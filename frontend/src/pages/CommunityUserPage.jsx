import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Flag, Trophy, Star, BarChart3, Shield } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PlayerTournamentHistory from '@/components/community/PlayerTournamentHistory'
import ProfileHeader from '@/components/community/ProfileHeader'
import { pickBestBadge, TIER_ACCENT_COLORS } from '@/lib/playerBadges'
import StatShowcaseCard from '@/components/common/StatShowcaseCard'
import { authApi, statsApi, getApiErrorMessage } from '@/services/apiClient'
import { useAppData } from '@/context/AppDataContext'
import { SkeletonPulse, SkeletonRows } from '@/components/common/Skeleton'
import { toast } from 'sonner'

const CommunityUserPage = () => {
    const { userId } = useParams()
    const navigate = useNavigate()
    const { statsByPlayerId, charactersById, games, getLeaderboardByGame, contentImages, updateContentImage } = useAppData()
    const [communityUser, setCommunityUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [fetchError, setFetchError] = useState(false)
    const [selectedGameId, setSelectedGameId] = useState('')
    const [badges, setBadges] = useState([])

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
    const viewedUserIsSuperadmin = communityUser?.role === 'superadmin'

    useEffect(() => {
        if (!player) return
        let active = true
        statsApi.playerBadges(player.id)
            .then((res) => { if (active) setBadges(res.data) })
            .catch(() => { if (active) setBadges([]) })
        return () => { active = false }
    }, [player])

    const bestBadge = useMemo(() => pickBestBadge(badges), [badges])
    const activeBadge = useMemo(() => {
        if (!selectedGameId) return bestBadge
        return badges.find((b) => b.game_id === Number(selectedGameId)) ?? bestBadge
    }, [badges, selectedGameId, bestBadge])
    const gameStats = useMemo(() => {
        if (!selectedGameId || !player) return null
        const leaderboard = getLeaderboardByGame(selectedGameId)
        return leaderboard.find((entry) => entry.playerId === player.id) ?? null
    }, [selectedGameId, player, getLeaderboardByGame])

    const activeStats = gameStats ?? playerStats

    if (loading) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
                    <SkeletonPulse className="h-40" />
                    <SkeletonRows count={3} />
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

                {/* Profile card — compatta (max-w-md), non max-w-3xl come il
                    resto della pagina: il contenuto è intrinsecamente stretto. */}
                <div
                    className="relative mx-auto max-w-md overflow-hidden rounded-[2rem] border-2 border-white/15 bg-slate-900 p-6"
                    style={(() => {
                        const tierAccent = TIER_ACCENT_COLORS[(viewedUserIsSuperadmin ? 'leggenda' : bestBadge?.tier)]
                        return tierAccent
                            ? { borderColor: tierAccent, boxShadow: `var(--circuit-shadow-md), 0 0 0 3px ${tierAccent}22` }
                            : { boxShadow: 'var(--circuit-shadow-md)' }
                    })()}
                >
                    <div className="relative z-10">
                    <ProfileHeader
                        avatarSrc={player?.img_url || communityUser?.img_url}
                        nickname={player?.nickname ?? communityUser.username}
                        fallbackInitial={(player?.nickname ?? communityUser.username ?? '?').charAt(0).toUpperCase()}
                        accentColor={player?.accent_color}
                        // Solo per il superadmin (nessun badge di gioco per
                        // quell'account) — per admin/user è ridondante col tag
                        // ruolo già visibile in Navbar.
                        role={viewedUserIsSuperadmin ? communityUser.role : null}
                        // Il superadmin non gioca mai — nessun badge di gioco anche se per
                        // qualche motivo risultasse un player collegato.
                        badges={!viewedUserIsSuperadmin && activeBadge ? [activeBadge] : []}
                        favoriteCharacter={favoriteCharacter}
                        bio={player?.bio}
                    />
                    </div>
                </div>
                  {player && <PlayerTournamentHistory playerId={player.id} />}

                {/* Superadmin sees fun game-master banner */}
                {viewedUserIsSuperadmin ? (
                    <div className="rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/30 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 p-8 text-center" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-circuit-ink bg-gradient-to-br from-amber-400 to-orange-500" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                            <Shield size={28} className="text-white" />
                        </div>
                        <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-foreground">
                            🏆 Game Master
                        </h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 italic">
                            "Chi è primo nella classifica non conta. Quello che conta è avere il miglior item al momento giusto."
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
                                    { label: 'Tornei vinti', value: activeStats.tournamentWins, sub: `di ${activeStats.tournamentsPlayed} giocati`, accent: 'amber', contentKey: 'stat-icon-tornei', Icon: Trophy },
                                    { label: 'Vittorie gara', value: activeStats.raceWins, sub: `Win Rate ${activeStats.winRate}%`, accent: 'emerald', contentKey: 'stat-icon-gare', Icon: Flag },
                                    { label: 'Podi totali', value: activeStats.podiums, sub: `Podium Rate ${activeStats.podiumRate}%`, accent: 'blue', contentKey: 'stat-icon-podi', Icon: Star },
                                    { label: 'Punti totali', value: activeStats.points, sub: `Efficienza ${activeStats.avgEfficiency}%`, accent: 'violet', contentKey: 'stat-icon-punti', Icon: BarChart3 },
                                ].map(({ label, value, sub, accent, contentKey, Icon }) => (
                                    <StatShowcaseCard
                                        key={label}
                                        label={label}
                                        value={value}
                                        sub={sub}
                                        Icon={Icon}
                                        accent={accent}
                                        contentKey={contentKey}
                                        imageUrl={contentImages[contentKey]}
                                        onUploaded={updateContentImage}
                                    />
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