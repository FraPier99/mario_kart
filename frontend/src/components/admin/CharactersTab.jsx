import { useMemo, useRef, useState } from 'react'
import { Edit2, Plus, Save, Search, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { compressImage } from '@/lib/imageCompression'
import { charactersApi, getApiErrorMessage } from '@/services/apiClient'
import { useAppData } from '@/context/AppDataContext'
import { MKDS_VOICE_NAME_MAP } from '@/lib/mkdsSounds'
import { MK8D_VOICE_NAME_MAP } from '@/lib/mk8dSounds'

// Il verso audio (mkdsSounds.js/mk8dSounds.js) e, per Mario Kart DS, la
// mugshot (mugshots.js) risolvono il personaggio cercando il nome esatto
// (maiuscole/minuscole non contano) dentro queste stesse mappe — non c'è
// altra fonte di verità, quindi la si interroga direttamente invece di
// duplicarne il contenuto qui.
const findExpectedVoiceName = (name) => {
    if (!name?.trim()) return { status: 'empty' }
    const lower = name.trim().toLowerCase()
    for (const map of [MKDS_VOICE_NAME_MAP, MK8D_VOICE_NAME_MAP]) {
        for (const key of Object.keys(map)) {
            if (key.toLowerCase() === lower) {
                return map[key] == null
                    ? { status: 'no-voice', expectedName: key }
                    : { status: 'match', expectedName: key }
            }
        }
    }
    return { status: 'unknown' }
}

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
const CharacterRow = ({ character }) => {
    const { patchCharacter } = useAppData()
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: character.name ?? '', img_url: character.img_url ?? '' })
    const voiceInfo = useMemo(() => findExpectedVoiceName(form.name), [form.name])

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
            const res = await charactersApi.update(character.id, {
                name: form.name.trim(),
                img_url: form.img_url.trim() || null,
            })
            // Aggiorna solo questo personaggio nello stato locale invece di
            // un refresh() completo: evita che un salvataggio su una singola
            // riga ricarichi visibilmente l'intera pagina.
            patchCharacter(character.id, res.data)
            toast.success(`${form.name || character.name} aggiornato`)
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
                    {voiceInfo.status === 'match' && (
                        <p className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-2 text-[10px] leading-snug text-amber-700 dark:text-amber-300">
                            Il verso audio (e, per Mario Kart DS, anche la mugshot) sono associati al nome esatto, non all'ID. Nome atteso: <strong>"{voiceInfo.expectedName}"</strong> (maiuscole/minuscole non contano). Cambiando il nome in qualcosa di diverso li interrompi.
                        </p>
                    )}
                    {voiceInfo.status === 'no-voice' && (
                        <p className="rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-2.5 py-2 text-[10px] leading-snug text-slate-500 dark:text-muted-foreground">
                            Questo personaggio ("{voiceInfo.expectedName}") non ha un verso audio assegnato.
                        </p>
                    )}
                    {voiceInfo.status === 'unknown' && (
                        <p className="rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-2 text-[10px] leading-snug text-rose-700 dark:text-rose-300">
                            Con questo nome non risulta nessun verso audio (né, per Mario Kart DS, una mugshot) — verifica l'esatta corrispondenza prima di salvare.
                        </p>
                    )}
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

// ── Form "aggiungi personaggio" ─────────────────────────────────────
const AddCharacterForm = ({ gameId, onClose }) => {
    const { addCharacter } = useAppData()
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: '', img_url: '' })
    const voiceInfo = useMemo(() => findExpectedVoiceName(form.name), [form.name])

    const handleCreate = async () => {
        const name = form.name.trim()
        if (!name) {
            toast.error('Il nome non può essere vuoto')
            return
        }
        setSaving(true)
        try {
            const res = await charactersApi.create({
                name,
                img_url: form.img_url.trim() || null,
                game_id: gameId,
            })
            addCharacter(res.data)
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
            {voiceInfo.status === 'match' && (
                <p className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-2 text-[10px] leading-snug text-amber-700 dark:text-amber-300">
                    Il verso audio (e, per Mario Kart DS, anche la mugshot) sono associati al nome esatto. Nome riconosciuto: <strong>"{voiceInfo.expectedName}"</strong>.
                </p>
            )}
            {voiceInfo.status === 'unknown' && form.name.trim() && (
                <p className="rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-2 text-[10px] leading-snug text-rose-700 dark:text-rose-300">
                    Con questo nome non risulta nessun verso audio — verifica l'esatta corrispondenza se ne esiste uno previsto.
                </p>
            )}
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
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Foto</span>
                <MiniImagePicker
                    value={form.img_url}
                    onChange={val => setForm(f => ({ ...f, img_url: val }))}
                />
            </label>
            <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition hover:bg-slate-100">
                    <X size={10} /> Annulla
                </button>
                <button type="button" onClick={handleCreate} disabled={saving}
                    className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-blue-500 disabled:opacity-60">
                    <Save size={10} /> {saving ? 'Creo...' : 'Crea personaggio'}
                </button>
            </div>
        </div>
    )
}

// ── CharactersTab ───────────────────────────────────────────────────
export default function CharactersTab({ characters = [], games = [] }) {
    const [selectedGameId, setSelectedGameId] = useState(() => games[0]?.id ?? null)
    const [search, setSearch] = useState('')
    const [showAddForm, setShowAddForm] = useState(false)

    const gameCharacters = useMemo(() => {
        const query = search.trim().toLowerCase()
        return characters.filter((c) =>
            c.game_id === selectedGameId &&
            (!query || c.name.toLowerCase().includes(query))
        )
    }, [characters, selectedGameId, search])

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

                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cerca personaggio..."
                            className="w-full rounded-xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                        />
                    </div>
                    <button type="button" onClick={() => setShowAddForm((v) => !v)}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-blue-500">
                        <Plus size={13} /> Aggiungi personaggio
                    </button>
                </div>

                {showAddForm && selectedGameId != null && (
                    <div className="mb-4">
                        <AddCharacterForm gameId={selectedGameId} onClose={() => setShowAddForm(false)} />
                    </div>
                )}

                {gameCharacters.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        {search.trim() ? 'Nessun personaggio corrisponde alla ricerca.' : 'Nessun personaggio per questo gioco.'}
                    </p>
                ) : (
                    <div className="grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {gameCharacters.map((character) => (
                            <CharacterRow key={character.id} character={character} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
