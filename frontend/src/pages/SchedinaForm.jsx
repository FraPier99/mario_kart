import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ban, Clock, Info, Lock, Save, Send, Trophy, Zap, Swords } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'
import { schedineApi, getApiErrorMessage } from '@/services/apiClient'

const PUNTI_PRONOSTICO = 3
const SCORING_RULES = [
    { label: `+${PUNTI_PRONOSTICO} pt`, desc: 'Ogni posizione esatta della classifica generale' },
    { label: `+${PUNTI_PRONOSTICO} pt`, desc: 'Maggiore streak di vittorie corretta' },
    { label: `+${PUNTI_PRONOSTICO} pt`, desc: 'Duello testa a testa corretto' },
]

// Stesso schema punti di app/data/punteggi.py (_compute_punteggi): serve solo
// a stimare un tetto realistico per "Distanza 1°-2°" — il possibile distacco
// massimo tra 1° e 2° posto, cioè lo stesso giocatore sempre 1° e un altro
// sempre 2° in ogni gara del torneo.
const PUNTEGGI_STATIC = { 4: [5, 3, 2, 1], 5: [6, 4, 3, 2, 1], 6: [7, 5, 4, 3, 2, 1], 7: [8, 6, 5, 4, 3, 2, 1], 8: [9, 7, 6, 5, 4, 3, 2, 1] }
const computePunteggi = (n) => {
    if (PUNTEGGI_STATIC[n]) return PUNTEGGI_STATIC[n]
    if (n < 4) return Array.from({ length: n }, (_, i) => n + 1 - i)
    return [n + 1, ...Array.from({ length: n - 1 }, (_, i) => n - 1 - i)]
}
const maxSpareggioGap = (nPlayers, nRaces) => {
    if (!nPlayers || nPlayers < 2 || !nRaces) return 999
    const punteggi = computePunteggi(nPlayers)
    // Gap 1°-2° (non 1°-ultimo): è quello che il campo chiede di stimare.
    const perRaceGap = punteggi[0] - punteggi[1]
    return perRaceGap * nRaces
}

