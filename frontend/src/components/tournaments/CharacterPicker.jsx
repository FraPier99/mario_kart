/**
 * CharacterPicker — Selettore personaggio compatto (avatar + nome + popover con
 * ricerca e griglia). Estratto da GroupRaceForm.jsx per essere condiviso con
 * ClassicRaceForm: entrambi i form inseriscono un personaggio per riga di
 * risultato e serviva lo stesso identico controllo.
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

const CharacterPicker = ({ characters = [], value, onChange, disabled }) => {
    const [open, setOpen]     = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef(null)

    const selected = characters.find((c) => String(c.id) === String(value))

    const filtered = useMemo(
        () => characters.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
        [characters, search]
    )

    useEffect(() => {
        if (!open) return
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                type="button"
                onClick={() => !disabled && setOpen((o) => !o)}
                disabled={disabled}
                title={selected?.name ?? 'Seleziona personaggio'}
                className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-black transition disabled:opacity-40 ${
                    selected
                        ? 'border-emerald-400/50 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-400'
                }`}
            >
                {selected?.img_url
                    ? <img src={selected.img_url} alt={selected.name} className="h-6 w-6 object-contain rounded" />
                    : <div className="h-6 w-6 rounded bg-slate-200 dark:bg-muted flex items-center justify-center text-[8px]">?</div>
                }
                <span className="max-w-16 truncate hidden sm:inline">{selected?.name ?? '—'}</span>
                <ChevronDown size={10} className="opacity-50" />
            </button>

            {open && (
                <div className="absolute z-50 top-full right-0 mt-1 w-72 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-2xl p-3 space-y-2">
                    {/* Search */}
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2">
                        <Search size={12} className="text-slate-400 shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Cerca personaggio..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-foreground outline-none placeholder:text-slate-400"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')}>
                                <X size={10} className="text-slate-400 hover:text-slate-600" />
                            </button>
                        )}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-4 gap-1 max-h-52 overflow-y-auto">
                        {filtered.length === 0 && (
                            <p className="col-span-4 text-center text-[10px] text-slate-400 py-3">Nessun personaggio trovato</p>
                        )}
                        {filtered.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => { onChange(c.id); setOpen(false); setSearch('') }}
                                className={`flex flex-col items-center gap-0.5 rounded-xl p-1.5 transition hover:bg-amber-50 dark:hover:bg-amber-500/10 ${
                                    String(value) === String(c.id)
                                        ? 'bg-amber-50 dark:bg-amber-500/15 ring-1 ring-amber-400'
                                        : ''
                                }`}
                            >
                                {c.img_url
                                    ? <img src={c.img_url} alt={c.name} className="h-8 w-8 object-contain rounded" />
                                    : <div className="h-8 w-8 rounded bg-slate-200 dark:bg-muted flex items-center justify-center text-[8px] font-black">{c.name[0]}</div>
                                }
                                <p className="text-[7px] font-black leading-tight text-center line-clamp-2 text-slate-700 dark:text-slate-300">{c.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default CharacterPicker
