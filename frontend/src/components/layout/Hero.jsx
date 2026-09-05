import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Gamepad2, Users2, Calendar, ArrowRight, Sparkles, UserPlus, BarChart3, Flag } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
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
    // "Dettagli torneo" (personaggi usati/premi/traguardi) chiuso di default
    // su mobile — dove impilare tutto sotto podio+meta creava troppo scroll
    // — aperto di default su desktop, dove lo spazio non manca. Calcolato
    // una sola volta al mount (non serve reagire al resize di una sezione
    // già aperta/chiusa manualmente dall'utente).
    const [detailsDefaultOpen] = useState(() => (
        typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
    ))
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
    const lastChampionRaceCount = lastChampionTournament?.races?.length ?? 0
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
            <div className="overflow-hidden rounded-[2rem] border-2 border-blue-500/30 bg-blue-950 p-6 md:p-8">
                <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:text-left">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15">
                        <UserPlus size={24} className="text-blue-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-blue-300">Benvenuto in Lega Kart</p>
                        <h2 className="mt-1 text-xl font-black text-white">Il tuo account non è ancora collegato a un giocatore</h2>
                        <p className="mt-1.5 text-sm text-slate-300">
                            Finché un admin non ti collega a un profilo giocatore non vedrai tornei, statistiche o badge personali — puoi comunque esplorare classifiche, tornei e regolamento nel frattempo.
                        </p>
                        <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
                            <Link to="/history" className="font-title rounded-xl border-2 border-blue-500/40 bg-transparent px-4 py-2 text-[10px] tracking-wide text-blue-300 transition hover:bg-blue-500/10">
                                Sfoglia i tornei
                            </Link>
                            <Link to="/faq" className="font-title rounded-xl bg-blue-600 px-4 py-2 text-[10px] tracking-wide text-white transition hover:bg-blue-500">
                                Leggi il regolamento
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Sfondo fisso, indipendente dal tema del sito e dall'accento profilo
    // dell'utente collegato — questo pannello vive dentro la dashboard Home,
    // già scura a prescindere dal tema (vedi Home.jsx), quindi non deve
    // seguire light/dark né il colore del personaggio preferito (creava un
    // riquadro quasi bianco o dai colori più disparati dentro un contenitore
    // nero, segnalato dall'utente).
    return (
        <div
            className="overflow-hidden rounded-[2rem] border-2 border-white/20 transition-all duration-500"
            style={{ background: 'linear-gradient(135deg, rgba(30,41,59,1), rgba(15,23,42,1))', boxShadow: 'var(--circuit-shadow-lg)' }}
        >
            <div className="px-6 pt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400/90">
                    🏁 Ultimo torneo
                </p>
            </div>

            <div className="p-6 pt-3">
                {lastChampion ? (
                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900"
                        style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                        {/* Accento oro ridotto a barra superiore — non più riempimento
                            pieno dietro tutto il blocco. */}
                        <div className="h-1 bg-linear-to-r from-circuit-gold/30 via-circuit-gold to-circuit-gold/30" />

                        <div className="bg-slate-900 p-5 md:p-6">
                            {/* ── 1. Torneo ── */}
                            <p title={lastChampionTournament.name} className="text-2xl md:text-3xl font-black text-white leading-tight">{formatTournamentTitle(lastChampionTournament.name, 60)}</p>

                            {/* ── 2. Vincitore — focal point della card, subito dopo il titolo.
                                Riga semplice separata da un divider sottile invece di una
                                mini-card con sfondo proprio ("incollata sopra" il genitore). ── */}
                            <div className="mt-4 flex items-center gap-4 border-t border-white/15 pt-4">
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
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Vinto da</p>
                                    <p className="truncate text-xl font-black capitalize text-white leading-tight">{lastChampion.nickname}</p>
                                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-black text-circuit-gold">
                                        {lastChampionBadge?.label ?? <><Trophy size={11} /></>}
                                        {(lastChampionStats?.tournamentWins ?? 1) > 1 ? ` · ${lastChampionStats.tournamentWins}° titolo` : ' · 1° titolo'}
                                    </span>
                                </div>
                            </div>

                            {/* ── 3. Pulsanti principali affiancati — due azioni distinte
                                (statistiche vs pagina torneo), non un toggle "dettagli"
                                duplicato con la sezione collassabile più sotto. ── */}
                            <div className="mt-4 flex items-center gap-2">
                                <Link
                                    to={`/tournaments/${lastChampionTournament.id}/stats`}
                                    className="font-title flex flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-circuit-gold px-3 py-2.5 text-[10px] tracking-widest text-circuit-gold transition hover:bg-circuit-gold/10"
                                >
                                    <BarChart3 size={13} /> Statistiche
                                </Link>
                                <Link
                                    to={`/tournaments/${lastChampionTournament.id}`}
                                    className="font-title flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-circuit-gold/40 bg-slate-800 px-3 py-2.5 text-[10px] tracking-widest text-amber-200 transition active:translate-y-px hover:bg-slate-700"
                                >
                                    Vai al torneo <ArrowRight size={13} />
                                </Link>
                            </div>

                            {/* ── 4. Riga compatta modalità/partecipanti/gare/data ── */}
                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-300">
                                {lastChampionGame && (
                                    <span className="inline-flex items-center gap-1"><Gamepad2 size={11} className="text-amber-400/80" /> <span className="capitalize font-semibold text-slate-200">{lastChampionGame.name}</span></span>
                                )}
                                <span className="text-amber-400/40">·</span>
                                <span className="font-medium text-slate-200">{lastChampionFormatLabel}</span>
                                {lastChampionParticipants > 0 && (
                                    <>
                                        <span className="text-amber-400/40">·</span>
                                        <span className="inline-flex items-center gap-1"><Users2 size={11} className="text-amber-400/80" /> {lastChampionParticipants}</span>
                                    </>
                                )}
                                {lastChampionRaceCount > 0 && (
                                    <>
                                        <span className="text-amber-400/40">·</span>
                                        <span className="inline-flex items-center gap-1"><Flag size={11} className="text-amber-400/80" /> {lastChampionRaceCount} gare</span>
                                    </>
                                )}
                                {lastChampionDateLabel && (
                                    <>
                                        <span className="text-amber-400/40">·</span>
                                        <span className="inline-flex items-center gap-1"><Calendar size={11} className="text-amber-400/80" /> {lastChampionDateLabel}</span>
                                    </>
                                )}
                            </div>

                            {/* ── 5. Podio finale — sempre visibile, tre chip orizzontali, 1°
                                posto graficamente più marcato. ── */}
                            {lastChampionPodium.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/70">Podio finale</p>
                                    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        {lastChampionPodium.map((standing, idx) => (
                                            <div
                                                key={standing.playerId}
                                                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${idx === 0 ? 'bg-amber-500/15 ring-1 ring-inset ring-amber-400/50' : 'bg-slate-800'}`}
                                            >
                                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${idx === 0 ? 'bg-amber-400 text-amber-950' : idx === 1 ? 'bg-slate-300 text-slate-700' : 'bg-orange-400 text-orange-950'}`}>
                                                    {idx + 1}
                                                </span>
                                                <img
                                                    src={standing.img_url || buildAvatarPlaceholder(standing.nickname)}
                                                    alt={standing.nickname}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className={`shrink-0 rounded-full object-cover ${idx === 0 ? 'h-10 w-10' : 'h-9 w-9'}`}
                                                />
                                                <span className="min-w-0 flex-1 truncate text-sm font-bold capitalize text-white">{standing.nickname}</span>
                                                {standing.points != null && (
                                                    <span className="text-xs font-black text-amber-300">{standing.points}pt</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── 6. Dettagli torneo — personaggi usati + premi + traguardi,
                            unico capitolo collassabile (variante scura, coerente col
                            resto del pannello). ── */}
                        <div className="p-5 pt-4 md:p-6 md:pt-4">
                            <CollapsibleSection
                                dark
                                title="Dettagli torneo"
                                subtitle="Personaggi usati, premi e traguardi"
                                icon={<Sparkles size={16} />}
                                defaultOpen={detailsDefaultOpen}
                            >
                                {lastChampionCharacters.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Personaggi usati dal vincitore</p>
                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                            {lastChampionCharacters.slice(0, 8).map((character) => (
                                                <div key={character.id} className="flex items-center gap-1.5 rounded-full bg-slate-700/60 py-1 pl-1 pr-3">
                                                    <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-600 bg-slate-700/60">
                                                        {character.img_url ? (
                                                            <img src={character.img_url} alt={character.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-400">{character.name.charAt(0).toUpperCase()}</div>
                                                        )}
                                                    </div>
                                                    <span className="max-w-24 truncate text-[10px] font-bold capitalize text-slate-200">{character.name}</span>
                                                </div>
                                            ))}
                                            {lastChampionCharacters.length > 8 && (
                                                <div className="flex items-center rounded-full border border-dashed border-slate-600 px-3 py-1 text-[10px] font-black text-slate-400">
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
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-600 bg-slate-800 p-5 py-8 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
                            <Trophy size={24} className="text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-400">Nessun campione ancora</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Hero
