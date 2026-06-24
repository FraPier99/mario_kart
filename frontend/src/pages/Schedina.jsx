import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { FileText, Trophy, Users, PenLine, Clock, AlertTriangle, ScrollText, ArrowLeft, Sparkles, Star } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import ApiBanner from '@/components/common/ApiBanner'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'
import { schedineApi, schedineDeluxeApi } from '@/services/apiClient'

const formatDeadline = (deadlineLock) => {
    if (!deadlineLock) return 'Nessuna scadenza'
    const d = new Date(deadlineLock)
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatDate = (value) => {
    if (!value) return 'data non disponibile'
    return new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ALL_TABS = [
    { key: 'storico', label: 'Storico Vincitori', icon: <Trophy size={16} /> },
    { key: 'storico-schedine', label: 'Storico Schedine', icon: <Users size={16} /> },
    { key: 'mie-schedine', label: 'Le Mie Schedine', icon: <ScrollText size={16} /> },
]

// helpers to extract per-category correctness from scoring_breakdown
const getPositionCorrect = (breakdown, idx) => {
    if (!breakdown?.length) return null
    const items = breakdown.filter(b => b.category === 'position')
    const item = items[idx]
    if (!item) return null
    return item.correct
}
const getCategoryCorrect = (breakdown, category) => {
    if (!breakdown?.length) return null
    const item = breakdown.find(b => b.category === category)
    if (!item) return null
    return item.correct
}

const Schedina = () => {
    const { tournamentId } = useParams()
    const location = useLocation()
    const fromAdmin = location.state?.fromAdmin === true
    const { getTournamentById } = useAppData()
    const { user, isAdmin, isSuperadmin } = useAuth()
    const isPrivileged = isAdmin || isSuperadmin

    const [activeTab, setActiveTab] = useState('storico')
    const [overview, setOverview] = useState(null)
    const [tournamentDetail, setTournamentDetail] = useState(null)
    const [pendingSchedine, setPendingSchedine] = useState([])
    const [mySchedine, setMySchedine] = useState([])
    const [participantsStatus, setParticipantsStatus] = useState([])
    const [allByTournament, setAllByTournament] = useState(null)
    const [deluxeDetail, setDeluxeDetail] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // game filters + sub-tabs
    const [overviewGameId, setOverviewGameId] = useState('')
    const [mySchedineGameId, setMySchedineGameId] = useState('')
    const { dark } = useTheme()
    const { charactersById, playersById, players, games } = useAppData()
    const theme = useMemo(() => getProfileTheme(user, charactersById, dark), [user, charactersById, dark])

    const tournament = tournamentId ? getTournamentById(tournamentId) : null

    // il giocatore corrente è tra i partecipanti del torneo selezionato
    const isParticipantOfCurrentTournament = useMemo(() => {
        if (!tournament?.participant_ids?.length) return true
        const playerId = user?.player?.id
        if (!playerId) return false
        return tournament.participant_ids.includes(playerId)
    }, [user, tournament])

    // nickname → player map
    const playersByNickname = useMemo(() => {
        const m = new Map()
        players.forEach((p) => { if (p.nickname) m.set(p.nickname.toLowerCase(), p) })
        return m
    }, [players])

    const getPlayerImg = (nickname) => {
        if (!nickname) return null
        const p = playersByNickname.get(nickname.toLowerCase())
        return p?.img_url ?? null
    }
    const favoriteCharacter = user?.player?.favorite_character_id
        ? charactersById?.get(user.player.favorite_character_id) ?? null
        : null

    const isTournamentDeleted = tournamentId && !tournamentDetail && !tournament

    // winner notification: most recent win within 48 hours
    const [winnerNotification, setWinnerNotification] = useState(null)
    useEffect(() => {
        let next = null
        if (overview?.winners && user) {
            const myWins = overview.winners.filter(w => w.user_id === user.id)
            if (myWins.length) {
                const latest = myWins[0]
                const hoursSince = (Date.now() - new Date(latest.created_at).getTime()) / 3_600_000
                next = hoursSince <= 48 ? latest : null
            }
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWinnerNotification(next)
    }, [overview, user])

    // memo for filtering mySchedine by game
    const filteredMySchedine = useMemo(() => {
        if (!mySchedineGameId) return mySchedine
        return mySchedine.filter(s => {
            const t = getTournamentById(s.tournament_id)
            return t && t.game_id === Number(mySchedineGameId)
        })
    }, [mySchedine, mySchedineGameId, getTournamentById])

    const getBreakdown = (entry) => entry.scoring_breakdown ?? []

    const breakdownSummary = (items) => {
        if (!items?.length) return '0/0 corretti'
        const correct = items.filter((i) => i.correct).length
        const total = items.length
        return `${correct}/${total} corretti`
    }

    const hasSchedinaFeature = Boolean(
        tournament?.deadline_lock ||
        tournament?.duello_player_a_id ||
        tournament?.duello_player_b_id
    )

    const filteredTabs = useMemo(() => {
        return ALL_TABS.map((tab) => {
            if (tab.key === 'mie-schedine' && isSuperadmin) {
                return { ...tab, label: 'Schedine Tornei' }
            }
            return tab
        })
    }, [isSuperadmin])

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            setError('')
            const requests = [
                schedineApi.overview(overviewGameId),
                schedineApi.pendingNotifications(),
            ]

            if (isSuperadmin) {
                requests.push(schedineApi.allByTournament())
            } else {
                requests.push(schedineApi.me())
            }

            const isGroupStage = tournament?.tournament_format === 'group_stage'
            if (tournamentId) {
                requests.push(schedineApi.tournamentDetail(tournamentId))
                if (isGroupStage) {
                    requests.push(schedineDeluxeApi.tournamentDetail(tournamentId))
                }
                if (isPrivileged) {
                    requests.push(schedineApi.participantsStatus(tournamentId))
                }
            }

            const responses = await Promise.allSettled(requests)
            if (!active) return

            let idx = 0
            const overviewRes = responses[idx++]
            const pendingRes = responses[idx++]

            let allByTournamentRes, meRes
            if (isSuperadmin) {
                allByTournamentRes = responses[idx++]
            } else {
                meRes = responses[idx++]
            }

            let detailRes, deluxeDetailRes, participantsRes
            if (tournamentId) {
                detailRes = responses[idx++]
                if (isGroupStage) {
                    deluxeDetailRes = responses[idx++]
                }
                if (isPrivileged) {
                    participantsRes = responses[idx]
                }
            }

            if (overviewRes?.status === 'fulfilled') {
                setOverview(overviewRes.value.data ?? null)
            }
            if (pendingRes?.status === 'fulfilled') {
                setPendingSchedine(pendingRes.value.data ?? [])
            }
            if (isSuperadmin) {
                if (allByTournamentRes?.status === 'fulfilled') {
                    setAllByTournament(allByTournamentRes.value.data?.tournaments ?? null)
                }
            } else if (meRes?.status === 'fulfilled') {
                setMySchedine(meRes.value.data?.schedine ?? [])
            }
            if (tournamentId) {
                if (detailRes?.status === 'fulfilled') {
                    setTournamentDetail(detailRes.value.data ?? null)
                } else {
                    setTournamentDetail(tournament ?? null)
                }
                if (isGroupStage && deluxeDetailRes?.status === 'fulfilled') {
                    setDeluxeDetail(deluxeDetailRes.value.data ?? null)
                } else if (!isGroupStage) {
                    setDeluxeDetail(null)
                }
                if (isPrivileged && participantsRes?.status === 'fulfilled') {
                    setParticipantsStatus(participantsRes.value.data ?? [])
                }
            }

            setError('')
            setLoading(false)
        }
        load()
        return () => { active = false }
    }, [tournamentId, isPrivileged, tournament, isSuperadmin, overviewGameId])

    const getPlayerNickname = (playerId) => {
        if (playerId == null) return null
        const p = playersById?.get(Number(playerId))
        return p?.nickname ?? `#${playerId}`
    }

    // renders a player pick pill with optional green/red color from breakdown correctness
    const renderPick = (playerId, explicitNickname, correct = null) => {
        if (!playerId) return <span className="text-slate-300 dark:text-slate-600">—</span>
        const nickname = explicitNickname ?? getPlayerNickname(playerId)
        const img = getPlayerImg(nickname)
        const ringColor = correct === true
            ? 'ring-emerald-400 dark:ring-emerald-500'
            : correct === false
                ? 'ring-rose-400 dark:ring-rose-500'
                : 'ring-slate-200 dark:ring-slate-700'
        const textColor = correct === true
            ? 'text-emerald-700 dark:text-emerald-300 font-black'
            : correct === false
                ? 'text-rose-600 dark:text-rose-400 font-black'
                : 'text-slate-800 dark:text-foreground font-bold'
        return (
            <div className="flex items-center gap-1.5 min-w-0">
                {img ? (
                    <img src={img} alt={nickname} className={`h-5 w-5 shrink-0 rounded-full object-cover ring-1 ${ringColor}`} />
                ) : (
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[8px] font-black text-slate-500 dark:text-slate-400`}>
                        {(nickname ?? '?').charAt(0).toUpperCase()}
                    </div>
                )}
                <span className={`truncate text-xs ${textColor}`}>{nickname}</span>
                {correct === true && <span className="text-emerald-500 text-[9px]">✓</span>}
                {correct === false && <span className="text-rose-400 text-[9px]">✗</span>}
            </div>
        )
    }

    if (loading) {
        return (
            <AppLayout>
                <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
                    <div className="space-y-4">
                        <div className="h-32 animate-shimmer rounded-3xl bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
                        <div className="h-52 animate-shimmer rounded-3xl bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
                    </div>
                </section>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">

                {/* ── PENDING BANNER — Da compilare (non scadute) ── */}
                {pendingSchedine.length > 0 && !tournamentId && (
                    <div className="mb-6 rounded-[2rem] overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                        <div className="border border-amber-300 rounded-[2rem] p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-400/40">
                                    <AlertTriangle size={20} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-700">Schedine da compilare</p>
                                    <p className="mt-0.5 text-sm font-black text-amber-900">
                                        Hai un torneo attivo: devi ancora compilare la schedina!
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {pendingSchedine.map((n) => (
                                    <div key={n.tournament_id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 shadow-sm p-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <Clock size={16} className="text-amber-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-amber-900 truncate">{n.tournament_name}</p>
                                                <p className="text-xs text-amber-700">{n.message}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em]">
                                                {formatDeadline(n.deadline_lock)}
                                            </span>
                                            <Link
                                                to={n.tournament_format === 'group_stage' ? `/schedina/${n.tournament_id}/group-stage` : `/schedina/${n.tournament_id}/compila`}
                                                className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 ${theme.tailwind.bg}`}
                                            >
                                                <PenLine size={12} />
                                                Compila Ora
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── ESITO TORNEO (tournamentId presente) ── */}
                {tournamentId ? (
                    <>
                        {/* HEADER */}
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                {favoriteCharacter?.img_url && (
                                    <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name}
                                        className={`hidden sm:block h-10 w-10 shrink-0 rounded-2xl object-cover border-2 ${theme.tailwind.border}`} />
                                )}
                                <div className="min-w-0">
                                    <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${theme.tailwind.text}`}>Esito Schedina</p>
                                    <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground truncate">
                                        {tournamentDetail?.tournament_name ?? tournament?.name ?? `Torneo #${tournamentId}`}
                                    </h1>
                                    <p className="text-xs text-slate-400 dark:text-muted-foreground">{formatDate(tournamentDetail?.tournament_date ?? tournament?.date)}</p>
                                </div>
                            </div>
                            <Link to={`/tournaments/${tournamentId}`} state={fromAdmin ? { adminMode: true } : undefined} className="shrink-0 inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-300 dark:border-border dark:bg-card dark:text-foreground">
                                <ArrowLeft size={13} /> Torna al torneo
                            </Link>
                        </div>

                        <ApiBanner title="Errore" message={error} />

                        {/* SEZIONE 1: ESITO */}
                        <div className="space-y-3">
                            {/* WINNER CARD */}
                            {tournamentDetail?.winner_user_id ? (() => {
                                const winnerNick = tournamentDetail.winner_nickname ?? tournamentDetail.winner_username
                                const winnerImg = getPlayerImg(winnerNick)
                                const isMe = tournamentDetail.winner_user_id === user?.id
                                return (
                                    <div className="rounded-[2rem] border border-amber-200 dark:border-amber-500/30 overflow-hidden"
                                        style={{ background: isMe ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(34,197,94,0.1))' : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(34,197,94,0.05))' }}>
                                        {isMe && (
                                            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 px-5 py-2 flex items-center gap-2">
                                                <Star size={14} className="text-amber-900" fill="currentColor" />
                                                <p className="text-xs font-black uppercase tracking-widest text-amber-900">Complimenti! Hai vinto la schedina di questo torneo!</p>
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500 mb-3">🏆 Vincitore Schedina</p>
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative shrink-0">
                                                        <div className="h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-amber-400 shadow-lg shadow-amber-500/20">
                                                            {winnerImg ? (
                                                                <img src={winnerImg} alt={winnerNick} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 text-2xl font-black text-white">
                                                                    {(winnerNick ?? '?').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow-md">
                                                            <Trophy size={12} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{winnerNick}</h2>
                                                        <p className="text-sm text-slate-500 dark:text-slate-300">
                                                            <span className="font-black text-amber-600 dark:text-amber-400">{tournamentDetail.winner_points} pt</span>
                                                            {tournamentDetail.winner_tiebreak_distance != null && (
                                                                <span className="text-slate-400"> · spareggio {tournamentDetail.winner_tiebreak_distance}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest ${tournamentDetail.premio ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {tournamentDetail.premio ? '✓ Premio assegnato' : 'Nessun premio'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })() : tournamentDetail?.user_has_predicted ? (
                                <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                                            <Trophy size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Schedina inviata</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                                {tournament?.status === 'in_corso'
                                                    ? 'L\'esito sarà visibile a torneo concluso'
                                                    : 'In attesa dell\'esito del torneo'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                                                {isTournamentDeleted ? 'Torneo non più disponibile' : hasSchedinaFeature ? 'Schedina non ancora compilata' : 'Torneo storico'}
                                            </p>
                                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                                {isTournamentDeleted ? 'Questo torneo è stato rimosso' : hasSchedinaFeature ? 'Il vincitore verrà annunciato a torneo concluso' : 'Creato prima dell\'introduzione della schedina'}
                                            </p>
                                        </div>
                                        {hasSchedinaFeature && tournament?.status !== 'concluso' && isParticipantOfCurrentTournament && (
                                            <Link
                                                to={tournament?.tournament_format === 'group_stage'
                                                    ? `/schedina/${tournamentId}/group-stage`
                                                    : `/schedina/${tournamentId}/compila`}
                                                className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90 ${theme.tailwind.bg}`}
                                            >
                                                <PenLine size={12} /> Compila schedina
                                            </Link>
                                        )}
                                        {/* Deluxe: mostra link anche senza deadline_lock */}
                                        {!hasSchedinaFeature && tournament?.tournament_format === 'group_stage' && tournament?.status !== 'concluso' && isParticipantOfCurrentTournament && (
                                            <Link
                                                to={`/schedina/${tournamentId}/group-stage`}
                                                className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90 ${theme.tailwind.bg}`}
                                            >
                                                <PenLine size={12} /> Compila schedina
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SEZIONE 2: CLASSIFICA PRONOSTICI */}
                        {(tournamentDetail?.schedine ?? []).length > 0 && (() => {
                            const schedine = tournamentDetail.schedine
                            const hasAnyDuel = schedine.some((e) => e.duello_scelta_id)

                            return (
                                <div className="mt-6 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">Classifica pronostici</p>

                                    {/* Mobile: cards */}
                                    <div className="md:hidden space-y-2">
                                        {schedine.map((entry, index) => {
                                            const isMe = entry.user_id === user?.id
                                            const nick = entry.nickname ?? entry.username
                                            const img = getPlayerImg(nick)
                                            const isWinner = entry.user_id === tournamentDetail.winner_user_id
                                            const bd = getBreakdown(entry)
                                            const nPos = (entry.classifica_ordinata ?? []).length
                                            return (
                                                <div key={entry.schedina_id}
                                                    className={`rounded-2xl border p-4 space-y-3 transition ${isWinner ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5' : isMe ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5' : 'border-slate-200 dark:border-border bg-white dark:bg-card'}`}>
                                                    {/* Header row */}
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className={`text-sm font-black ${isWinner ? 'text-amber-500' : 'text-slate-400 dark:text-muted-foreground'}`}>#{index + 1}</span>
                                                            {img ? <img src={img} alt={nick} className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-slate-700" />
                                                                : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-black text-slate-500">{(nick ?? '?').charAt(0).toUpperCase()}</div>}
                                                            <div>
                                                                <p className={`text-sm font-black ${isWinner ? 'text-amber-700 dark:text-amber-300' : isMe ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-foreground'}`}>
                                                                    {nick} {isMe && <span className="text-[8px] text-emerald-500 font-black">(tu)</span>}
                                                                    {isWinner && <span className="ml-1 text-[9px] text-amber-500">🏆</span>}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {tournamentDetail?.winner_user_id ? `${entry.points} pt · dist. ${entry.tie_breaker_distance ?? '-'}` : 'In attesa'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`text-lg font-black ${isWinner ? 'text-amber-500' : 'text-slate-700 dark:text-foreground'}`}>{tournamentDetail?.winner_user_id ? entry.points : '—'}</span>
                                                        </div>
                                                    </div>
                                                    {/* Picks grid */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                                                        {[
                                                            { label: '1°', val: renderPick(entry.classifica_ordinata?.[0], null, getPositionCorrect(bd, 0)) },
                                                            { label: '2°', val: renderPick(entry.classifica_ordinata?.[1], null, getPositionCorrect(bd, 1)) },
                                                            { label: '3°', val: renderPick(entry.classifica_ordinata?.[2], null, getPositionCorrect(bd, 2)) },
                                                            { label: 'Ultimo', val: renderPick(entry.classifica_ordinata?.[nPos - 1], null, getPositionCorrect(bd, nPos - 1)) },
                                                        ].map(({ label, val }) => (
                                                            <div key={label} className="rounded-xl bg-slate-50 dark:bg-muted p-1.5">
                                                                <p className="font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[8px] mb-0.5">{label}</p>
                                                                {val}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {(entry.maggiore_streak_vittorie_id || entry.duello_scelta_id) && (
                                                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                                                            {entry.maggiore_streak_vittorie_id && (
                                                                <span className={`rounded-full border px-2 py-0.5 ${getCategoryCorrect(bd, 'streak') === true ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : getCategoryCorrect(bd, 'streak') === false ? 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300'}`}>
                                                                    Streak: {entry.maggiore_streak_nickname ?? getPlayerNickname(entry.maggiore_streak_vittorie_id)}
                                                                </span>
                                                            )}
                                                            {entry.duello_scelta_id && (
                                                                <span className={`rounded-full border px-2 py-0.5 ${getCategoryCorrect(bd, 'duello') === true ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : getCategoryCorrect(bd, 'duello') === false ? 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300'}`}>
                                                                    Duello: {entry.duello_scelta_nickname ?? getPlayerNickname(entry.duello_scelta_id)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* Breakdown */}
                                                    {(() => {
                                                        return bd.length > 0 ? (
                                                            <div className="border-t border-slate-100 dark:border-white/10 pt-3 space-y-1">
                                                                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400 mb-1.5">Dettaglio punteggio ({breakdownSummary(bd)})</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {bd.map((item, i) => (
                                                                        <span key={i} className={`inline-flex items-center gap-1 rounded-xl border px-2 py-1 text-[9px] font-black ${item.correct ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/3'}`}>
                                                                            {item.correct ? '✓' : '✗'} {item.label}{item.pick_nickname ? ` · ${item.pick_nickname}` : ''}{item.points > 0 && ` +${item.points}`}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : null
                                                    })()}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Desktop: table */}
                                    <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-border">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-100 dark:divide-border">
                                                <thead className="bg-slate-50 dark:bg-muted">
                                                    <tr>
                                                        <th className="w-10 px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">#</th>
                                                        <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Giocatore</th>
                                                        <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Pt</th>
                                                        <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Dist.</th>
                                                        <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">1°</th>
                                                        <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">2°</th>
                                                        <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">3°</th>
                                                        <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Ultimo</th>
                                                        <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Streak</th>
                                                        {hasAnyDuel && <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Duello</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-border bg-white dark:bg-card">
                                                    {schedine.map((entry, index) => {
                                                        const isMe = entry.user_id === user?.id
                                                        const isWinner = entry.user_id === tournamentDetail.winner_user_id
                                                        const nick = entry.nickname ?? entry.username
                                                        const img = getPlayerImg(nick)
                                                        const bd = getBreakdown(entry)
                                                        const nPos = (entry.classifica_ordinata ?? []).length
                                                        const colSpan = 6 + (hasAnyDuel ? 1 : 0)
                                                        return (
                                                            <>
                                                                <tr key={entry.schedina_id}
                                                                    className={`transition select-none ${isWinner ? 'bg-amber-50/50 dark:bg-amber-500/5' : isMe ? 'bg-emerald-50/40 dark:bg-emerald-500/5' : 'hover:bg-slate-50/70 dark:hover:bg-white/3'}`}>
                                                                    <td className="px-3 py-3">
                                                                        <span className={`text-sm font-black ${isWinner ? 'text-amber-500' : 'text-slate-400 dark:text-muted-foreground'}`}>
                                                                            {isWinner ? '🏆' : `#${index + 1}`}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-3">
                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                            {img ? (
                                                                                <img src={img} alt={nick} className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 shadow-sm" />
                                                                            ) : (
                                                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-black text-slate-500 dark:text-slate-400">
                                                                                    {(nick ?? '?').charAt(0).toUpperCase()}
                                                                                </div>
                                                                            )}
                                                                            <div className="min-w-0">
                                                                                <p className={`text-sm font-black truncate ${isWinner ? 'text-amber-700 dark:text-amber-300' : isMe ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-foreground'}`}>
                                                                                    {nick}{isMe && <span className="ml-1.5 text-[8px] text-emerald-500 font-black">(tu)</span>}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-3">
                                                                        <span className={`text-sm font-black ${isWinner ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-foreground'}`}>{tournamentDetail?.winner_user_id ? entry.points : '—'}</span>
                                                                    </td>
                                                                    <td className="px-3 py-3 text-sm text-slate-500 dark:text-muted-foreground">{entry.tie_breaker_distance ?? '—'}</td>
                                                                    <td className="px-3 py-3 max-w-28">{renderPick(entry.classifica_ordinata?.[0], null, getPositionCorrect(bd, 0))}</td>
                                                                    <td className="px-3 py-3 max-w-28">{renderPick(entry.classifica_ordinata?.[1], null, getPositionCorrect(bd, 1))}</td>
                                                                    <td className="px-3 py-3 max-w-28">{renderPick(entry.classifica_ordinata?.[2], null, getPositionCorrect(bd, 2))}</td>
                                                                    <td className="px-3 py-3 max-w-28">{renderPick(entry.classifica_ordinata?.[nPos - 1], null, getPositionCorrect(bd, nPos - 1))}</td>
                                                                    <td className="px-3 py-3 max-w-28">{renderPick(entry.maggiore_streak_vittorie_id, entry.maggiore_streak_nickname, getCategoryCorrect(bd, 'streak'))}</td>
                                                                    {hasAnyDuel && <td className="px-3 py-3 max-w-28">{renderPick(entry.duello_scelta_id, entry.duello_scelta_nickname, getCategoryCorrect(bd, 'duello'))}</td>}
                                                                </tr>
                                                                {/* BREAKDOWN row */}
                                                                <tr key={`${entry.schedina_id}-bd`} className={isWinner ? 'bg-amber-50/30 dark:bg-amber-500/3' : isMe ? 'bg-emerald-50/30 dark:bg-emerald-500/3' : 'bg-slate-50/50 dark:bg-white/2'}>
                                                                    <td colSpan={colSpan} className="px-4 pb-3 pt-0">
                                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                                            {bd.map((item, i) => (
                                                                                <div key={i} className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[10px] font-black ${
                                                                                    item.correct
                                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                                                        : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/3 dark:text-slate-500'
                                                                                }`}>
                                                                                    <span>{item.correct ? '✓' : '✗'}</span>
                                                                                    <span>{item.label}</span>
                                                                                    {item.pick_nickname && <span className="opacity-70">· {item.pick_nickname}</span>}
                                                                                    {item.points > 0 && <span className="font-black">+{item.points}</span>}
                                                                                </div>
                                                                            ))}
                                                                            {bd.length === 0 && tournament?.status !== 'concluso' && (
                                                                                <span className="text-[10px] text-slate-400 italic">Torneo non ancora concluso — confronto non disponibile</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* SEZIONE 2b: CLASSIFICA PRONOSTICI (GIRONI) */}
                        {tournament?.tournament_format === 'group_stage' && (deluxeDetail?.schedine ?? []).length > 0 && (() => {
                            const schedine = deluxeDetail.schedine
                            const actualFinalistiSet = new Set(deluxeDetail.actual_finalisti ?? [])

                            return (
                                <div className="mt-6 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">Classifica pronostici (Gironi)</p>

                                    {/* Risultati reali */}
                                    {((deluxeDetail.actual_finalisti?.length ?? 0) > 0 || (deluxeDetail.actual_classifica_finale?.length ?? 0) > 0 || Object.keys(deluxeDetail.actual_classifiche_gironi_nicknames ?? {}).length > 0) && (
                                        <div className="rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-3 space-y-1.5 text-[11px]">
                                            {(deluxeDetail.actual_finalisti?.length ?? 0) > 0 && (
                                                <p>
                                                    <span className="font-black uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Finalisti: </span>
                                                    {deluxeDetail.actual_finalisti_nicknames.filter(Boolean).join(', ')}
                                                </p>
                                            )}
                                            {(deluxeDetail.actual_classifica_finale?.length ?? 0) > 0 && (
                                                <p>
                                                    <span className="font-black uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Classifica finale: </span>
                                                    {deluxeDetail.actual_classifica_finale_nicknames.map((n, i) => `${i + 1}° ${n ?? '—'}`).join(' · ')}
                                                </p>
                                            )}
                                            {Object.keys(deluxeDetail.actual_classifiche_gironi_nicknames ?? {}).length > 0 && (
                                                <div className="space-y-0.5">
                                                    <span className="font-black uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Classifica gironi: </span>
                                                    {Object.entries(deluxeDetail.actual_classifiche_gironi_nicknames).map(([girone, names]) => (
                                                        <p key={girone} className="pl-2">
                                                            Girone {girone}: {names.map((n, i) => `${i + 1}° ${n ?? '—'}`).join(' · ')}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {schedine.map((entry, index) => {
                                            const isMe = entry.user_id === user?.id
                                            const isWinner = entry.user_id === deluxeDetail.winner_user_id
                                            const nick = entry.nickname ?? entry.username
                                            const img = getPlayerImg(nick)
                                            const bd = entry.scoring_breakdown
                                            return (
                                                <div key={entry.schedina_id}
                                                    className={`rounded-2xl border p-4 space-y-3 transition ${isWinner ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5' : isMe ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5' : 'border-slate-200 dark:border-border bg-white dark:bg-card'}`}>
                                                    {/* Header row */}
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className={`text-sm font-black shrink-0 ${isWinner ? 'text-amber-500' : 'text-slate-400 dark:text-muted-foreground'}`}>#{index + 1}</span>
                                                            {img ? <img src={img} alt={nick} className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-700" />
                                                                : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-black text-slate-500">{(nick ?? '?').charAt(0).toUpperCase()}</div>}
                                                            <div className="min-w-0">
                                                                <p className={`text-sm font-black truncate ${isWinner ? 'text-amber-700 dark:text-amber-300' : isMe ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-foreground'}`}>
                                                                    {nick} {isMe && <span className="text-[8px] text-emerald-500 font-black">(tu)</span>}
                                                                    {isWinner && <span className="ml-1 text-[9px] text-amber-500">🏆</span>}
                                                                </p>
                                                                 <p className="text-[10px] text-slate-400">
                                                                     {deluxeDetail?.winner_user_id ? `${entry.points} pt · dist. ${entry.tie_breaker_distance ?? '-'}` : 'In attesa'}
                                                                 </p>
                                                             </div>
                                                         </div>
                                                         <span className={`text-lg font-black shrink-0 ${isWinner ? 'text-amber-500' : 'text-slate-700 dark:text-foreground'}`}>{deluxeDetail?.winner_user_id ? entry.points : '—'}</span>
                                                    </div>

                                                    {/* Finalisti */}
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                                                            Finalisti pronosticati ({bd.finalisti.n_corretti}/{entry.finalisti_ids.length} ✓)
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {entry.finalisti_ids.map((pid, i) => {
                                                                const correct = actualFinalistiSet.has(pid)
                                                                return (
                                                                    <span key={pid} className={`inline-flex items-center gap-1 rounded-xl border px-2 py-1 text-[9px] font-black ${correct ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/3'}`}>
                                                                        {correct ? '✓' : '✗'} {entry.finalisti_nicknames[i] ?? `#${pid}`}
                                                                    </span>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Classifica finale per posizione */}
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                                                            Classifica finale ({bd.classifica_finale.posizioni_corrette}/{entry.classifica_finale_ordinata.length} ✓)
                                                        </p>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                                                            {bd.classifica_finale.posizioni.map((pos, i) => (
                                                                <div key={i} className="rounded-xl bg-slate-50 dark:bg-muted p-1.5">
                                                                    <p className="font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[8px] mb-0.5">{pos.label}</p>
                                                                    {renderPick(entry.classifica_finale_ordinata[i], entry.classifica_finale_nicknames[i], pos.correct)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Classifica Gironi */}
                                                    {Object.keys(bd.classifiche_gironi?.gironi ?? {}).length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                                                                Classifica gironi ({bd.classifiche_gironi.punti} pt)
                                                            </p>
                                                            {Object.entries(bd.classifiche_gironi.gironi).map(([girone, gbd]) => (
                                                                <div key={girone} className="space-y-1">
                                                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                                        Girone {girone} ({gbd.posizioni_corrette}/{entry.classifiche_gironi?.[girone]?.length ?? 0} ✓)
                                                                    </p>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                                                                        {gbd.posizioni.map((pos, i) => (
                                                                            <div key={i} className="rounded-xl bg-slate-50 dark:bg-muted p-1.5">
                                                                                <p className="font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 text-[8px] mb-0.5">{pos.label}</p>
                                                                                {renderPick(entry.classifiche_gironi?.[girone]?.[i], entry.classifiche_gironi_nicknames?.[girone]?.[i], pos.correct)}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Duello */}
                                                    {(entry.duello_scelta_id || entry.duello_pareggio) && (
                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${bd.duello.corretto ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                            {bd.duello.corretto ? '✓' : '✗'} Duello: {entry.duello_pareggio ? 'Pareggio' : entry.duello_scelta_nickname}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Nessuna schedina */}
                        {(tournamentDetail?.schedine ?? []).length === 0 && !(tournament?.tournament_format === 'group_stage' && (deluxeDetail?.schedine ?? []).length > 0) && (
                            <div className="mt-6 rounded-[2rem] border border-dashed border-slate-200 p-10 text-center dark:border-white/10">
                                <FileText size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="mt-4 text-sm font-black text-slate-500 dark:text-muted-foreground uppercase tracking-wider">Nessuna schedina disponibile</p>
                                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                                    {isTournamentDeleted ? 'Il torneo non è più disponibile.' : 'Torneo storico o nessuna schedina compilata.'}
                                </p>
                            </div>
                        )}

                        {/* SEZIONE 3: ADMIN — STATO COMPILAZIONI + DEADLINE CONTROL */}
                        {isPrivileged && participantsStatus.length > 0 && (
                            <div className="mt-6 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-500/5 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-600 dark:text-sky-400 flex items-center gap-2 mb-3">
                                    <Users size={13} /> Stato compilazione partecipanti
                                    <span className="ml-auto rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 py-0.5 text-[9px]">
                                        {participantsStatus.filter((p) => p.has_compiled).length}/{participantsStatus.length} compilate
                                    </span>
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {participantsStatus.map((p) => (
                                        <div key={p.user_id} className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-slate-800 px-3 py-2.5 shadow-sm">
                                            {(() => {
                                                const img = getPlayerImg(p.nickname)
                                                return img
                                                    ? <img src={img} alt={p.nickname} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                                                    : <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-500">{(p.nickname ?? '?').charAt(0).toUpperCase()}</div>
                                            })()}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{p.nickname || p.username}</p>
                                                {p.compiled_at && (
                                                    <p className="text-[9px] text-slate-400">{new Date(p.compiled_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                )}
                                            </div>
                                            <span className={`shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${p.has_compiled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                                {p.has_compiled ? '✓' : '○'} {p.has_compiled ? 'Sì' : 'No'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* HEADER + TAB NAV */}
                        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {favoriteCharacter?.img_url && (
                                    <div className="hidden shrink-0 sm:block">
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden border-2 ${theme.tailwind.border}`}>
                                            <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-full w-full object-cover" />
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className={`text-xs font-black uppercase tracking-[0.35em] ${theme.tailwind.text}`}>SCHEDINA</p>
                                    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">Schedina</h1>
                                    <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground uppercase">
                                        Storici vincitori e storici schedine dei tornei
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {favoriteCharacter && (
                                    <div className={`hidden md:flex items-center gap-2 rounded-2xl px-4 py-2 text-xs ${theme.tailwind.bgSoft} border ${theme.tailwind.border}`}>
                                        <Sparkles size={12} className={theme.tailwind.text} />
                                        <span className={`font-black uppercase tracking-wider ${theme.tailwind.textStrong}`}>{favoriteCharacter.name}</span>
                                    </div>
                                )}
                                <Link to="/history" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 dark:border-border dark:bg-card dark:text-foreground">
                                    Storico tornei
                                </Link>
                            </div>
                        </div>

                        <ApiBanner title="Errore" message={error} action={error ? (
                            <button type="button" onClick={() => window.location.reload()} className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white">Riprova</button>
                        ) : null} />

                        {/* TAB BUTTONS — max-w-full è necessario perché overflow-x-auto
                        funzioni davvero su un contenitore inline-flex: senza un
                        vincolo di larghezza il div si allarga quanto serve per
                        contenere tutte le tab (sforando la pagina) invece di
                        scrollare al suo interno — stesso fix già usato per la
                        tab bar dell'admin in TournamentDetail.jsx. */}
                        <div className="inline-flex max-w-full rounded-2xl bg-slate-100 dark:bg-muted p-1 mb-6 overflow-x-auto">
                            {filteredTabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab === tab.key ? `text-white shadow-md ${theme.tailwind.bg}` : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>



                        {/* TAB: STORICO */}
                        {activeTab === 'storico' && (
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-border dark:bg-card">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className={`text-xs font-black uppercase tracking-[0.35em] ${theme.tailwind.text}`}>Storico schedine</p>
                                        <h2 className="mt-2 font-title text-2xl uppercase tracking-tight text-slate-900 dark:text-foreground">Vincitori nei vari tornei</h2>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-slate-700 dark:bg-muted dark:text-muted-foreground">
                                        <Trophy size={16} />
                                        <span className="text-xs font-black uppercase tracking-[0.3em]">Storico premi</span>
                                    </div>
                                </div>
                                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                    {overview?.winners?.length ? (
                                        overview.winners.map((winner) => {
                                            const isMe = winner.user_id === user?.id
                                            const winnerImg = getPlayerImg(winner.nickname)
                                            return (
                                                <div key={`${winner.tournament_id}-${winner.schedina_id}`} className={`rounded-3xl border p-4 ${isMe ? 'border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/5' : 'border-slate-200 bg-slate-50 dark:border-border dark:bg-muted'}`}>
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            {winnerImg ? (
                                                                <img src={winnerImg} alt={winner.nickname} className="h-10 w-10 rounded-2xl object-cover ring-2 ring-amber-300 dark:ring-amber-500/50 shrink-0" />
                                                            ) : (
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-lg font-black text-amber-600 dark:text-amber-400">
                                                                    {(winner.nickname ?? winner.username ?? '?').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Torneo #{winner.tournament_id}</p>
                                                                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-foreground">{winner.tournament_name}</h3>
                                                                <p className="text-xs text-slate-500 dark:text-muted-foreground">{formatDate(winner.tournament_date)} · {winner.nickname ?? winner.username}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${winner.redeemed_at ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'}`}>
                                                            {winner.redeemed_at ? 'Riscattato' : 'Da riscattare'}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-card">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Punti schedina</p>
                                                            <p className="mt-1 text-xl font-black text-slate-900 dark:text-foreground">{winner.points}</p>
                                                        </div>
                                                        <Link to={`/schedina/${winner.tournament_id}`} className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest transition hover:opacity-80 border ${theme.tailwind.border} ${theme.tailwind.bgSoft} ${theme.tailwind.textStrong}`}>
                                                            Esito torneo
                                                        </Link>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <p className="rounded-3xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-border dark:text-muted-foreground lg:col-span-2">Non c'è nessun vincitore di schedina per nessun torneo</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: STORICO SCHEDINE */}
                        {activeTab === 'storico-schedine' && (
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-border dark:bg-card">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className={`text-xs font-black uppercase tracking-[0.35em] ${theme.tailwind.text}`}>Storico Schedine</p>
                                        <h2 className="mt-2 font-title text-2xl uppercase tracking-tight text-slate-900 dark:text-foreground">Compilazioni e vittorie per giocatore</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={overviewGameId}
                                            onChange={(e) => setOverviewGameId(e.target.value)}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none dark:border-border dark:bg-card dark:text-foreground"
                                        >
                                            <option value="">Tutti i giochi</option>
                                            {games.map((g) => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-slate-700 dark:bg-muted dark:text-muted-foreground">
                                            <Users size={16} />
                                            <span className="text-xs font-black uppercase tracking-[0.3em]">Statistiche utenti</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 dark:border-border">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-border">
                                            <thead className="bg-slate-50 dark:bg-muted">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Utente</th>
                                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Compilate</th>
                                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Vinte</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 bg-white dark:divide-border dark:bg-card">
                                                {(overview?.usage ?? []).map((row) => (
                                                    <tr key={row.user_id}>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2.5">
                                                                {row.img_url ? (
                                                                    <img src={row.img_url} alt={row.nickname ?? row.username} className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                                                                ) : (
                                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-500 dark:text-slate-400">
                                                                        {(row.nickname ?? row.username ?? '?').charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <p className="text-sm font-black text-slate-900 dark:text-foreground">{row.nickname ?? row.username}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-sm font-bold text-slate-700 dark:text-foreground">{row.schedine_compiled}</td>
                                                        <td className="px-4 py-3 text-center text-sm font-bold text-slate-700 dark:text-foreground">{row.schedine_won}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                {(overview?.usage ?? []).length === 0 && (
                                    <p className="mt-4 text-center text-sm text-slate-400 dark:text-slate-500">Nessun dato disponibile.</p>
                                )}
                            </div>
                        )}

                        {/* TAB: LE MIE SCHEDINE / SCHEDINE TORNEI */}
                        {activeTab === 'mie-schedine' && (
                            <div className="space-y-4">
                                {/* WIN NOTIFICATION BANNER */}
                                {!isSuperadmin && winnerNotification && (
                                    <div className="rounded-[2rem] overflow-hidden shadow-xl">
                                        <div className="border border-amber-300 dark:border-amber-500/40 rounded-[2rem]" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(34,197,94,0.1))' }}>
                                            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-2 flex items-center gap-2">
                                                <Star size={14} className="text-amber-900" fill="currentColor" />
                                                <p className="text-xs font-black uppercase tracking-widest text-amber-900">Hai vinto una schedina!</p>
                                            </div>
                                            <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">
                                                        Hai vinto la schedina del torneo <span className="text-amber-600 dark:text-amber-400">{winnerNotification.tournament_name}</span>!
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                                                        {winnerNotification.points} punti · {formatDate(winnerNotification.tournament_date)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Link to={`/schedina/${winnerNotification.tournament_id}`} className={`rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90 shadow-lg ${theme.tailwind.bg}`}>
                                                        Vedi Esito
                                                    </Link>
                                                    <Link to="/carte" className={`rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition shadow-lg border ${theme.tailwind.border} ${theme.tailwind.bgSoft} ${theme.tailwind.textStrong}`}>
                                                        Le Mie Carte
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isSuperadmin && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={mySchedineGameId}
                                            onChange={(e) => setMySchedineGameId(e.target.value)}
                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 outline-none dark:border-border dark:bg-card dark:text-foreground"
                                        >
                                            <option value="">Tutti i giochi</option>
                                            {games.map((g) => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {isSuperadmin ? (
                                    allByTournament && allByTournament.length > 0 ? (
                                        allByTournament.map((entry) => (
                                            <div key={entry.tournament_id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl dark:border-border dark:bg-card">
                                                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Torneo #{entry.tournament_id}</p>
                                                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">{entry.tournament_name}</h3>
                                                        <p className="text-xs text-slate-500 dark:text-muted-foreground">{formatDate(entry.tournament_date)} · {entry.n_compiled}/{entry.n_participants} compilate</p>
                                                    </div>
                                                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${entry.all_compiled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                                                        {entry.all_compiled ? 'Tutti hanno compilato' : `In corso (${entry.n_compiled}/${entry.n_participants})`}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {entry.schedine.map((s) => (
                                                        <div key={s.schedina_id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-muted px-4 py-2.5">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                {(() => {
                                                                    const img = getPlayerImg(s.nickname)
                                                                    return img
                                                                        ? <img src={img} alt={s.nickname} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                                                                        : <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-500">{(s.nickname ?? s.username ?? '?').charAt(0).toUpperCase()}</div>
                                                                })()}
                                                                <p className="text-sm font-black text-slate-900 dark:text-foreground truncate">{s.nickname ?? s.username}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{s.points} pt</span>
                                                                <Link to={`/schedina/${entry.tournament_id}`} className="rounded-xl border border-slate-200 dark:border-border px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 transition">
                                                                    Esito
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-[2rem] border border-sky-200 bg-sky-50 p-8 text-center dark:border-sky-500/30 dark:bg-sky-500/5">
                                            <Users size={40} className="mx-auto text-sky-400 dark:text-sky-500" />
                                            <p className="mt-4 text-sm font-black text-sky-700 dark:text-sky-300 uppercase tracking-wider">Monitoraggio schedine</p>
                                            <p className="mt-2 text-xs text-sky-600 dark:text-sky-400 max-w-md mx-auto">Nessun torneo con schedine complete o in corso al momento.</p>
                                        </div>
                                    )
                                ) : filteredMySchedine.length === 0 && pendingSchedine.length === 0 ? (
                                    <div className="rounded-[2rem] border border-dashed border-slate-200 p-10 text-center dark:border-white/10">
                                        <ScrollText size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
                                        <p className="mt-4 text-sm font-black text-slate-500 dark:text-muted-foreground uppercase tracking-wider">Nessuna schedina trovata</p>
                                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Non hai ancora compilato nessuna schedina.</p>
                                    </div>
                                ) : (
                                    <>
                                        {filteredMySchedine.map((s) => {
                                            const t = getTournamentById(s.tournament_id)
                                            const isWon = s.status === 'settled' && mySchedine.length > 0 && overview?.winners?.some(w => w.user_id === user?.id && w.tournament_id === s.tournament_id)
                                            return (
                                                <div key={s.id} className={`rounded-[2rem] border bg-white p-5 shadow-xl dark:bg-card ${isWon ? 'border-amber-200 dark:border-amber-500/30' : 'border-slate-200 dark:border-border'}`}>
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Torneo #{s.tournament_id}</p>
                                                            <h3 className={`text-lg font-black uppercase tracking-tight ${isWon ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-foreground'}`}>
                                                                {t?.name ?? `Torneo #${s.tournament_id}`}
                                                                {isWon && <span className="ml-2 text-sm">🏆</span>}
                                                            </h3>
                                                            <p className="text-xs text-slate-500 dark:text-muted-foreground">{formatDate(t?.date ?? s.created_at)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${s.status === 'settled' ? (isWon ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300') : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                                                                {s.status === 'settled' ? `${s.total_points} pt` : 'In attesa'}
                                                            </span>
                                                            <Link to={`/schedina/${s.tournament_id}`} className={`rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition dark:text-muted-foreground ${theme.tailwind.borderSoft} hover:border-(--mk-primary) hover:text-(--mk-primary)`}>
                                                                Esito
                                                            </Link>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                                                        {[
                                                            { label: '1°', playerId: s.classifica_ordinata?.[0] },
                                                            { label: '2°', playerId: s.classifica_ordinata?.[1] },
                                                            { label: '3°', playerId: s.classifica_ordinata?.[2] },
                                                            { label: 'Ultimo', playerId: s.classifica_ordinata?.[s.classifica_ordinata?.length - 1] },
                                                            { label: 'Streak', playerId: s.maggiore_streak_vittorie_id, nickname: s.maggiore_streak_nickname },
                                                        ].map(({ label, playerId, nickname }) => {
                                                            const nick = nickname ?? (playerId ? getPlayerNickname(playerId) : null)
                                                            const img = nick ? getPlayerImg(nick) : null
                                                            return (
                                                                <div key={label} className="rounded-xl bg-slate-50 p-2.5 dark:bg-muted">
                                                                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                                                                    <div className="mt-1 flex items-center gap-1.5">
                                                                        {img ? <img src={img} alt={nick} className="h-5 w-5 rounded-full object-cover shrink-0" /> : playerId ? <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[8px] font-black text-slate-500">{(nick ?? '?').charAt(0).toUpperCase()}</div> : null}
                                                                        <p className="text-xs font-bold text-slate-900 dark:text-foreground truncate">{nick ?? '—'}</p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                    {s.duello_scelta_nickname && (
                                                        <p className="mt-2 text-xs text-slate-500 dark:text-muted-foreground">Duello: {s.duello_scelta_nickname}</p>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </>
                                )}
                            </div>
                        )}


                    </>
                )}

            </section>
        </AppLayout>
    )
}

export default Schedina
