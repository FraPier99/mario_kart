import { useMemo, useRef, useState } from 'react'
import { Check, Edit2, Lock, Plus, Save, Search, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import CircuitThumbnail from '@/components/common/CircuitThumbnail'
import { compressImage } from '@/lib/imageCompression'
import { circuitsApi, getApiErrorMessage } from '@/services/apiClient'
import { useAppData } from '@/context/AppDataContext'
import { trophyColor } from '@/lib/trophyColors'

// ── Mini image picker (hides raw base64) — mirror di DatabaseTab.jsx,
// solo con preview rettangolare invece che circolare (thumbnail circuiti).
const MiniImagePicker = ({ value, onChange }) => {
    const ref = useRef(null)
    const isBase64 = value?.startsWith('data:')

    const processFile = async (file) => {
        if (!file?.type.startsWith('image/')) return
        try {
            onChange(await compressImage(file, { maxDimension: 800, quality: 0.82 }))
        } catch {
            toast.error('Impossibile leggere il file')
        }
    }

    return (
        <div className="flex items-center gap-2">
            <div
                onClick={() => ref.current?.click()}
                className="relative h-10 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-slate-300 dark:border-border transition hover:border-blue-400"
            >
                {value
                    ? <img src={value} alt="preview" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center">
                        <Upload size={12} className="text-slate-400" />
                      </div>
                }
            </div>

            {!isBase64 && (
                <input
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                />
            )}

            {isBase64 && (
                <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Immagine caricata
                </span>
            )}

            {value && (
                <button type="button" onClick={() => onChange('')}
                    className="rounded-lg p-1 text-slate-400 transition hover:text-rose-500">
                    <X size={12} />
                </button>
            )}

            <input ref={ref} type="file" accept="image/*" className="hidden"
                onChange={e => { processFile(e.target.files?.[0]); e.target.value = '' }} />
        </div>
    )
}

// ── Circuit inline editor ──────────────────────────────────────────
const CircuitRow = ({ circuit }) => {
    const { patchCircuit } = useAppData()
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: circuit.name ?? '', image_url: circuit.image_url ?? '', requires_pass: circuit.requires_pass ?? false })

    const reset = () => {
        setForm({ name: circuit.name ?? '', image_url: circuit.image_url ?? '', requires_pass: circuit.requires_pass ?? false })
        setEditing(false)
    }

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('Il nome non può essere vuoto')
            return
        }
        setSaving(true)
        try {
            const res = await circuitsApi.update(circuit.id, {
                name: form.name.trim(),
                image_url: form.image_url.trim() || null,
                requires_pass: form.requires_pass,
            })
            // Aggiorna solo questo circuito nello stato locale invece di un
            // refresh() completo (rifetch di tutto il dataset): evita che un
            // salvataggio su una singola riga ricarichi visibilmente l'intera
            // pagina.
            patchCircuit(circuit.id, res.data)
            toast.success(`${form.name || circuit.name} aggiornato`)
            setEditing(false)
        } catch (err) {
            toast.error('Salvataggio fallito', { description: getApiErrorMessage(err) })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <CircuitThumbnail circuit={circuit} size="md" />
                    <p className="truncate capitalize text-sm font-bold text-slate-900 dark:text-foreground">{circuit.name}</p>
                    {circuit.requires_pass && (
                        <Lock size={12} className="shrink-0 text-amber-500" title="Richiede pass/DLC" />
                    )}
                </div>
                <button type="button" onClick={() => setEditing(v => !v)}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400">
                    <Edit2 size={10} /> {editing ? 'Annulla' : 'Modifica'}
                </button>
            </div>

            {editing && (
                <div className="border-t border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-3 space-y-2.5">
                    <label className="block space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nome</span>
                        <input
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                        />
                    </label>
                    <label className="block space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Foto</span>
                        <MiniImagePicker
                            value={form.image_url}
                            onChange={val => setForm(f => ({ ...f, image_url: val }))}
                        />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.requires_pass}
                            onChange={e => setForm(f => ({ ...f, requires_pass: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 dark:border-border accent-amber-500"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Richiede pass/DLC</span>
                    </label>
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={reset}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition hover:bg-slate-100">
                            <X size={10} /> Annulla
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-blue-500 disabled:opacity-60">
                            <Save size={10} /> {saving ? 'Salvo...' : 'Salva'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Header di gruppo trofeo, con rinomina inline ────────────────────
const TrophyGroupHeader = ({ trophy, items, color }) => {
    const { patchCircuit } = useAppData()
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(trophy)
    const [saving, setSaving] = useState(false)

    const startEdit = () => {
        setDraft(trophy)
        setEditing(true)
    }

    const handleRename = async () => {
        const newName = draft.trim()
        if (!newName || newName.toLowerCase() === trophy.toLowerCase()) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            // Il trofeo è solo il campo `description` condiviso da più
            // circuiti — rinominarlo vuol dire aggiornarlo su tutti i
            // circuiti del gruppo in un colpo solo, non un'entità a parte.
            await Promise.all(items.map((c) => circuitsApi.update(c.id, { description: newName })))
            items.forEach((c) => patchCircuit(c.id, { description: newName }))
            toast.success(`Trofeo rinominato in "${newName}"`)
            setEditing(false)
        } catch (err) {
            toast.error('Rinomina fallita', { description: getApiErrorMessage(err) })
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
                <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    className="flex-1 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition"
                />
                <button type="button" onClick={handleRename} disabled={saving}
                    className="shrink-0 rounded-lg p-1 text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-60">
                    <Check size={12} />
                </button>
                <button type="button" onClick={() => setEditing(false)}
                    className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:text-rose-500">
                    <X size={12} />
                </button>
            </div>
        )
    }

    return (
        <button type="button" onClick={startEdit} className="group flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">{trophy}</p>
            <Edit2 size={10} className="shrink-0 text-slate-300 dark:text-slate-600 opacity-0 transition group-hover:opacity-100" />
        </button>
    )
}

// ── Form "aggiungi circuito" ────────────────────────────────────────
const AddCircuitForm = ({ gameId, existingTrophies, initialTrophy = null, onClose }) => {
    const { addCircuit } = useAppData()
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: '', description: initialTrophy ?? existingTrophies[0] ?? '', newTrophy: '', image_url: '', requires_pass: false })
    const [creatingNewTrophy, setCreatingNewTrophy] = useState(existingTrophies.length === 0)

    const handleCreate = async () => {
        const name = form.name.trim()
        const description = (creatingNewTrophy ? form.newTrophy : form.description).trim()
        if (!name) {
            toast.error('Il nome non può essere vuoto')
            return
        }
        if (!description) {
            toast.error('Seleziona o inserisci un trofeo')
            return
        }
        setSaving(true)
        try {
            const res = await circuitsApi.create({
                name,
                description,
                game_id: gameId,
                image_url: form.image_url.trim() || null,
                requires_pass: form.requires_pass,
            })
            addCircuit(res.data)
            toast.success(`${name} creato`)
            onClose()
        } catch (err) {
            toast.error('Creazione fallita', { description: getApiErrorMessage(err) })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 px-3 py-3 space-y-2.5">
            <label className="block space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nome</span>
                <input
                    autoFocus
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                />
            </label>
            <label className="block space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Trofeo</span>
                {!creatingNewTrophy ? (
                    <div className="flex gap-2">
                        <select
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="flex-1 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition"
                        >
                            {existingTrophies.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button type="button" onClick={() => setCreatingNewTrophy(true)}
                            className="shrink-0 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition hover:text-blue-600">
                            Nuovo…
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            value={form.newTrophy}
                            onChange={e => setForm(f => ({ ...f, newTrophy: e.target.value }))}
                            placeholder="Nome nuovo trofeo"
                            className="flex-1 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                        />
                        {existingTrophies.length > 0 && (
                            <button type="button" onClick={() => setCreatingNewTrophy(false)}
                                className="shrink-0 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition hover:text-blue-600">
                                Esistente…
                            </button>
                        )}
                    </div>
                )}
            </label>
            <label className="block space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Foto</span>
                <MiniImagePicker
                    value={form.image_url}
                    onChange={val => setForm(f => ({ ...f, image_url: val }))}
                />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={form.requires_pass}
                    onChange={e => setForm(f => ({ ...f, requires_pass: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 dark:border-border accent-amber-500"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Richiede pass/DLC</span>
            </label>
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition hover:bg-slate-100">
                    <X size={10} /> Annulla
                </button>
                <button type="button" onClick={handleCreate} disabled={saving}
                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-blue-500 disabled:opacity-60">
                    <Save size={10} /> {saving ? 'Creo...' : 'Crea circuito'}
                </button>
            </div>
        </div>
    )
}

// ── CircuitsTab ─────────────────────────────────────────────────────
export default function CircuitsTab({ circuits = [], games = [] }) {
    const [selectedGameId, setSelectedGameId] = useState(() => games[0]?.id ?? null)
    const [search, setSearch] = useState('')
    const [showAddForm, setShowAddForm] = useState(false)
    const [addFormInitialTrophy, setAddFormInitialTrophy] = useState(null)
    const [showAddTrophyForm, setShowAddTrophyForm] = useState(false)
    const [newTrophyDraft, setNewTrophyDraft] = useState('')
    // Trofei creati "a vuoto" (nessun circuito ancora) — non esiste un
    // modello Trofeo a parte in DB (è solo Circuit.description condiviso),
    // quindi finché non gli si assegna almeno un circuito questi esistono
    // solo qui, lato client. Una volta creato il primo circuito con quel
    // trofeo, diventa un gruppo "vero" derivato dai circuiti e questa voce
    // diventa ridondante (filtrata sotto).
    const [pendingTrophies, setPendingTrophies] = useState([])

    const gameCircuits = useMemo(() => {
        const query = search.trim().toLowerCase()
        return circuits.filter((c) =>
            c.game_id === selectedGameId &&
            (!query || c.name.toLowerCase().includes(query))
        )
    }, [circuits, selectedGameId, search])

    const groups = useMemo(() => {
        const map = new Map()
        gameCircuits.forEach((circuit) => {
            const key = circuit.description || 'Altri circuiti'
            if (!map.has(key)) map.set(key, [])
            map.get(key).push(circuit)
        })
        return Array.from(map.entries()).map(([trophy, items]) => ({ trophy, items }))
    }, [gameCircuits])

    // Trofei esistenti per il gioco selezionato, non influenzati dalla
    // ricerca testuale — servono al form "aggiungi circuito" per popolare
    // il menu a tendina anche quando l'utente ha un filtro di ricerca attivo.
    // Include anche i trofei creati "a vuoto" (pendingTrophies) non ancora
    // assegnati a nessun circuito.
    const existingTrophies = useMemo(() => {
        const set = new Set()
        circuits.forEach((c) => { if (c.game_id === selectedGameId && c.description) set.add(c.description) })
        pendingTrophies
            .filter((t) => t.gameId === selectedGameId)
            .forEach((t) => set.add(t.name))
        return Array.from(set)
    }, [circuits, selectedGameId, pendingTrophies])

    // Trofei vuoti da mostrare come gruppo a parte — solo quelli non ancora
    // "diventati veri" (nessun circuito con quella description) e solo
    // quando non c'è una ricerca attiva (un gruppo vuoto non può comparire
    // tra risultati di ricerca per nome circuito).
    const emptyPendingTrophies = useMemo(() => {
        if (search.trim()) return []
        const realTrophyNames = new Set(groups.map((g) => g.trophy.toLowerCase()))
        return pendingTrophies.filter((t) => t.gameId === selectedGameId && !realTrophyNames.has(t.name.toLowerCase()))
    }, [pendingTrophies, selectedGameId, groups, search])

    return (
        <div className="space-y-4">
            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground mb-1">Catalogo circuiti</p>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground mb-4">Modifica nome e foto</h2>

                <div className="flex flex-wrap gap-2 mb-4">
                    {games.map((game) => (
                        <button
                            key={game.id}
                            type="button"
                            onClick={() => setSelectedGameId(game.id)}
                            className={`rounded-xl border-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${
                                selectedGameId === game.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                    : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-500 dark:text-muted-foreground hover:border-slate-300'
                            }`}
                        >
                            {game.name}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cerca circuito..."
                            className="w-full rounded-xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                        />
                    </div>
                    <button type="button" onClick={() => { setShowAddTrophyForm((v) => !v); setNewTrophyDraft('') }}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-blue-500 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300 transition hover:bg-blue-50 dark:hover:bg-blue-500/10">
                        <Plus size={13} /> Nuovo trofeo
                    </button>
                    <button type="button" onClick={() => { setAddFormInitialTrophy(null); setShowAddForm((v) => !v) }}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-blue-500">
                        <Plus size={13} /> Aggiungi circuito
                    </button>
                </div>

                {showAddTrophyForm && selectedGameId != null && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 px-3 py-2.5">
                        <input
                            autoFocus
                            value={newTrophyDraft}
                            onChange={(e) => setNewTrophyDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter') return
                                const name = newTrophyDraft.trim()
                                if (!name) return
                                if (existingTrophies.some((t) => t.toLowerCase() === name.toLowerCase())) {
                                    toast.error('Esiste già un trofeo con questo nome')
                                    return
                                }
                                setPendingTrophies((prev) => [...prev, { gameId: selectedGameId, name }])
                                toast.success(`Trofeo "${name}" creato — aggiungi un circuito per popolarlo`)
                                setShowAddTrophyForm(false)
                                setNewTrophyDraft('')
                            }}
                            placeholder="Nome del nuovo trofeo (Invio per confermare)"
                            className="flex-1 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                        />
                        <button type="button" onClick={() => setShowAddTrophyForm(false)}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:text-rose-500">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {showAddForm && selectedGameId != null && (
                    <div className="mb-4">
                        <AddCircuitForm
                            gameId={selectedGameId}
                            existingTrophies={existingTrophies}
                            initialTrophy={addFormInitialTrophy}
                            onClose={() => setShowAddForm(false)}
                        />
                    </div>
                )}

                {groups.length === 0 && emptyPendingTrophies.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        {search.trim() ? 'Nessun circuito corrisponde alla ricerca.' : 'Nessun circuito per questo gioco.'}
                    </p>
                ) : (
                    <div className="space-y-5">
                        {groups.map(({ trophy, items }, index) => {
                            const color = trophyColor(index)
                            return (
                                <div key={trophy} className={`space-y-2 border-l-4 pl-3 ${color.border}`}>
                                    <TrophyGroupHeader trophy={trophy} items={items} color={color} />
                                    <div className="grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {items.map((circuit) => (
                                            <CircuitRow key={circuit.id} circuit={circuit} />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                        {emptyPendingTrophies.map((t, i) => {
                            const color = trophyColor(groups.length + i)
                            return (
                                <div key={t.name} className={`space-y-2 border-l-4 pl-3 ${color.border}`}>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">{t.name}</p>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 dark:border-border px-3 py-3">
                                        <p className="flex-1 text-xs text-slate-400 dark:text-muted-foreground">Nessun circuito ancora in questo trofeo.</p>
                                        <button type="button" onClick={() => { setAddFormInitialTrophy(t.name); setShowAddForm(true) }}
                                            className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:text-blue-600 hover:border-blue-300">
                                            <Plus size={10} /> Aggiungi qui
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
