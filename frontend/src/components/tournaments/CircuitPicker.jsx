import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, Shuffle } from 'lucide-react'
import CircuitThumbnail from '@/components/common/CircuitThumbnail'
import { DEFAULT_TROPHY_COLOR, trophyColor } from '@/lib/trophyColors'

const MAX_MENU_HEIGHT = 420
const MIN_MENU_WIDTH = 360
const VIEWPORT_MARGIN = 12

const useDropdownPosition = (triggerRef, menuRef, open) => {
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0, maxHeight: MAX_MENU_HEIGHT, ready: false })

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

            // Larghezza minima 360 pensata per desktop: su schermi più
            // stretti del bottone-trigger (mobile) va vincolata al viewport,
            // altrimenti il menu sborda a destra e la sua metà finisce fuori
            // schermo, non raggiungibile al tocco. `left` va vincolato di
            // conseguenza (mai oltre innerWidth - width - margine).
            const width = Math.min(Math.max(rect.width, MIN_MENU_WIDTH), window.innerWidth - VIEWPORT_MARGIN * 2)
            const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN)

            // Il popover è position:fixed: se lo spazio reale sopra/sotto il
            // trigger è minore dell'altezza del contenuto, la parte in
            // eccesso finisce fuori dal viewport e non è raggiungibile né
            // scrollando la pagina (l'elemento è fixed) né scrollando il
            // popover stesso (che scrolla solo il proprio contenuto interno,
            // non oltre la propria altezza). Si limita quindi maxHeight allo
            // spazio realmente disponibile, così la lista resta sempre
            // interamente scrollabile.
            if (rect.top > menuHeight + 8) {
                const maxHeight = Math.min(MAX_MENU_HEIGHT, rect.top - VIEWPORT_MARGIN)
                setMenuPos({ top: rect.top - Math.min(menuHeight, maxHeight) - 4, left, width, maxHeight, ready: true })
            }
            else {
                const maxHeight = Math.min(MAX_MENU_HEIGHT, window.innerHeight - rect.bottom - 4 - VIEWPORT_MARGIN)
                setMenuPos({ top: rect.bottom + 4, left, width, maxHeight, ready: true })
            }
        }

        setMenuPos({ top: 0, left: 0, width: triggerRef.current?.getBoundingClientRect().width || 0, maxHeight: MAX_MENU_HEIGHT, ready: false })
        const raf = requestAnimationFrame(measure)

        return () => cancelAnimationFrame(raf)
    }, [open, triggerRef, menuRef])

    return menuPos
}

