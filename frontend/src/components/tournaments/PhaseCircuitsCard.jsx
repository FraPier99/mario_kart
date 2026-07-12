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
import { MapPin, Check, Shuffle, Info, ChevronDown } from 'lucide-react'
import CircuitThumbnail from '@/components/common/CircuitThumbnail'
import RefreshButton from '@/components/common/RefreshButton'

const PhaseCircuitsCard = ({ circuits = [], races = [], title = 'Circuiti', collapsible = false, defaultOpen = true, onRefresh = null, refreshing = false }) => {
    const [open, setOpen] = useState(defaultOpen)
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

    const availableCount = circuits.length - usedByCircuitId.size

    // Raggruppa per trofeo (circuit.description), preservando l'ordine di
    // comparizione nell'array — i circuiti arrivano già ordinati per trofeo.
    const groups = useMemo(() => {
        const map = new Map()
        circuits.forEach((circuit) => {
            const key = circuit.description || 'Altri circuiti'
            if (!map.has(key)) map.set(key, [])
            map.get(key).push(circuit)
        })
        return Array.from(map.entries()).map(([trophy, items]) => ({ trophy, items }))
    }, [circuits])

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
                    <div className="space-y-4">
                        {groups.map(({ trophy, items }) => (
                            <div key={trophy} className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">{trophy}</p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                    {items.map((circuit) => {
                                        const race = usedByCircuitId.get(circuit.id)
                                        const isUsed = !!race
                                        return (
                                            <div
                                                key={circuit.id}
                                                className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${isUsed
                                                    ? 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted opacity-60'
                                                    : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'}`}
                                            >
                                                <CircuitThumbnail circuit={circuit} size="md" />
                                                <div className="min-w-0 flex-1">
                                                    <p className={`truncate capitalize text-sm font-bold ${isUsed ? 'text-slate-500 dark:text-muted-foreground line-through' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                                        {circuit.name}
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
