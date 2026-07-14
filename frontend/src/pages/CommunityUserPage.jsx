import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Crown, Flag, Trophy, Star, BarChart3, UserCircle2, Shield } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PlayerTournamentHistory from '@/components/community/PlayerTournamentHistory'
import { authApi, getApiErrorMessage } from '@/services/apiClient'
import { useAppData } from '@/context/AppDataContext'
import { toast } from 'sonner'

const CommunityUserPage = () => {
    const { userId } = useParams()
    const navigate = useNavigate()
    const { statsByPlayerId, charactersById, games, getLeaderboardByGame } = useAppData()
    const [communityUser, setCommunityUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [fetchError, setFetchError] = useState(false)
    const [selectedGameId, setSelectedGameId] = useState('')

    useEffect(() => {
        let active = true
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true)
        setNotFound(false)
        setFetchError(false)
        authApi.getCommunityUser(userId)
            .then((res) => { if (active) setCommunityUser(res.data) })
            .catch((err) => {
                if (active) {
                    if (err.response?.status === 404) {
                        setNotFound(true)
                    } else {
                        setFetchError(true)
                        toast.error('Errore caricamento', { description: getApiErrorMessage(err) })
                    }
                }
            })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [userId])

    const player = communityUser?.player ?? null
    const playerStats = player ? (statsByPlayerId.get(player.id) ?? null) : null
    const favoriteCharacter = player?.favorite_character_id ? charactersById.get(player.favorite_character_id) : null
    const isChampion = (playerStats?.tournamentWins ?? 0) > 0
    const viewedUserIsSuperadmin = communityUser?.role === 'superadmin'

    const gameStats = useMemo(() => {
        if (!selectedGameId || !player) return null
        const leaderboard = getLeaderboardByGame(selectedGameId)
        return leaderboard.find((entry) => entry.playerId === player.id) ?? null
    }, [selectedGameId, player, getLeaderboardByGame])

    const activeStats = gameStats ?? playerStats

    if (loading) {
        return (
            <AppLayout>
                <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
                    <p className="font-title text-[11px] tracking-wide text-slate-400">Caricamento...</p>
                </div>
            </AppLayout>
        )
    }

    if (notFound) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-3xl px-4 py-12 text-center">
                    <p className="text-lg font-black text-slate-500">Utente non trovato</p>
                    <Link to="/" className="font-title mt-4 inline-block rounded-xl border-2 border-emerald-800/30 bg-emerald-600 px-5 py-3 text-[10px] tracking-wide text-white transition active:translate-y-px" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>Torna alla home</Link>
                </div>
            </AppLayout>
        )
    }

    if (fetchError) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-3xl px-4 py-12 text-center">
                    <p className="text-lg font-black text-slate-500">Errore di caricamento</p>
                    <p className="mt-2 text-sm text-slate-400">Riprova più tardi</p>
                    <Link to="/" className="font-title mt-4 inline-block rounded-xl border-2 border-emerald-800/30 bg-emerald-600 px-5 py-3 text-[10px] tracking-wide text-white transition active:translate-y-px" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>Torna alla home</Link>
                </div>
            </AppLayout>
        )
    }

    if (!communityUser) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-3xl px-4 py-12 text-center">
                    <p className="text-lg font-black text-slate-500">Utente non trovato</p>
                    <Link to="/" className="font-title mt-4 inline-block rounded-xl border-2 border-emerald-800/30 bg-emerald-600 px-5 py-3 text-[10px] tracking-wide text-white transition active:translate-y-px" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>Torna alla home</Link>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-3xl px-4 py-8 animate-fade-in space-y-6">
                {/* Back link — torna alla pagina di provenienza (es. /players) invece di forzare sempre la Home */}
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="font-title inline-flex items-center gap-2 text-[10px] tracking-wide text-slate-400 transition hover:text-emerald-600"
                >
                    <ArrowLeft size={14} /> Indietro
                </button>

                {/* Profile card — composizione editoriale asimmetrica: colonna avatar fissa + colonna contenuto fluida, niente centratura */}
                <div className={`rounded-2xl border-2 p-6 md:p-8 ${isChampion ? 'border-amber-400/60 dark:border-amber-500/30 bg-linear-to-br from-amber-100/90 via-amber-50/60 to-amber-100/80 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60' : 'border-slate-200 dark:border-border bg-white dark:bg-card'}`} style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                    <div className="grid gap-6 md:grid-cols-[auto_1fr] items-start">
                        {/* Colonna sinistra: avatar + ruolo */}
                        <div className="flex flex-row items-center gap-3 md:flex-col md:items-start">
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-xl scale-125 pointer-events-none" />
                                <div className={`relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-[2.5px] bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-400/20 ${isChampion ? 'border-amber-400' : 'border-emerald-400'}`}>
                                    {player?.img_url || communityUser?.img_url
                                        ? <img src={player?.img_url || communityUser?.img_url} alt={player?.nickname ?? communityUser?.username} className="h-full w-full object-cover" />
                                        : <UserCircle2 size={40} className="text-white" />}
                                </div>
                                {isChampion && (
                                    <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white dark:border-card bg-amber-400 shadow-md">
                                        <Crown size={13} className="text-amber-950" />
                                    </span>
                                )}
                            </div>
                            <span className="font-title inline-flex items-center rounded-full border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-1 text-[9px] tracking-wide text-emerald-600 dark:text-emerald-400">
                                {communityUser.role === 'superadmin' ? 'Superadmin' : communityUser.role === 'admin' ? 'Admin' : 'Giocatore'}
                            </span>
                        </div>

                        {/* Colonna destra: identità allineata a sinistra + badge in fondo */}
                        <div className="min-w-0 text-left">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-foreground">{player?.nickname ?? communityUser.username}</h1>
                            {player && <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">{player.first_name} {player.last_name}</p>}
                            {player?.bio && <p className="mt-3 max-w-xl text-sm text-slate-600 dark:text-muted-foreground leading-relaxed whitespace-pre-wrap">{player.bio}</p>}

                            {(favoriteCharacter || isChampion) && (
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    {isChampion && (
                                        <div className="flex items-center gap-1.5 rounded-xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-100/70 dark:bg-amber-500/15 px-3 py-1.5">
                                            <Trophy size={13} className="text-amber-600 dark:text-amber-400" />
                                            <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                                                {playerStats.tournamentWins} {playerStats.tournamentWins === 1 ? 'torneo vinto' : 'tornei vinti'}
                                            </span>
                                        </div>
                                    )}
                                    {favoriteCharacter && (
                                        <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-1.5">
                                            {favoriteCharacter.img_url && <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-5 w-5 rounded-full object-cover" />}
                                            <span className="text-xs font-black text-slate-600 dark:text-foreground">{favoriteCharacter.name}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                  {player && <PlayerTournamentHistory playerId={player.id} />}

                {/* Superadmin sees fun game-master banner */}
                {viewedUserIsSuperadmin ? (
                    <div className="rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 p-8 text-center" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-circuit-ink bg-gradient-to-br from-amber-400 to-orange-500" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                            <Shield size={28} className="text-white" />
                        </div>
                        <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-foreground">
                            🏆 Game Master
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 italic">
                            "Chi è primo nella classifica non conta. Quello che conta è avere il miglior item al momento giusto."
                        </p>
                        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                            Tu organizzi, loro corrono. La vera vittoria è vedere il tabellone funzionare. 👑
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <span className="font-title rounded-full bg-amber-100 dark:bg-amber-500/20 px-3 py-1 text-[9px] tracking-wide text-amber-700 dark:text-amber-300">SuperAdmin</span>
                            <span className="font-title rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-3 py-1 text-[9px] tracking-wide text-emerald-700 dark:text-emerald-300">Game Master</span>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-6" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                        {/* Header with game selector */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <div>
                                <p className="font-title text-[10px] tracking-wide text-emerald-600 dark:text-emerald-400">Statistiche</p>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-foreground">Andamento</h2>
                            </div>
                            <select
                                value={selectedGameId}
                                onChange={e => setSelectedGameId(e.target.value)}
                                className="font-title rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2 text-[10px] tracking-wide text-slate-700 dark:text-foreground outline-none focus:border-emerald-400"
                            >
                                <option value="">Tutti i giochi </option>
                                {games.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        

                        {/* Stats grid */}
                        {activeStats ? (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    { label: 'Tornei vinti', value: activeStats.tournamentWins, sub: `di ${activeStats.tournamentsPlayed} giocati`, iconCls: 'bg-amber-500/10 text-amber-600', Icon: Trophy },
                                    { label: 'Vittorie gara', value: activeStats.raceWins, sub: `Win Rate ${activeStats.winRate}%`, iconCls: 'bg-emerald-500/10 text-emerald-600', Icon: Flag },
                                    { label: 'Podi totali', value: activeStats.podiums, sub: `Podium Rate ${activeStats.podiumRate}%`, iconCls: 'bg-blue-500/10 text-blue-600', Icon: Star },
                                    { label: 'Punti totali', value: activeStats.points, sub: `Efficienza ${activeStats.avgEfficiency}%`, iconCls: 'bg-violet-500/10 text-violet-600', Icon: BarChart3 },
                                ].map(({ label, value, sub, iconCls, Icon }) => (
                                    <div key={label} className="flex items-start gap-3 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-4" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-title text-[9px] tracking-wide text-slate-400">{label}</p>
                                            <p className="font-title mt-1 text-xl leading-none text-slate-900 dark:text-foreground">{value}</p>
                                            <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-muted-foreground">{sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-muted/30 p-6 text-center">
                                <Shield size={24} className="mx-auto text-slate-400" />
                                <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">Nessuna statistica disponibile</p>
                            </div>
                        )}
                    </div>
                )}

              
            </section>
        </AppLayout>
    )
}

export default CommunityUserPage