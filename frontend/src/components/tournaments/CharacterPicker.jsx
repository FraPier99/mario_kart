/**
 * CharacterPicker — Selettore personaggio compatto (avatar + nome + popover con
 * ricerca e griglia). Estratto da GroupRaceForm.jsx per essere condiviso con
 * ClassicRaceForm: entrambi i form inseriscono un personaggio per riga di
 * risultato e serviva lo stesso identico controllo.
 *
 * Il popover è in portale (position: fixed), non assoluto rispetto alla riga:
 * per righe dal 2° posto in giù, un popover posizionato "assoluto" veniva
 * tagliato dall'overflow-hidden del contenitore (es. CollapsibleSection) prima
 * ancora di poter scrollare fino in fondo — stesso problema già risolto per
 * CircuitPicker. L'altezza massima si adatta allo spazio reale disponibile
 * sopra/sotto il bottone, allineato a destra come nella versione originale.
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, X } from 'lucide-react'

const MAX_MENU_HEIGHT = 300
const MAX_MENU_WIDTH = 288
const VIEWPORT_MARGIN = 12

const useDropdownPosition = (triggerRef, menuRef, open) => {
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0, width: MAX_MENU_WIDTH, maxHeight: MAX_MENU_HEIGHT, ready: false })

    useEffect(() => {
        if (!open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMenuPos((position) => ({ ...position, ready: false }))
            return
        }

        const measure = () => {
            if (!triggerRef.current) return
            const rect = triggerRef.current.getBoundingClientRect()
            const menuHeight = menuRef.current?.offsetHeight || MAX_MENU_HEIGHT
            // Larghezza e posizione (ancorata a destra del trigger, come uno
            // "sposta a sinistra se serve") vanno vincolate al viewport reale:
            // su schermi stretti un trigger vicino al bordo sinistro spingeva
            // il menu (larghezza fissa) fuori dallo schermo a sinistra, con
            // parte della griglia personaggi non raggiungibile al tocco.
            const width = Math.min(MAX_MENU_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)
            const rawRight = window.innerWidth - rect.right
            const maxRight = window.innerWidth - width - VIEWPORT_MARGIN
            const right = Math.min(Math.max(rawRight, VIEWPORT_MARGIN), Math.max(maxRight, VIEWPORT_MARGIN))

            if (rect.top > menuHeight + 8) {
                const maxHeight = Math.min(MAX_MENU_HEIGHT, rect.top - VIEWPORT_MARGIN)
                setMenuPos({ top: rect.top - Math.min(menuHeight, maxHeight) - 4, right, width, maxHeight, ready: true })
            }
            else {
                const maxHeight = Math.min(MAX_MENU_HEIGHT, window.innerHeight - rect.bottom - 4 - VIEWPORT_MARGIN)
                setMenuPos({ top: rect.bottom + 4, right, width, maxHeight, ready: true })
            }
        }

        setMenuPos((position) => ({ ...position, ready: false }))
        const raf = requestAnimationFrame(measure)
        return () => cancelAnimationFrame(raf)
    }, [open, triggerRef, menuRef])

    return menuPos
}

const CharacterPicker = ({ characters = [], value, onChange, disabled }) => {
    const [open, setOpen]     = useState(false)
    const [search, setSearch] = useState('')
    const triggerRef = useRef(null)
    const menuRef = useRef(null)
    const menuPos = useDropdownPosition(triggerRef, menuRef, open)

    const selected = characters.find((c) => String(c.id) === String(value))

    const filtered = useMemo(
        () => characters.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
        [characters, search]
    )

    useEffect(() => {
        if (!open) return
        const handler = (e) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    return (
        <div ref={triggerRef} className="relative shrink-0">
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

            {open && createPortal(
                <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, maxHeight: menuPos.maxHeight, width: menuPos.width, zIndex: 9999, visibility: menuPos.ready ? 'visible' : 'hidden' }}
                    className="flex flex-col rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-2xl p-3 space-y-2"
                >
                    {/* Search */}
                    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2">
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
                    <div className="min-h-0 flex-1 grid grid-cols-4 gap-1 overflow-y-auto content-start">
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
                </div>,
                document.body
            )}
        </div>
    )
}

export default CharacterPicker
