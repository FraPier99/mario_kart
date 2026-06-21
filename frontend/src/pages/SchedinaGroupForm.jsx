/**
 * SchedinaGroupForm — Inserimento pronostici per tornei a gironi N-flessibili
 *
 * L'utente predice (REGOLAMENTO.md, sezione "Schedina a Gironi"):
 *   1. Finalisti       — quali giocatori passano alla fase finale (gruppo "top")
 *   2. Classifica Finale — l'ordine esatto del podio finale tra i finalisti scelti
 *   3. Classifica Gironi — per ciascun girone della fase 1, l'ordine completo di arrivo
 *   4. Il Duello       — pronostico testa a testa tra i due giocatori scelti dall'admin
 *   5. Spareggio       — distanza esatta di punti tra 1° e 2° classificato (tie-breaker, non assegna punti)
 *
 * Punteggio: ogni singola posizione/pronostico indovinato assegna esattamente 3 punti
 *   +3 pt per ogni finalista correttamente individuato
 *   +3 pt per ogni posizione esatta della classifica finale
 *   +3 pt per ogni posizione esatta indovinata nella classifica di ciascun girone
 *   +3 pt se il pronostico del Duello è corretto
 *
 * Disponibile solo quando:
 *   - tournament.format_data.groups è impostato (seeding completato)
 *   - tournament.status === 'da_svolgere' (torneo non ancora avviato)
 *   - L'utente non ha già una schedina per questo torneo
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2, Lock, Save, Send, Trophy, Crown, Info, Swords, ListOrdered, Users } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import ApiBanner from '@/components/common/ApiBanner'
import DeadlineCountdown from '@/components/common/DeadlineCountdown'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { schedineDeluxeApi, getApiErrorMessage } from '@/services/apiClient'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PUNTI_PRONOSTICO = 3

const SCORING_RULES = [
    { label: '+3 pt', desc: 'Per ogni finalista correttamente individuato' },
    { label: '+3 pt', desc: 'Per ogni posizione esatta della classifica finale' },
    { label: '+3 pt', desc: 'Per ogni posizione esatta indovinata nella classifica di ciascun girone' },
    { label: '+3 pt', desc: 'Pronostico del Duello corretto' },
]

const PlayerAvatar = ({ player }) => (
    player?.img_url
        ? <img src={player.img_url} alt={player.nickname} className="h-8 w-8 shrink-0 rounded-xl object-cover border border-white dark:border-border" />
        : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-muted text-[11px] font-black text-slate-500">
            {player?.nickname?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
)

// ─── Sub-componente: PlayerSelectGrid (selezione multipla, ordine libero) ─────
const PlayerSelectGrid = ({ players, selected, onToggle, maxSelect, label }) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 dark:text-muted-foreground">{label}</p>
            <span className={`text-[9px] font-black ${selected.length === maxSelect ? 'text-emerald-500' : 'text-slate-400'}`}>
                {selected.length}/{maxSelect} selezionati
            </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
            {players.map((p) => {
                const isSelected = selected.includes(p.id)
                const isDisabled = !isSelected && selected.length >= maxSelect
                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => !isDisabled && onToggle(p.id)}
                        disabled={isDisabled}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                            isSelected
                                ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 shadow-sm'
                                : isDisabled
                                    ? 'border-slate-100 dark:border-border/50 bg-slate-50/60 dark:bg-card/50 opacity-50 cursor-not-allowed'
                                    : 'border-slate-200 dark:border-border bg-white dark:bg-card hover:border-slate-300 cursor-pointer'
                        }`}
                    >
                        <PlayerAvatar player={p} />
                        <span className={`flex-1 truncate text-sm font-black ${isSelected ? 'text-violet-800 dark:text-violet-200' : 'text-slate-700 dark:text-slate-300'}`}>
                            {p.nickname}
                        </span>
                        {isSelected && <CheckCircle2 size={14} className="text-violet-500 shrink-0" />}
                    </button>
                )
            })}
        </div>
    </div>
)

// ─── Sub-componente: RankingPicker (ordina i giocatori cliccandoli in sequenza) ─
const RankingPicker = ({ players, ranking, onToggle, instruction = "Clicca i finalisti nell'ordine previsto (1° → ultimo)" }) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 dark:text-muted-foreground">
                {instruction}
            </p>
            <span className={`text-[9px] font-black ${ranking.length === players.length ? 'text-emerald-500' : 'text-slate-400'}`}>
                {ranking.length}/{players.length} posizionati
            </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
            {players.map((p) => {
                const pos = ranking.indexOf(p.id)
                const isPlaced = pos !== -1
                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => onToggle(p.id)}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                            isPlaced
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-sm'
                                : 'border-slate-200 dark:border-border bg-white dark:bg-card hover:border-slate-300 cursor-pointer'
                        }`}
                    >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                            isPlaced ? 'bg-amber-400 text-white' : 'bg-slate-100 dark:bg-muted text-slate-400'
                        }`}>
                            {isPlaced ? pos + 1 : '—'}
                        </span>
                        <PlayerAvatar player={p} />
                        <span className={`flex-1 truncate text-sm font-black ${isPlaced ? 'text-amber-800 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'}`}>
                            {p.nickname}
                        </span>
                    </button>
                )
            })}
        </div>
    </div>
)

// ─── Sub-componente: SinglePlayerSelect (es. Il Duello) ───────────────────────
const SinglePlayerSelect = ({ players, selected, onSelect, label, description }) => (
    <div className="space-y-2">
        <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500 dark:text-muted-foreground">{label}</p>
            {description && <p className="text-[10px] text-slate-400 dark:text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
            {players.map((p) => {
                const isSelected = selected === p.id
                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelect(p.id)}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                            isSelected
                                ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 shadow-sm'
                                : 'border-slate-200 dark:border-border bg-white dark:bg-card hover:border-slate-300 cursor-pointer'
                        }`}
                    >
                        <PlayerAvatar player={p} />
                        <span className={`flex-1 truncate text-sm font-black ${isSelected ? 'text-rose-800 dark:text-rose-200' : 'text-slate-700 dark:text-slate-300'}`}>
                            {p.nickname}
                        </span>
                        {isSelected && <Crown size={14} className="text-rose-500 shrink-0" />}
                    </button>
                )
            })}
        </div>
    </div>
)

// ─── Componente principale ─────────────────────────────────────────────────────
const SchedinaGroupForm = () => {
    const { tournamentId } = useParams()
    const { players, getTournamentById } = useAppData()
    const { user } = useAuth()
    const navigate = useNavigate()

    const tournament = useMemo(
        () => (tournamentId ? getTournamentById(tournamentId) : null),
        [tournamentId, getTournamentById]
    )

    const groups = tournament?.format_data?.groups ?? null
    const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

    const allParticipants = useMemo(
        () => (tournament?.participant_ids ?? []).map((id) => playerMap.get(id)).filter(Boolean),
        [tournament, playerMap]
    )

    // Numero atteso di finalisti = top 2 per girone (vedi generate_group_stage_finals)
    const nGironi = groups ? Object.keys(groups).length : 0
    const nFinalisti = Math.max(2, nGironi * 2)

    const duelloA = tournament?.duello_player_a_id ? playerMap.get(tournament.duello_player_a_id) : null
    const duelloB = tournament?.duello_player_b_id ? playerMap.get(tournament.duello_player_b_id) : null
    const duelloPlayers = [duelloA, duelloB].filter(Boolean)

    // Gironi della fase 1: [[group_name, [player, ...]], ...]
    const gironiEntries = useMemo(() => (
        groups
            ? Object.entries(groups).map(([groupName, ids]) => [
                  groupName,
                  (ids ?? []).map((id) => playerMap.get(id)).filter(Boolean),
              ])
            : []
    ), [groups, playerMap])

    // ── Form state ──────────────────────────────────────────────────────────────
    const [finalisti, setFinalisti] = useState([])      // [player_id, ...] (selezione libera, max nFinalisti)
    const [classifica, setClassifica] = useState([])    // [player_id, ...] (ordine podio, sottoinsieme di finalisti)
    const [classificheGironi, setClassificheGironi] = useState({}) // {group_name: [player_id, ...]}
    const [duelloScelta, setDuelloScelta] = useState(null)
    const [spareggio, setSpareggio] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [existing, setExisting]     = useState(null)
    const [loading, setLoading]       = useState(true)
    const [draftRestored, setDraftRestored] = useState(false)

    const finalistiPlayers = useMemo(() => finalisti.map((id) => playerMap.get(id)).filter(Boolean), [finalisti, playerMap])

    // Chiusura a evento (allineata al backend, vedi services/schedine/schedine_deluxe.py):
    // resta apribile finché il torneo è "da_svolgere" E l'admin non ha chiuso
    // manualmente le schedine in anticipo (schedine_locked) — indipendentemente
    // dalla data della deadline mostrata in countdown, che è solo informativa.
    const canSubmit      = tournament?.status === 'da_svolgere' && !tournament?.schedine_locked
    const isLocked        = !canSubmit || !!existing

    // Bozza salvata in locale: riprende la compilazione dopo un refresh senza perdere i pronostici.
    const draftKey = useMemo(() => (
        tournamentId && user?.id ? `schedina-draft-deluxe-${tournamentId}-${user.id}` : null
    ), [tournamentId, user?.id])

    // ── Carica schedina esistente (o ripristina la bozza locale) ────────────────
    useEffect(() => {
        if (!tournamentId) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true)
        schedineDeluxeApi.me()
            .then((res) => {
                const data = Array.isArray(res.data) ? res.data : [res.data]
                const found = data.find((s) => String(s.tournament_id) === String(tournamentId))
                if (found) {
                    setExisting(found)
                    setFinalisti(found.finalisti_ids ?? [])
                    setClassifica(found.classifica_finale_ordinata ?? [])
                    setClassificheGironi(found.classifiche_gironi ?? {})
                    setDuelloScelta(found.duello_pareggio ? 'pareggio' : (found.duello_scelta_id ?? null))
                    setSpareggio(String(found.spareggio_distanza ?? ''))
                    return
                }

                if (!draftKey) return
                try {
                    const raw = localStorage.getItem(draftKey)
                    if (!raw) return
                    const draft = JSON.parse(raw)
                    const participantIds = new Set((tournament?.participant_ids ?? []))
                    const validIds = (ids) => Array.isArray(ids) && ids.every((id) => participantIds.has(id))
                    if (validIds(draft.finalisti)) setFinalisti(draft.finalisti)
                    if (validIds(draft.classifica)) setClassifica(draft.classifica)
                    if (groups && draft.classificheGironi && typeof draft.classificheGironi === 'object') {
                        const validGironi = Object.entries(draft.classificheGironi).every(([girone, order]) => {
                            const gironeIds = groups[girone] ?? []
                            return Array.isArray(order) && order.every((pid) => gironeIds.includes(pid)) && new Set(order).size === order.length
                        })
                        if (validGironi) setClassificheGironi(draft.classificheGironi)
                    }
                    if (draft.duelloScelta == null || draft.duelloScelta === 'pareggio' || participantIds.has(draft.duelloScelta)) setDuelloScelta(draft.duelloScelta ?? null)
                    if (typeof draft.spareggio === 'string') setSpareggio(draft.spareggio)
                    // Mostra "bozza ripristinata" solo se la bozza contiene scelte
                    // effettive, non solo lo stato iniziale vuoto.
                    const hasRealChoices = (draft.finalisti?.length ?? 0) > 0
                        || (draft.classifica?.length ?? 0) > 0
                        || Object.keys(draft.classificheGironi ?? {}).length > 0
                        || draft.duelloScelta != null
                        || Boolean(draft.spareggio)
                    if (hasRealChoices) setDraftRestored(true)
                } catch {
                    // bozza corrotta: la ignoriamo e si riparte da un form vuoto
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournamentId, draftKey])

    // Autosalvataggio della bozza ad ogni modifica
    useEffect(() => {
        if (!draftKey || existing || loading) return
        if (finalisti.length === 0 && classifica.length === 0 && Object.keys(classificheGironi).length === 0 && !duelloScelta && spareggio === '') return
        try {
            localStorage.setItem(draftKey, JSON.stringify({ finalisti, classifica, classificheGironi, duelloScelta, spareggio }))
        } catch {
            // storage non disponibile o pieno: l'autosave è solo un comfort, non un requisito
        }
    }, [draftKey, finalisti, classifica, classificheGironi, duelloScelta, spareggio, existing, loading])

    // ── Toggle helpers ──────────────────────────────────────────────────────────
    const toggleFinalista = (id) => {
        setFinalisti((prev) => {
            if (prev.includes(id)) {
                setClassifica((c) => c.filter((x) => x !== id))
                return prev.filter((x) => x !== id)
            }
            return [...prev, id]
        })
    }

    const toggleClassificaPos = (id) => {
        setClassifica((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    }

    const toggleGironeRanking = (groupName, playerId) => {
        setClassificheGironi((prev) => {
            const current = prev[groupName] ?? []
            const next = current.includes(playerId)
                ? current.filter((x) => x !== playerId)
                : [...current, playerId]
            return { ...prev, [groupName]: next }
        })
    }

    // ── Validazione live ────────────────────────────────────────────────────────
    const errors = useMemo(() => {
        const errs = []
        if (finalisti.length !== nFinalisti) errs.push(`Seleziona esattamente ${nFinalisti} finalisti pronosticati`)
        if (finalisti.length > 0 && classifica.length !== finalisti.length) errs.push('Ordina tutti i finalisti per costruire la classifica finale prevista')
        if (gironiEntries.some(([groupName, gironePlayers]) => (classificheGironi[groupName]?.length ?? 0) !== gironePlayers.length)) {
            errs.push('Ordina tutti i giocatori di ciascun girone per costruire la classifica prevista')
        }
        if (duelloPlayers.length === 2 && !duelloScelta) errs.push('Scegli il vincitore del Duello')
        if (spareggio === '' || Number(spareggio) < 0) errs.push('Inserisci un valore di spareggio valido (≥ 0)')
        return errs
    }, [finalisti, classifica, classificheGironi, gironiEntries, duelloScelta, duelloPlayers, spareggio, nFinalisti])

    const isValid = errors.length === 0

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isValid || isLocked) return

        setSubmitting(true)
        try {
            await schedineDeluxeApi.create({
                tournament_id:              Number(tournamentId),
                finalisti_ids:              finalisti,
                classifica_finale_ordinata: classifica,
                classifiche_gironi:         classificheGironi,
                duello_scelta_id:           duelloScelta === 'pareggio' ? null : duelloScelta,
                duello_pareggio:            duelloScelta === 'pareggio',
                spareggio_distanza:         Number(spareggio),
            })
            toast.success('Schedina inviata!', { description: 'I tuoi pronostici sono stati registrati.' })
            if (draftKey) {
                try { localStorage.removeItem(draftKey) } catch { /* bozza già scaduta da sola */ }
            }
            navigate(`/schedina/${tournamentId}`)
        } catch (err) {
            toast.error('Errore invio schedina', { description: getApiErrorMessage(err) })
        } finally {
            setSubmitting(false)
        }
    }

    // ── Guard: torneo non caricato ──────────────────────────────────────────────
    if (!tournament) {
        return (
            <AppLayout>
                <ApiBanner />
                <div className="flex items-center justify-center py-24">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
            </AppLayout>
        )
    }

    // ── Guard: seeding non ancora fatto ────────────────────────────────────────
    if (!groups) {
        return (
            <AppLayout>
                <ApiBanner />
                <div className="mx-auto max-w-xl px-4 py-12 text-center space-y-3">
                    <AlertCircle size={32} className="mx-auto text-amber-400" />
                    <p className="text-lg font-black text-slate-800 dark:text-foreground">Gironi non ancora assegnati</p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        L'admin deve prima eseguire il seeding dei gironi prima che possano essere inviati i pronostici.
                    </p>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <ApiBanner />
            <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-violet-500">
                        Schedina Pronostici · A Gironi
                    </p>
                    <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-foreground">
                        {tournament.name}
                    </h1>
                    {tournament.deadline_lock && canSubmit && (
                        <DeadlineCountdown deadline={tournament.deadline_lock} passedLabel="Deadline scaduta" className="mt-3" hideWhenPassed />
                    )}
                    {!existing && !loading && canSubmit && draftRestored && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-sky-100 dark:bg-sky-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400">
                            <Save size={13} />
                            Bozza ripristinata dal salvataggio automatico
                        </div>
                    )}
                </div>

                {/* ── Regole punteggio ───────────────────────────────────────── */}
                <div className="rounded-3xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-900/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Info size={13} className="text-violet-500 shrink-0" />
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-violet-600 dark:text-violet-400">
                            Come funziona il punteggio · {PUNTI_PRONOSTICO} pt per pronostico esatto
                        </p>
                    </div>
                    {SCORING_RULES.map((r) => (
                        <div key={r.desc} className="flex items-start gap-3">
                            <span className="shrink-0 rounded-lg bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[10px] font-black text-violet-700 dark:text-violet-300 min-w-12 text-center">{r.label}</span>
                            <span className="text-[11px] text-slate-600 dark:text-muted-foreground">{r.desc}</span>
                        </div>
                    ))}
                    <p className="pt-1 text-[10px] text-slate-400 dark:text-muted-foreground border-t border-violet-200/60 dark:border-violet-500/20">
                        Lo Spareggio non assegna punti: viene usato solo per risolvere la parità in classifica schedine.
                    </p>
                </div>

                {/* ── Schedina già inviata ───────────────────────────────────── */}
                {existing && (
                    <div className={`rounded-3xl border px-5 py-4 ${existing.status === 'settled' ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10' : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/10'}`}>
                        <div className="flex items-center gap-3">
                            {existing.status === 'settled'
                                ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                : <Lock size={18} className="text-amber-500 shrink-0" />
                            }
                            <div>
                                <p className="font-black text-slate-900 dark:text-foreground text-sm">
                                    {existing.status === 'settled' ? `Schedina liquidata — ${existing.total_points} pt` : 'Schedina già inviata'}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-muted-foreground">
                                    {existing.status === 'open' ? 'I tuoi pronostici sono stati registrati. Puoi consultarli qui sotto.' : 'Risultato finale registrato.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Form ───────────────────────────────────────────────────── */}
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 size={22} className="animate-spin text-slate-400" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Sezione 1: Finalisti */}
                        <div className="rounded-3xl border border-violet-200 dark:border-violet-500/30 bg-white dark:bg-card p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <Trophy size={14} className="text-violet-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-600 dark:text-violet-400">1 · Finalisti</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Chi pensi che si qualificherà alla fase finale?</p>
                                </div>
                            </div>
                            <PlayerSelectGrid
                                players={allParticipants}
                                selected={finalisti}
                                onToggle={toggleFinalista}
                                maxSelect={nFinalisti}
                                label={`Seleziona ${nFinalisti} giocatori`}
                            />
                        </div>

                        {/* Sezione 2: Classifica Finale */}
                        {finalisti.length === nFinalisti && (
                            <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-card p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-2">
                                    <ListOrdered size={14} className="text-amber-500 shrink-0" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">2 · Classifica Finale</p>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">In che ordine arriveranno i finalisti? (riparte da zero, non conta i punti dei gironi)</p>
                                    </div>
                                </div>
                                <RankingPicker players={finalistiPlayers} ranking={classifica} onToggle={toggleClassificaPos} />
                            </div>
                        )}

                        {/* Sezione 3: Classifica Gironi */}
                        <div className="rounded-3xl border border-sky-200 dark:border-sky-500/30 bg-white dark:bg-card p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-sky-500 shrink-0" />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-600 dark:text-sky-400">3 · Classifica Gironi</p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Per ciascun girone della fase 1, in che ordine arriveranno i giocatori?</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {gironiEntries.map(([groupName, gironePlayers]) => (
                                    <RankingPicker
                                        key={groupName}
                                        players={gironePlayers}
                                        ranking={classificheGironi[groupName] ?? []}
                                        onToggle={(id) => toggleGironeRanking(groupName, id)}
                                        instruction={`Girone ${groupName} — clicca i giocatori nell'ordine previsto (1° → ultimo)`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Sezione 4: Il Duello */}
                        {duelloPlayers.length === 2 && (
                            <div className="rounded-3xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-card p-5 shadow-sm space-y-4">
                                <div className="flex items-center gap-2">
                                    <Swords size={14} className="text-rose-500 shrink-0" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-600 dark:text-rose-400">4 · Il Duello</p>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                                            Tra {duelloA?.nickname} e {duelloB?.nickname}, chi totalizzerà più punti nel proprio girone? Oppure pronostica il Pareggio.
                                        </p>
                                    </div>
                                </div>
                                <SinglePlayerSelect
                                    players={duelloPlayers}
                                    selected={duelloScelta}
                                    onSelect={setDuelloScelta}
                                    label="Seleziona il vincitore del Duello"
                                />
                                <button
                                    type="button"
                                    onClick={() => setDuelloScelta('pareggio')}
                                    className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                                        duelloScelta === 'pareggio'
                                            ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200 shadow-sm'
                                            : 'border-slate-200 dark:border-border bg-white dark:bg-card text-slate-700 dark:text-slate-300 hover:border-slate-300 cursor-pointer'
                                    }`}
                                >
                                    {duelloScelta === 'pareggio' && <Crown size={14} className="text-rose-500 shrink-0" />}
                                    Pareggio (stessi punti totali nel girone)
                                </button>
                            </div>
                        )}

                        {/* Sezione 5: Spareggio */}
                        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 dark:text-muted-foreground">5 · Spareggio (tie-breaker)</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                                    Qual è la distanza esatta di punti tra il 1° e il 2° classificato della classifica finale?
                                    <br/>
                                    <span className="text-[11px] text-slate-400">Non assegna punti — usato solo per risolvere la parità tra le schedine.</span>
                                </p>
                            </div>
                            <input
                                type="number"
                                min="0"
                                value={spareggio}
                                onChange={(e) => setSpareggio(e.target.value)}
                                placeholder="Es. 12"
                                disabled={isLocked}
                                className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-sm font-black text-slate-900 dark:text-foreground outline-none focus:border-amber-400 disabled:opacity-50"
                            />
                        </div>

                        {/* ── Errori ─────────────────────────────────────────── */}
                        {errors.length > 0 && finalisti.length > 0 && (
                            <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/8 px-4 py-3 space-y-1">
                                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                                    <AlertCircle size={13} className="shrink-0" />
                                    <p className="text-xs font-black">Correggi prima di inviare</p>
                                </div>
                                {errors.map((err, i) => (
                                    <p key={i} className="text-[11px] text-rose-500 pl-5">{err}</p>
                                ))}
                            </div>
                        )}

                        {/* ── Anteprima (tutto completo) ─────────────────────── */}
                        {isValid && !existing && (
                            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/8 px-4 py-3 space-y-2">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={13} />
                                    <p className="text-xs font-black">Schedina completa — pronta per l'invio</p>
                                </div>
                                <div className="space-y-1 pl-5 text-[11px] text-emerald-700 dark:text-emerald-300">
                                    <p>Finalisti: {finalisti.map((id) => playerMap.get(id)?.nickname).join(', ')}</p>
                                    <p>Classifica finale: {classifica.map((id, i) => `${i + 1}° ${playerMap.get(id)?.nickname}`).join(' · ')}</p>
                                    {gironiEntries.map(([groupName]) => (
                                        <p key={groupName}>
                                            Girone {groupName}: {(classificheGironi[groupName] ?? []).map((id, i) => `${i + 1}° ${playerMap.get(id)?.nickname}`).join(' · ')}
                                        </p>
                                    ))}
                                    {duelloScelta && <p>Duello: {duelloScelta === 'pareggio' ? 'Pareggio' : `vince ${playerMap.get(duelloScelta)?.nickname}`}</p>}
                                    <p>Spareggio: {spareggio} pt di distanza</p>
                                </div>
                            </div>
                        )}

                        {/* ── Submit ─────────────────────────────────────────── */}
                        {!existing && (
                            <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                <Save size={11} /> I tuoi pronostici vengono salvati automaticamente in locale mentre compili
                            </p>
                        )}
                        {!existing && (
                            <button
                                type="submit"
                                disabled={!isValid || submitting || isLocked}
                                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-violet-500 hover:bg-violet-400 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition active:scale-[0.98]"
                            >
                                {submitting
                                    ? <><Loader2 size={15} className="animate-spin" /> Invio in corso...</>
                                    : tournament.status !== 'da_svolgere'
                                        ? <><Lock size={15} /> Torneo già avviato</>
                                        : tournament.schedine_locked
                                            ? <><Lock size={15} /> Schedine chiuse</>
                                            : <><Send size={15} /> Invia schedina</>
                                }
                            </button>
                        )}
                    </form>
                )}
            </div>
        </AppLayout>
    )
}

export default SchedinaGroupForm
