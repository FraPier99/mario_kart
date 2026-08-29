import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Crown, Gamepad2, Users2, Calendar, ArrowRight, Sparkles, UserPlus } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import TournamentAwardsPanel from '@/components/layout/TournamentAwardsPanel'
import TournamentMilestonesPanel from '@/components/layout/TournamentMilestonesPanel'
import CollapsibleSection from '@/components/tournaments/CollapsibleSection'
import { detectTournamentMilestones } from '@/lib/milestones'
import { statsApi } from '@/services/apiClient'
import { pickBestBadge, getProfileCardStyle } from '@/lib/playerBadges'
import { checkBadgeTierUps } from '@/lib/badgeTierToast'

const formatChampionDate = (value) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

const Hero = () => {
    const { statsByPlayerId, charactersById, detailedTournaments, games } = useAppData()
    const { user, isSuperadmin } = useAuth()
    const { dark } = useTheme()
    const theme = getProfileTheme(user, charactersById, dark)
    const player = user?.player ?? null
    const [badges, setBadges] = useState([])
    useEffect(() => {
        if (!player) return
        let active = true
        statsApi.playerBadges(player.id)
            .then((res) => {
                if (!active) return
                setBadges(res.data)
                checkBadgeTierUps(player.id, res.data, games)
            })
            .catch(() => { if (active) setBadges([]) })
        return () => { active = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player])
    const bestBadge = useMemo(() => pickBestBadge(badges), [badges])
    // "Dettagli torneo" (personaggi usati/premi/traguardi) collassato di
    // default su mobile — dove impilare tutto sotto podio+meta+CTA creava
    // troppo scroll prima di arrivare a contenuti secondari — aperto di
    // default su desktop, dove lo spazio non manca. Calcolato una sola
    // volta al mount (non serve reagire al resize di una sezione già aperta
    // manualmente dall'utente).
    const [detailsDefaultOpen] = useState(() => (
        typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
    ))
    // Stile "carta speciale" guidato dal tier reale del badge migliore
    // (leggenda/campione/veterano) — un superadmin non ha badge per
    // game_id (non gioca), quindi niente trattamento dorato automatico:
    // stessa regola già applicata in CommunityUserPage.jsx.
    const cardStyle = getProfileCardStyle(bestBadge?.tier)
    const cardTier = cardStyle ? bestBadge.tier : null
    const effectiveCardStyle = cardStyle
    const goldCard = Boolean(effectiveCardStyle)
    // Gradiente coerente col tier: oro per leggenda/campione, blu per
    // veterano — classi Tailwind con varianti dark:, non più un ternario
    // JS su `dark` + style inline (il resto della card usa ancora
    // style.background per theme.cardBackground, dinamico per utente e
    // quindi legittimamente inline — qui invece il gradiente è fisso).
    const goldCardBg = cardTier === 'veterano'
        ? 'bg-blue-50/50 dark:bg-blue-950/20'
        : 'bg-linear-to-br from-amber-100/92 via-amber-50/70 to-amber-100/88 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60'

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
    const lastChampionMilestones = lastChampionTournament
        ? detectTournamentMilestones({
            tournament: lastChampionTournament,
            standings: lastChampionTournament.standings ?? [],
            statsByPlayerId,
            detailedTournaments,
            gameName: lastChampionGame?.name,
        })
        : []

    // Un account loggato ma senza Player collegato (in attesa che un admin lo
    // colleghi a un giocatore) vedeva finora la stessa card "Ultimo torneo"
    // di chiunque altro, senza alcuna spiegazione del perché non trova le
    // proprie statistiche/tornei — qui gli si spiega la situazione invece.
    if (user && !isSuperadmin && !player) {
        return (
            <section className="mx-auto max-w-7xl px-4 py-8">
                <div className="overflow-hidden rounded-[2rem] border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-6 md:p-8">
                    <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:text-left">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-500/15">
                            <UserPlus size={24} className="text-blue-600 dark:text-blue-300" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Benvenuto in Lega Kart</p>
                            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-foreground">Il tuo account non è ancora collegato a un giocatore</h2>
                            <p className="mt-1.5 text-sm text-slate-600 dark:text-muted-foreground">
                                Finché un admin non ti collega a un profilo giocatore non vedrai tornei, statistiche o badge personali — puoi comunque esplorare classifiche, tornei e regolamento nel frattempo.
                            </p>
                            <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
                                <Link to="/history" className="font-title rounded-xl border-2 border-blue-300 dark:border-blue-500/40 bg-white dark:bg-transparent px-4 py-2 text-[10px] tracking-wide text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 dark:hover:bg-blue-500/10">
                                    Sfoglia i tornei
                                </Link>
                                <Link to="/faq" className="font-title rounded-xl bg-blue-600 px-4 py-2 text-[10px] tracking-wide text-white transition hover:bg-blue-500">
                                    Leggi il regolamento
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section className="mx-auto max-w-7xl px-4 py-8">
            <div
                className={`overflow-hidden rounded-[2rem] border-2 backdrop-blur-xl transition-all duration-500 ${goldCard ? `border-circuit-ink ${goldCardBg} ${effectiveCardStyle?.shimmer ? 'gold-card-shimmer' : ''}` : 'border-slate-900/70 dark:border-white/20'}`}
                style={{ background: goldCard ? undefined : theme.cardBackground, boxShadow: 'var(--circuit-shadow-lg)' }}
            >

                {/* ── Zone 3 "Chi rappresenti": niente più identità qui (già raccontata dalla Hero in cima) ── */}
                <div className="px-6 pt-5">
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme.tailwind.textStrong}`}>
                        🏁 Ultimo torneo
                    </p>
                </div>

                <div className="p-6 pt-3">
                    {lastChampion ? (
                        <div className="rounded-3xl border-2 border-amber-400/50 dark:border-amber-500/30 bg-linear-to-br from-amber-100/92 via-amber-50/70 to-amber-100/88 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60 p-5 md:p-6"
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>

                            <div>
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

                            {/* ── 3. CTA — spostata subito dopo il vincitore (era in fondo alla
                                colonna, dopo meta/podio/personaggi): l'azione principale va
                                raggiunta senza dover scrollare oltre tutto il resto. ── */}
                            <div className="mt-3">
                                <Link
                                    to={`/tournaments/${lastChampionTournament.id}`}
                                    className="font-title flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-600/40 dark:border-amber-400/30 bg-white/40 dark:bg-black/20 px-4 py-3 text-[10px] tracking-wide text-amber-800 dark:text-amber-200 transition active:translate-y-px hover:bg-white/60 dark:hover:bg-black/30"
                                >
                                    Vai al torneo <ArrowRight size={14} />
                                </Link>
                            </div>

                            {/* ── 4. Dettagli torneo ── */}
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

                            {/* ── 5. Dettagli torneo — personaggi usati + premi + traguardi,
                                raggruppati in un unico capitolo collassabile (chiuso di default
                                su mobile, aperto su desktop dove lo spazio non manca): prima
                                erano impilati per intero, costringendo a scorrere oltre podio e
                                personaggi prima di arrivare a premi/traguardi. ── */}
                            <div className="mt-4">
                                <CollapsibleSection
                                    title="Dettagli torneo"
                                    subtitle="Personaggi usati, premi e traguardi"
                                    icon={<Sparkles size={16} />}
                                    defaultOpen={detailsDefaultOpen}
                                >
                                    {lastChampionCharacters.length > 0 && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">Personaggi usati dal vincitore</p>
                                            <div className="mt-1.5 flex flex-wrap gap-2">
                                                {lastChampionCharacters.slice(0, 8).map((character) => (
                                                    <div key={character.id} className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-muted py-1 pl-1 pr-3">
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
                                                    <div className="flex items-center rounded-full border border-dashed border-slate-300 dark:border-slate-600 px-3 py-1 text-[10px] font-black text-slate-500 dark:text-muted-foreground">
                                                        +{lastChampionCharacters.length - 8} altri
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <TournamentAwardsPanel
                                        tournamentId={lastChampionTournament.id}
                                        tournamentFormat={lastChampionTournament.tournament_format}
                                        standings={lastChampionTournament.standings}
                                    />
                                    <TournamentMilestonesPanel milestones={lastChampionMilestones} />
                                </CollapsibleSection>
                            </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-800/40 p-5 py-8 text-center">
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
