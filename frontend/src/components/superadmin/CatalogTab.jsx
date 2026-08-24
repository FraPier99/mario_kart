import { useState } from 'react'
import { toast } from 'sonner'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { consolesApi, gamesApi, getApiErrorMessage } from '@/services/apiClient'

// ── Riga gioco: modifica nome/descrizione, elimina ────────────────────────
const GameRow = ({ game }) => {
    const { patchGame, removeGame } = useAppData()
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [form, setForm] = useState({ name: game.name ?? '', description: game.description ?? '' })

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('Il nome non può essere vuoto')
            return
        }
        setSaving(true)
        try {
            const res = await gamesApi.update(game.id, { name: form.name.trim(), description: form.description.trim() })
            patchGame(game.id, res.data)
            toast.success(`${form.name} aggiornato`)
            setEditing(false)
        } catch (err) {
            toast.error('Salvataggio fallito', { description: getApiErrorMessage(err) })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await gamesApi.remove(game.id)
            removeGame(game.id)
            toast.success(`${game.name} eliminato`)
        } catch (err) {
            toast.error('Eliminazione fallita', { description: getApiErrorMessage(err) })
        } finally {
            setDeleting(false)
            setConfirmingDelete(false)
        }
    }

    return (
        <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted overflow-hidden">
            {confirmingDelete ? (
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-rose-50/50 dark:bg-rose-500/5">
                    <span className="flex-1 min-w-35 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                        Eliminare &quot;{game.name}&quot;?
                    </span>
                    <button type="button" onClick={() => setConfirmingDelete(false)}
                        className="shrink-0 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:bg-slate-100">
                        Annulla
                    </button>
                    <button type="button" onClick={handleDelete} disabled={deleting}
                        className="shrink-0 rounded-lg bg-rose-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-rose-500 disabled:opacity-60">
                        {deleting ? 'Elimino...' : 'Sì, elimina'}
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <p className="truncate capitalize text-sm font-bold text-slate-900 dark:text-foreground">{game.name}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <button type="button" onClick={() => setEditing((v) => !v)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400">
                            <Edit2 size={10} /> {editing ? 'Annulla' : 'Modifica'}
                        </button>
                        <button type="button" onClick={() => setConfirmingDelete(true)} title="Elimina gioco"
                            className="rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card p-1.5 text-slate-400 transition hover:text-rose-500 hover:border-rose-300">
                            <Trash2 size={10} />
                        </button>
                    </div>
                </div>
            )}

            {editing && (
                <div className="border-t border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-3 space-y-2.5">
                    <label className="block space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nome</span>
                        <input
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition"
                        />
                    </label>
                    <label className="block space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Descrizione</span>
                        <input
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition"
                        />
                    </label>
                    <button type="button" onClick={handleSave} disabled={saving}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:opacity-60">
                        {saving ? 'Salvo...' : 'Salva'}
                    </button>
                </div>
            )}
        </div>
    )
}

const AddGameForm = () => {
    const { addGame } = useAppData()
    const [form, setForm] = useState({ name: '', description: '' })
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!form.name.trim()) {
            toast.error('Il nome non può essere vuoto')
            return
        }
        setSaving(true)
        try {
            const res = await gamesApi.create({ name: form.name.trim(), description: form.description.trim() })
            addGame(res.data)
            toast.success(`${form.name} aggiunto`)
            setForm({ name: '', description: '' })
        } catch (err) {
            toast.error('Creazione fallita', { description: getApiErrorMessage(err) })
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-border p-3">
            <label className="min-w-40 flex-1 space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nome</span>
                <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Nuovo gioco"
                    className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                />
            </label>
            <label className="min-w-40 flex-1 space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Descrizione</span>
                <input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Descrizione"
                    className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                />
            </label>
            <button type="submit" disabled={saving}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:opacity-60">
                <Plus size={12} /> {saving ? 'Aggiungo...' : 'Aggiungi'}
            </button>
        </form>
    )
}

