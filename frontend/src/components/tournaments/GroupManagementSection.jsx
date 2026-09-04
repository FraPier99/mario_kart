/**
 * GroupManagementSection — Pannello di gestione per tornei a gironi N-flessibili
 *
 * Sostituisce ResultEntryForm + RaceCreator nella sezione admin di TournamentDetail
 * quando tournament.tournament_format === 'group_stage'.
 *
 * La schermata è divisa in capitoli per fase, ciascuno con il proprio
 * "Avanza alla fase successiva" dove applicabile:
 *   1. Generale         — stepper di fase, seeding (legacy) e plancia live
 *   2. Gironi           — Fase 1: inserimento gare, spareggi, avanzamento
 *   3. Semifinali       — Fase 2 (solo con 3+ gironi): batterie, spareggi, avanzamento
 *   4. Finali           — Finale + Consolazione: inserimento gare
 *   5. Classifica Finale — podio Final 4, spareggi di podio e vincitore
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Shuffle, Trophy, Medal, Loader2, CheckCircle2, AlertCircle, Swords, Dices, Flag, Users, Lock, Unlock, Settings, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { tournamentsApi, getApiErrorMessage } from '@/services/apiClient'
import { useAppData } from '@/context/AppDataContext'
import CollapsibleSection from './CollapsibleSection'
import GroupRaceForm from './GroupRaceForm'
import PhaseCircuitsCard from './PhaseCircuitsCard'
import GroupPlancia, { GroupCard } from './GroupPlancia'
import FinalsPodiumDuelCard from './FinalsPodiumDuelCard'
import ConsolationPodiumDuelCard from './ConsolationPodiumDuelCard'
import TournamentResolutionNotes from './TournamentResolutionNotes'
import OverallClassificaCard from './OverallClassificaCard'
import WinnerFinalizeCard from './WinnerFinalizeCard'
import { consolationHeatKeysFromFormatData, groupColor, groupKeysFromFormatData, groupLabel, semifinalKeysFromFormatData, passScopeKey, isPassEnabledForScope } from '@/lib/groupStage'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEED_CARD_CLASSES = {
    blue:    { border: 'border-blue-200 dark:border-blue-500/30',       bg: 'bg-blue-50/60 dark:bg-blue-900/15',       text: 'text-blue-600 dark:text-blue-400' },
    violet:  { border: 'border-violet-200 dark:border-violet-500/30',   bg: 'bg-violet-50/60 dark:bg-violet-900/15',   text: 'text-violet-600 dark:text-violet-400' },
    emerald: { border: 'border-emerald-200 dark:border-emerald-500/30', bg: 'bg-emerald-50/60 dark:bg-emerald-900/15', text: 'text-emerald-600 dark:text-emerald-400' },
    rose:    { border: 'border-rose-200 dark:border-rose-500/30',       bg: 'bg-rose-50/60 dark:bg-rose-900/15',       text: 'text-rose-600 dark:text-rose-400' },
    cyan:    { border: 'border-cyan-200 dark:border-cyan-500/30',       bg: 'bg-cyan-50/60 dark:bg-cyan-900/15',       text: 'text-cyan-600 dark:text-cyan-400' },
    fuchsia: { border: 'border-fuchsia-200 dark:border-fuchsia-500/30', bg: 'bg-fuchsia-50/60 dark:bg-fuchsia-900/15', text: 'text-fuchsia-600 dark:text-fuchsia-400' },
    lime:    { border: 'border-lime-200 dark:border-lime-500/30',       bg: 'bg-lime-50/60 dark:bg-lime-900/15',       text: 'text-lime-600 dark:text-lime-400' },
    orange:  { border: 'border-orange-200 dark:border-orange-500/30',   bg: 'bg-orange-50/60 dark:bg-orange-900/15',   text: 'text-orange-600 dark:text-orange-400' },
    amber:   { border: 'border-amber-200 dark:border-amber-500/30',     bg: 'bg-amber-50/60 dark:bg-amber-900/15',     text: 'text-amber-600 dark:text-amber-400' },
    slate:   { border: 'border-slate-200 dark:border-slate-500/30',     bg: 'bg-slate-50/60 dark:bg-slate-900/15',     text: 'text-slate-600 dark:text-slate-400' },
}

const TAB_ACTIVE_CLASSES = {
    blue:    'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    violet:  'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300',
    emerald: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    rose:    'border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300',
    cyan:    'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300',
    fuchsia: 'border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-700 dark:text-fuchsia-300',
    lime:    'border-lime-400 bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300',
    orange:  'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    amber:   'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
    slate:   'border-slate-400 bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300',
}

// Composizione persistita di una fase di passaggio (gironi/semifinale/finale)
const seededForPhase = (tournament, phase, key) => {
    const fd = tournament.format_data ?? {}
    if (phase === 'semifinal') return fd.semifinals?.[key] ?? []
    if (phase === 'finals') {
        // "bottom_B1"/"bottom_B2"/... → batterie della Finalina quando supera i
        // 4 giocatori (vincolo schermo), salvate in finals.bottom_heats.B1/B2/...
        if (key?.startsWith('bottom_')) return fd.finals?.bottom_heats?.[key.slice('bottom_'.length)] ?? []
        return fd.finals?.[key] ?? []
    }
    return fd.groups?.[key] ?? []
}

// ─── Sub-componente: Card Seeding (fallback legacy) ───────────────────────────
const SeedingCard = ({ tournament, players, onRefresh }) => {
    const [seeding, setSeeding] = useState(false)
    const [result, setResult]   = useState(null)

    const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

    const handleSeed = async () => {
        setSeeding(true)
        try {
            const res = await tournamentsApi.seedGroups(tournament.id)
            setResult(res.data)
            toast.success('Gironi assegnati!')
            await onRefresh()
        } catch (err) {
            toast.error('Seeding fallito', { description: getApiErrorMessage(err) })
        } finally {
            setSeeding(false)
        }
    }

    const displayGroups = result?.groups ?? tournament.format_data?.groups ?? null
    const groupKeys = displayGroups ? Object.keys(displayGroups).sort((a, b) => Number(a) - Number(b)) : []

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-600">Seeding gironi</p>
                    <h3 className="mt-1.5 text-xl font-black text-slate-900 dark:text-foreground">Assegnazione gironi</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                        Il sistema divide i giocatori in gironi equilibrati sul ranking storico,
                        con un massimo di 4 per girone (vincolo schermo): 8 → 4+4, 10 → 4+3+3, 12 → 4+4+4.
                        Puoi eseguire il seeding più volte prima di avviare il torneo.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSeed}
                    disabled={seeding || tournament.status !== 'da_svolgere'}
                    className="flex items-center gap-2 rounded-2xl bg-violet-500 hover:bg-violet-400 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition active:scale-95"
                >
                    {seeding
                        ? <><Loader2 size={14} className="animate-spin" /> Calcolo...</>
                        : <><Shuffle size={14} /> {displayGroups ? 'Rigenera gironi' : 'Genera gironi'}</>
                    }
                </button>
            </div>

            {displayGroups && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {groupKeys.map((g) => {
                        const cls = SEED_CARD_CLASSES[groupColor(g)] ?? SEED_CARD_CLASSES.slate
                        return (
                            <div key={g} className={`rounded-2xl border p-4 space-y-2 ${cls.border} ${cls.bg}`}>
                                <p className={`text-[9px] font-black uppercase tracking-[0.35em] ${cls.text}`}>
                                    {groupLabel(g)}
                                </p>
                                {(displayGroups[g] ?? []).map((pid, idx) => {
                                    const p = playerMap.get(pid)
                                    return (
                                        <div key={pid} className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-400 w-4">{idx + 1}.</span>
                                            {p?.img_url
                                                ? <img src={p.img_url} alt={p.nickname} className="h-6 w-6 rounded-lg object-cover border border-white dark:border-border" />
                                                : <div className="h-6 w-6 rounded-lg bg-slate-200 dark:bg-muted flex items-center justify-center text-[9px] font-black">{p?.nickname?.charAt(0)?.toUpperCase() ?? '?'}</div>
                                            }
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{p?.nickname ?? `#${pid}`}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            )}

            {tournament.status !== 'da_svolgere' && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-2.5">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <p className="text-xs font-black text-slate-500 dark:text-muted-foreground">Torneo avviato — seeding bloccato</p>
                </div>
            )}
        </div>
    )
}

// ─── Sub-componente: Inserimento gare scoped a una fase ───────────────────────
const PhaseRaceEntry = ({ tournament, players, circuits, characters, results, phase, groups, completedGroups = new Set(), onRefresh }) => {
    const [selectedGroup, setSelectedGroup] = useState(groups[0])
    // Se il gruppo selezionato non è più tra quelli disponibili (es. cambio fase), ricadi sul primo
    const activeGroup = groups.includes(selectedGroup) ? selectedGroup : groups[0]

    const activeGroupPlayers = useMemo(() => {
        let ids = []
        if (phase === 'group') {
            ids = tournament.format_data?.groups?.[activeGroup] ?? []
        } else {
            const matchingRaces = (tournament.races ?? []).filter(
                (r) => r.phase === phase && r.group_name === activeGroup
            )
            if (matchingRaces.length > 0) {
                const raceIdSet = new Set(matchingRaces.map((r) => r.id))
                ids = [...new Set(
                    results.filter((res) => raceIdSet.has(res.race_id)).map((res) => res.player_id)
                )]
            } else {
                const persisted = seededForPhase(tournament, phase, activeGroup)
                ids = persisted.length > 0 ? persisted : (tournament.participant_ids ?? [])
            }
        }

        // I giocatori "Ritirati" restano in classifica con i punti già ottenuti,
        // ma non vanno più assegnati a gare future.
        const withdrawnIds = new Set(tournament.withdrawn_player_ids ?? [])
        return players.filter((p) => ids.includes(p.id) && !withdrawnIds.has(p.id))
    }, [tournament, players, results, phase, activeGroup])

    // Quanti dei giocatori assegnati a questo girone/fase risultano ritirati
    const withdrawnInActiveGroupCount = useMemo(() => {
        const ids = seededForPhase(tournament, phase, activeGroup)
        const withdrawnIds = new Set(tournament.withdrawn_player_ids ?? [])
        return ids.filter((id) => withdrawnIds.has(id)).length
    }, [tournament, phase, activeGroup])

    // Circuiti disponibili/utilizzati per questa fase/girone — pool indipendente
    // per ogni girone, si azzera al passaggio di fase (stesso filtro di GroupRaceForm)
    const phaseGroupRaces = useMemo(
        () => (tournament.races ?? []).filter((r) => r.phase === phase && r.group_name === activeGroup),
        [tournament.races, phase, activeGroup]
    )

    // Inclusione circuiti a pass/DLC — indipendente per ogni girone/fase,
    // modificabile dall'admin in qualsiasi momento del torneo.
    const passScope = passScopeKey(phase, activeGroup)
    const passEnabled = isPassEnabledForScope(tournament.format_data, passScope)
    const gameHasPassCircuits = circuits.some((c) => c.requires_pass)
    const [togglingPass, setTogglingPass] = useState(false)
    const { patchTournament } = useAppData()
    const visibleCircuitsForForm = useMemo(
        () => passEnabled ? circuits : circuits.filter((c) => !c.requires_pass),
        [circuits, passEnabled]
    )

    const handleTogglePass = async () => {
        setTogglingPass(true)
        try {
            const res = await tournamentsApi.setPassCircuits(tournament.id, passScope, !passEnabled)
            // Niente onRefresh() qui: GET /tournaments ha una cache HTTP di
            // 10s (vedi commento sul controller) che riporterebbe indietro
            // il valore appena cambiato — l'aggiornamento locale via
            // patchTournament basta, format_data non tocca altri dati.
            patchTournament(tournament.id, { format_data: res.data.format_data })
        } catch (err) {
            toast.error('Aggiornamento non riuscito', { description: getApiErrorMessage(err) })
        } finally {
            setTogglingPass(false)
        }
    }

    return (
        <div className="space-y-4">
            {groups.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {groups.map((g) => (
                        <button
                            key={g}
                            type="button"
                            onClick={() => setSelectedGroup(g)}
                            className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-widest transition ${activeGroup === g
                                ? TAB_ACTIVE_CLASSES[groupColor(g)] ?? TAB_ACTIVE_CLASSES.slate
                                : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-500 hover:border-slate-300'}`}
                        >
                            {groupLabel(g)}
                        </button>
                    ))}
                </div>
            )}

            {gameHasPassCircuits && (
                <button
                    type="button"
                    onClick={handleTogglePass}
                    disabled={togglingPass}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2 text-xs font-black uppercase tracking-widest transition disabled:opacity-60 ${passEnabled
                        ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-500 dark:text-muted-foreground'}`}
                >
                    <CreditCard size={13} />
                    {passEnabled
                        ? `Circuiti a pass/DLC inclusi per ${groupLabel(activeGroup)} — tocca per escluderli`
                        : `Circuiti a pass/DLC esclusi per ${groupLabel(activeGroup)} — tocca per includerli`}
                </button>
            )}

            <PhaseCircuitsCard circuits={circuits} races={phaseGroupRaces} title={`Circuiti · ${groupLabel(activeGroup)}`} passEnabled={passEnabled} />

            {tournament.status === 'concluso' ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10 px-4 py-3">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-black">
                        Torneo concluso — non è possibile inserire altre gare.
                    </p>
                </div>
            ) : completedGroups.has(activeGroup) ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10 px-4 py-3">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-black">
                        {groupLabel(activeGroup)} completato — non è più possibile aggiungere gare.
                    </p>
                </div>
            ) : activeGroupPlayers.length < 2 ? (
                <div className="flex items-center gap-2 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
                    <AlertCircle size={13} className="text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-black">
                        {!tournament.format_data?.groups
                            ? 'Esegui prima il seeding per assegnare i giocatori ai gironi.'
                            : withdrawnInActiveGroupCount > 0
                                ? `${groupLabel(activeGroup)}: solo ${activeGroupPlayers.length} piloti attivi (${withdrawnInActiveGroupCount} ritirat${withdrawnInActiveGroupCount === 1 ? 'o' : 'i'}).`
                                : `${groupLabel(activeGroup)}: servono almeno 2 piloti. Genera/verifica la composizione di questa fase.`}
                    </p>
                </div>
            ) : (
                <GroupRaceForm
                    tournament={tournament}
                    activeGroupPlayers={activeGroupPlayers}
                    circuits={visibleCircuitsForForm}
                    characters={characters}
                    phase={phase}
                    groupName={activeGroup}
                    onCreated={onRefresh}
                />
            )}
        </div>
    )
}

// ─── Sub-componente: Avanza alla fase successiva (gironi→semi/finale, semi→finale) ─
const PhaseAdvanceCard = ({ tournament, onRefresh, phase }) => {
    const [loading, setLoading] = useState(false)
    const [confirm, setConfirm] = useState(null) // null | { type: 'incomplete' } | { type: 'ties' }
    const [ties, setTies] = useState(null)

    const fd = tournament.format_data ?? {}
    const groupKeys = groupKeysFromFormatData(fd)
    const semiKeys = semifinalKeysFromFormatData(fd)
    const finalsReady = (fd.finals?.top ?? []).length > 0
    const semisReady = semiKeys.length > 0
    // Con ≥3 gironi i qualificati (2 per girone) superano i 4 posti finale → serve la semifinale
    const predictedSemi = groupKeys.length >= 3

    const currentPhaseGroupsMap = phase === 'semifinal' ? (fd.semifinals ?? {}) : (fd.groups ?? {})

    // Gare previste per questa fase che non hanno ancora tutti i risultati inseriti
    const incompleteRaces = useMemo(() => {
        return (tournament.races ?? []).filter((r) => {
            if (r.phase !== phase || r.is_duello) return false
            const groupPlayers = currentPhaseGroupsMap[r.group_name] ?? []
            const expected = Math.min(Math.max(groupPlayers.length, 2), 4)
            return (r.resultCount ?? r.results?.length ?? 0) < expected
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournament.races, phase, tournament.format_data])

    // Pareggi al posto di qualificazione, controllati proattivamente
    useEffect(() => {
        let active = true
        tournamentsApi.groupStageTies(tournament.id)
            .then((res) => { if (active) setTies(res.data) })
            .catch(() => { if (active) setTies(null) })
        return () => { active = false }
    }, [tournament.id, tournament.races, tournament.format_data])

    const tieCount = ties?.phase === phase ? Object.keys(ties.ties ?? {}).length : 0

    // Per la fase gironi: verifica che tutti i gironi siano completati
    const completedGroups = new Set(fd.completed_groups ?? [])
    const allGroupsComplete = groupKeys.length > 0 && groupKeys.every((k) => completedGroups.has(k))

    // Questa card è rilevante solo quando questa fase è quella corrente da cui avanzare
    const isCurrentPhase = phase === 'semifinal' ? semisReady : !semisReady
    if (finalsReady || !isCurrentPhase) return null

    const label = phase === 'semifinal'
        ? 'Componi Finale'
        : (predictedSemi ? 'Genera Semifinali' : 'Genera Finale')

    const description = phase === 'semifinal'
        ? 'Inserisci i risultati delle batterie, poi premi per comporre la Final 4 dai migliori.'
        : predictedSemi
            ? 'Con 3+ gironi i 2 qualificati per girone superano i 4 posti: prima si gioca una semifinale, poi la Final 4.'
            : 'Calcola i qualificati alla Finale (Final 4) e chi va in Consolazione. Esegui quando le gare dei gironi sono complete.'

    const criterionNote = phase === 'semifinal'
        ? 'Criterio Final 4: prima i vincitori di ogni batteria (per punti), poi i secondi migliori per punti, fino a riempire i 4 posti.'
        : 'Criterio qualificazione: i primi 2 di ogni girone, ordinati per punti → vittorie di gara → podi → spareggio in caso di parità.'

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const res = await tournamentsApi.generateFinals(tournament.id)
            toast.success('Fase aggiornata!', { description: res.data.messaggio })
            await onRefresh()
        } catch (err) {
            toast.error('Errore avanzamento fase', { description: getApiErrorMessage(err) })
        } finally {
            setLoading(false)
        }
    }

    // Verifica gare incomplete, pareggi e completamento gironi prima di avanzare fase.
    const handleGenerateClick = async () => {
        if (phase === 'group' && !allGroupsComplete) {
            toast.error('Completa prima tutti i gironi.')
            return
        }
        if (incompleteRaces.length > 0) {
            setConfirm({ type: 'incomplete' })
            return
        }
        if (tieCount > 0) {
            setConfirm({ type: 'ties' })
            return
        }
        await handleGenerate()
    }

    const handleConfirmProceed = async () => {
        setConfirm(null)
        await handleGenerate()
    }

    const handleConfirmDismiss = () => {
        if (confirm?.type === 'ties') {
            toast.info('Crea il duello di spareggio dalla card "Spareggio" qui sopra, poi riprova ad avanzare la fase.')
        }
        setConfirm(null)
    }

    return (
        <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-900/10 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">Avanzamento fase</p>
                    <h3 className="mt-1.5 text-xl font-black text-slate-900 dark:text-foreground">{label}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
                    <p className="mt-1 text-xs italic text-slate-400 dark:text-muted-foreground">{criterionNote}</p>
                </div>
                <button
                    type="button"
                    onClick={handleGenerateClick}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition active:scale-95"
                >
                    {loading
                        ? <><Loader2 size={14} className="animate-spin" /> Calcolo...</>
                        : <><Trophy size={14} /> Avanza alla fase successiva</>
                    }
                </button>
            </div>

            {/* Nota preventiva: stato delle gare e dei pareggi prima di avanzare */}
            <div className="rounded-2xl border border-slate-200 dark:border-border bg-white/60 dark:bg-card/60 p-3.5 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-muted-foreground">Nota preventiva</p>
                <div className="flex flex-wrap gap-2 text-[11px] font-black">
                    {phase === 'group' && (
                        <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 ${allGroupsComplete ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
                            {allGroupsComplete ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            {allGroupsComplete ? 'Tutti i gironi completati' : `${groupKeys.filter(k => !completedGroups.has(k)).length} gironi da completare`}
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 ${incompleteRaces.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}>
                        {incompleteRaces.length > 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                        {incompleteRaces.length > 0 ? `${incompleteRaces.length} gare mancanti` : 'Tutte le gare inserite'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 ${tieCount > 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}>
                        {tieCount > 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                        {tieCount > 0 ? `${tieCount} pari punti da risolvere` : 'Nessun pareggio in classifica'}
                    </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-muted-foreground">
                    Puoi avanzare comunque: ti verrà chiesta una conferma se ci sono gare mancanti o pareggi non risolti.
                </p>
            </div>

            {/* Conferma avanzamento fase: gare incomplete / pareggi al posto di qualificazione */}
            {confirm && (
                <div className="fixed inset-0 z-200 overflow-y-auto bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="advance-phase-confirm-title">
                    <div className="mx-auto my-8 w-full max-w-md rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-card p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle size={18} className="shrink-0" />
                            <p id="advance-phase-confirm-title" className="text-xs font-black uppercase tracking-[0.3em]">Attenzione</p>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-muted-foreground">
                            {confirm.type === 'incomplete'
                                ? 'Alcune gare previste non sono ancora state completate. Come desideri procedere?'
                                : 'Sono presenti giocatori a pari punti che influenzano il passaggio del turno. Come desideri procedere?'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleConfirmDismiss}
                                className="flex-1 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:border-slate-300"
                            >
                                {confirm.type === 'incomplete' ? 'Torna alle gare' : 'Crea duelli spareggio'}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmProceed}
                                className="flex-1 rounded-2xl bg-amber-500 hover:bg-amber-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition"
                            >
                                Avanza comunque
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Sub-componente: Vincitore Consolazione ────────────────────────────────────
const ConsolazioneCard = ({ tournament, players, onRefresh }) => {
    const [deciding, setDeciding] = useState(false)
    const [ties, setTies] = useState(null)
    const [loadingTies, setLoadingTies] = useState(true)

    const hasBottomRaces = (tournament.races ?? []).some((r) => r.phase === 'finals' && (r.group_name === 'bottom' || r.group_name?.startsWith('bottom_B')))

    useEffect(() => {
        if (!hasBottomRaces || tournament.consolation_winner_id) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoadingTies(false)
            return undefined
        }
        let active = true
        setLoadingTies(true)
        tournamentsApi.consolationTies(tournament.id)
            .then((res) => { if (active) setTies(res.data) })
            .catch(() => { if (active) setTies(null) })
            .finally(() => { if (active) setLoadingTies(false) })
        return () => { active = false }
    }, [tournament.id, tournament.consolation_winner_id, tournament.races, hasBottomRaces])

    if (!hasBottomRaces) return null

    if (tournament.consolation_winner_id) {
        const winner = players.find((p) => p.id === tournament.consolation_winner_id)
        return (
            <div className="flex items-center gap-3 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card px-5 py-4 shadow-sm">
                <Medal size={18} className="text-slate-400 shrink-0" />
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Vincitore Consolazione</p>
                    <p className="text-sm font-black text-slate-900 dark:text-foreground">{winner?.nickname ?? `#${tournament.consolation_winner_id}`}</p>
                </div>
            </div>
        )
    }

    // Stessi blocchi della Finale principale (get_finals_podium_ties):
    // niente scelta manuale, il sistema legge la classifica reale già
    // risolta — ma serve che ogni spareggio di Consolazione sia stato
    // giocato prima di potercisi affidare.
    const unresolvedTies = ties
        ? [ties.top2, ties.top4, ...(ties.others ?? [])].filter((t) => t && t.order === null)
        : []

    const handleDecide = async () => {
        setDeciding(true)
        try {
            await tournamentsApi.decreeConsolationWinner(tournament.id)
            toast.success('Vincitore Consolazione decretato!')
            await onRefresh()
        } catch (err) {
            toast.error('Errore', { description: getApiErrorMessage(err) })
        } finally {
            setDeciding(false)
        }
    }

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 dark:text-muted-foreground">Vincitore Consolazione</p>
            {!loadingTies && unresolvedTies.length > 0 ? (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-900/10 px-4 py-3">
                    <AlertCircle size={13} className="text-rose-500 shrink-0" />
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-black">
                        Risolvi prima gli spareggi di Consolazione (sezione "Classifica Finale").
                    </p>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleDecide}
                    disabled={deciding || loadingTies}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-slate-700 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition active:scale-95"
                >
                    {deciding ? <><Loader2 size={14} className="animate-spin" /> Calcolo...</> : <><Medal size={14} /> Decreta Vincitore Finalina</>}
                </button>
            )}
        </div>
    )
}

// ─── Sub-componente: Spareggio Gironi (pareggio al posto di qualificazione) ───
const SpareggioGironiCard = ({ tournament, players, circuits, characters, onRefresh, phaseFilter }) => {
    const [data, setData]           = useState(null)
    const [loading, setLoading]     = useState(true)
    const [activeTieKey, setActiveTieKey] = useState(null)

    const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

    useEffect(() => {
        let active = true
        tournamentsApi.groupStageTies(tournament.id)
            .then((res) => { if (active) setData(res.data) })
            .catch(() => { if (active) setData(null) })
            .finally(() => { if (active) setLoading(false) })
    }, [tournament.id, tournament.races, tournament.format_data])

    const tieEntries = data?.ties ? Object.entries(data.ties) : []
    if (loading || tieEntries.length === 0) return null
    if (phaseFilter && data.phase !== phaseFilter) return null

    const phaseLabel = data.phase === 'semifinal' ? 'Semifinali' : data.phase === 'finals' ? 'Ultimo posto Finale' : 'Gironi'

    return (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-900/10 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <Swords size={16} className="text-rose-500 shrink-0" />
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-600">Spareggio {phaseLabel}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Pareggio al posto di qualificazione</h3>
                </div>
            </div>

            {tieEntries.map(([key, ids]) => {
                const tiedPlayers = ids.map((id) => playerMap.get(id)).filter(Boolean)
                const isOpen = activeTieKey === key
                const duelRaces = (tournament.races ?? []).filter(
                    (r) => r.is_duello && r.phase === data.phase && r.group_name === key
                )
                const wins = new Map(ids.map((id) => [id, 0]))
                duelRaces.forEach((race) => {
                    const winner = race.results?.find((r) => r.position === 1)
                    if (winner && wins.has(winner.player_id)) {
                        wins.set(winner.player_id, (wins.get(winner.player_id) ?? 0) + 1)
                    }
                })
                return (
                    <div key={key} className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-card p-4 space-y-3">
                        <p className="text-sm text-slate-600 dark:text-muted-foreground">
                            <span className="font-black text-slate-900 dark:text-foreground">{groupLabel(key)}</span>:
                            {' '}pareggio su punti, vittorie e podi tra{' '}
                            <span className="font-black text-rose-600 dark:text-rose-400">
                                {tiedPlayers.map((p) => p.nickname).join(' e ')}
                            </span>.
                            Spareggio al meglio (primo a 2 vittorie) su piste random per decidere chi avanza.
                        </p>
                        {duelRaces.length > 0 && (
                            <div className="flex items-center gap-3 text-xs">
                                {tiedPlayers.map((p) => (
                                    <span key={p.id} className="font-black text-slate-700 dark:text-slate-300">
                                        {p.nickname}: {wins.get(p.id) ?? 0} vittorie
                                    </span>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setActiveTieKey(isOpen ? null : key)}
                            className="flex items-center gap-2 rounded-2xl bg-rose-500 hover:bg-rose-400 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition active:scale-95"
                        >
                            <Dices size={14} /> {isOpen ? 'Annulla' : `Genera gara di spareggio (pista random)${duelRaces.length > 0 ? ` — gara ${duelRaces.length + 1}` : ''}`}
                        </button>
                        {isOpen && (() => {
                            const tiePassEnabled = isPassEnabledForScope(tournament.format_data, passScopeKey(data.phase, key))
                            const tieCircuits = tiePassEnabled ? circuits : circuits.filter((c) => !c.requires_pass)
                            return (
                                <div className="rounded-2xl border border-slate-200 dark:border-border bg-slate-50/60 dark:bg-muted/30 p-4">
                                    <GroupRaceForm
                                        tournament={tournament}
                                        activeGroupPlayers={tiedPlayers}
                                        circuits={tieCircuits}
                                        characters={characters}
                                        phase={data.phase}
                                        groupName={key}
                                        randomizeCircuit
                                        onCreated={() => { setActiveTieKey(null); onRefresh() }}
                                    />
                                </div>
                            )
                        })()}
                    </div>
                )
            })}
        </div>
    )
}

// ─── Sub-componente: Stepper di fase ──────────────────────────────────────────
const PhaseStepper = ({ tournament, semiKeys }) => {
    const fd = tournament.format_data ?? {}
    const hasGroups = Object.keys(fd.groups ?? {}).length > 0
    const finalsComposed = (fd.finals?.top ?? []).length > 0
    const needsSemi = semiKeys.length > 0
    const isDone = Boolean(tournament.winner_id)

    // Fase corrente
    let current = 'group'
    if (!hasGroups) current = 'seeding'
    else if (isDone) current = 'done'
    else if (finalsComposed) current = 'finals'
    else if (needsSemi) current = 'semifinal'

    const steps = [
        { key: 'group', label: 'Gironi' },
        ...(needsSemi ? [{ key: 'semifinal', label: 'Semifinali' }] : []),
        { key: 'finals', label: 'Finale' },
        { key: 'done', label: 'Concluso' },
    ]
    const order = steps.map((s) => s.key)
    const currentIdx = current === 'seeding' ? -1 : order.indexOf(current)

    return (
        <div className="flex items-center gap-1.5 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-3 shadow-sm overflow-x-auto">
            {steps.map((s, i) => {
                const done = i < currentIdx
                const active = i === currentIdx
                return (
                    <div key={s.key} className="flex items-center gap-1.5 shrink-0">
                        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
                            active
                                ? 'bg-amber-500 text-white'
                                : done
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-muted text-slate-400 dark:text-muted-foreground'
                        }`}>
                            {done && <CheckCircle2 size={11} />}
                            {s.label}
                        </div>
                        {i < steps.length - 1 && <span className="text-slate-300 dark:text-slate-600">→</span>}
                    </div>
                )
            })}
            {current === 'seeding' && (
                <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-violet-500">· da seedare</span>
            )}
        </div>
    )
}

// ─── Componente principale ─────────────────────────────────────────────────────
const GroupManagementSection = ({
    tournament,
    players,
    circuits,
    characters = [],
    results,
    isAdmin = false,
    onRefresh,
    leader,
    onFinalized,
    onReplayCelebration,
}) => {
    const groupKeys = useMemo(() => groupKeysFromFormatData(tournament.format_data), [tournament.format_data])
    const semiKeys = useMemo(() => semifinalKeysFromFormatData(tournament.format_data), [tournament.format_data])
    const consolationHeatKeys = useMemo(() => consolationHeatKeysFromFormatData(tournament.format_data), [tournament.format_data])
    const isTournamentLocked = tournament.status !== 'in_corso' && !isAdmin

    const fd = tournament.format_data ?? {}
    const semisReady = semiKeys.length > 0
    const finalsReady = (fd.finals?.top ?? []).length > 0
    // Con ≥3 gironi i qualificati (2 per girone) superano i 4 posti finale → serve la semifinale
    const predictedSemi = groupKeys.length >= 3
    const showSemifinaliSection = predictedSemi || semisReady

    // ── Gruppi completati ─────────────────────────────────────────────────
    const completedGroups = useMemo(
        () => new Set(tournament.format_data?.completed_groups ?? []),
        [tournament.format_data]
    )
    const allGroupsComplete = groupKeys.length > 0 && groupKeys.every((k) => completedGroups.has(k))

    // ── Configurazione fasi (n_races per fase) ────────────────────────────
    const [phaseConfig, setPhaseConfig] = useState(() => ({
        n_races_group_stage: tournament.format_data?.n_races_group_stage ?? '',
        n_races_semifinals: tournament.format_data?.n_races_semifinals ?? '',
        n_races_final: tournament.format_data?.n_races_final ?? '',
    }))
    const [savingConfig, setSavingConfig] = useState(false)
    const handleSavePhaseConfig = useCallback(async () => {
        setSavingConfig(true)
        try {
            const payload = {}
            if (phaseConfig.n_races_group_stage !== '') payload.n_races_group_stage = Number(phaseConfig.n_races_group_stage)
            if (phaseConfig.n_races_semifinals !== '') payload.n_races_semifinals = Number(phaseConfig.n_races_semifinals)
            if (phaseConfig.n_races_final !== '') payload.n_races_final = Number(phaseConfig.n_races_final)
            await tournamentsApi.update(tournament.id, { format_data: payload })
            toast.success('Configurazione fasi salvata!')
            await onRefresh()
        } catch (err) {
            toast.error('Errore salvataggio', { description: getApiErrorMessage(err) })
        } finally {
            setSavingConfig(false)
        }
    }, [tournament.id, phaseConfig, onRefresh])

    const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

    // ── Tie data per gruppo ──────────────────────────────────────────────
    const [ties, setTies] = useState(null)
    useEffect(() => {
        let active = true
        tournamentsApi.groupStageTies(tournament.id)
            .then((res) => { if (active) setTies(res.data) })
            .catch(() => { if (active) setTies(null) })
        return () => { active = false }
    }, [tournament.id, tournament.races, tournament.format_data])

    const tieGroups = ties?.phase === 'group' ? new Set(Object.keys(ties.ties ?? {})) : new Set()

    // ── Per-group completion ─────────────────────────────────────────────
    const [completingGroup, setCompletingGroup] = useState(null)
    const [reopeningGroup, setReopeningGroup] = useState(null)
    const [confirmCompleteGroup, setConfirmCompleteGroup] = useState(null) // { groupKey, incompleteCount? }

    const handleReopenGroupClick = async (groupKey) => {
        setReopeningGroup(groupKey)
        try {
            await tournamentsApi.reopenGroup(tournament.id, groupKey)
            toast.success(`${groupLabel(groupKey)} riaperto`)
            await onRefresh()
        } catch (err) {
            toast.error('Errore', { description: getApiErrorMessage(err) })
        } finally {
            setReopeningGroup(null)
        }
    }

    const handleCompleteGroupClick = (groupKey) => {
        const groupRaces = (tournament.races ?? []).filter(
            (r) => r.phase === 'group' && r.group_name === groupKey && !r.is_duello
        )
        if (groupRaces.length === 0) {
            toast.error('Nessuna gara registrata', {
                description: `${groupLabel(groupKey)} non ha ancora nessuna gara: aggiungi almeno una gara prima di chiuderlo.`,
            })
            return
        }
        const incompleteRaces = groupRaces.filter((r) => {
            const groupPlayers = fd.groups?.[groupKey] ?? []
            const expected = Math.min(Math.max(groupPlayers.length, 2), 4)
            return (r.resultCount ?? r.results?.length ?? 0) < expected
        })
        const hasTie = tieGroups.has(groupKey)
        if (incompleteRaces.length > 0 || hasTie) {
            setConfirmCompleteGroup({ groupKey, incompleteCount: incompleteRaces.length, hasTie })
        } else {
            doCompleteGroup(groupKey)
        }
    }

    const doCompleteGroup = async (groupKey) => {
        setCompletingGroup(groupKey)
        try {
            await tournamentsApi.completeGroup(tournament.id, groupKey)
            toast.success(`${groupLabel(groupKey)} completato!`)
            await onRefresh()
        } catch (err) {
            toast.error('Errore', { description: getApiErrorMessage(err) })
        } finally {
            setCompletingGroup(null)
        }
    }

    const finalsTopRaces = (tournament.races ?? []).filter((r) => r.phase === 'finals' && r.group_name === 'top')

    // ── Tab per fase: una sola fase visibile alla volta invece di tutta la
    // gestione (Generale/Gironi/Semifinali/Finali/Classifica Finale) impilata
    // in un'unica pagina lunga e confusa.
    const phaseTabs = useMemo(() => {
        const tabs = [
            { key: 'generale', label: 'Generale', icon: <Flag size={13} /> },
            { key: 'gironi', label: 'Gironi', icon: <Users size={13} /> },
        ]
        if (showSemifinaliSection) tabs.push({ key: 'semifinali', label: 'Semifinali', icon: <Swords size={13} /> })
        tabs.push({ key: 'finali', label: 'Finali', icon: <Trophy size={13} /> })
        tabs.push({ key: 'classifica', label: 'Classifica Finale', icon: <Medal size={13} /> })
        return tabs
    }, [showSemifinaliSection])

    // Si parte sempre dai Gironi (Fase 1), anche quando Semifinali/Finale
    // sono già pronte: saltare direttamente alla Finale non permette di
    // capire come ci si è arrivati senza dover tornare indietro a mano.
    const [activePhaseTab, setActivePhaseTab] = useState('gironi')

    return (
        <div className="space-y-4">
            {/* ── Tab bar fase ─────────────────────────────────────────── */}
            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Fase</span>
                    <div className="inline-flex flex-wrap rounded-xl bg-slate-100 dark:bg-muted p-1 gap-0.5">
                        {phaseTabs.map(({ key, label, icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActivePhaseTab(key)}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap transition ${activePhaseTab === key ? 'bg-emerald-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200'}`}
                            >
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── 1. Generale ───────────────────────────────────────────── */}
            {activePhaseTab === 'generale' && (
            <CollapsibleSection title="Generale" subtitle="Stato del torneo, plancia live e composizione gironi" icon={<Flag size={16} />} defaultOpen>
                <PhaseStepper tournament={tournament} semiKeys={semiKeys} />

                {/* I gironi vengono generati automaticamente alla creazione del torneo:
                    questa card resta visibile solo come fallback per i tornei legacy
                    creati prima dell'auto-seeding e ancora senza gironi assegnati. */}
                {!groupKeys.length && (
                    <SeedingCard tournament={tournament} players={players} onRefresh={onRefresh} />
                )}

                <GroupPlancia tournament={tournament} players={players} results={results} />

                {/* Configurazione fasi — n_races per fase (salvato in format_data) */}
                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <Settings size={16} className="text-slate-500" />
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 dark:text-muted-foreground">Configurazione fasi</p>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        Imposta il numero di gare previsto per ogni fase (solo informativo — le gare effettive vengono create manualmente).
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gironi</span>
                            <input
                                type="number"
                                min="1"
                                max="16"
                                value={phaseConfig.n_races_group_stage}
                                onChange={(e) => setPhaseConfig((p) => ({ ...p, n_races_group_stage: e.target.value }))}
                                className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500"
                                placeholder="es. 4"
                            />
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Semifinali</span>
                            <input
                                type="number"
                                min="1"
                                max="16"
                                value={phaseConfig.n_races_semifinals}
                                onChange={(e) => setPhaseConfig((p) => ({ ...p, n_races_semifinals: e.target.value }))}
                                className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500"
                                placeholder="es. 3"
                            />
                        </label>
                        <label className="space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Finale</span>
                            <input
                                type="number"
                                min="1"
                                max="16"
                                value={phaseConfig.n_races_final}
                                onChange={(e) => setPhaseConfig((p) => ({ ...p, n_races_final: e.target.value }))}
                                className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500"
                                placeholder="es. 6"
                            />
                        </label>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleSavePhaseConfig}
                            disabled={savingConfig}
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition active:scale-95"
                        >
                            {savingConfig ? <><Loader2 size={13} className="animate-spin" /> Salvataggio...</> : 'Salva configurazione'}
                        </button>
                    </div>
                </div>
            </CollapsibleSection>
            )}

            {/* ── 2. Gironi (Fase 1) ────────────────────────────────────── */}
            {activePhaseTab === 'gironi' && (
            <CollapsibleSection title="Gironi" subtitle="Fase 1 — inserimento gare e avanzamento" icon={<Users size={16} />} defaultOpen>
                {!isTournamentLocked && (
                    <PhaseRaceEntry
                        tournament={tournament}
                        players={players}
                        circuits={circuits}
                        characters={characters}
                        results={results}
                        phase="group"
                        groups={groupKeys.length ? groupKeys : ['1']}
                        completedGroups={completedGroups}
                        onRefresh={onRefresh}
                    />
                )}
                <SpareggioGironiCard tournament={tournament} players={players} circuits={circuits} characters={characters} onRefresh={onRefresh} phaseFilter="group" />

                {/* Per-gruppo: pulsante "Completa girone" */}
                {groupKeys.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {groupKeys.map((key) => {
                            const isCompleted = completedGroups.has(key)
                            return (
                                <div key={key} className={`rounded-2xl border p-4 space-y-3 ${isCompleted ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-border bg-white dark:bg-card'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-xs font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-600' : 'text-slate-500 dark:text-muted-foreground'}`}>
                                            {groupLabel(key)}
                                        </p>
                                        {isCompleted && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                                <CheckCircle2 size={11} /> Completato
                                            </span>
                                        )}
                                    </div>
                                    {!isCompleted && (
                                        <button
                                            type="button"
                                            onClick={() => handleCompleteGroupClick(key)}
                                            disabled={completingGroup === key}
                                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition active:scale-95"
                                        >
                                            {completingGroup === key
                                                ? <><Loader2 size={13} className="animate-spin" /> Completamento...</>
                                                : <><Lock size={13} /> Completa girone</>
                                            }
                                        </button>
                                    )}
                                    {/* Riapertura: permessa solo se la fase successiva non e' stata
                                        ancora generata, altrimenti i qualificati gia' calcolati
                                        resterebbero incoerenti con una gara aggiunta dopo (stesso
                                        vincolo del backend, vedi reopen_group_stage_group). */}
                                    {isCompleted && !semisReady && !finalsReady && (
                                        <button
                                            type="button"
                                            onClick={() => handleReopenGroupClick(key)}
                                            disabled={reopeningGroup === key}
                                            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 transition active:scale-95"
                                        >
                                            {reopeningGroup === key
                                                ? <><Loader2 size={13} className="animate-spin" /> Riapertura...</>
                                                : <><Unlock size={13} /> Riapri girone</>
                                            }
                                        </button>
                                    )}
                                    {isCompleted && (semisReady || finalsReady) && (
                                        <p className="text-[10px] text-slate-400 dark:text-muted-foreground italic">
                                            Non riapribile: la fase successiva è già stata generata.
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Avanzamento globale: visibile solo quando TUTTI i gironi sono completati */}
                {allGroupsComplete && (
                    <PhaseAdvanceCard tournament={tournament} onRefresh={onRefresh} phase="group" />
                )}
            </CollapsibleSection>
            )}

            {/* ── 3. Semifinali (Fase 2, solo con ≥3 gironi) ────────────── */}
            {activePhaseTab === 'semifinali' && showSemifinaliSection && (
                <CollapsibleSection title="Semifinali" subtitle="Fase 2 — batterie e avanzamento alla finale" icon={<Swords size={16} />} defaultOpen>
                    {!semisReady ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3">
                            <AlertCircle size={13} className="text-slate-400 shrink-0" />
                            <p className="text-xs text-slate-500 dark:text-muted-foreground font-black">
                                In attesa della generazione delle semifinali (sezione "Gironi").
                            </p>
                        </div>
                    ) : (
                        <>
                            {!isTournamentLocked && (
                                <PhaseRaceEntry
                                    tournament={tournament}
                                    players={players}
                                    circuits={circuits}
                                    characters={characters}
                                    results={results}
                                    phase="semifinal"
                                    groups={semiKeys}
                                    onRefresh={onRefresh}
                                />
                            )}
                            <SpareggioGironiCard tournament={tournament} players={players} circuits={circuits} characters={characters} onRefresh={onRefresh} phaseFilter="semifinal" />
                            {/* Pareggio sull'ultimo posto Finale tra batterie di semifinale
                                diverse (mai affrontate direttamente) — vedi _advance_top_n */}
                            <SpareggioGironiCard tournament={tournament} players={players} circuits={circuits} characters={characters} onRefresh={onRefresh} phaseFilter="finals" />
                            <PhaseAdvanceCard tournament={tournament} onRefresh={onRefresh} phase="semifinal" />
                        </>
                    )}
                </CollapsibleSection>
            )}

            {/* ── 4. Finali ──────────────────────────────────────────────── */}
            {activePhaseTab === 'finali' && (
            <CollapsibleSection title="Finali" subtitle="Finale (Final 4) e Consolazione" icon={<Trophy size={16} />} defaultOpen>
                {!finalsReady ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3">
                        <AlertCircle size={13} className="text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500 dark:text-muted-foreground font-black">
                            In attesa della composizione della Finale.
                        </p>
                    </div>
                ) : (
                    <>
                        {!isTournamentLocked && (
                            <PhaseRaceEntry
                                tournament={tournament}
                                players={players}
                                circuits={circuits}
                                characters={characters}
                                results={results}
                                phase="finals"
                                groups={consolationHeatKeys.length > 0 ? ['top', ...consolationHeatKeys.map((k) => `bottom_${k}`)] : ['top', 'bottom']}
                                onRefresh={onRefresh}
                            />
                        )}
                        <ConsolazioneCard tournament={tournament} players={players} onRefresh={onRefresh} />
                    </>
                )}
            </CollapsibleSection>
            )}

            {/* ── 5. Classifica Finale ───────────────────────────────────── */}
            {activePhaseTab === 'classifica' && (
            <CollapsibleSection title="Classifica Finale" subtitle="Podio Final 4, spareggi e vincitore" icon={<Medal size={16} />} defaultOpen>
                {!finalsReady ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3">
                        <AlertCircle size={13} className="text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500 dark:text-muted-foreground font-black">
                            La classifica finale sarà disponibile dopo la composizione della Finale.
                        </p>
                    </div>
                ) : (
                    <GroupCard
                        groupKey="top"
                        races={finalsTopRaces}
                        results={results}
                        playerMap={playerMap}
                        seedPlayerIds={fd.finals?.top ?? []}
                    />
                )}

                {/* Spareggi podio di Finale (Final 4): 1°/2° e 3°/4° posto */}
                <FinalsPodiumDuelCard tournament={tournament} players={players} circuits={circuits} characters={characters} onRefresh={onRefresh} />

                {/* Spareggi podio di Consolazione/Finalina — DISTINTI da quelli della Finale (5°/6° e 7°/8° posto generale) */}
                <ConsolationPodiumDuelCard tournament={tournament} players={players} circuits={circuits} characters={characters} onRefresh={onRefresh} />

                {/* Note automatiche sulla Finale — gli esiti di gironi/semifinali non sono rilevanti qui */}
                <TournamentResolutionNotes tournament={tournament} phaseFilter="finals" />

                {/* Decreta vincitore: controlla che Finale e Consolazione non abbiano
                    spareggi aperti, altrimenti conclude il torneo, salda le schedine
                    (Card premio incluse) e fa partire l'overlay di celebrazione. */}
                {finalsReady && (
                    <WinnerFinalizeCard tournament={tournament} leader={leader} onFinalized={onFinalized} onReplayCelebration={onReplayCelebration} />
                )}

                {/* Classifica generale combinata: Finale + Consolazione */}
                {finalsReady && (
                    <OverallClassificaCard tournament={tournament} playerMap={playerMap} />
                )}
            </CollapsibleSection>
            )}

            {/* Conferma completamento girone: gare incomplete / pareggi non risolti */}
            {confirmCompleteGroup && (
                <div className="fixed inset-0 z-200 overflow-y-auto bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="complete-group-confirm-title">
                    <div className="mx-auto my-8 w-full max-w-md rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-card p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle size={18} className="shrink-0" />
                            <p id="complete-group-confirm-title" className="text-xs font-black uppercase tracking-[0.3em]">Attenzione</p>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-muted-foreground">
                            {confirmCompleteGroup.incompleteCount > 0 && confirmCompleteGroup.hasTie
                                ? `${groupLabel(confirmCompleteGroup.groupKey)} ha ${confirmCompleteGroup.incompleteCount} gara/e incompleta/e e dei pareggi non risolti. Completare lo stesso?`
                                : confirmCompleteGroup.incompleteCount > 0
                                    ? `${groupLabel(confirmCompleteGroup.groupKey)} ha ${confirmCompleteGroup.incompleteCount} gara/e incompleta/e. Completare lo stesso?`
                                    : `${groupLabel(confirmCompleteGroup.groupKey)} ha dei pareggi non risolti. Completare lo stesso?`}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-muted-foreground">
                            Una volta completato, non sarà più possibile aggiungere gare a questo girone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmCompleteGroup(null)}
                                className="flex-1 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:border-slate-300"
                            >
                                Annulla
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const key = confirmCompleteGroup.groupKey
                                    setConfirmCompleteGroup(null)
                                    doCompleteGroup(key)
                                }}
                                className="flex-1 rounded-2xl bg-amber-500 hover:bg-amber-400 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition"
                            >
                                Completa comunque
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default GroupManagementSection