// Riga della classifica a click-in-sequenza (al posto del drag-and-drop, che
// sul touch era inaffidabile): si clicca un giocatore per assegnargli la
// posizione successiva, lo si riclicca per rimuoverlo. Stesso modello del
// form a gironi — meno bug del trascinamento.
//   pos      = posizione 0-based nella classifica (-1 se non ancora piazzato)
//   total    = numero totale di partecipanti
//   complete = true quando tutti i partecipanti sono stati piazzati: solo
//              allora ha senso evidenziare "ultimo"/"penultimo" (Guscio Blu),
//              che altrimenti cambierebbero a ogni click.
const ClickRankRow = ({ player, pos, total, complete, onToggle }) => {
    const isPlaced = pos !== -1
    // Guscio Blu va all'ultimo e, da 7 partecipanti in su, anche al penultimo
    // (vedi _last_ids_from_final_order, schedine.py) — stesso simbolo "stop"
    // (Ban) usato per la Carta Guscio Blu in PowerCard.jsx.
    const isBlueShellRow = complete && (pos === total - 1 || (total >= 7 && pos === total - 2))

    return (
        <button
            type="button"
            onClick={() => onToggle(player.id)}
            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${
                isBlueShellRow
                    ? 'border-cyan-300 bg-cyan-50/60 dark:border-cyan-500/30 dark:bg-cyan-500/10'
                    : isPlaced
                        ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-border dark:bg-card'
            }`}
        >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isBlueShellRow ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300' : isPlaced ? 'bg-emerald-400 text-white' : 'bg-slate-100 text-slate-400 dark:bg-muted dark:text-slate-500'}`}>
                {pos === 0 ? (
                    <Trophy size={14} className="text-amber-500" />
                ) : isBlueShellRow ? (
                    <Ban size={14} title="Guscio Blu" />
                ) : isPlaced ? `#${pos + 1}` : '—'}
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {player.img_url ? (
                    <img src={player.img_url} alt={player.nickname} className="h-7 w-7 shrink-0 rounded-lg object-cover" />
                ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-[10px] font-black text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        {player.nickname?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                )}
                <span className={`truncate text-sm font-bold ${isPlaced ? 'text-slate-900 dark:text-foreground' : 'text-slate-500 dark:text-slate-400'}`}>{player.nickname}</span>
            </div>
            {pos === 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-title tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Vincitore</span>}
            {complete && pos === total - 1 && <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[9px] font-title tracking-wide text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">Ultimo</span>}
            {complete && total >= 7 && pos === total - 2 && <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[9px] font-title tracking-wide text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">Penultimo</span>}
        </button>
    )
}

const SchedinaForm = () => {
    const { tournamentId } = useParams()
    const navigate = useNavigate()
    const { getTournamentById, getTournamentDisplayNumber, players, refresh } = useAppData()
    const { user, isSuperadmin } = useAuth()
    const { dark } = useTheme()
    const { charactersById } = useAppData()
    const theme = useMemo(() => getProfileTheme(user, charactersById, dark), [user, charactersById, dark])
    const tournament = tournamentId ? getTournamentById(tournamentId) : null
    const hasSchedinaFeature = Boolean(
        tournament?.deadline_lock ||
        tournament?.duello_player_a_id ||
        tournament?.duello_player_b_id
    )

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [items, setItems] = useState([])
    const [draftRestored, setDraftRestored] = useState(false)

    const [form, setForm] = useState({
        maggiore_streak_vittorie_id: '',
        duello_scelta_id: '',
        spareggio_punti_vincitore: '',
    })

    // Chiusura a evento (allineata al backend, vedi services/schedine/schedine.py):
    // resta apribile finché il torneo è "da_svolgere" E l'admin non ha chiuso
    // manualmente le schedine in anticipo (schedine_locked) — indipendentemente
    // dalla data della deadline mostrata in countdown, che è solo informativa.
    const schedineLocked = tournament?.status !== 'da_svolgere' || Boolean(tournament?.schedine_locked)

    // Bozza salvata in locale: permette di riprendere la compilazione dopo un
    // refresh o una chiusura accidentale del browser, senza perdere i pronostici.
    const draftKey = useMemo(() => (
        tournamentId && user?.id ? `schedina-draft-classic-${tournamentId}-${user.id}` : null
    ), [tournamentId, user?.id])

    const participantPlayers = useMemo(() => {
        if (!tournament?.participant_ids?.length) return players
        return players.filter((p) => tournament.participant_ids.includes(p.id))
    }, [players, tournament])

    const spareggioMaxGap = useMemo(
        () => maxSpareggioGap(participantPlayers.length, tournament?.n_races),
        [participantPlayers.length, tournament?.n_races]
    )
    const spareggioPlaceholder = `Es. ${Math.max(5, Math.round(spareggioMaxGap * 0.15))}`

    const isParticipant = useMemo(() => {
        if (!tournament?.participant_ids?.length) return true
        const playerId = user?.player?.id
        if (!playerId) return false
        return tournament.participant_ids.includes(playerId)
    }, [user, tournament])

    useEffect(() => {
        if (participantPlayers.length === 0 || items.length > 0) return

        let draft = null
        if (draftKey && !alreadySubmitted) {
            try {
                const raw = localStorage.getItem(draftKey)
                if (raw) {
                    const parsed = JSON.parse(raw)
                    // Click-in-sequenza: la classifica si costruisce piazzando i
                    // giocatori uno alla volta, quindi una bozza PARZIALE (alcuni
                    // piazzati, altri no) è valida — basta che siano partecipanti
                    // reali, senza duplicati e non oltre il totale.
                    const validItems = Array.isArray(parsed.items)
                        && parsed.items.length <= participantPlayers.length
                        && new Set(parsed.items).size === parsed.items.length
                        && parsed.items.every((id) => participantPlayers.some((p) => p.id === id))
                    if (validItems) draft = parsed
                }
            } catch {
                // bozza corrotta: la ignoriamo e ripartiamo da una classifica vuota
            }
        }

        // Si parte da una classifica VUOTA: l'utente clicca i giocatori
        // nell'ordine di arrivo previsto (1° → ultimo).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(draft?.items ?? [])
        if (draft?.form) {
            setForm((prev) => ({ ...prev, ...draft.form }))
            // Mostra "bozza ripristinata" solo se contiene scelte effettive
            // dell'utente: altrimenti l'autosalvataggio dello stato iniziale
            // (classifica vuota, pronostici vuoti) verrebbe segnalato come una
            // bozza reale a ogni successiva visita della pagina.
            const hasRealChoices = Object.values(draft.form).some((v) => v !== '' && v != null)
            const hasPlacedItems = Array.isArray(draft.items) && draft.items.length > 0
            if (hasRealChoices || hasPlacedItems) setDraftRestored(true)
        }
    }, [participantPlayers, draftKey, alreadySubmitted, items.length])

    // Autosalvataggio della bozza ad ogni modifica (riordino classifica o pronostici)
    useEffect(() => {
        if (!draftKey || alreadySubmitted || items.length === 0) return
        try {
            localStorage.setItem(draftKey, JSON.stringify({ items, form }))
        } catch {
            // storage non disponibile o pieno: l'autosave è solo un comfort, non un requisito
        }
    }, [draftKey, items, form, alreadySubmitted])

    // Click-in-sequenza (al posto del drag): clicca un giocatore non piazzato
    // per assegnargli la posizione successiva, riclicca un già piazzato per
    // toglierlo (le posizioni dei successivi si compattano da sole).
    const toggleRank = (id) => {
        setItems((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    }

    const playerMap = useMemo(() => {
        const m = new Map()
        participantPlayers.forEach((p) => m.set(p.id, p))
        return m
    }, [participantPlayers])

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            try {
                const res = await schedineApi.me()
                if (!active) return
                const mySchedine = res.data?.schedine ?? []
                const exists = mySchedine.some((s) => String(s.tournament_id) === String(tournamentId))
                if (exists) setAlreadySubmitted(true)
            } catch {
                // ignore
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [tournamentId])

    const handleChange = (field) => (e) => {
        const value = e.target.value
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (schedineLocked) {
            toast.error('Le schedine sono chiuse: il torneo è già in corso')
            return
        }
        if (items.length !== participantPlayers.length) {
            toast.error('Ordina tutti i partecipanti prima di inviare')
            return
        }

        setSubmitting(true)
        try {
            await schedineApi.create({
                tournament_id: Number(tournamentId),
                classifica_ordinata: items,
                maggiore_streak_vittorie_id: Number(form.maggiore_streak_vittorie_id),
                duello_player_a_id: duelloPlayerAId,
                duello_player_b_id: duelloPlayerBId,
                duello_scelta_id: form.duello_scelta_id && form.duello_scelta_id !== 'pareggio' ? Number(form.duello_scelta_id) : null,
                duello_pareggio: form.duello_scelta_id === 'pareggio',
                spareggio_punti_vincitore: Number(form.spareggio_punti_vincitore),
            })
            toast.success('Schedina compilata con successo!')
            setAlreadySubmitted(true)
            if (draftKey) {
                try { localStorage.removeItem(draftKey) } catch { /* bozza già scaduta da sola */ }
            }
            await refresh()
            navigate('/schedina')
        } catch (err) {
            toast.error('Errore nella compilazione', {
                description: getApiErrorMessage(err, 'Impossibile salvare la schedina'),
            })
        } finally {
            setSubmitting(false)
        }
    }

    const playerOptions = participantPlayers.map((p) => (
        <option key={p.id} value={p.id}>{p.nickname} ({p.first_name} {p.last_name})</option>
    ))

    const duelloPlayerAId = tournament?.duello_player_a_id ? Number(tournament.duello_player_a_id) : null
    const duelloPlayerBId = tournament?.duello_player_b_id ? Number(tournament.duello_player_b_id) : null

    const duelloSceltaOptions = (() => {
        if (!duelloPlayerAId || !duelloPlayerBId) return []
        const a = playerMap.get(duelloPlayerAId)
        const b = playerMap.get(duelloPlayerBId)
        return [
            { value: duelloPlayerAId, label: a?.nickname || `#${duelloPlayerAId}` },
            { value: duelloPlayerBId, label: b?.nickname || `#${duelloPlayerBId}` },
            { value: 'pareggio', label: 'Pareggio (stessi punti totali)' },
        ]
    })()

    const duelloPlayerALabel = duelloPlayerAId ? (playerMap.get(duelloPlayerAId)?.nickname || `#${duelloPlayerAId}`) : null
    const duelloPlayerBLabel = duelloPlayerBId ? (playerMap.get(duelloPlayerBId)?.nickname || `#${duelloPlayerBId}`) : null

    if (isSuperadmin) {
        return (
            <AppLayout>
                <section className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
                    <div className={`rounded-[2rem] border-2 p-8 text-center ${theme.tailwind.borderSoft}`} style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, transparent)`, boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <Lock size={48} className={`mx-auto ${theme.tailwind.text}`} />
                        <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-foreground">Accesso negato</h2>
                        <p className={`mt-2 text-sm ${theme.tailwind.text}`}>
                            Gli amministratori super non possono compilare schedine.
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                            Puoi comunque monitorare lo stato di compilazione delle schedine nella pagina del torneo.
                        </p>
                    </div>
                </section>
            </AppLayout>
        )
    }

    if (!isParticipant) {
        return (
            <AppLayout>
                <section className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
                    <div className={`rounded-[2rem] border-2 p-8 text-center ${theme.tailwind.borderSoft}`} style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, transparent)`, boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <Lock size={48} className={`mx-auto ${theme.tailwind.text}`} />
                        <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-foreground">Non sei iscritto</h2>
                        <p className={`mt-2 text-sm ${theme.tailwind.text}`}>
                            Non sei tra i partecipanti di questo torneo, quindi non puoi compilare la schedina.
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                            Contatta l'organizzatore per essere aggiunto alla lista partecipanti.
                        </p>
                    </div>
                </section>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-5xl px-4 py-8 animate-fade-in">
                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 md:p-8 space-y-6">

                <div className="mb-6">
                    <p className={`font-title text-[10px] tracking-wide ${theme.tailwind.text}`}>Compila schedina</p>
                    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">
                        {tournament?.name ?? `Torneo #${getTournamentDisplayNumber(tournamentId)}`}
                    </h1>
                    {hasSchedinaFeature && !alreadySubmitted && !schedineLocked && draftRestored && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-100 dark:bg-sky-500/10 px-4 py-2 text-[10px] font-title tracking-wide text-sky-700 dark:text-sky-400">
                            <Save size={13} />
                            Bozza ripristinata dal salvataggio automatico
                        </div>
                    )}
                </div>

                {!hasSchedinaFeature && (
                    <div className="rounded-[2rem] border-2 border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-500/30 dark:bg-amber-500/5" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <Clock size={48} className="mx-auto text-amber-500 dark:text-amber-400" />
                        <h2 className="mt-4 text-xl font-black text-amber-800 dark:text-amber-200">Torneo storico</h2>
                        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                            Questo torneo è stato creato prima dell'introduzione della schedina, quindi non è possibile compilarla qui.
                        </p>
                    </div>
                )}

                {hasSchedinaFeature && schedineLocked && !alreadySubmitted && (
                    <div className="rounded-[2rem] border-2 border-red-200 bg-red-50 p-8 text-center dark:border-red-500/30 dark:bg-red-500/5" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <Lock size={48} className="mx-auto text-red-400 dark:text-red-500" />
                        <h2 className="mt-4 text-xl font-black text-red-800 dark:text-red-300">Schedina non compilata</h2>
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            Non hai compilato la schedina per questo torneo: il torneo è già iniziato e le schedine sono chiuse.
                        </p>
                    </div>
                )}

                {hasSchedinaFeature && alreadySubmitted && (
                    <div className="rounded-[2rem] border-2 border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/5" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <Send size={48} className="mx-auto text-emerald-400 dark:text-emerald-500" />
                        <h2 className="mt-4 text-xl font-black text-emerald-800 dark:text-emerald-300">Schedina già compilata</h2>
                        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                            Hai già inviato la schedina per questo torneo. Puoi consultare i risultati nella sezione esiti.
                        </p>
                    </div>
                )}

                {hasSchedinaFeature && (
                    <div className="rounded-3xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-900/10 p-4 space-y-2" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Info size={13} className="text-violet-500 shrink-0" />
                            <p className="font-title text-[9px] tracking-wide text-violet-600 dark:text-violet-400">Come funziona il punteggio</p>
                        </div>
                        {SCORING_RULES.map((r) => (
                            <div key={r.label + r.desc} className="flex items-start gap-3">
                                <span className="shrink-0 rounded-lg bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 font-title text-[10px] tracking-wide text-violet-700 dark:text-violet-300 min-w-12 text-center">{r.label}</span>
                                <span className="text-[11px] text-slate-600 dark:text-muted-foreground">{r.desc}</span>
                            </div>
                        ))}
                    </div>
                )}

                {hasSchedinaFeature && !schedineLocked && !alreadySubmitted && !loading && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* SEZIONE 1: CLASSIFICA ORDINATA */}
                        <div className={`rounded-[2rem] border-2 p-6 ${theme.tailwind.borderSoft}`} style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, transparent)`, boxShadow: 'var(--circuit-shadow-lg)' }}>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className={`font-title text-xs tracking-wide ${theme.tailwind.text}`}>Classifica</p>
                                    <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Ordina i giocatori dal 1° all'ultimo posto</h2>
                                </div>
                                <span className={`shrink-0 rounded-full px-3 py-1 font-title text-[10px] tracking-wide ${items.length === participantPlayers.length ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {items.length}/{participantPlayers.length}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">Clicca i giocatori, dal 1° all'ultimo, per costruire la classifica. Primo = vincitore, ultimo = ultimo classificato. Riclicca un giocatore già posizionato per toglierlo.</p>

                            {participantPlayers.length === 0 ? (
                                <p className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">Nessun partecipante disponibile per questo torneo.</p>
                            ) : (
                                <>
                                    {/* Classifica costruita: i giocatori già posizionati, mostrati
                                        IN ORDINE di arrivo (1°→ultimo). Con molti partecipanti
                                        tenere la lista in ordine fisso e badge sparsi confondeva —
                                        qui invece si legge come una classifica vera che cresce. */}
                                    {items.length > 0 && (
                                        <div className="mt-5 space-y-2">
                                            {items.map((id, idx) => {
                                                const p = playerMap.get(id)
                                                if (!p) return null
                                                return (
                                                    <ClickRankRow
                                                        key={id}
                                                        player={p}
                                                        pos={idx}
                                                        total={participantPlayers.length}
                                                        complete={items.length === participantPlayers.length}
                                                        onToggle={toggleRank}
                                                    />
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Pool dei giocatori ancora da posizionare: cliccandone uno
                                        viene aggiunto in coda alla classifica (posizione successiva). */}
                                    {items.length < participantPlayers.length && (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                                                {items.length === 0
                                                    ? 'Clicca il giocatore che arriverà 1°'
                                                    : `Da posizionare — clicca per assegnare il ${items.length + 1}° posto`}
                                            </p>
                                            {participantPlayers.filter((p) => !items.includes(p.id)).map((p) => (
                                                <ClickRankRow
                                                    key={p.id}
                                                    player={p}
                                                    pos={-1}
                                                    total={participantPlayers.length}
                                                    complete={false}
                                                    onToggle={toggleRank}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* SEZIONE 2: PRONOSTICI SPECIALI E SPAREGGIO */}
                        <div className={`rounded-[2rem] border-2 p-6 ${theme.tailwind.borderSoft}`} style={{ background: `linear-gradient(135deg, ${theme.accentSoft}, transparent)`, boxShadow: 'var(--circuit-shadow-lg)' }}>
                            <p className={`font-title text-xs tracking-wide ${theme.tailwind.text}`}>Side Bets</p>
                            <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Pronostici speciali</h2>

                            <div className="mt-6 grid gap-5 md:grid-cols-2">
                                <label className="space-y-2 rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-border dark:bg-card" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <span className="flex items-center gap-2 font-title text-xs tracking-wide text-sky-600 dark:text-sky-400">
                                        <Zap size={14} /> Maggior Streak (+{PUNTI_PRONOSTICO}pt)
                                    </span>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Indovina quale pilota registrerà la striscia più lunga di primi posti consecutivi nelle singole gare.</p>
                                    <select value={form.maggiore_streak_vittorie_id} onChange={handleChange('maggiore_streak_vittorie_id')} required className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-border dark:bg-muted dark:text-foreground">
                                        <option value="">Seleziona</option>
                                        {playerOptions}
                                    </select>
                                </label>

                                <div className="space-y-2 rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-border dark:bg-card" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <span className="flex items-center gap-2 font-title text-xs tracking-wide text-purple-600 dark:text-purple-400">
                                        <Swords size={14} /> Il Duello Casuale (+{PUNTI_PRONOSTICO}pt)
                                    </span>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500">All'apertura del torneo, il sistema genera una coppia di piloti casuale identica per tutti. Pronostica chi tra i due totalizzerà più punti in classifica generale, oppure se finiranno in Pareggio.</p>
                                    {duelloPlayerALabel && duelloPlayerBLabel ? (
                                        <div className="mt-2 space-y-3">
                                            <span className="block rounded-xl border-2 border-purple-200 bg-purple-50 px-4 py-2.5 text-center text-sm font-bold text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
                                                {duelloPlayerALabel} 🆚 {duelloPlayerBLabel}
                                            </span>
                                            <select value={form.duello_scelta_id} onChange={handleChange('duello_scelta_id')} className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-purple-500 dark:border-border dark:bg-muted dark:text-foreground">
                                                <option value="">Chi vince?</option>
                                                {duelloSceltaOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-xs text-slate-500 italic">Coppia non ancora definita per questo torneo.</p>
                                    )}
                                </div>
                            </div>

                            {/* SPAREGGIO */}
                            <div className="mt-4 rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-border dark:bg-card" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                <span className="flex items-center gap-2 font-title text-xs tracking-wide text-emerald-600 dark:text-emerald-400">
                                    <Clock size={14} /> Spareggio
                                </span>
                                <h3 className="mt-1 text-sm font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Punti di distacco</h3>
                                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Usato solo come criterio di spareggio in caso di parità nel punteggio finale.</p>
                                <label className="mt-3 block">
                                    <span className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground">Distanza 1°-2°:</span>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max={spareggioMaxGap}
                                            value={form.spareggio_punti_vincitore}
                                            onChange={handleChange('spareggio_punti_vincitore')}
                                            required
                                            placeholder={spareggioPlaceholder}
                                            className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-border dark:bg-muted dark:text-foreground"
                                        />
                                        <span className="text-xs font-black text-slate-400 shrink-0">pt</span>
                                    </div>
                                </label>
                                <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">Massimo teorico per questo torneo: {spareggioMaxGap} pt.</p>
                            </div>
                        </div>

                        <p className="flex items-center justify-center gap-1.5 font-title text-[10px] tracking-wide text-slate-400 dark:text-muted-foreground">
                            <Save size={11} /> I tuoi pronostici vengono salvati automaticamente in locale mentre compili
                        </p>

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                            className={`w-full rounded-2xl border-2 border-transparent px-5 py-4 font-title text-sm tracking-wide text-white transition hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${theme.tailwind.bg}`}
                        >
                            {submitting ? 'Invio in corso...' : 'Invia schedina'}
                        </button>

                    </form>
                )}

                {hasSchedinaFeature && loading && (
                    <div className="h-60 animate-shimmer rounded-3xl bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 bg-size-[200%_100%] dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
                )}

                </div>
            </section>
        </AppLayout>
    )
}

export default SchedinaForm