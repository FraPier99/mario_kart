import { useMemo, useRef, useState } from 'react'
import { Edit2, Save, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { compressImage } from '@/lib/imageCompression'
import { charactersApi, getApiErrorMessage } from '@/services/apiClient'

// ── Mini image picker (hides raw base64) — identico a CircuitsTab.jsx
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

// ── Character inline editor ────────────────────────────────────────
const CharacterRow = ({ character, onSaved }) => {
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: character.name ?? '', img_url: character.img_url ?? '' })

    const reset = () => {
        setForm({ name: character.name ?? '', img_url: character.img_url ?? '' })
        setEditing(false)
    }

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error('Il nome non può essere vuoto')
            return
        }
        setSaving(true)
        try {
            await charactersApi.update(character.id, {
                name: form.name.trim(),
                img_url: form.img_url.trim() || null,
            })
            toast.success(`${form.name || character.name} aggiornato`)
            setEditing(false)
            onSaved()
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
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card">
                        {character.img_url
                            ? <img src={character.img_url} alt={character.name} className="h-full w-full object-cover" />
                            : <div className="flex h-full w-full items-center justify-center text-[9px] font-black uppercase text-slate-400">?</div>
                        }
                    </div>
                    <p className="truncate capitalize text-sm font-bold text-slate-900 dark:text-foreground">{character.name}</p>
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
                            value={form.img_url}
                            onChange={val => setForm(f => ({ ...f, img_url: val }))}
                        />
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

// ── CharactersTab ───────────────────────────────────────────────────
export default function CharactersTab({ characters = [], games = [], onRefresh }) {
    const [selectedGameId, setSelectedGameId] = useState(() => games[0]?.id ?? null)

    const gameCharacters = useMemo(
        () => characters.filter((c) => c.game_id === selectedGameId),
        [characters, selectedGameId]
    )

    return (
        <div className="space-y-4">
            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground mb-1">Catalogo personaggi</p>
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

                {gameCharacters.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">Nessun personaggio per questo gioco.</p>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {gameCharacters.map((character) => (
                            <CharacterRow key={character.id} character={character} onSaved={onRefresh} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
