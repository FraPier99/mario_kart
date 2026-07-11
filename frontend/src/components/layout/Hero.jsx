import { Link } from 'react-router-dom'
import { Trophy, Crown, Gamepad2, Users2, Calendar } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'
import { buildAvatarPlaceholder } from '@/lib/placeholders'

const formatChampionDate = (value) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

const Hero = () => {
    const { statsByPlayerId, charactersById, tournaments, players: allPlayers, detailedTournaments, games, loading } = useAppData()
    const { user, isSuperadmin } = useAuth()
    const { dark } = useTheme()
    const theme = getProfileTheme(user, charactersById, dark)
    const player = user?.player ?? null
    const playerStats = player ? (statsByPlayerId.get(player.id) ?? null) : null
    const isChampion = (playerStats?.tournamentWins ?? 0) > 0
    const goldCard = isChampion || isSuperadmin
    const goldBackground = dark
        ? 'linear-gradient(to bottom right, rgba(67,20,7,0.60), rgba(120,53,15,0.30), rgba(67,20,7,0.60))'
        : 'linear-gradient(to bottom right, rgba(254,243,199,0.92), rgba(255,251,235,0.70), rgba(254,243,199,0.88))'
    const totalTournaments = tournaments?.length ?? 0
    const totalPlayers = allPlayers?.length ?? 0
    const activeTournaments = tournaments?.filter(t => t.status === 'in_corso').length ?? 0

    // "Ultimo campione": non usare lastWinner/lastWinnerStats del context — quelli
    // valgono solo se il torneo più recente in assoluto è concluso, quindi sono
    // spesso null mentre c'è un torneo in corso. Cerchiamo invece il primo torneo
    // con un vincitore nell'elenco già ordinato per data desc.
    const lastChampionTournament = detailedTournaments.find((t) => t.winner_id) ?? null
    const lastChampion = lastChampionTournament?.winner ?? null
    const lastChampionStats = lastChampion ? (statsByPlayerId.get(lastChampion.id) ?? null) : null
    const lastChampionGame = lastChampionTournament ? games.find((g) => g.id === lastChampionTournament.game_id) : null
    const lastChampionFormatLabel = lastChampionTournament?.tournament_format === 'group_stage' ? 'Gironi' : 'Classic'
    const lastChampionParticipants = lastChampionTournament?.standings?.length ?? 0
    const lastChampionDateLabel = formatChampionDate(lastChampionTournament?.date)
    // Personaggi usati dal campione in QUESTO torneo (non solo il preferito) —
    // usedCharacterIds è già calcolato per standing in buildTournamentDetails.
    const lastChampionStanding = lastChampionTournament?.standings?.find((s) => s.playerId === lastChampion?.id) ?? null
    const lastChampionCharacters = (lastChampionStanding?.usedCharacterIds ?? [])
        .map((id) => charactersById.get(id))
        .filter(Boolean)
    // Podio del torneo: standings è la classifica ufficiale solo per i tornei
    // classic (per group_stage somma tutte le fasi/gironi, non ufficiale) — vedi
    // gotcha in CLAUDE.md. Per i gironi si resta senza podio piuttosto che
    // mostrare un ordine scorretto.
    const lastChampionPodium = lastChampionTournament && lastChampionTournament.tournament_format !== 'group_stage'
        ? (lastChampionTournament.standings ?? []).slice(0, 3)
        : []

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            <div
                className={`overflow-hidden rounded-[2rem] border-2 backdrop-blur-xl transition-all duration-500 ${goldCard ? 'gold-card-shimmer border-circuit-ink' : 'border-slate-900/70 dark:border-white/20'}`}
                style={{ background: goldCard ? goldBackground : theme.cardBackground, boxShadow: 'var(--circuit-shadow-lg)' }}
            >

                {/* ── Zone 3 "Chi rappresenti": niente più identità qui (già raccontata dalla Hero in cima) ── */}
                <div className="px-6 pt-5">
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme.tailwind.textStrong}`}>
                        {isSuperadmin ? 'Panoramica lega' : '🏁 Ultimo torneo'}
                    </p>
                </div>

                <div className="p-6 pt-3">
                    {isSuperadmin ? (
                        <div className="rounded-3xl border-2 border-slate-900/40 dark:border-white/15 p-4"
                            style={{ background: isChampion
                                ? (dark ? 'linear-gradient(to bottom right, rgba(67,20,7,0.60), rgba(120,53,15,0.30), rgba(67,20,7,0.60))' : 'linear-gradient(to bottom right, rgba(254,243,199,0.92), rgba(255,251,235,0.70), rgba(254,243,199,0.88))')
                                : (dark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.7)'),
                            boxShadow: 'var(--circuit-shadow-sm)' }}>
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
                    ) : lastChampion ? (
                        <div className="rounded-3xl border-2 border-amber-400/50 dark:border-amber-500/30 p-5 md:p-6"
                            style={{ background: dark
                                ? 'linear-gradient(to bottom right, rgba(67,20,7,0.60), rgba(120,53,15,0.30), rgba(67,20,7,0.60))'
                                : 'linear-gradient(to bottom right, rgba(254,243,199,0.92), rgba(255,251,235,0.70), rgba(254,243,199,0.88))',
                            boxShadow: 'var(--circuit-shadow-sm)' }}>

                            {/* ── 1. Torneo ── */}
                            <p className="line-clamp-2 text-2xl md:text-3xl font-black capitalize text-slate-900 dark:text-foreground leading-tight [text-shadow:0_1px_0_rgba(255,255,255,0.3)] dark:text-shadow-none">{lastChampionTournament.name}</p>

                            {/* ── 2. Vincitore — focal point della card, subito dopo il titolo ── */}
                            <div className="mt-3 flex items-center gap-4 rounded-2xl bg-white/30 dark:bg-black/15 p-3">
                                <div className="relative shrink-0">
                                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] border-amber-400 overflow-hidden bg-linear-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/20">
                                        <img
                                            src={lastChampion.img_url || buildAvatarPlaceholder(lastChampion.nickname)}
                                            alt={lastChampion.nickname}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-card bg-amber-400 shadow-md">
                                        <Crown size={10} className="text-amber-950" />
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70 dark:text-amber-400/60">Vinto da</p>
                                    <p className="truncate text-xl font-black capitalize text-slate-900 dark:text-foreground leading-tight">{lastChampion.nickname}</p>
                                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                        <Trophy size={11} />
                                        {(lastChampionStats?.tournamentWins ?? 1) > 1 ? `${lastChampionStats.tournamentWins}° titolo` : '1° titolo'}
                                    </span>
                                </div>
                            </div>

                            {/* ── 3. Dettagli torneo ── */}
                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-muted-foreground">
                                {lastChampionGame && (
                                    <span className="inline-flex items-center gap-1"><Gamepad2 size={11} className="text-amber-500/80" /> <span className="capitalize font-semibold text-slate-700 dark:text-foreground">{lastChampionGame.name}</span></span>
                                )}
                                <span className="text-amber-400/40">·</span>
                                <span className="font-medium text-slate-700 dark:text-foreground">{lastChampionFormatLabel}</span>
                                {lastChampionParticipants > 0 && (
                                    <>
                                        <span className="text-amber-400/40">·</span>
                                        <span className="inline-flex items-center gap-1"><Users2 size={11} className="text-amber-500/80" /> {lastChampionParticipants}</span>
                                    </>
                                )}
                                {lastChampionDateLabel && (
                                    <>
                                        <span className="text-amber-400/40">·</span>
                                        <span className="inline-flex items-center gap-1"><Calendar size={11} className="text-amber-500/80" /> {lastChampionDateLabel}</span>
                                    </>
                                )}
                            </div>

                            {/* ── 4. Podio — tre chip orizzontali a piena larghezza ── */}
                            {lastChampionPodium.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70 dark:text-amber-400/60">Podio</p>
                                    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        {lastChampionPodium.map((standing, idx) => (
                                            <div key={standing.playerId} className="flex items-center gap-2.5 rounded-xl bg-white/30 dark:bg-black/15 px-3 py-2.5">
                                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-700' : 'bg-orange-400 text-orange-950'}`}>
                                                    {idx + 1}
                                                </span>
                                                <img
                                                    src={standing.img_url || buildAvatarPlaceholder(standing.nickname)}
                                                    alt={standing.nickname}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                                                />
                                                <span className="min-w-0 flex-1 truncate text-sm font-bold capitalize text-slate-800 dark:text-foreground">{standing.nickname}</span>
                                                {standing.points != null && (
                                                    <span className="text-xs font-black text-amber-600/80 dark:text-amber-400/70">{standing.points}pt</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── 5. Personaggi usati — chip compatti a riga singola ── */}
                            {lastChampionCharacters.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70 dark:text-amber-400/60">Personaggi usati</p>
                                    <div className="mt-1.5 flex flex-wrap gap-2">
                                        {lastChampionCharacters.slice(0, 8).map((character) => (
                                            <div key={character.id} className="flex items-center gap-1.5 rounded-full bg-white/30 dark:bg-black/15 py-1 pl-1 pr-3">
                                                <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white dark:border-card bg-slate-100 dark:bg-slate-700/60">
                                                    {character.img_url ? (
                                                        <img src={character.img_url} alt={character.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-400">{character.name.charAt(0).toUpperCase()}</div>
                                                    )}
                                                </div>
                                                <span className="max-w-24 truncate text-[10px] font-bold capitalize text-slate-700 dark:text-foreground">{character.name}</span>
                                            </div>
                                        ))}
                                        {lastChampionCharacters.length > 8 && (
                                            <div className="flex items-center rounded-full border border-dashed border-amber-400/30 dark:border-amber-500/20 bg-white/20 dark:bg-black/10 px-3 py-1 text-[10px] font-black text-amber-600/60 dark:text-amber-400/50">
                                                +{lastChampionCharacters.length - 8} altri
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── 6. CTA ── */}
                            <Link
                                to={`/tournaments/${lastChampionTournament.id}`}
                                className="font-title mt-4 inline-flex items-center gap-1 text-[10px] tracking-wide text-amber-700 dark:text-amber-300 transition hover:text-amber-900 dark:hover:text-amber-100"
                            >
                                Vai al torneo →
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-5 py-8 text-center"
                            style={{ background: dark ? 'rgba(30,41,59,0.4)' : 'rgba(255,255,255,0.5)' }}>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                                <Trophy size={24} className="text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground">Nessun campione ancora</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default Hero