const CircuitPicker = ({ circuits = [], value, onChange, disabled = false, usedCircuitIds = new Set(), label = 'Circuito', placeholder = 'Seleziona un circuito' }) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const triggerRef = useRef(null)
    const menuRef = useRef(null)
    const inputRef = useRef(null)
    const menuPos = useDropdownPosition(triggerRef, menuRef, open)

    const selectedCircuit = useMemo(() => circuits.find((circuit) => circuit.id === Number(value)), [circuits, value])

    const groupedCircuits = useMemo(() => {
        const groups = new Map()

        circuits.forEach((circuit) => {
            const groupName = (circuit.description || 'Altro').trim() || 'Altro'
            const groupList = groups.get(groupName) ?? []
            groupList.push(circuit)
            groups.set(groupName, groupList)
        })

        return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right))
    }, [circuits])

    // Colore per trofeo assegnato per posizione nell'elenco ordinato
    // (stesso principio del catalogo circuiti admin) — calcolato sull'elenco
    // completo, non su quello filtrato dalla ricerca, così i colori restano
    // stabili mentre l'utente digita nella barra di ricerca.
    const groupColorByName = useMemo(() => {
        const map = new Map()
        groupedCircuits.forEach(([groupName], index) => map.set(groupName, trophyColor(index)))
        return map
    }, [groupedCircuits])

    const filteredGroups = useMemo(() => {
        if (!query.trim()) return groupedCircuits

        const term = query.toLowerCase()
        return groupedCircuits
            .map(([groupName, groupCircuits]) => {
                const matches = groupCircuits.filter((circuit) => {
                    const haystack = `${circuit.name} ${circuit.description ?? ''}`.toLowerCase()
                    return haystack.includes(term)
                })
                return [groupName, matches]
            })
            .filter(([, groupCircuits]) => groupCircuits.length > 0)
    }, [groupedCircuits, query])

    useEffect(() => {
        const handler = (event) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target) && menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false)
                setQuery('')
            }
        }

        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus()
        }
    }, [open])

    const hasDisabledMatch = (circuitId) => usedCircuitIds.has(circuitId) && circuitId !== Number(value)

    const availableCircuits = useMemo(
        () => circuits.filter((c) => !usedCircuitIds.has(c.id)),
        [circuits, usedCircuitIds]
    )
    const handleRandom = () => {
        if (availableCircuits.length === 0) return
        const pick = availableCircuits[Math.floor(Math.random() * availableCircuits.length)]
        onChange(pick.id)
    }

    return (
        // Sotto ad `sm` il bottone Random va a riga intera SOTTO al trigger
        // invece di stargli accanto — a fianco su mobile aveva poco margine
        // e finiva visivamente tagliato al bordo destro della riga.
        <div ref={triggerRef} className="relative flex flex-col sm:flex-row sm:items-stretch gap-2">
            <button
                type="button"
                onClick={() => { if (!disabled) setOpen((current) => !current) }}
                disabled={disabled}
                className="flex-1 min-w-0 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-left text-sm text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 truncate font-semibold">
                        {selectedCircuit ? (
                            <>
                                <CircuitThumbnail circuit={selectedCircuit} size="lg" />
                                <span className="truncate">{selectedCircuit.name}</span>
                                <span className={`hidden sm:inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${(groupColorByName.get(selectedCircuit.description || 'Altro') ?? DEFAULT_TROPHY_COLOR).badge}`}>
                                    {selectedCircuit.description ?? 'Cup'}
                                </span>
                            </>
                        ) : placeholder}
                    </span>
                    <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">{label}</div>
            </button>

            <button
                type="button"
                onClick={handleRandom}
                disabled={disabled || circuits.length === 0}
                title="Sorteggia un circuito non ancora usato"
                className="w-full sm:w-auto sm:shrink-0 flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-1 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3.5 py-2.5 sm:py-0 text-slate-500 dark:text-muted-foreground transition hover:border-emerald-400 hover:text-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Shuffle size={15} />
                <span className="text-[8px] font-black uppercase tracking-widest">Random</span>
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, maxHeight: menuPos.maxHeight, zIndex: 9999, visibility: menuPos.ready ? 'visible' : 'hidden' }}
                    className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
                >
                    <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 dark:border-slate-700 px-3 py-2">
                        <Search size={14} className="shrink-0 text-slate-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Cerca circuito o cup..."
                            className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        <div className="space-y-4">
                            {filteredGroups.map(([groupName, groupCircuits]) => {
                                const cupStyle = groupColorByName.get(groupName) ?? DEFAULT_TROPHY_COLOR
                                return (
                                <div key={groupName} className={`space-y-1.5 border-l-4 pl-2 ${cupStyle.border}`}>
                                    <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.35em] ${cupStyle.label}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${cupStyle.dot}`} />
                                        {groupName}
                                    </div>
                                    <div className="grid gap-1.5">
                                        {groupCircuits.map((circuit) => {
                                            const isSelected = circuit.id === Number(value)
                                            const isDisabled = hasDisabledMatch(circuit.id)

                                            return (
                                                <button
                                                    key={circuit.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isDisabled) return
                                                        onChange(circuit.id)
                                                        setOpen(false)
                                                        setQuery('')
                                                    }}
                                                    disabled={isDisabled}
                                                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all duration-150 ${isSelected ? 'bg-emerald-950/50 ring-2 ring-emerald-500 text-white' : isDisabled ? 'cursor-not-allowed opacity-35 bg-slate-50 dark:bg-slate-700 text-slate-400' : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                                >
                                                    <CircuitThumbnail circuit={circuit} size="md" />
                                                    <span className="min-w-0 truncate font-semibold">{circuit.name}</span>
                                                    {isDisabled ? (
                                                        <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Già usato</span>
                                                    ) : (
                                                        <span className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${cupStyle.badge}`}>
                                                            {circuit.description ?? 'Cup'}
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                )
                            })}
                            {filteredGroups.length === 0 && (
                                <p className="py-6 text-center text-sm text-slate-400">Nessun circuito trovato</p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default CircuitPicker