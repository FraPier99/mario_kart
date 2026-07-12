import { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAppData } from '@/context/AppDataContext'
import { toast } from 'sonner'
import { getApiErrorMessage, resultsApi } from '@/services/apiClient'
import { ChevronDown, Search, Check, X } from 'lucide-react'
import { buildAvatarPlaceholder } from '@/lib/placeholders'

const useDropdownPosition = (triggerRef, menuRef, open, options = {}) => {
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0, ready: false })
    const { forceBelow = false } = options

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!open) { setMenuPos((p) => ({ ...p, ready: false })); return }
        const measure = () => {
            if (!triggerRef.current) return
            const rect = triggerRef.current.getBoundingClientRect()
            const menuH = menuRef.current?.offsetHeight || 200
            if (forceBelow) {
                setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width, ready: true })
            } else if (rect.top > menuH + 8) {
                setMenuPos({ top: rect.top - menuH - 4, left: rect.left, width: rect.width, ready: true })
            } else {
                setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width, ready: true })
            }
        }
        setMenuPos({ top: 0, left: 0, width: triggerRef.current?.getBoundingClientRect().width || 0, ready: false })
        const raf = requestAnimationFrame(measure)
        return () => cancelAnimationFrame(raf)
    }, [open, triggerRef, menuRef, forceBelow])

    return menuPos
}

