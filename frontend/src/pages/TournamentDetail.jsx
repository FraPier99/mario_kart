import { useMemo, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Crown, Trophy, Trash2, Shield, Ban, Zap, AlertCircle, Settings, Users, Flag, Swords, Clock, BarChart3, ListChecks, MapPin } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PortalSelect from '@/components/common/PortalSelect'
import RefreshButton from '@/components/common/RefreshButton'
import LeaderboardTable from '@/components/stats/LeaderboardTable'
import PodiumSteps from '@/components/stats/PodiumSteps'
import { useCommunityUserNav } from '@/hooks/useCommunityUserNav'
import { useCelebration } from '@/context/CelebrationContext'
import RaceList from '@/components/tournaments/RaceList'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import ApiBanner from '@/components/common/ApiBanner'
import ClassicRaceForm from '@/components/tournaments/ClassicRaceForm'
import CircuitPicker from '@/components/tournaments/CircuitPicker'
import CharacterPicker from '@/components/tournaments/CharacterPicker'
import TournamentParticipantsManager from '@/components/tournaments/TournamentParticipantsManager'
import WithdrawalManager from '@/components/tournaments/WithdrawalManager'
import ResultEntryForm from '@/components/tournaments/ResultEntryForm'
import WinnerFinalizeCard from '@/components/tournaments/WinnerFinalizeCard'
import TournamentStatusManager from '@/components/tournaments/TournamentStatusManager'
import GroupManagementSection from '@/components/tournaments/GroupManagementSection'
import ClassicPodiumDuelCard from '@/components/tournaments/ClassicPodiumDuelCard'
import CollapsibleSection from '@/components/tournaments/CollapsibleSection'
import TournamentResolutionNotes from '@/components/tournaments/TournamentResolutionNotes'
import PointAdjustmentsPanel from '@/components/tournaments/PointAdjustmentsPanel'
import GroupPlancia, { GroupCard } from '@/components/tournaments/GroupPlancia'
import PhaseCircuitsCard from '@/components/tournaments/PhaseCircuitsCard'
import SpareggioEsitiList from '@/components/tournaments/SpareggioEsitiList'
import CardLogPanel from '@/components/tournaments/CardLogPanel'
import OverallClassificaCard from '@/components/tournaments/OverallClassificaCard'
import { findPlayerGroup, groupLabel, isPodiumDuelKey } from '@/lib/groupStage'
import { useTournamentCards, MASTER_EFFECTS, SHELL_EFFECTS } from '@/hooks/useTournamentCards'
import { getApiErrorMessage, tournamentsApi, authApi, schedineApi } from '@/services/apiClient'
import { toast } from 'sonner'

const getTournamentStatusLabel = (status) => {
    if (status === 'da_svolgere') return 'Da svolgere'
    if (status === 'concluso') return 'Concluso'
    if (status === 'finito') return 'Finito'
    return 'In corso'
}

const getTournamentStatusBadge = (status) => {
    if (status === 'da_svolgere') return 'bg-slate-500 text-white'
    if (status === 'concluso') return 'bg-slate-900 text-white'
    if (status === 'finito') return 'bg-amber-500 text-white'
    return 'bg-emerald-500 text-white'
}

