import { Link } from 'react-router-dom'
import { UserCircle2, PencilLine, Sparkles, Crown } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'

const Hero = () => {
    const { statsByPlayerId, charactersById, tournaments, players: allPlayers, loading } = useAppData()
    const { user, isSuperadmin } = useAuth()
    const { dark } = useTheme()
    const theme = getProfileTheme(user, charactersById, dark)
    const player = user?.player ?? null
    const playerStats = player ? (statsByPlayerId.get(player.id) ?? null) : null
    const favoriteCharacter = player?.favorite_character_id ? charactersById.get(player.favorite_character_id) : null
    const isChampion = (playerStats?.tournamentWins ?? 0) > 0
    const goldCard = isChampion || isSuperadmin
    const goldBackground = dark
        ? 'linear-gradient(to bottom right, rgba(67,20,7,0.60), rgba(120,53,15,0.30), rgba(67,20,7,0.60))'
        : 'linear-gradient(to bottom right, rgba(254,243,199,0.92), rgba(255,251,235,0.70), rgba(254,243,199,0.88))'
    const totalTournaments = tournaments?.length ?? 0
    const totalPlayers = allPlayers?.length ?? 0
    const activeTournaments = tournaments?.filter(t => t.status === 'in_corso').length ?? 0

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            <div
                className={`overflow-hidden rounded-[2rem] border-2 backdrop-blur-xl transition-all duration-500 ${goldCard ? 'gold-card-shimmer border-circuit-ink' : 'border-slate-900/70 dark:border-white/20'}`}
                style={{ background: goldCard ? goldBackground : theme.cardBackground, boxShadow: 'var(--circuit-shadow-lg)' }}
            >

                {/* ── Header ── */}
                <div className={`relative border-b px-6 py-5 ${theme.tailwind.borderSoft}`}>
                    {goldCard && (
                        <div className="absolute right-4 top-4 rounded-full bg-amber-400 p-1.5 shadow-lg z-10">
                            <Crown size={16} className="text-amber-950" />
                        </div>
                    )}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme.tailwind.textStrong}`}>
                                {isSuperadmin ? 'Pannello di Amministrazione' : player ? 'La tua area personale' : 'Cruscotto generale'}
                            </p>
                            <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">
                                {isSuperadmin
                                    ? `${user?.username} · Supervisione`
                                    : player
                                        ? `${player.nickname ?? user?.username} in pista`
                                        : 'Statistiche del torneo'}
                            </h2>
                            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-muted-foreground">
                                {isSuperadmin
                                    ? 'Gestisci tornei, utenti e schedine della lega.'
                                    : player
                                        ? favoriteCharacter
                                            ? `Tema ${favoriteCharacter.name} attivo — statistiche e profilo collegati.`
                                            : 'Completa il tuo player per sbloccare tema e statistiche.'
                                        : 'Accedi per vedere il tuo profilo e le statistiche personali.'}
                            </p>
                        </div>

                        {/* Champion badge */}
                        {isChampion && (
                            <div className="flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-2">
                                <Crown size={16} className="text-amber-500" />
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Campione</p>
                                    <p className="text-sm font-black text-amber-700 dark:text-amber-300">
                                        {playerStats.tournamentWins} {playerStats.tournamentWins === 1 ? 'trofeo' : 'trofei'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Body grid: profile card + character card ── */}
                <div className="grid gap-4 p-6 sm:grid-cols-2">
                    {/* Profile card */}
                    <Link to="/dashboard" className="flex flex-col items-center gap-4 rounded-3xl border-2 border-slate-900/40 dark:border-white/15 p-5 transition hover:scale-[1.02]"
                        style={{ background: isChampion
                            ? (dark ? 'linear-gradient(to bottom right, rgba(67,20,7,0.60), rgba(120,53,15,0.30), rgba(67,20,7,0.60))' : 'linear-gradient(to bottom right, rgba(254,243,199,0.92), rgba(255,251,235,0.70), rgba(254,243,199,0.88))')
                            : (dark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.7)'),
                            boxShadow: 'var(--circuit-shadow-sm)' }}>
                        <div className="relative mt-1">
                            <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl scale-150 pointer-events-none" />
                            <div className={`relative flex h-20 w-20 items-center justify-center rounded-full border-[2.5px] overflow-hidden bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-400/20 ${isChampion ? 'border-amber-400' : 'border-emerald-400'}`}>
                                {player?.img_url || user?.img_url
                                    ? <img src={player?.img_url || user?.img_url} alt={player?.nickname ?? user?.username} className="h-full w-full object-cover" />
                                    : <UserCircle2 size={30} className="text-white" />}
                            </div>
                            {isChampion && (
                                <span className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-card bg-amber-400">
                                    <Crown size={10} className="text-amber-950" />
                                </span>
                            )}
                        </div>
                        <div className="flex flex-1 flex-col items-center gap-1 text-center">
                            <p className="text-sm font-black text-slate-900 dark:text-foreground">{player?.nickname ?? user?.username}</p>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-600 dark:text-emerald-400">
                                {isSuperadmin ? 'Superadmin' : 'Giocatore'}
                            </p>
                        </div>
                    </Link>

                    {/* Favorite character card */}
                    {isSuperadmin ? (
                        <div className="rounded-3xl border-2 border-slate-900/40 dark:border-white/15 p-4"
                            style={{ background: isChampion
                                ? (dark ? 'linear-gradient(to bottom right, rgba(67,20,7,0.60), rgba(120,53,15,0.30), rgba(67,20,7,0.60))' : 'linear-gradient(to bottom right, rgba(254,243,199,0.92), rgba(255,251,235,0.70), rgba(254,243,199,0.88))')
                                : (dark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.7)'),
                            boxShadow: 'var(--circuit-shadow-sm)' }}>
                            <p className="font-title text-[9px] tracking-wide mb-3" style={{ color: theme.accentStrong }}>
                                Metriche di sistema
                            </p>
                            <div className="grid gap-3">
                                <div className="rounded-xl border border-slate-900/10 dark:border-white/10 bg-white/70 dark:bg-slate-700/50 p-3">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Tornei totali</p>
                                    <p className="font-title mt-1 text-xl text-slate-900 dark:text-foreground">{loading ? '—' : totalTournaments}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-slate-900/10 dark:border-white/10 bg-white/70 dark:bg-slate-700/50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Giocatori</p>
                                        <p className="font-title mt-1 text-lg text-slate-900 dark:text-foreground">{loading ? '—' : totalPlayers}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-900/10 dark:border-white/10 bg-white/70 dark:bg-slate-700/50 p-3">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Tornei attivi</p>
                                        <p className="font-title mt-1 text-lg text-slate-900 dark:text-foreground">{loading ? '—' : activeTournaments}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`flex flex-col items-center gap-4 rounded-3xl p-5 ${favoriteCharacter ? 'border-2 border-slate-900/40 dark:border-white/15' : 'border-2 border-dashed border-slate-300 dark:border-slate-600'}`}
                            style={{ background: !favoriteCharacter
                                ? (dark ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.5)')
                                : isChampion
                                    ? (dark ? 'linear-gradient(to bottom right, rgba(67,20,7,0.60), rgba(120,53,15,0.30), rgba(67,20,7,0.60))' : 'linear-gradient(to bottom right, rgba(254,243,199,0.92), rgba(255,251,235,0.70), rgba(254,243,199,0.88))')
                                    : (dark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.7)'),
                            ...(favoriteCharacter ? { boxShadow: 'var(--circuit-shadow-sm)' } : {}) }}>
                            {favoriteCharacter ? (
                                <>
                                    <div className="relative mt-1">
                                        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl scale-150 pointer-events-none" />
                                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-[2.5px] border-amber-400 overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/20">
                                            {favoriteCharacter.img_url
                                                ? <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-full w-full object-cover" />
                                                : <span className="text-2xl font-black text-white">{favoriteCharacter.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                                            }
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col items-center gap-1 text-center">
                                        <p className="text-sm font-black text-slate-900 dark:text-foreground">{favoriteCharacter.name}</p>
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-600 dark:text-amber-400">Personaggio preferito</p>
                                        {favoriteCharacter.description && (
                                            <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-muted-foreground line-clamp-2">{favoriteCharacter.description}</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                                        <Sparkles size={24} className="text-slate-400" />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-muted-foreground">Nessun personaggio preferito</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Action button ── */}
                <div className="flex flex-wrap gap-3 px-6 pb-6">
                    <Link to="/dashboard"
                        className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`, boxShadow: `0 18px 50px ${theme.accentSoft}` }}>
                        <PencilLine size={16} />
                        {player ? 'Il mio profilo' : 'Dashboard'}
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default Hero