const RaceDropdown = ({ races, circuitsById, results, tournamentParticipants, value, onChange, disabled }) => {
    const [open, setOpen] = useState(false)
    const triggerRef = useRef(null)
    const menuRef = useRef(null)
    const menuPos = useDropdownPosition(triggerRef, menuRef, open)

    const sortedRacesDesc = useMemo(() => [...races].sort((a, b) => (b.race_order ?? 0) - (a.race_order ?? 0)), [races])
    const selectedRace = sortedRacesDesc.find((r) => r.id === Number(value))

    const raceStatusMap = useMemo(() => {
        const total = tournamentParticipants.length
        const map = new Map()
        races.forEach((race) => {
            const entered = results.filter((r) => r.race_id === race.id).length
            if (entered === 0) map.set(race.id, 'empty')
            else if (entered >= total) map.set(race.id, 'full')
            else map.set(race.id, 'partial')
        })
        return map
    }, [races, results, tournamentParticipants])

    useEffect(() => {
        const handler = (e) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const statusColor = (raceId) => {
        const status = raceStatusMap.get(raceId)
        if (status === 'full') return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
        if (status === 'partial') return 'bg-amber-400 text-amber-950 shadow-lg shadow-amber-400/20'
        return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
    }

    return (
        <div ref={triggerRef} className="relative">
            <button
                type="button"
                onClick={() => { if (!disabled) setOpen((v) => !v) }}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all ${selectedRace ? `${statusColor(selectedRace.id)} border-transparent` : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-900 dark:text-foreground'}`}
            >
                <span className="flex items-center gap-2 truncate">
                    {selectedRace
                        ? `Gara ${selectedRace.race_order} — ${circuitsById?.get(selectedRace.circuit_id)?.name ?? selectedRace.name ?? ''}`
                        : 'Seleziona una gara'}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && createPortal(
                <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: Math.max(menuPos.width, 320), zIndex: 9999, visibility: menuPos.ready ? 'visible' : 'hidden' }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-3"
                >
                    <div className="flex items-center gap-3 mb-2 px-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Completa</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Parziale</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Vuota</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                        {sortedRacesDesc.map((race) => {
                            const isSelected = race.id === Number(value)
                            return (
                                <button
                                    key={race.id}
                                    type="button"
                                    onClick={() => { onChange(race.id); setOpen(false) }}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black transition-all ${statusColor(race.id)} ${isSelected ? 'ring-2 ring-white scale-110 shadow-lg' : ''}`}
                                >
                                    {race.race_order}
                                </button>
                            )
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

const PlayerGrid = ({ players, alreadyEnteredPlayerIds, value, onChange, disabled }) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const triggerRef = useRef(null)
    const menuRef = useRef(null)
    const inputRef = useRef(null)
    const menuPos = useDropdownPosition(triggerRef, menuRef, open)

    const selectedPlayer = players.find((p) => p.id === Number(value))

    const sortedPlayers = useMemo(() => {
        const entered = []
        const notEntered = []
        players.forEach((p) => {
            if (alreadyEnteredPlayerIds.has(p.id)) entered.push(p)
            else notEntered.push(p)
        })
        return [...notEntered, ...entered]
    }, [players, alreadyEnteredPlayerIds])

    const filtered = useMemo(() => {
        if (!query) return sortedPlayers
        const q = query.toLowerCase()
        return sortedPlayers.filter((p) => p.nickname?.toLowerCase().includes(q))
    }, [sortedPlayers, query])

    useEffect(() => {
        const handler = (e) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false)
                setQuery('')
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])

    return (
        <div ref={triggerRef} className="relative">
            <button
                type="button"
                onClick={() => { if (!disabled) setOpen((v) => !v) }}
                disabled={disabled}
                className="w-full flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-left text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {selectedPlayer ? (
                    <span className="flex items-center gap-2 truncate">
                        <img
                            src={selectedPlayer.img_url || buildAvatarPlaceholder(selectedPlayer.nickname ?? '?')}
                            alt={selectedPlayer.nickname}
                            className="h-7 w-7 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-600 shrink-0"
                        />
                        <span className="truncate">{selectedPlayer.nickname}</span>
                        {alreadyEnteredPlayerIds.has(selectedPlayer.id) && (
                            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                    </span>
                ) : (
                    <span className="truncate text-slate-400">Seleziona un pilota</span>
                )}
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && createPortal(
                <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: Math.max(menuPos.width, 320), zIndex: 9999, visibility: menuPos.ready ? 'visible' : 'hidden' }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 px-3 py-2">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cerca pilota..."
                            className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-200">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="max-h-65 overflow-y-auto p-3">
                        <div className="grid grid-cols-4 gap-2">
                            {filtered.map((player) => {
                                const isSelected = player.id === Number(value)
                                const isEntered = alreadyEnteredPlayerIds.has(player.id)
                                const avatarSrc = player.img_url || buildAvatarPlaceholder(player.nickname ?? '?')
                                return (
                                    <button
                                        key={player.id}
                                        type="button"
                                        title={`${player.nickname}${isEntered ? ' (già inserito)' : ''}`}
                                        onClick={() => { if (!isEntered) { onChange(player.id); setOpen(false); setQuery('') } }}
                                        disabled={isEntered}
                                        className={`relative flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all ${isSelected ? 'bg-emerald-950/50 ring-2 ring-emerald-500' : isEntered ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        <img
                                            src={avatarSrc}
                                            alt={player.nickname}
                                            className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-600"
                                        />
                                        <span className="w-full text-center text-[9px] leading-tight font-bold text-slate-500 dark:text-slate-400 truncate">{player.nickname}</span>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                                <Check size={10} className="text-white" />
                                            </div>
                                        )}
                                        {isEntered && !isSelected && (
                                            <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/40 dark:bg-black/60">
                                                <span className="text-[9px] font-black text-white uppercase">Inserito</span>
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                            {filtered.length === 0 && (
                                <p className="col-span-4 text-center text-sm text-slate-400 py-4">Nessun pilota trovato</p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {alreadyEnteredPlayerIds.size > 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {alreadyEnteredPlayerIds.size} pilota/i già inserito/i per questa gara
                </p>
            )}
        </div>
    )
}

const CharacterGrid = ({ characters, value, onChange, disabled }) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const triggerRef = useRef(null)
    const menuRef = useRef(null)
    const inputRef = useRef(null)
    const menuPos = useDropdownPosition(triggerRef, menuRef, open)

    const selectedChar = characters.find((ch) => ch.id === Number(value))

    const filtered = useMemo(() => {
        if (!query) return characters
        const q = query.toLowerCase()
        return characters.filter((ch) => ch.name?.toLowerCase().includes(q))
    }, [characters, query])

    useEffect(() => {
        const handler = (e) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false)
                setQuery('')
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => { if (open && inputRef.current) inputRef.current.focus() }, [open])

    return (
        <div ref={triggerRef} className="relative">
            <button
                type="button"
                onClick={() => { if (!disabled) setOpen((v) => !v) }}
                disabled={disabled}
                className="w-full flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-left text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {selectedChar ? (
                    <span className="flex items-center gap-2 truncate">
                        {selectedChar.img_url ? (
                            <img src={selectedChar.img_url} alt={selectedChar.name} className="h-7 w-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-600 shrink-0" />
                        ) : (
                            <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-400 dark:text-slate-300 shrink-0">
                                {selectedChar.name?.charAt(0)?.toUpperCase()}
                            </div>
                        )}
                        <span className="truncate">{selectedChar.name}</span>
                    </span>
                ) : (
                    <span className="truncate text-slate-400">Seleziona un personaggio</span>
                )}
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && createPortal(
                <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: Math.max(menuPos.width, 320), zIndex: 9999, visibility: menuPos.ready ? 'visible' : 'hidden' }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 px-3 py-2">
                        <Search size={14} className="text-slate-400 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cerca personaggio..."
                            className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-200">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="max-h-65 overflow-y-auto p-3">
                        <div className="grid grid-cols-4 gap-2">
                            {filtered.map((ch) => {
                                const isSelected = ch.id === Number(value)
                                return (
                                    <button
                                        key={ch.id}
                                        type="button"
                                        onClick={() => { onChange(ch.id); setOpen(false); setQuery('') }}
                                        className={`relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 transition-all ${isSelected ? 'bg-emerald-950/50 ring-2 ring-emerald-500' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        {ch.img_url ? (
                                            <img src={ch.img_url} alt={ch.name} className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-600" />
                                        ) : (
                                            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-base font-black text-slate-400 dark:text-slate-300">
                                                {ch.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                        )}
                                        <span className="w-full text-center text-[10px] leading-tight font-bold text-slate-600 dark:text-slate-300 truncate">{ch.name}</span>
                                    </button>
                                )
                            })}
                            {filtered.length === 0 && (
                                <p className="col-span-4 text-center text-sm text-slate-400 py-4">Nessun personaggio trovato</p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

const PositionGrid = ({ max, value, onChange, disabled, takenPositions }) => {
    const [open, setOpen] = useState(false)
    const triggerRef = useRef(null)
    const menuRef = useRef(null)
    const menuPos = useDropdownPosition(triggerRef, menuRef, open)

    useEffect(() => {
        const handler = (e) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const positions = useMemo(() => {
        const arr = []
        for (let i = 1; i <= max; i++) arr.push(i)
        return arr
    }, [max])

    const posStyle = (pos, isTaken, isSelected) => {
        if (isSelected) return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
        if (isTaken) return 'bg-red-400/80 text-white/70 cursor-not-allowed opacity-40'
        return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
    }

    const selectedBadge = () => 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'

    return (
        <div ref={triggerRef} className="relative">
            <button
                type="button"
                onClick={() => { if (!disabled) setOpen((v) => !v) }}
                disabled={disabled}
                className="w-full flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-left text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className="flex items-center gap-2">
                    {value ? (
                        <>
                            <span className={`h-6 w-6 rounded-lg ${selectedBadge()} flex items-center justify-center text-xs font-black ring-2 ring-emerald-500`}>{value}</span>
                            <span>Posizione {value}</span>
                        </>
                    ) : (
                        <span className="text-slate-400">Scegli posizione</span>
                    )}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && createPortal(
                <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: 168, zIndex: 9999, visibility: menuPos.ready ? 'visible' : 'hidden' }}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-2"
                >
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Libera</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 dark:text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Presa</span>
                    </div>
                    <div className="grid grid-cols-3 gap-px">
                        {positions.map((pos) => {
                            const isSelected = pos === Number(value)
                            const isTaken = takenPositions?.has(pos) && !isSelected
                            return (
                                <button
                                    key={pos}
                                    type="button"
                                    onClick={() => { if (!isTaken) { onChange(pos); setOpen(false) } }}
                                    disabled={isTaken}
                                    className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black transition-all ${posStyle(pos, isTaken, isSelected)}`}
                                >
                                    {pos}
                                </button>
                            )
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

const ResultEntryForm = ({ tournament, races, tournamentParticipants, onCreated, disabled = false }) => {
    const initialRaceId = useMemo(() => {
        if (!races.length) return ''
        return races.reduce((max, r) => (r.race_order ?? 0) > (max.race_order ?? 0) ? r : max, races[0]).id
    }, [races])
    const [formState, setFormState] = useState({
        race_id: initialRaceId,
        player_id: tournamentParticipants[0]?.id ?? '',
        character_id: tournamentParticipants[0]?.favorite_character_id ?? '',
        position: null,
    })
    const [saving, setSaving] = useState(false)
    const [localEntries, setLocalEntries] = useState([])
    const isFirstRender = useRef(true)

    const { charactersByGameId, characters, results, circuitsById } = useAppData()
    const gameCharacters = tournament?.game_id
        ? (charactersByGameId.get(tournament.game_id) ?? characters)
        : characters

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return }
        setLocalEntries([])
    }, [formState.race_id])

    useEffect(() => {
        const fallbackPlayer = tournamentParticipants[0] ?? null
        const lastRace = races.length
            ? races.reduce((max, r) => (r.race_order ?? 0) > (max.race_order ?? 0) ? r : max, races[0])
            : null

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormState((current) => ({
            ...current,
            race_id: lastRace?.id ?? current.race_id ?? '',
            player_id: current.player_id || fallbackPlayer?.id || '',
            character_id: current.character_id || fallbackPlayer?.favorite_character_id || '',
        }))
    }, [tournamentParticipants, races])

    const alreadyEnteredPlayerIds = useMemo(() => {
        const ids = new Set()
        if (!formState.race_id) return ids
        results.filter((r) => r.race_id === Number(formState.race_id)).forEach((r) => ids.add(r.player_id))
        localEntries.filter((e) => e.race_id === Number(formState.race_id)).forEach((e) => ids.add(e.player_id))
        return ids
    }, [formState.race_id, results, localEntries])

    const takenPositions = useMemo(() => {
        const ids = new Set()
        if (!formState.race_id) return ids
        results.filter((r) => r.race_id === Number(formState.race_id)).forEach((r) => ids.add(r.position))
        localEntries.filter((e) => e.race_id === Number(formState.race_id)).forEach((e) => ids.add(e.position))
        return ids
    }, [formState.race_id, results, localEntries])

    const isRaceComplete = useMemo(() => {
        if (!formState.race_id) return false
        return alreadyEnteredPlayerIds.size >= tournamentParticipants.length
    }, [formState.race_id, alreadyEnteredPlayerIds, tournamentParticipants])

    const getPlayerPreviousCharacterId = (playerId, currentRaceId) => {
        if (!playerId || !currentRaceId) return null
        const currentRace = races.find((r) => r.id === Number(currentRaceId))
        if (!currentRace) return null
        const currentOrder = currentRace.race_order ?? 0
        // find the most recent result for this player in any race before current (by race_order)
        const prevResult = results
            .filter((r) => r.player_id === Number(playerId))
            .filter((r) => {
                const race = races.find((race) => race.id === r.race_id)
                return race && (race.race_order ?? 0) < currentOrder
            })
            .sort((a, b) => {
                const raceA = races.find((r) => r.id === a.race_id)
                const raceB = races.find((r) => r.id === b.race_id)
                return (raceB?.race_order ?? 0) - (raceA?.race_order ?? 0)
            })[0]
        return prevResult?.character_id ?? null
    }

    const handleChange = (name, value) => {
        setFormState((current) => {
            if (name === 'race_id') {
                return { ...current, race_id: value, player_id: '', character_id: '', position: null }
            }
            if (name === 'player_id') {
                const previousCharacterId = getPlayerPreviousCharacterId(value, current.race_id)
                const fallbackCharacterId = tournamentParticipants.find((player) => player.id === Number(value))?.favorite_character_id ?? ''
                return {
                    ...current,
                    player_id: value,
                    character_id: previousCharacterId ?? fallbackCharacterId,
                }
            }
            return {
                ...current,
                [name]: value,
            }
        })
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!formState.race_id || !formState.player_id || !formState.character_id || !formState.position) {
            toast.error('Compila tutti i campi del risultato')
            return
        }

        const entry = {
            race_id: Number(formState.race_id),
            player_id: Number(formState.player_id),
            character_id: Number(formState.character_id),
            position: Number(formState.position),
        }

        setSaving(true)

        try {
            await resultsApi.create(entry)

            setLocalEntries((prev) => [...prev, entry])

            const usedPlayerIds = new Set()
            const usedCharIds = new Set()
            const usedPositions = new Set()
            localEntries.filter((e) => e.race_id === entry.race_id).forEach((e) => {
                usedPlayerIds.add(e.player_id)
                usedCharIds.add(e.character_id)
                usedPositions.add(e.position)
            })
            usedPlayerIds.add(entry.player_id)
            usedCharIds.add(entry.character_id)
            usedPositions.add(entry.position)

            const freePlayer = tournamentParticipants.find((p) => !usedPlayerIds.has(p.id))
            const freeChar = gameCharacters.find((ch) => !usedCharIds.has(ch.id))

            setFormState((current) => ({
                ...current,
                player_id: freePlayer?.id ?? '',
                character_id: freeChar?.id ?? freePlayer?.favorite_character_id ?? '',
                position: null,
            }))

            toast.success('Risultato salvato')
            await onCreated()
        }
        catch (error) {
            const message = getApiErrorMessage(error, 'Salvataggio risultato fallito')
            console.error('[ResultEntryForm] create failed', error, { tournamentId: tournament.id, ...formState })
            toast.error('Impossibile salvare il risultato', { description: message })
        }
        finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={`space-y-4 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/20 ${disabled ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 dark:bg-slate-200 text-xs font-black text-white dark:text-slate-900">2</span>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-foreground">Inserisci risultato</h3>
                    {disabled ? (
                        <p className="mt-1 text-sm font-medium text-amber-600 dark:text-amber-400">Torneo completato — non è possibile inserire nuovi risultati.</p>
                    ) : (
                        <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Seleziona la gara e il pilota, poi inserisci posizione e personaggio.</p>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Gara</span>
                    <RaceDropdown
                        races={races}
                        circuitsById={circuitsById}
                        results={results}
                        tournamentParticipants={tournamentParticipants}
                        value={formState.race_id}
                        onChange={(val) => handleChange('race_id', val)}
                        disabled={disabled || isRaceComplete}
                    />
                </label>

                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Pilota</span>
                    <PlayerGrid
                        players={tournamentParticipants}
                        alreadyEnteredPlayerIds={alreadyEnteredPlayerIds}
                        value={formState.player_id}
                        onChange={(val) => handleChange('player_id', val)}
                        disabled={disabled || isRaceComplete}
                    />
                </label>

                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Personaggio</span>
                    <CharacterGrid
                        characters={gameCharacters}
                        value={formState.character_id}
                        onChange={(val) => handleChange('character_id', val)}
                        disabled={disabled || isRaceComplete}
                    />
                </label>

                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Posizione</span>
                    <PositionGrid
                        max={tournamentParticipants.length}
                        value={formState.position}
                        onChange={(val) => handleChange('position', val)}
                        disabled={disabled || isRaceComplete}
                        takenPositions={takenPositions}
                    />
                </label>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={disabled || saving || !races.length || !tournamentParticipants.length}
                    className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-700 dark:hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? 'Salvataggio...' : 'Salva risultato'}
                </button>
            </div>
        </form>
    )
}

export default ResultEntryForm