// Overlay di celebrazione fine torneo — estratto in un componente a parte
// così può essere mostrato sia nella vista admin sia in quella giocatore
// (prima era presente solo nel ramo di rendering admin: un giocatore non
// admin non vedeva MAI l'overlay, nemmeno restando sulla pagina in tempo
// reale alla conclusione del torneo).
const TournamentDetail = () => {
    const { tournamentId } = useParams()
    const navigate = useNavigate()
    const { getTournamentById, getTournamentDisplayNumber, players, games, refresh, loading, errorMessage, circuitsById, circuitsByGameId, charactersById, charactersByGameId, results } = useAppData()
    const { user, isAdmin, isSuperadmin } = useAuth()
    const { triggerCelebration } = useCelebration()

    const tournament = getTournamentById(tournamentId)

    const tournamentCircuits = circuitsByGameId.get(tournament?.game_id ?? 0) ?? []
    const myPlayerId = user?.player_id ?? user?.player?.id ?? null

    // Per i tornei a gironi, tournament.standings è un aggregato cross-fase
    // (gironi+semifinali+finale insieme) e standings[0] NON è il vincitore
    // reale — il vincitore è il 1° della Finale, riordinato secondo gli
    // eventuali spareggi podio (vedi /group-stage/overall-classifica).
    const [groupStageOrder, setGroupStageOrder] = useState([])
    useEffect(() => {
        if (tournament?.tournament_format !== 'group_stage' || !tournament?.id) return undefined
        let active = true
        tournamentsApi.overallClassifica(tournament.id)
            .then((res) => { if (active) setGroupStageOrder(res.data?.order ?? []) })
            .catch(() => { if (active) setGroupStageOrder([]) })
        return () => { active = false }
    }, [tournament?.id, tournament?.tournament_format, tournament?.races])

    const groupStageStandingsOrdered = useMemo(() => {
        if (!groupStageOrder.length) return null
        const byId = new Map((tournament?.standings ?? []).map((s) => [s.playerId, s]))
        return groupStageOrder.map((pid) => byId.get(pid)).filter(Boolean)
    }, [groupStageOrder, tournament?.standings])

    const currentLeader = tournament?.tournament_format === 'group_stage'
        ? (groupStageStandingsOrdered?.[0] ?? null)
        : (tournament?.standings?.[0] ?? null)

    // Classifica di girone/semifinale già risolta rispetto agli eventuali
    // spareggi di qualificazione — vedi stesso fetch in GroupPlancia.jsx.
    // Serve alla vista giocatore per mostrare la classifica del proprio
    // girone aggiornata anche dopo che uno spareggio si è risolto.
    const [resolvedClassifiche, setResolvedClassifiche] = useState({ group: {}, semifinal: {} })
    useEffect(() => {
        if (tournament?.tournament_format !== 'group_stage' || !tournament?.id) return undefined
        let active = true
        tournamentsApi.groupStageClassifiche(tournament.id)
            .then((res) => { if (active) setResolvedClassifiche(res.data ?? { group: {}, semifinal: {} }) })
            .catch(() => { if (active) setResolvedClassifiche({ group: {}, semifinal: {} }) })
        return () => { active = false }
    }, [tournament?.id, tournament?.tournament_format, tournament?.races, tournament?.format_data])

    // Circuiti disponibili/utilizzati per la vista giocatore: in modalità a
    // gironi mostra solo il proprio girone, in modalità classic l'intero torneo.
    const myCircuitsView = useMemo(() => {
        if (!tournament) return null
        if (tournament.tournament_format === 'group_stage') {
            const myGroup = findPlayerGroup(tournament.format_data, myPlayerId)
            if (!myGroup) return null
            return {
                title: `Circuiti · ${groupLabel(myGroup.groupName)}`,
                races: (tournament.races ?? []).filter((r) => r.phase === myGroup.phase && r.group_name === myGroup.groupName),
            }
        }
        return {
            title: 'Circuiti',
            races: (tournament.races ?? []).filter((r) => !r.is_duello),
        }
    }, [tournament, myPlayerId])

    const playerMapById = useMemo(
        () => new Map((players ?? []).map((p) => [p.id, p])),
        [players]
    )

    // Raggruppa le gare duello per group_name (es. duello_podio_1_2)
    const duelloGroups = useMemo(() => {
        const races = tournament?.races ?? []
        const duelloRaces = races.filter((r) => r.is_duello)
        if (!duelloRaces.length) return []
        const groups = new Map()
        duelloRaces.forEach((race) => {
            const key = race.group_name || 'unknown'
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push(race)
        })
        return Array.from(groups.entries()).map(([groupName, groupRaces]) => {
            const sortedRaces = [...groupRaces].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))
            const playerIds = [...new Set(sortedRaces.flatMap((r) => (r.results ?? []).map((res) => res.player_id)))]
            const wins = new Map()
            playerIds.forEach((id) => wins.set(id, 0))
            sortedRaces.forEach((race) => {
                const winnerResult = race.results?.find((r) => r.position === 1)
                if (winnerResult && wins.has(winnerResult.player_id)) {
                    wins.set(winnerResult.player_id, (wins.get(winnerResult.player_id) ?? 0) + 1)
                }
            })
            // I duelli podio (1°/2°, 3°/4°, posizioni più basse) si risolvono al
            // meglio (primo a 3 vittorie); gli spareggi di qualificazione gironi/
            // semifinali (group_name = chiave del girone/batteria, non "duello_podio_*")
            // si risolvono al primo a 2 vittorie — usare sempre 3 qui marcava questi
            // ultimi come "in attesa" anche quando erano già stati risolti.
            const winThreshold = isPodiumDuelKey(groupName) ? 3 : 2
            let winnerId = null
            for (const [id, count] of wins) {
                if (count >= winThreshold) { winnerId = id; break }
            }
            const label = groupLabel(groupName)
            return { groupName, label, races: sortedRaces, playerIds, wins, winnerId, resolved: winnerId != null }
        }).sort((a, b) => {
            const order = ['duello_podio_1_2', 'duello_podio_3_4']
            const ai = order.indexOf(a.groupName)
            const bi = order.indexOf(b.groupName)
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
    }, [tournament?.races])


    const tournamentParticipants = useMemo(() => {
        if (!tournament?.participant_ids?.length) return []
        return players.filter((p) => tournament.participant_ids.includes(p.id))
    }, [tournament, players])

    // Esclude i giocatori "Ritirati" dal pool selezionabile per le gare successive:
    // i loro risultati già registrati restano comunque validi in classifica.
    const activeTournamentParticipants = useMemo(() => {
        const withdrawnIds = new Set(tournament?.withdrawn_player_ids ?? [])
        return tournamentParticipants.filter((p) => !withdrawnIds.has(p.id))
    }, [tournamentParticipants, tournament?.withdrawn_player_ids])
    const tournamentStatus = tournament?.status ?? (tournament?.winner_id ? 'concluso' : 'in_corso')
    const isTournamentLocked = tournamentStatus !== 'in_corso'

    // Gestione > Risultati (classic) non mostra più l'elenco completo
    // gare/circuiti — quello vive solo nel tab "Gare" — ma un riepilogo
    // sintetico con conteggio gare senza tutti i risultati inseriti.
    const incompleteRacesCount = useMemo(() => {
        return (tournament?.races ?? []).filter((r) => !r.is_duello && (r.results?.length ?? 0) < activeTournamentParticipants.length).length
    }, [tournament?.races, activeTournamentParticipants])

    // Il podio (classic, tab Classifica) mostra già i dati dei primi 3 con
    // le stesse metriche della tabella, stile arcade — la tabella sotto
    // parte dal 4° posto per non ripeterli. Visibile solo a torneo concluso.
    const showClassicPodium = tournamentStatus === 'concluso' && (tournament?.standings?.length ?? 0) >= 3
    const classicPodiumPlayers = useMemo(() => {
        if (!showClassicPodium) return []
        return (tournament?.standings ?? []).slice(0, 3).map((s) => ({
            ...s,
            stats: [
                { label: 'Punti', value: s.points },
                { label: 'Vittorie', value: s.raceWins },
                { label: 'Podi', value: s.podiums },
            ],
            characters: (s.usedCharacterIds ?? [])
                .map((id) => charactersById.get(id))
                .filter(Boolean),
        }))
    }, [showClassicPodium, tournament?.standings, charactersById])
    const classicTableRows = showClassicPodium ? (tournament?.standings ?? []).slice(3) : (tournament?.standings ?? [])

    // Un Admin che è anche partecipante al torneo vede di default la vista
    // giocatore (schedina/classifica/proprio girone) e può passare alla vista
    // gestionale con il toggle "Modalità Admin". Il SuperAdmin non partecipa
    // mai e vede sempre e solo la vista gestionale, senza toggle.
    const isParticipantAdmin = isAdmin && !isSuperadmin && myPlayerId != null && (tournament?.participant_ids ?? []).includes(myPlayerId)

    // adminModeOn può essere attivato da navigation state (es. da Schedina)
    const location = useLocation()
    const [adminModeOn, setAdminModeOn] = useState(location.state?.adminMode === true)

    const [confirmDeleteTournament, setConfirmDeleteTournament] = useState(false)
    const [deleting, setDeleting] = useState(false)
    // 'leaderboard' è l'unica chiave presente in entrambi i formati e sempre
    // renderizzabile: come atterraggio evita sia di dipendere dal formato
    // (non ancora noto se il torneo non è in cache al mount) sia di aprire
    // l'admin direttamente su un form di inserimento dati.
    const [activeSection, setActiveSection] = useState('leaderboard')
    const [participantsStatus, setParticipantsStatus] = useState([])
    const [userHasPredicted, setUserHasPredicted] = useState(null)
    // Nessun tab "riepilogo" condiviso da entrambi i formati come default:
    // sceglie subito quello giusto se il torneo è già in cache, e si
    // autocorregge quando i dati arrivano dopo il mount (vedi effect sotto).
    const [userTab, setUserTab] = useState(() => (tournament?.tournament_format === 'group_stage' ? 'generale' : 'classifica'))
    const [expandedDuelGroups, setExpandedDuelGroups] = useState(new Set())
    const [superadminPlayerIds, setSuperadminPlayerIds] = useState([])
    const { goToPlayerProfile } = useCommunityUserNav()

    // Corregge il tab di default se il torneo non era ancora in cache al
    // mount (lo useState qui sopra sceglie 'classifica' come fallback prima
    // di sapere il formato): appena arriva il formato reale, se il tab
    // attivo è ancora quel fallback e non combacia col formato, lo aggiusta.
    useEffect(() => {
        if (!tournament) return
        const isGroup = tournament.tournament_format === 'group_stage'
        if (isGroup && userTab === 'classifica') setUserTab('generale')
        if (!isGroup && userTab === 'generale') setUserTab('classifica')
    }, [tournament, userTab])

    const {
        inventory, localCardLog, showCardModal, setShowCardModal, selectedCard,
        cardEffectOption, setCardEffectOption,
        cardTargetId, setCardTargetId, cardEffectOwner, setCardEffectOwner,
        cardRaceId, setCardRaceId,
        cardImposedCircuitId, setCardImposedCircuitId,
        cardImposedCharacterId, setCardImposedCharacterId,
        selectedEffectDef,
        usingCard, availableCards, cardHolders, cardHistory,
        cardTypeHolders, pendingEffects, refreshPendingEffects, openCardModal, handleUseCard,
    } = useTournamentCards({ tournamentId, tournamentStatus, tournamentParticipants, tournament, user, refresh })

    // Carica superadmin player IDs per escluderli dalla lista partecipanti.
    // listUsers() (/auth/users) è riservato al superadmin: per un admin
    // normale falliva silenziosamente (403 ingoiato dal .catch). listCommunityUsers()
    // (/auth/community/users) è pubblico e basta comunque, perché i
    // superadmin non hanno mai un player_id (vengono esclusi da quell'endpoint
    // per costruzione, quindi il filtro qui sotto resta corretto).
    useEffect(() => {
        if (!isAdmin && !isSuperadmin) return
        authApi.listCommunityUsers().then((res) => {
            const superadminIds = (res.data ?? [])
                .filter((u) => u.role === 'superadmin' && u.player_id != null)
                .map((u) => u.player_id)
            setSuperadminPlayerIds(superadminIds)
        }).catch(() => {})
    }, [isAdmin, isSuperadmin])

    useEffect(() => {
        if (!isAdmin || !tournamentId || activeSection !== 'schedina') return
        schedineApi.participantsStatus(tournamentId)
            .then((res) => setParticipantsStatus(res.data ?? []))
            .catch(() => setParticipantsStatus([]))
    }, [isAdmin, tournamentId, activeSection])

    useEffect(() => {
        if (!tournamentId) return
        schedineApi.tournamentDetail(tournamentId)
            .then((res) => setUserHasPredicted(res.data?.user_has_predicted ?? false))
            .catch(() => setUserHasPredicted(false))
    }, [tournamentId])

    // Torneo live (gironi/semifinali/finale possono avanzare di fase senza che
    // chi sta guardando la pagina lo sappia, es. l'admin compone la Finale da
    // un altro browser): senza un refresh periodico, format_data/races
    // restano fermi allo stato caricato all'apertura della pagina finché non
    // si ricarica manualmente. Aggiorna in background ogni 20s e quando la
    // tab torna in foreground, solo mentre il torneo è effettivamente in corso.
    useEffect(() => {
        if (tournamentStatus !== 'in_corso' && tournamentStatus !== 'concluso') return undefined
        const interval = setInterval(() => { refresh() }, 20000)
        const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [tournamentStatus, refresh])

    const handlePlayerClick = (row) => {
        goToPlayerProfile(row.playerId)
    }



    const handleFinalized = useCallback(async () => {
        const standingsSnap = groupStageStandingsOrdered ?? tournament?.standings ?? []
        await refresh()
        const leader = standingsSnap[0] ?? currentLeader
        if (leader) {
            triggerCelebration(leader, standingsSnap, tournament)
        }
    }, [refresh, currentLeader, triggerCelebration, tournament, groupStageStandingsOrdered])

    const handleReplayCelebration = useCallback(() => {
        const standingsSnap = groupStageStandingsOrdered ?? tournament?.standings ?? []
        // standingsSnap[0] ha già i campi camelCase lastCharacterId/
        // favoriteCharacterId che l'overlay si aspetta — tournament.winner è
        // l'oggetto Player grezzo (favorite_character_id snake_case) e va
        // usato solo come ultima risorsa, altrimenti la replica perde
        // personaggio e verso.
        const winner = standingsSnap[0] ?? tournament?.winner ?? currentLeader
        if (winner) {
            triggerCelebration(winner, standingsSnap, tournament)
        }
    }, [currentLeader, tournament, triggerCelebration, groupStageStandingsOrdered])



    const handleDeleteTournament = async () => {
        setConfirmDeleteTournament(false)
        setDeleting(true)
        try {
            await tournamentsApi.remove(tournament.id)
            toast.success('Torneo eliminato')
            await refresh()
            navigate('/history')
        } catch (error) {
            const message = getApiErrorMessage(error, 'Eliminazione torneo fallita')
            toast.error('Impossibile eliminare il torneo', { description: message })
        } finally {
            setDeleting(false)
        }
    }

    if (loading && !tournament) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-7xl px-4 py-12 text-center text-slate-500 dark:text-muted-foreground">Caricamento torneo...</div>
            </AppLayout>
        )
    }

    if (!tournament) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-7xl px-4 py-12 text-center">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-foreground">Torneo non trovato</h1>
                    <button
                        type="button"
                        onClick={() => navigate('/history')}
                        className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white"
                    >
                        Torna allo storico
                    </button>
                </div>
            </AppLayout>
        )
    }

    // ── READ-ONLY VIEW (regular users) ──────────────────────────────────────
    if ((!isAdmin && !isSuperadmin) || (isParticipantAdmin && !adminModeOn)) {
        const raceProgress = tournament.n_races > 0
            ? Math.round(((tournament.raceCount ?? 0) / tournament.n_races) * 100)
            : 0

        const hasCardHistory = cardHistory.length > 0 || localCardLog.length > 0

        const myGroup = findPlayerGroup(tournament.format_data, myPlayerId)
        const isTournamentFinished = Boolean(tournament.winner_id)
        const filteredCardHistory = isTournamentFinished || !myGroup
            ? cardHistory
            : cardHistory.filter((e) => e.group_name === myGroup.groupName)
        const filteredCardLog = isTournamentFinished || !myGroup
            ? localCardLog
            : localCardLog.filter((e) => e.group_name === myGroup.groupName)

        const isGroupStageView = tournament.tournament_format === 'group_stage'
        // Nei tornei a gironi le vecchie tab "Classifica"/"Gare" (tutto
        // mischiato) sono sostituite da una tab dedicata alla fase in cui si
        // trova il giocatore (Girone/Semifinale, poi Finale/Consolazione) e
        // da una classifica generale combinata — niente più da scorrere
        // tutto insieme per trovare la propria posizione.
        const myPhaseTabKey = myGroup?.phase === 'finals' ? 'finale' : 'fase'
        const USER_TABS = isGroupStageView
            ? [
                ...(myGroup ? [{ key: myPhaseTabKey, label: groupLabel(myGroup.groupName), icon: myGroup.phase === 'finals' ? Trophy : Users }] : []),
                { key: 'generale', label: 'Classifica Generale', icon: BarChart3 },
                ...(hasCardHistory ? [{ key: 'carte', label: 'Carte', icon: Zap }] : []),
            ]
            : [
                { key: 'classifica', label: 'Classifica', icon: BarChart3 },
                { key: 'gare', label: 'Gare', icon: ListChecks },
                { key: 'circuiti', label: 'Circuiti', icon: MapPin },
                ...(hasCardHistory ? [{ key: 'carte', label: 'Carte', icon: Zap }] : []),
            ]

        return (
            <AppLayout>
                <section className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-fade-in">
                    {/* Back navigation — standalone, outside the card */}
                    <button type="button" onClick={() => navigate('/history')}
                        className="font-title inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-400 dark:text-muted-foreground transition hover:text-slate-600 dark:hover:text-foreground">
                        <span className="text-sm">←</span> Storico tornei
                    </button>

                    {/* Header card */}
                    <div className="rounded-2xl border-2 border-slate-900/20 dark:border-white/15 bg-white dark:bg-card p-6" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <p className="font-title text-[10px] tracking-wide text-emerald-600 dark:text-emerald-400">Torneo #{getTournamentDisplayNumber(tournament.id)}</p>
                                <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">{tournament.name}</h1>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-muted-foreground">
                                    <span>{tournament.date}</span>
                                    <span>·</span>
                                    <span>{tournament.raceCount}/{tournament.n_races} gare</span>
                                    {tournament.winner && (
                                        <><span>·</span><span className="font-black text-amber-600 dark:text-amber-400">🏆 {tournament.winner.nickname}</span></>
                                    )}
                                </div>
                                {/* Progress bar gare */}
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="h-2 w-32 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-emerald-400 dark:bg-emerald-500 transition-all duration-500"
                                            style={{ width: `${Math.min(raceProgress, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400">{raceProgress}%</span>
                                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${getTournamentStatusBadge(tournamentStatus)}`}>
                                        {getTournamentStatusLabel(tournamentStatus)}
                                    </span>
                                </div>
                            </div>

                            {/* Action buttons — grouped by hierarchy */}
                            <div className="flex flex-col items-end gap-2">
                                {/* Primary CTAs */}
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => navigate(`/schedina/${tournamentId}`, { state: { fromAdmin: adminModeOn } })}
                                        className="font-title rounded-xl border-2 border-emerald-800/30 bg-emerald-600 px-4 py-2.5 text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500"
                                        style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                        Schedina
                                    </button>
                                    <button type="button" onClick={() => navigate(`/tournaments/${tournamentId}/stats`)}
                                        className="font-title rounded-xl border-2 border-slate-300 dark:border-border bg-slate-50 dark:bg-muted px-4 py-2.5 text-[10px] tracking-wide text-slate-700 dark:text-foreground transition active:translate-y-px hover:border-slate-400 dark:hover:border-slate-500">
                                        Stats
                                    </button>
                                </div>
                                {/* Informational badges + admin toggle */}
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {userHasPredicted !== null && (
                                        <span className={`font-title flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[9px] tracking-wide ${userHasPredicted ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'}`}>
                                            {userHasPredicted ? '✓ Schedina compilata' : '○ Schedina da compilare'}
                                        </span>
                                    )}
                                    {isParticipantAdmin && (
                                        <button type="button" onClick={() => setAdminModeOn(true)}
                                            className="font-title flex items-center gap-1.5 rounded-lg border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/10 px-3 py-1 text-[9px] tracking-wide text-violet-600 dark:text-violet-300 transition active:translate-y-px hover:bg-violet-100">
                                            <Settings size={11} /> Admin
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {tournamentParticipants.length > 0 && (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="font-title text-[9px] tracking-wide text-slate-400">Partecipanti</span>
                                <div className="flex -space-x-2">
                                    {tournamentParticipants.slice(0, 8).map((p) => (
                                        <div key={p.id} title={p.nickname} className="h-7 w-7 overflow-hidden rounded-full border-2 border-white dark:border-card bg-slate-100 dark:bg-slate-800 shadow-sm">
                                            {p.img_url ? <img src={p.img_url} alt={p.nickname} className="h-full w-full object-cover" />
                                                : <div className="flex h-full w-full items-center justify-center text-[9px] font-black text-slate-500">{(p.nickname ?? '?').charAt(0).toUpperCase()}</div>}
                                        </div>
                                    ))}
                                </div>
                                {tournamentParticipants.length > 8 && <span className="text-xs text-slate-400">+{tournamentParticipants.length - 8}</span>}
                            </div>
                        )}
                    </div>

                    {/* Tabs — overflow-x-auto invece di flex-1: con 4 tab (Riepilogo/
                    Classifica/Gare/Carte) su schermi piccoli flex-1 le comprimeva
                    finché l'ultima non veniva tagliata dal contenitore, qui invece
                    restano alla larghezza naturale e la riga scorre orizzontalmente. */}
                    <div className="flex gap-1 overflow-x-auto rounded-xl border-2 border-slate-200 dark:border-border bg-slate-100 dark:bg-muted p-1">
                        {USER_TABS.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setUserTab(key)}
                                className={`font-title flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[10px] tracking-wide transition-all justify-center ${
                                    userTab === key
                                        ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-sm'
                                        : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground'
                                }`}
                            >
                                <Icon size={14} />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* ── TAB: Classifica ── */}
                    {userTab === 'classifica' && (
                        <div className="space-y-6">
                            {tournamentStatus === 'in_corso' && (
                                <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-5 flex items-center gap-3 shadow-sm">
                                    <Clock size={20} className="shrink-0 text-amber-500 dark:text-amber-400" />
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Torneo in corso</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400">La classifica è provvisoria fino al termine del torneo.</p>
                                    </div>
                                </div>
                            )}

                            {(tournament.standings?.length ?? 0) > 0 && (
                                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm">
                                    <div className="px-5 py-4 border-b border-slate-100 dark:border-border flex items-center justify-between">
                                        <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Classifica</p>
                                        <RefreshButton onClick={refresh} loading={loading} />
                                    </div>
                                    {showClassicPodium && (
                                        <div className="p-5 pb-0">
                                            <PodiumSteps players={classicPodiumPlayers} onPlayerClick={(p) => goToPlayerProfile(p.playerId)} />
                                        </div>
                                    )}
                                    <LeaderboardTable
                                        rows={classicTableRows}
                                        startIndex={showClassicPodium ? 3 : 0}
                                        showTournamentWins={false}
                                        charactersById={charactersById}
                                        highlightPlayerId={user?.player?.id ?? null}
                                        isSuperadmin={false}
                                        onPlayerClick={handlePlayerClick}
                                    />
                                </div>
                            )}

                            <PointAdjustmentsPanel tournament={tournament} participants={activeTournamentParticipants} isSuperadmin={isSuperadmin} onChanged={refresh} />

                            <TournamentResolutionNotes tournament={tournament} />

                            <SpareggioEsitiList
                                duelloGroups={duelloGroups}
                                playerMapById={playerMapById}
                                circuitsById={circuitsById}
                                charactersById={charactersById}
                                expandedDuelGroups={expandedDuelGroups}
                                setExpandedDuelGroups={setExpandedDuelGroups}
                            />
                        </div>
                    )}

                    {/* ── TAB: Fase corrente (Girone/Semifinale) — solo gironi ── */}
                    {userTab === 'fase' && myGroup && myGroup.phase !== 'finals' && (
                        <div className="space-y-6">
                            <GroupCard
                                groupKey={myGroup.groupName}
                                races={(tournament.races ?? []).filter((r) => r.phase === myGroup.phase && r.group_name === myGroup.groupName && !r.is_duello)}
                                results={results}
                                playerMap={playerMapById}
                                seedPlayerIds={(myGroup.phase === 'group' ? tournament.format_data?.groups?.[myGroup.groupName] : tournament.format_data?.semifinals?.[myGroup.groupName]) ?? []}
                                highlightPlayerId={myPlayerId}
                                resolvedOrder={(myGroup.phase === 'group' ? resolvedClassifiche.group?.[myGroup.groupName] : resolvedClassifiche.semifinal?.[myGroup.groupName])}
                                onRefresh={refresh}
                                refreshing={loading}
                            />
                            <TournamentResolutionNotes tournament={tournament} phaseFilter={myGroup.phase} />
                            {myCircuitsView && (
                                <PhaseCircuitsCard circuits={tournamentCircuits} races={myCircuitsView.races} title={myCircuitsView.title} onRefresh={refresh} refreshing={loading} />
                            )}
                        </div>
                    )}

                    {/* ── TAB: Finale/Consolazione — solo gironi, una volta composta la Finale ── */}
                    {userTab === 'finale' && myGroup && myGroup.phase === 'finals' && (() => {
                        const bracketRaces = (tournament.races ?? []).filter((r) => r.phase === 'finals' && r.group_name === myGroup.groupName && !r.is_duello)
                        const bracketDuelloGroups = duelloGroups.filter((g) => (
                            myGroup.groupName === 'top'
                                ? g.groupName.startsWith('finals_duello_podio_')
                                : g.groupName.startsWith('finals_duello_consolazione_')
                        ))
                        return (
                            <div className="space-y-6">
                                {bracketRaces.length > 0 ? (
                                    <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm">
                                        <div className="px-5 py-4 border-b border-slate-100 dark:border-border">
                                            <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Gare e risultati</p>
                                        </div>
                                        <div className="p-4">
                                            <RaceList races={bracketRaces} circuitsById={circuitsById} charactersById={charactersById} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center shadow-sm">
                                        <p className="text-sm text-slate-500 dark:text-muted-foreground">Nessuna gara ancora disputata.</p>
                                    </div>
                                )}
                                <GroupCard
                                    groupKey={myGroup.groupName}
                                    races={bracketRaces}
                                    results={results}
                                    playerMap={playerMapById}
                                    seedPlayerIds={tournament.format_data?.finals?.[myGroup.groupName] ?? []}
                                    highlightPlayerId={myPlayerId}
                                    onRefresh={refresh}
                                    refreshing={loading}
                                />
                                {myCircuitsView && (
                                    <PhaseCircuitsCard circuits={tournamentCircuits} races={myCircuitsView.races} title={myCircuitsView.title} onRefresh={refresh} refreshing={loading} />
                                )}
                                <SpareggioEsitiList
                                    duelloGroups={bracketDuelloGroups}
                                    playerMapById={playerMapById}
                                    circuitsById={circuitsById}
                                    charactersById={charactersById}
                                    expandedDuelGroups={expandedDuelGroups}
                                    setExpandedDuelGroups={setExpandedDuelGroups}
                                />
                            </div>
                        )
                    })()}

                    {/* ── TAB: Classifica Generale — solo gironi, combina Finale + Consolazione ── */}
                    {userTab === 'generale' && (
                        <div className="space-y-6">
                            <OverallClassificaCard tournament={tournament} playerMap={playerMapById} highlightPlayerId={myPlayerId} />
                        </div>
                    )}

                    {/* ── TAB: Gare ── */}
                    {userTab === 'gare' && (
                        <div className="space-y-6">
                            {(tournament.races?.length ?? 0) === 0 && (
                                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center shadow-sm">
                                    <p className="text-sm text-slate-500 dark:text-muted-foreground">Nessuna gara ancora disputata.</p>
                                </div>
                            )}

                            {(tournament.races?.length ?? 0) > 0 && (
                                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm">
                                    <div className="px-5 py-4 border-b border-slate-100 dark:border-border">
                                        <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Gare e risultati</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{tournament.raceCount}/{tournament.n_races} gare giocate</p>
                                    </div>
                                    <div className="p-4">
                                        <RaceList races={tournament.races} circuitsById={circuitsById} charactersById={charactersById} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: Circuiti — solo classic: nei gironi sono già nella tab della fase ── */}
                    {userTab === 'circuiti' && (
                        <div className="space-y-6">
                            {myCircuitsView && (
                                <PhaseCircuitsCard circuits={tournamentCircuits} races={myCircuitsView.races} title={myCircuitsView.title} onRefresh={refresh} refreshing={loading} />
                            )}
                        </div>
                    )}

                    {/* ── TAB: Carte ── */}
                    {userTab === 'carte' && (
                        <div className="space-y-6">
                            {!isTournamentFinished && myGroup && (
                                <div className="rounded-3xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/5 p-5 flex items-center gap-3 shadow-sm">
                                    <Zap size={20} className="shrink-0 text-sky-500 dark:text-sky-400" />
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">Carte nella tua fase</p>
                                        <p className="text-xs text-sky-600 dark:text-sky-400">
                                            Mostrate solo le carte usate in {groupLabel(myGroup.groupName)}. A torneo concluso vedrai lo storico completo.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <CardLogPanel
                                variant="log"
                                entries={filteredCardLog}
                                eyebrow="Registro ufficiale"
                                title="Carte usate in questo torneo"
                                emptyMessage={isTournamentFinished ? 'Nessuna carta registrata in questo torneo.' : 'Nessuna carta usata nella tua fase finora.'}
                            />

                            <CardLogPanel
                                variant="history"
                                entries={filteredCardHistory}
                                eyebrow="Registro di sistema"
                                title="Storico carte"
                                emptyMessage={isTournamentFinished ? 'Nessun utilizzo di carte in questo torneo.' : 'Nessuna carta usata nella tua fase finora.'}
                            />
                        </div>
                    )}
                </section>
            </AppLayout>
        )
    }

    return (
        <>
        {confirmDeleteTournament && (() => {
            const hasRaces = (tournament?.raceCount ?? 0) > 0
            const hasWinner = Boolean(tournament?.winner_id)
            return (
                <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setConfirmDeleteTournament(false)}>
                    <div className="w-full max-w-sm rounded-2xl border-2 border-white/20 bg-slate-900 p-6 animate-scale-in"
                        style={{ boxShadow: 'var(--circuit-shadow-lg)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-rose-500/30 bg-rose-500/20">
                                <Trash2 size={18} className="text-rose-400" />
                            </div>
                            <div>
                                <p className="font-title text-[9px] tracking-wide text-rose-400">Azione irreversibile</p>
                                <h4 className="text-lg font-black text-white">Eliminare il torneo?</h4>
                            </div>
                        </div>

                        <div className="space-y-2 mb-5">
                            <div className="flex items-start gap-2 rounded-xl border-2 border-rose-500/25 bg-rose-500/8 p-3">
                                <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                                <p className="text-[11px] text-slate-300">Verranno eliminate a cascata tutte le gare, i risultati e le schedine associate. Non è possibile annullare.</p>
                            </div>
                            {hasRaces && (
                                <div className="flex items-center gap-2 rounded-xl border-2 border-amber-500/20 bg-amber-500/8 px-3 py-2">
                                    <span className="text-amber-400">🏁</span>
                                    <p className="text-[11px] text-amber-300">{tournament.raceCount} gare con risultati verranno perse.</p>
                                </div>
                            )}
                            {hasWinner && (
                                <div className="flex items-center gap-2 rounded-xl border-2 border-amber-500/20 bg-amber-500/8 px-3 py-2">
                                    <span className="text-amber-400">🏆</span>
                                    <p className="text-[11px] text-amber-300">Il torneo ha un vincitore ufficiale — verrà rimosso dallo storico.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteTournament(false)}
                                className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition active:translate-y-px hover:bg-white/10">
                                Annulla
                            </button>
                            <button onClick={handleDeleteTournament} disabled={deleting}
                                className="font-title flex-1 rounded-xl border-2 border-rose-900/30 bg-rose-600 px-4 py-2.5 text-[11px] tracking-wide text-white transition active:translate-y-px hover:bg-rose-500 disabled:opacity-60"
                                style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                {deleting ? 'Eliminazione...' : 'Elimina definitivamente'}
                            </button>
                        </div>
                    </div>
                </div>
            )
        })()}

        {/* ══ MODAL REGISTRA USO CARTA — adaptive light/dark ══ */}
        {showCardModal && selectedCard && (
            <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => { setShowCardModal(false); setCardEffectOwner('') }}>
                <div className="w-full max-w-md rounded-2xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 p-6 animate-scale-in"
                    style={{ boxShadow: 'var(--circuit-shadow-lg)' }}
                    onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-circuit-ink bg-gradient-to-br text-white ${selectedCard.card_type === 'master' ? 'from-amber-400 to-orange-500' : 'from-cyan-400 to-blue-600'}`} style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                            {selectedCard.card_type === 'master' ? <Shield size={22} /> : <Ban size={22} />}
                        </div>
                        <div>
                            <p className={`font-title text-[9px] tracking-wide ${selectedCard.card_type === 'master' ? 'text-amber-500 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                                Registra uso carta
                            </p>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">{selectedCard.card_name}</h4>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Portatore della carta */}
                        <label className="block space-y-1.5">
                            <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-slate-400">Chi usa la carta</span>
                            <PortalSelect
                                value={cardEffectOwner}
                                onChange={setCardEffectOwner}
                                placeholder="Seleziona portatore…"
                                options={
                                    cardTypeHolders.length === 0
                                        ? [{ value: '', label: 'Nessun giocatore ha questa carta', disabled: true }]
                                        : cardTypeHolders.map((h) => ({
                                            value: h.player_id,
                                            label: `${h.player_nickname}${selectedCard?.card_type === 'master' ? ` (★ ×${h.master_count})` : ` (⚡ ×${h.blue_shell_count})`}`,
                                          }))
                                }
                            />
                        </label>

                        {/* Effetto */}
                        <label className="block space-y-1.5">
                            <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-slate-400">Effetto applicato</span>
                            <PortalSelect
                                value={cardEffectOption}
                                onChange={setCardEffectOption}
                                placeholder="Seleziona effetto…"
                                options={(selectedCard.card_type === 'master' ? MASTER_EFFECTS : SHELL_EFFECTS).map((e) => ({
                                    value: e.value,
                                    label: e.label,
                                }))}
                            />
                        </label>

                        {/* Bersaglio — solo per gli effetti che colpiscono un avversario */}
                        {selectedEffectDef?.needsTarget && (
                            <label className="block space-y-1.5">
                                <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-slate-400">Giocatore bersaglio</span>
                                <PortalSelect
                                    value={cardTargetId}
                                    onChange={setCardTargetId}
                                    placeholder="Seleziona bersaglio…"
                                    options={tournamentParticipants
                                        .filter((p) => String(p.id) !== String(cardEffectOwner))
                                        .map((p) => ({ value: p.id, label: p.nickname }))}
                                />
                            </label>
                        )}

                        {/* Pista imposta — solo ban_pista */}
                        {selectedEffectDef?.needsCircuit && (
                            <label className="block space-y-1.5">
                                <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-slate-400">Pista imposta al bersaglio</span>
                                <CircuitPicker
                                    circuits={tournamentCircuits}
                                    value={cardImposedCircuitId}
                                    onChange={setCardImposedCircuitId}
                                    label="Pista imposta"
                                    placeholder="Seleziona una pista"
                                />
                            </label>
                        )}

                        {/* Personaggio imposto — solo imponi_personaggio */}
                        {selectedEffectDef?.needsCharacter && (
                            <label className="block space-y-1.5">
                                <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-slate-400">Personaggio imposto al bersaglio</span>
                                <CharacterPicker
                                    characters={charactersByGameId.get(tournament?.game_id ?? 0) ?? []}
                                    value={cardImposedCharacterId}
                                    onChange={setCardImposedCharacterId}
                                />
                            </label>
                        )}
                        {(selectedEffectDef?.needsCircuit || selectedEffectDef?.needsCharacter) && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                Nessuna gara da scegliere ora: questo effetto verrà proposto in automatico alla prossima gara creata che coinvolge il bersaglio.
                            </p>
                        )}

                        {/* Gara — solo per gli effetti retroattivi su una gara già esistente (Guscio Blu) */}
                        {selectedEffectDef?.needsRace && (
                            <label className="block space-y-1.5">
                                <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-slate-400">Gara</span>
                                <PortalSelect
                                    value={cardRaceId}
                                    onChange={setCardRaceId}
                                    placeholder="Seleziona la gara…"
                                    options={(tournament.races ?? [])
                                        .slice()
                                        .sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))
                                        .map((r) => ({
                                            value: r.id,
                                            label: `Gara ${r.race_order ?? r.id}${r.group_name ? ` · ${groupLabel(r.group_name)}` : ''}${r.name ? ` — ${r.name}` : ''}`,
                                        }))}
                                />
                            </label>
                        )}
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button type="button" onClick={() => { setShowCardModal(false); setCardEffectOwner('') }}
                            className="flex-1 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-white/10">
                            Annulla
                        </button>
                        <button type="button" onClick={handleUseCard}
                            disabled={
                                usingCard || !cardEffectOption || !cardEffectOwner ||
                                (selectedEffectDef?.needsTarget && !cardTargetId) ||
                                (selectedEffectDef?.needsCircuit && !cardImposedCircuitId) ||
                                (selectedEffectDef?.needsCharacter && !cardImposedCharacterId) ||
                                (selectedEffectDef?.needsRace && !cardRaceId)
                            }
                            className={`font-title flex-1 rounded-xl border-2 border-black/20 px-4 py-2.5 text-[11px] tracking-wide text-white transition bg-gradient-to-r active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed ${selectedCard.card_type === 'master' ? 'from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400' : 'from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400'}`}
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                            {usingCard ? 'Registrazione…' : 'Registra uso'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <AppLayout>
            {isParticipantAdmin && (
                <div
                    role="alert"
                    className="sticky top-14 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b-2 border-amber-600/40 bg-amber-500 px-4 py-2 text-center shadow-md"
                >
                    <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-amber-950">
                        <AlertCircle size={14} className="shrink-0" />
                        Modalità Admin attiva — le modifiche incidono sui dati del torneo
                    </span>
                    <button
                        type="button"
                        onClick={() => setAdminModeOn(false)}
                        className="font-title shrink-0 rounded-lg border-2 border-amber-950/20 bg-amber-950 px-3 py-1 text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-amber-900"
                    >
                        <Settings size={11} className="inline -mt-0.5 me-1" />
                        Esci
                    </button>
                </div>
            )}
            <section className="mx-auto max-w-7xl px-4 py-12 space-y-6">
                <ApiBanner title="Errore caricamento torneo" message={errorMessage} />

                {/* Back navigation — standalone */}
                <button type="button" onClick={() => navigate('/history')}
                    className="font-title inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-400 dark:text-muted-foreground transition hover:text-slate-600 dark:hover:text-foreground">
                    <span className="text-sm">←</span> Storico tornei
                </button>

                <div className="rounded-2xl border-2 border-slate-900/20 dark:border-emerald-500/30 bg-white dark:bg-card p-8" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                    <div className="flex items-start gap-3 mb-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-emerald-800/30 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                            <Trophy size={16} />
                        </div>
                        <p className="font-title text-[10px] tracking-wide text-emerald-600 dark:text-emerald-400 mt-1.5">
                            {tournamentStatus === 'concluso' ? 'Torneo concluso' : 'Gestione torneo'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4">
                        <div className="min-w-0 sm:flex-1">
                            <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{tournament.name}</h1>
                            <div className="mt-4 flex flex-wrap gap-2 text-sm">
                                <span className="whitespace-nowrap rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-white/10">Data: {tournament.date}</span>
                                <span className="whitespace-nowrap rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-white/10">Gioco: {games.find((game) => game.id === tournament.game_id)?.name ?? `#${tournament.game_id}`}</span>
                                <span className="whitespace-nowrap rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-white/10">Gare: {tournament.raceCount}/{tournament.n_races}</span>
                                <span className={`font-title whitespace-nowrap rounded-full px-3 py-1 text-[10px] tracking-wide border-2 ${getTournamentStatusBadge(tournamentStatus)}`}>
                                    Stato: {getTournamentStatusLabel(tournamentStatus)}
                                </span>
                                <span className="whitespace-nowrap rounded-full bg-amber-50 dark:bg-amber-400/20 px-3 py-1 font-black text-amber-700 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-500/20">
                                    <Crown size={14} className="-mt-0.5 me-1 inline" />
                                    Vincitore: {tournament.winner?.nickname ?? '—'}
                                </span>
                            </div>
                            {/* Partecipanti con avatar */}
                            {tournamentParticipants.length > 0 && (
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span className="font-title text-[9px] tracking-wide text-slate-400 mr-1">Partecipanti</span>
                                    <div className="flex -space-x-2">
                                        {tournamentParticipants.slice(0, 8).map((p) => {
                                            const isWithdrawn = (tournament.withdrawn_player_ids ?? []).includes(p.id)
                                            return (
                                                <div key={p.id} className={`relative h-8 w-8 overflow-hidden rounded-full border-2 bg-slate-100 dark:bg-slate-800 shadow-md ${isWithdrawn ? 'border-rose-400 grayscale opacity-60' : 'border-slate-200 dark:border-slate-700'}`} title={isWithdrawn ? `${p.nickname} · Ritirato` : p.nickname}>
                                                    {p.img_url ? (
                                                        <img src={p.img_url} alt={p.nickname} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-400">
                                                            {(p.nickname ?? '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    {isWithdrawn && (
                                                        <span className="absolute inset-x-0 bottom-0 bg-rose-500 text-white text-[6px] font-black uppercase text-center leading-tight">Ritirato</span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <span className="font-title rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[9px] tracking-wide text-emerald-300 border-2 border-emerald-500/30">
                                        {tournamentParticipants.length}
                                    </span>
                                    {tournamentParticipants.length > 8 && (
                                        <span className="text-[10px] text-slate-400">+{tournamentParticipants.length - 8}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2">
                            <button
                                onClick={() => setConfirmDeleteTournament(true)}
                                disabled={deleting}
                                className="font-title rounded-lg px-3 py-1.5 text-[9px] tracking-wide text-rose-400/80 dark:text-rose-400/60 transition hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40"
                            >
                                <Trash2 size={11} className="inline -mt-0.5 me-1" />
                                Elimina torneo
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white/90 dark:bg-card/90 backdrop-blur-sm p-6 md:p-8">

                <div className="rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-3" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <span className="font-title select-none px-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-muted-foreground/70 cursor-default">Gestione torneo</span>
                        <div className="inline-flex flex-wrap rounded-xl bg-slate-100 dark:bg-muted p-1 overflow-x-auto max-w-full gap-0.5">
                            {[
                                // Le più usate in cima: inserire risultati, consultare la
                                // classifica e le carte sono le azioni ricorrenti; il resto
                                // (setup una tantum, casi limite, servizi) segue dopo.
                                ...(isAdmin ? (
                                    tournament.tournament_format === 'group_stage'
                                        ? [{ key: 'gironi', label: 'Gironi/Fasi', icon: Flag }]
                                        : [{ key: 'gare', label: 'Risultati', icon: Flag }]
                                ) : []),
                                { key: 'leaderboard', label: 'Classifica', icon: BarChart3 },
                                { key: 'carte', label: 'Carte', icon: Zap },
                                { key: 'races', label: 'Gare', icon: ListChecks },
                                ...(isAdmin ? [{ key: 'setup', label: 'Impostazioni', icon: Settings }] : []),
                                ...(isAdmin && tournament.tournament_format !== 'group_stage' ? [
                                    { key: 'duelli', label: 'Duelli', icon: Swords },
                                    { key: 'finale', label: 'Verdetto', icon: Crown },
                                ] : []),
                                ...(isAdmin ? [{ key: 'schedina', label: 'Schedine', icon: ListChecks }] : []),
                            ].map(({ key, label, icon: Icon }) => (
                                <button key={key} type="button" onClick={() => setActiveSection(key)}
                                    className={`font-title flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] tracking-wide whitespace-nowrap transition ${activeSection === key ? 'bg-slate-700 dark:bg-slate-600 text-white shadow' : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200'}`}>
                                    <Icon size={12} />
                                    {label}
                                    {key === 'carte' && inventory.filter((c) => !c.is_consumed).length > 0 && (
                                        <span className="font-title flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] text-white">
                                            {inventory.filter((c) => !c.is_consumed).length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {isAdmin && activeSection === 'setup' && (
                    <div className="space-y-4">
                        <CollapsibleSection title="Stato torneo" icon={<Settings size={16} />} defaultOpen>
                            <TournamentStatusManager tournament={tournament} disabled={!isAdmin} onUpdated={refresh} />
                        </CollapsibleSection>

                        <CollapsibleSection
                            title="Partecipanti"
                            icon={<Users size={16} />}
                            badge={(
                                <span className="rounded-full bg-slate-100 dark:bg-muted px-2.5 py-0.5 text-[10px] font-black text-slate-500 dark:text-muted-foreground">
                                    {tournament.participant_ids?.length ?? 0}
                                </span>
                            )}
                            defaultOpen
                        >
                            <TournamentParticipantsManager tournament={tournament} players={players} initialParticipantIds={tournament.participant_ids ?? []} disabled={Boolean(tournament.winner_id) || tournament.status === 'in_corso'} onUpdated={refresh} excludePlayerIds={superadminPlayerIds} />

                            {(tournament.status === 'in_corso' || tournament.status === 'da_svolgere') && (
                                <WithdrawalManager tournament={tournament} players={players} disabled={!isAdmin} onUpdated={refresh} />
                            )}
                        </CollapsibleSection>
                    </div>
                )}

                {/* ── Modalità MK8 Deluxe: gironi, spareggi, semifinali e finale ──
                    GroupManagementSection rende già le proprie CollapsibleSection
                    per fase (Generale/Gironi/Semifinali/Finali/Classifica Finale) */}
                {isAdmin && activeSection === 'gironi' && (
                    <GroupManagementSection
                        tournament={tournament}
                        players={players}
                        circuits={tournamentCircuits}
                        characters={charactersByGameId.get(tournament?.game_id ?? 0) ?? []}
                        results={results}
                        isAdmin={isAdmin}
                        onRefresh={refresh}
                        leader={currentLeader}
                        onFinalized={handleFinalized}
                        onReplayCelebration={handleReplayCelebration}
                    />
                )}

                {isAdmin && activeSection === 'gare' && (
                    <CollapsibleSection title="Risultati" icon={<Flag size={16} />} defaultOpen>
                        {/* Riepilogo sintetico — l'elenco completo gare/circuiti e la
                        modifica dei risultati già inseriti vivono solo nel tab "Gare"
                        di primo livello, per evitare due viste della stessa lista. */}
                        <div className="rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Riepilogo gare</p>
                                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-foreground">
                                        {tournament.raceCount}/{tournament.n_races} <span className="text-sm font-bold text-slate-400 dark:text-muted-foreground">gare inserite</span>
                                    </p>
                                    {incompleteRacesCount > 0 && (
                                        <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                            {incompleteRacesCount} gara/e con risultati incompleti
                                        </p>
                                    )}
                                </div>
                                <button type="button" onClick={() => setActiveSection('races')}
                                    className="font-title shrink-0 rounded-xl border-2 border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-4 py-2.5 text-[10px] tracking-wide text-blue-700 dark:text-blue-300 transition active:translate-y-px hover:bg-blue-100 dark:hover:bg-blue-500/20">
                                    Vai a Gare — consulta e modifica i risultati →
                                </button>
                            </div>
                        </div>
                        <ClassicRaceForm tournamentId={tournament.id} races={tournament.races} nPlayers={tournament.n_players} participants={activeTournamentParticipants} circuits={tournamentCircuits} characters={charactersByGameId.get(tournament?.game_id ?? 0) ?? []} disabled={isTournamentLocked} pendingEffects={pendingEffects} onCardEffectsResolved={refreshPendingEffects} onSaved={refresh} />

                        {/* Fallback per gare incomplete create col vecchio flusso (un
                        risultato alla volta): ClassicRaceForm crea sempre gara +
                        ordine completo insieme, quindi non c'è più un modo per
                        aggiungere un risultato mancante a una gara già esistente.
                        Sparisce da sola appena non ci sono più gare incomplete. */}
                        {incompleteRacesCount > 0 && (
                            <CollapsibleSection title="Completa una gara incompleta" subtitle="Percorso di riserva per le gare create con risultati parziali — non serve più una volta che ogni gara ha l'ordine di arrivo completo." icon={<AlertCircle size={16} />}>
                                <ResultEntryForm tournament={tournament} races={tournament.races} tournamentParticipants={activeTournamentParticipants} onCreated={refresh} disabled={isTournamentLocked} />
                            </CollapsibleSection>
                        )}
                    </CollapsibleSection>
                )}

                {isAdmin && activeSection === 'duelli' && (
                    <CollapsibleSection title="Duelli spareggio" subtitle="Spareggi automatici per pareggi in classifica — risolvono le posizioni a pari merito indipendentemente dal podio. Non assegnano punti in classifica." icon={<Swords size={16} />} defaultOpen>
                        <ClassicPodiumDuelCard
                            tournament={tournament}
                            players={players}
                            circuits={tournamentCircuits}
                            characters={charactersByGameId.get(tournament?.game_id ?? 0) ?? []}
                            onRefresh={refresh}
                        />
                    </CollapsibleSection>
                )}

                {isAdmin && activeSection === 'finale' && (
                    <CollapsibleSection title="Verdetto" icon={<Crown size={16} />} defaultOpen>
                        <div className="space-y-4">
                            <WinnerFinalizeCard tournament={tournament} leader={currentLeader} onFinalized={handleFinalized} onReplayCelebration={handleReplayCelebration} />
                            <TournamentResolutionNotes tournament={tournament} />
                        </div>
                    </CollapsibleSection>
                )}

                {isAdmin && activeSection === 'schedina' && (
                    <div className="space-y-4">
                        <CollapsibleSection title="Stato compilazione schedine" subtitle="Chi ha compilato la schedina e chi no" icon={<ListChecks size={16} />}>
                            {participantsStatus.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-muted-foreground">Nessun partecipante trovato.</p>
                            ) : (
                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="rounded-full bg-sky-100 dark:bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-black text-sky-600 dark:text-sky-400">
                                            {participantsStatus.filter((p) => p.has_compiled).length}/{participantsStatus.length} compilate
                                        </span>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {participantsStatus.map((p) => {
                                            const player = players.find((pl) => pl.id === p.player_id)
                                            return (
                                                <div key={p.user_id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-muted/50 px-3 py-2.5">
                                                    {player?.img_url
                                                        ? <img src={player.img_url} alt={p.nickname} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                                                        : <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-500">{(p.nickname ?? '?').charAt(0).toUpperCase()}</div>
                                                    }
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{p.nickname || p.username}</p>
                                                        {p.compiled_at && (
                                                            <p className="text-[9px] text-slate-400">{new Date(p.compiled_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                        )}
                                                    </div>
                                                    <span className={`shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${p.has_compiled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                                        {p.has_compiled ? '✓ Compilata' : '○ Da compilare'}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </CollapsibleSection>
                    </div>
                )}

                {activeSection === 'leaderboard' && (
                    <div className="space-y-4">
                        {tournament.tournament_format === 'group_stage' ? (
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-muted-foreground">Classifiche · per fase</p>
                                    <RefreshButton onClick={refresh} loading={loading} />
                                </div>
                                <GroupPlancia tournament={tournament} players={players} results={results} highlightPlayerId={myPlayerId} />
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-slate-100 dark:border-border flex items-center justify-between">
                                    <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Classifica</p>
                                    <RefreshButton onClick={refresh} loading={loading} />
                                </div>
                                <div className="overflow-x-auto">
                                    <LeaderboardTable
                                        rows={tournament.standings}
                                        showTournamentWins={false}
                                        charactersById={charactersById}
                                        highlightPlayerId={user?.player_id ?? user?.player?.id ?? null}
                                        isSuperadmin={isSuperadmin}
                                        onPlayerClick={handlePlayerClick}
                                    />
                                </div>
                                <div className="p-4">
                                    <PointAdjustmentsPanel tournament={tournament} participants={activeTournamentParticipants} isSuperadmin={isSuperadmin} onChanged={refresh} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'races' && (
                    <div className="space-y-4">
                        <RaceList races={tournament.races} circuits={tournamentCircuits} circuitsById={circuitsById} charactersById={charactersById} characters={charactersByGameId.get(tournament?.game_id ?? 0) ?? []} nPlayers={tournament.n_players} tournamentId={tournament.id} onChanged={refresh} canEdit={isAdmin} />
                        {/* Log azioni carte nella timeline */}
                        {localCardLog.length > 0 && (
                            <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4 space-y-2">
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                    <Zap size={12} /> Azioni Carte Potere
                                </p>
                                {localCardLog.map((entry, idx) => {
                                    const isMaster = entry.card_type === 'master'
                                    const raceLabel = entry.race_id
                                        ? `alla gara #${tournament.races?.find(r => r.id === entry.race_id)?.race_order ?? entry.race_id}`
                                        : 'durante il torneo'
                                    return (
                                        <div key={idx} className={`flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-xs ${isMaster ? 'border-amber-200/60 dark:border-amber-500/20 bg-white dark:bg-amber-500/5' : 'border-sky-200/60 dark:border-sky-500/20 bg-white dark:bg-sky-500/5'}`}>
                                            <span className={`font-black shrink-0 ${isMaster ? 'text-amber-500' : 'text-sky-500'}`}>{isMaster ? '★' : '⚡'}</span>
                                            <p className="text-slate-700 dark:text-slate-300">
                                                <span className="font-black">{raceLabel}</span>, <span className="font-black">{entry.used_by_nickname}</span> ha usato la <span className={`font-black ${isMaster ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>{entry.card_name}</span> per <span className="italic">{entry.effect}</span>
                                                {entry.target_nickname && <> contro <span className="font-black text-rose-600 dark:text-rose-400">{entry.target_nickname}</span></>}.
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ══ CARTE POTERE (Admin tool) ══ */}
                {activeSection === 'carte' && (
                    <div className="space-y-6">
                        {/* Spiegazione flusso */}
                        <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
                                    <Zap size={18} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">Strumento Admin</p>
                                    <h3 className="mt-1 text-lg font-black text-amber-900 dark:text-amber-200">Gestione Carte Potere</h3>
                                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                                        L'admin registra l'uso delle carte durante il torneo. Il portatore della carta dichiara l'intenzione prima della gara; l'admin sceglie effetto e bersaglio e lo registra qui.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                                        <span className="rounded-full border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">1. Portatore dichiara</span>
                                        <span className="text-amber-400">→</span>
                                        <span className="rounded-full border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">2. Admin registra qui</span>
                                        <span className="text-amber-400">→</span>
                                        <span className="rounded-full border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">3. Effetto applicato</span>
                                    </div>
                                    <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">
                                        Le carte vinte in un torneo si possono usare solo in tornei dello stesso gioco.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Registra uso carta */}
                        {isAdmin && (
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Registra uso</p>
                                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Carta usata in gara</h3>
                                </div>
                                {tournamentStatus === 'concluso' && (
                                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3">
                                        <span className="text-[11px] text-slate-500 dark:text-muted-foreground font-black uppercase tracking-wider">Torneo concluso — utilizzo carte disabilitato.</span>
                                    </div>
                                )}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => openCardModal('master')}
                                        disabled={availableCards.master === 0 || tournamentStatus === 'concluso'}
                                        className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4 text-left transition hover:border-amber-400 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-amber-200 dark:disabled:hover:border-amber-500/30"
                                    >
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
                                            <Shield size={22} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500">★ Leggendaria</p>
                                            <p className="font-black text-amber-700 dark:text-amber-300">Carta Master</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Annulla penalizzazione</p>
                                        </div>
                                        {availableCards.master === 0 ? (
                                            <span className="shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Non disp.</span>
                                        ) : (
                                            <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">{availableCards.master} disp.</span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openCardModal('blue_shell')}
                                        disabled={availableCards.blue_shell === 0 || tournamentStatus === 'concluso'}
                                        className="flex items-center gap-3 rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/5 p-4 text-left transition hover:border-sky-400 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-sky-200 dark:disabled:hover:border-sky-500/30"
                                    >
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow">
                                            <Ban size={22} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-500">⚡ Rara</p>
                                            <p className="font-black text-sky-700 dark:text-sky-300">Guscio Blu</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Penalizza avversario</p>
                                        </div>
                                        {availableCards.blue_shell === 0 ? (
                                            <span className="shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Non disp.</span>
                                        ) : (
                                            <span className="shrink-0 rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">{availableCards.blue_shell} disp.</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Chi ha carte - pannello live */}
                        {isAdmin && (
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Inventario live</p>
                                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Chi ha carte disponibili</h3>
                                </div>
                                {cardHolders.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-5 text-center">
                                        <p className="text-sm text-slate-400 dark:text-muted-foreground">Nessun partecipante possiede carte attualmente.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {cardHolders.map((h) => (
                                            <div key={h.player_id} className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5">
                                                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-border bg-slate-200 dark:bg-slate-700">
                                                    {h.player_img_url
                                                        ? <img src={h.player_img_url} alt={h.player_nickname} className="h-full w-full object-cover" />
                                                        : <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-500">{(h.player_nickname ?? '?').charAt(0).toUpperCase()}</div>}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-black text-slate-900 dark:text-foreground truncate">{h.player_nickname}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {h.master_count > 0 && (
                                                        <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:text-amber-300">
                                                            <Shield size={9} /> ×{h.master_count}
                                                        </span>
                                                    )}
                                                    {h.blue_shell_count > 0 && (
                                                        <span className="flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 py-0.5 text-[9px] font-black text-sky-700 dark:text-sky-300">
                                                            <Ban size={9} /> ×{h.blue_shell_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Storico usi carte */}
                        <CardLogPanel
                            variant="log"
                            entries={localCardLog}
                            eyebrow="Registro ufficiale"
                            title="Carte usate in questo torneo"
                            emptyMessage="Nessuna carta ancora registrata in questo torneo."
                        />

                        <CardLogPanel
                            variant="history"
                            entries={cardHistory}
                            eyebrow="Registro di sistema"
                            title="Storico carte"
                            emptyMessage="Nessun utilizzo di carte collegato a una gara per ora."
                        />
                    </div>
                )}

                </div>

            </section>
        </AppLayout>
        </>
    )
}

export default TournamentDetail
