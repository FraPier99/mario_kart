import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Gamepad2, Users2, Calendar, ArrowRight, Sparkles, UserPlus, ChevronDown } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { formatTournamentTitle } from '@/lib/utils'
import TournamentAwardsPanel from '@/components/layout/TournamentAwardsPanel'
import TournamentMilestonesPanel from '@/components/layout/TournamentMilestonesPanel'
import CollapsibleSection from '@/components/tournaments/CollapsibleSection'
import { detectTournamentMilestones } from '@/lib/milestones'
import { statsApi } from '@/services/apiClient'
import { TIER_BADGE_IMAGES } from '@/lib/playerBadges'
import { checkBadgeTierUps } from '@/lib/badgeTierToast'
import TierMedallion from '@/components/community/badges/TierMedallion'

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
    useEffect(() => {
        if (!player) return
        let active = true
        statsApi.playerBadges(player.id)
            .then((res) => { if (active) checkBadgeTierUps(player.id, res.data, games) })
            .catch(() => {})
        return () => { active = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player])
    // "Dettagli torneo" (personaggi usati/premi/traguardi) collassato di
    // default su mobile — dove impilare tutto sotto podio+meta+CTA creava
    // troppo scroll prima di arrivare a contenuti secondari — aperto di
    // default su desktop, dove lo spazio non manca. Calcolato una sola
    // volta al mount (non serve reagire al resize di una sezione già aperta
    // manualmente dall'utente).
    const [detailsDefaultOpen] = useState(() => (
        typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
    ))
    // Card "Ultimo torneo" chiusa di default (nome+vincitore soli occupano
    // molto meno spazio verticale di CTA+meta+podio+dettagli insieme) — si
    // apre solo su richiesta, invece di essere sempre alta in home.
    const [expanded, setExpanded] = useState(false)
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

    // Tier badge del vincitore per il gioco di questo torneo — stessa logica
    // di Stats.jsx (badge per-game_id, mai calcolato client-side).
    const [lastChampionBadges, setLastChampionBadges] = useState([])
    useEffect(() => {
        if (!lastChampion) return
        let active = true
        statsApi.playerBadges(lastChampion.id)
            .then((res) => { if (active) setLastChampionBadges(res.data ?? []) })
            .catch(() => { if (active) setLastChampionBadges([]) })
        return () => { active = false }
    }, [lastChampion])
    const lastChampionBadge = lastChampionTournament
        ? lastChampionBadges.find((b) => b.game_id === lastChampionTournament.game_id) ?? null
        : null

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
                <div className="overflow-hidden rounded-[2rem] border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950 p-6 md:p-8">
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
                className="overflow-hidden rounded-[2rem] border-2 border-slate-900/70 dark:border-white/20 transition-all duration-500"
                style={{ background: theme.cardBackground, boxShadow: 'var(--circuit-shadow-lg)' }}
            >

                {/* ── Zone 3 "Chi rappresenti": niente più identità qui (già raccontata dalla Hero in cima) ── */}
                <div className="px-6 pt-5">
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme.tailwind.textStrong}`}>
                        🏁 Ultimo torneo
                    </p>
                </div>

                <div className="p-6 pt-3">
                    {lastChampion ? (
                        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900"
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                            {/* Accento oro ridotto a barra superiore — non più riempimento
                                pieno dietro tutto il blocco. */}
                            <div className="h-1 bg-linear-to-r from-circuit-gold/30 via-circuit-gold to-circuit-gold/30" />

                            <div className="p-5 md:p-6">
                            {/* ── 1. Torneo ── */}
                            <p title={lastChampionTournament.name} className="text-2xl md:text-3xl font-black text-slate-900 dark:text-foreground leading-tight">{formatTournamentTitle(lastChampionTournament.name, 60)}</p>

                            {/* ── 2. Vincitore — focal point della card, subito dopo il titolo.
                                Riga semplice separata da un divider sottile invece di una
                                mini-card con sfondo proprio ("incollata sopra" il genitore). ── */}
                            <div className="mt-4 flex items-center gap-4 border-t border-slate-100 dark:border-white/10 pt-4">
                                {lastChampionBadge && TIER_BADGE_IMAGES[lastChampionBadge.tier] ? (
                                    <img
                                        src={TIER_BADGE_IMAGES[lastChampionBadge.tier]}
                                        alt={`Badge ${lastChampionBadge.label}`}
                                        className="h-14 w-14 shrink-0 object-contain"
                                    />
                                ) : lastChampionBadge ? (
                                    <TierMedallion tier={lastChampionBadge.tier} size={56} />
                                ) : (
                                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-circuit-gold">
                                        <img
                                            src={lastChampion.img_url || buildAvatarPlaceholder(lastChampion.nickname)}
                                            alt={lastChampion.nickname}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">Vinto da</p>
                                    <p className="truncate text-xl font-black capitalize text-slate-900 dark:text-foreground leading-tight">{lastChampion.nickname}</p>
                                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-black text-circuit-gold">
                                        {lastChampionBadge?.label ?? <><Trophy size={11} /></>}
                                        {(lastChampionStats?.tournamentWins ?? 1) > 1 ? ` · ${lastChampionStats.tournamentWins}° titolo` : ' · 1° titolo'}
                                    </span>
                                </div>
                            </div>

                            {/* ── Toggle — chiusa di default mostra solo titolo+vincitore
                                sopra; il resto (CTA, meta, podio, dettagli) si apre a
                                richiesta invece di occupare sempre tutto questo spazio. ── */}
                            <button
                                type="button"
                                onClick={() => setExpanded((v) => !v)}
                                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-circuit-gold px-3 py-2 text-[10px] font-black uppercase tracking-widest text-circuit-gold transition hover:bg-circuit-gold/10"
                            >
                                {expanded ? 'Mostra meno' : 'Mostra dettagli'}
                                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </button>

                            {expanded && (
                                <>
                                {/* ── 3. CTA ── */}
                                <div className="mt-3">
                                    <Link
                                        to={`/tournaments/${lastChampionTournament.id}`}
                                        className="font-title flex w-full items-center justify-center gap-2 rounded-xl border-2 border-circuit-gold/40 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[10px] tracking-wide text-amber-800 dark:text-amber-200 transition active:translate-y-px hover:bg-amber-50 dark:hover:bg-slate-700"
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
                                                <div key={standing.playerId} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
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
                                </>
                            )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-5 py-8 text-center">
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