// ── Riga console: modifica label/R4, elimina (key immutabile) ────────────
const ConsoleRow = ({ console: item }) => {
    const { patchConsole, removeConsole } = useAppData()
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [form, setForm] = useState({ label: item.label ?? '', is_r4_compatible: item.is_r4_compatible ?? false })

    const handleSave = async () => {
        if (!form.label.trim()) {
            toast.error('L\'etichetta non può essere vuota')
            return
        }
        setSaving(true)
        try {
            const res = await consolesApi.update(item.id, { label: form.label.trim(), is_r4_compatible: form.is_r4_compatible })
            patchConsole(item.id, res.data)
            toast.success(`${form.label} aggiornata`)
            setEditing(false)
        } catch (err) {
            toast.error('Salvataggio fallito', { description: getApiErrorMessage(err) })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await consolesApi.remove(item.id)
            removeConsole(item.id)
            toast.success(`${item.label} eliminata`)
        } catch (err) {
            toast.error('Eliminazione fallita', { description: getApiErrorMessage(err) })
        } finally {
            setDeleting(false)
            setConfirmingDelete(false)
        }
    }

    return (
        <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted overflow-hidden">
            {confirmingDelete ? (
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-rose-50/50 dark:bg-rose-500/5">
                    <span className="flex-1 min-w-35 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                        Eliminare &quot;{item.label}&quot;?
                    </span>
                    <button type="button" onClick={() => setConfirmingDelete(false)}
                        className="shrink-0 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:bg-slate-100">
                        Annulla
                    </button>
                    <button type="button" onClick={handleDelete} disabled={deleting}
                        className="shrink-0 rounded-lg bg-rose-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-rose-500 disabled:opacity-60">
                        {deleting ? 'Elimino...' : 'Sì, elimina'}
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-foreground">{item.label}</p>
                        <span className="shrink-0 text-[10px] text-slate-400">{item.key}</span>
                        {item.is_r4_compatible && (
                            <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">R4</span>
                        )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <button type="button" onClick={() => setEditing((v) => !v)}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400">
                            <Edit2 size={10} /> {editing ? 'Annulla' : 'Modifica'}
                        </button>
                        <button type="button" onClick={() => setConfirmingDelete(true)} title="Elimina console"
                            className="rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card p-1.5 text-slate-400 transition hover:text-rose-500 hover:border-rose-300">
                            <Trash2 size={10} />
                        </button>
                    </div>
                </div>
            )}

            {editing && (
                <div className="border-t border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-3 space-y-2.5">
                    <label className="block space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Etichetta</span>
                        <input
                            value={form.label}
                            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 transition"
                        />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_r4_compatible}
                            onChange={(e) => setForm((f) => ({ ...f, is_r4_compatible: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 dark:border-border accent-amber-500"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">R4 compatibile</span>
                    </label>
                    <button type="button" onClick={handleSave} disabled={saving}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:opacity-60">
                        {saving ? 'Salvo...' : 'Salva'}
                    </button>
                </div>
            )}
        </div>
    )
}

const AddConsoleForm = () => {
    const { addConsole } = useAppData()
    const [form, setForm] = useState({ key: '', label: '', is_r4_compatible: false })
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        const key = form.key.trim().toLowerCase().replace(/\s+/g, '_')
        if (!key || !form.label.trim()) {
            toast.error('Chiave ed etichetta sono obbligatorie')
            return
        }
        setSaving(true)
        try {
            const res = await consolesApi.create({ key, label: form.label.trim(), is_r4_compatible: form.is_r4_compatible })
            addConsole(res.data)
            toast.success(`${form.label} aggiunta`)
            setForm({ key: '', label: '', is_r4_compatible: false })
        } catch (err) {
            toast.error('Creazione fallita', { description: getApiErrorMessage(err) })
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-border p-3">
            <label className="min-w-32 flex-1 space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Chiave</span>
                <input
                    value={form.key}
                    onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                    placeholder="es. switch_2"
                    className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                />
            </label>
            <label className="min-w-32 flex-1 space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Etichetta</span>
                <input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="es. Switch 2"
                    className="w-full rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                />
            </label>
            <label className="flex shrink-0 items-center gap-2 cursor-pointer pb-2">
                <input
                    type="checkbox"
                    checked={form.is_r4_compatible}
                    onChange={(e) => setForm((f) => ({ ...f, is_r4_compatible: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 dark:border-border accent-amber-500"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">R4</span>
            </label>
            <button type="submit" disabled={saving}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:opacity-60">
                <Plus size={12} /> {saving ? 'Aggiungo...' : 'Aggiungi'}
            </button>
        </form>
    )
}

export default function CatalogTab() {
    const { games, consoles } = useAppData()

    return (
        <div className="space-y-6">
            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground">Catalogo</p>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Giochi</h2>
                <div className="mt-4 space-y-2">
                    {games.map((g) => <GameRow key={g.id} game={g} />)}
                    <AddGameForm />
                </div>
            </div>

            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground">Catalogo</p>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Console</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">La chiave è immutabile dopo la creazione — referenziata dai possessi già dichiarati.</p>
                <div className="mt-4 space-y-2">
                    {consoles.map((c) => <ConsoleRow key={c.id} console={c} />)}
                    <AddConsoleForm />
                </div>
            </div>
        </div>
    )
}
