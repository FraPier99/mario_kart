/**
 * PhaseCircuitsCard — Mostra a colpo d'occhio, in un'unica griglia, quali
 * circuiti sono già stati usati e quali sono ancora liberi per una
 * determinata fase/girone (o per l'intero torneo in modalità classic).
 *
 * Un circuito è "utilizzato" solo se compare in una gara già presente in
 * `races` (cioè con un risultato registrato). Le gare di spareggio
 * (is_duello, circuito sorteggiato) sono evidenziate con un badge dedicato.
 * Prima erano due liste separate (chip compatti per i liberi, un elenco
 * verticale a riga piena per gli usati) — con molte gare la seconda lista
 * diventava altissima e costringeva a scorrere parecchio; ora è un'unica
 * griglia di tessere, tutte con lo stesso ingombro, dove lo stato si legge
 * dal colore/opacità senza dover scorrere una lista lunga.
 */
import { useMemo, useState } from 'react'
import { MapPin, Check, Shuffle, Info, ChevronDown, Lock, Search, Trophy, Medal } from 'lucide-react'
import CircuitThumbnail from '@/components/common/CircuitThumbnail'
import RefreshButton from '@/components/common/RefreshButton'

const ordinal = (n) => `${n}°`

// searchable/statsByCircuitId sono opt-in (default off): le chiamate esistenti
// nei tab a gironi/fase non li passano e restano visivamente identiche a
// prima — solo il tab Circuiti classic (e la sua controparte in vista admin)
// li attiva.
// passEnabled = false esclude i circuiti a pass/DLC dall'intera card (pool
// disponibile, conteggio, gruppi) — non solo un badge informativo: se
// disattivato per questa fase/girone, quei circuiti non devono comparire
// da nessuna parte per chi la guarda.
const PhaseCircuitsCard = ({ circuits = [], races = [], title = 'Circuiti', collapsible = false, defaultOpen = true, onRefresh = null, refreshing = false, searchable = false, statsByCircuitId = null, passEnabled = true }) => {
    const [open, setOpen] = useState(defaultOpen)
    const [search, setSearch] = useState('')
    const visibleCircuits = useMemo(
        () => passEnabled ? circuits : circuits.filter((c) => !c.requires_pass),
        [circuits, passEnabled]
    )
    const usedByCircuitId = useMemo(() => {
        const map = new Map()
        races
            .slice()
            .sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))
            .forEach((race) => {
                if (race.circuit_id != null && !map.has(race.circuit_id)) {
                    map.set(race.circuit_id, race)
                }
            })
        return map
    }, [races])

    const availableCount = visibleCircuits.length - usedByCircuitId.size

    const filteredCircuits = useMemo(() => {
        if (!searchable || !search.trim()) return visibleCircuits
        const q = search.trim().toLowerCase()
        return visibleCircuits.filter((c) => c.name?.toLowerCase().includes(q))
    }, [visibleCircuits, search, searchable])

    // Raggruppa per trofeo (circuit.description), preservando l'ordine di
    // comparizione nell'array — i circuiti arrivano già ordinati per trofeo.
    const groups = useMemo(() => {
        const map = new Map()
        filteredCircuits.forEach((circuit) => {
            const key = circuit.description || 'Altri circuiti'
            if (!map.has(key)) map.set(key, [])
            map.get(key).push(circuit)
        })
        return Array.from(map.entries()).map(([trophy, items]) => ({ trophy, items }))
    }, [filteredCircuits])

    if (circuits.length === 0) return null

    const titleBlock = (
        <div className="flex items-center gap-2 text-slate-500 dark:text-muted-foreground">
            <MapPin size={14} />
            <p className="text-xs font-black uppercase tracking-[0.3em]">{title}</p>
        </div>
    )

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 space-y-3">
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
                {collapsible ? (
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        className="flex items-center gap-2 text-left transition hover:opacity-80"
                    >
                        {titleBlock}
                    </button>
                ) : titleBlock}

                <div className="flex items-center gap-3 text-[10px] font-bold">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> {availableCount} libere
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" /> {usedByCircuitId.size} usate
                    </span>
                    {onRefresh && <RefreshButton onClick={onRefresh} loading={refreshing} />}
                    {collapsible && (
                        <button
                            type="button"
                            onClick={() => setOpen((o) => !o)}
                            className="rounded-lg p-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {(!collapsible || open) && (
                <>
                    {searchable && (
                        <div className="relative">
                            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cerca un circuito..."
                                className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                            />
                        </div>
                    )}

                    {searchable && filteredCircuits.length === 0 && (
                        <p className="text-center text-xs text-slate-400 dark:text-muted-foreground py-4">Nessun circuito trovato per &quot;{search}&quot;.</p>
                    )}

                    <div className="space-y-4">
                        {groups.map(({ trophy, items }) => (
                            <div key={trophy} className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">{trophy}</p>
                                <div className={`grid gap-2 ${statsByCircuitId ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
                                    {items.map((circuit) => {
                                        const race = usedByCircuitId.get(circuit.id)
                                        const isUsed = !!race
                                        const stats = statsByCircuitId?.get(circuit.id)
                                        return (
                                            <div
                                                key={circuit.id}
                                                className={`flex items-start gap-2 rounded-xl border px-2 py-2 ${isUsed
                                                    ? 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted opacity-60'
                                                    : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'}`}
                                            >
                                                <CircuitThumbnail circuit={circuit} size="md" />
                                                <div className="min-w-0 flex-1">
                                                    <p className={`flex items-center gap-1 truncate capitalize text-sm font-bold ${isUsed ? 'text-slate-500 dark:text-muted-foreground line-through' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                                        {circuit.name}
                                                        {circuit.requires_pass && <Lock size={10} className="shrink-0 text-amber-500" title="Richiede pass/DLC" />}
                                                    </p>
                                                    {isUsed ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 dark:text-muted-foreground">
                                                            <Check size={9} />
                                                            {race.name ?? `Gara ${race.race_order ?? ''}`}
                                                            {race.is_duello && <Shuffle size={9} className="text-amber-500" title="Circuito sorteggiato per spareggio" />}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black uppercase text-emerald-600/70 dark:text-emerald-400/60">Libera</span>
                                                    )}
                                                    {!isUsed && stats && (
                                                        <div className="mt-1.5 space-y-1 border-t border-slate-200/70 dark:border-border/70 pt-1.5">
                                                            <p className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-muted-foreground">
                                                                <Medal size={10} className="shrink-0 text-blue-500" />
                                                                {stats.myBestPosition != null
                                                                    ? <>Il mio miglior piazzamento: <strong className="text-slate-700 dark:text-foreground">{ordinal(stats.myBestPosition)}</strong></>
                                                                    : 'Non ci hai ancora corso'}
                                                            </p>
                                                            {stats.topWinners.length > 0 && (
                                                                <p className="flex items-start gap-1 text-[10px] text-slate-500 dark:text-muted-foreground">
                                                                    <Trophy size={10} className="mt-0.5 shrink-0 text-amber-500" />
                                                                    <span>
                                                                        Più vittorie: <strong className="text-slate-700 dark:text-foreground">
                                                                            {stats.topWinners.map((w) => w.nickname).join(', ')}
                                                                        </strong> ({stats.topWinners[0].wins}×)
                                                                    </span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50/60 dark:bg-muted/30 p-3 text-xs text-slate-500 dark:text-muted-foreground flex items-start gap-2">
                        <Info size={14} className="shrink-0" />
                        <span>Se un nome o un&apos;immagine non ti è chiaro, segnalalo pure all&apos;organizzatore.</span>
                    </div>
                </>
            )}
        </div>
    )
}

export default PhaseCircuitsCard
