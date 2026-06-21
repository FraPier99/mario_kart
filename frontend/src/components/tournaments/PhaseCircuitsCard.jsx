/**
 * PhaseCircuitsCard — Mostra i circuiti disponibili e quelli già utilizzati
 * per una determinata fase/girone (o per l'intero torneo in modalità classic).
 *
 * Un circuito è "utilizzato" solo se compare in una gara già presente in
 * `races` (cioè con un risultato registrato). Le gare di spareggio
 * (is_duello, circuito sorteggiato) sono evidenziate con un badge dedicato.
 */
import { useMemo } from 'react'
import { MapPin, Shuffle } from 'lucide-react'
import CircuitThumbnail from '@/components/common/CircuitThumbnail'

const PhaseCircuitsCard = ({ circuits = [], races = [], title = 'Circuiti' }) => {
    const usedEntries = useMemo(
        () => races
            .map((race) => ({ race, circuit: circuits.find((c) => c.id === race.circuit_id) }))
            .filter((entry) => entry.circuit)
            .sort((a, b) => (a.race.race_order ?? 0) - (b.race.race_order ?? 0)),
        [races, circuits]
    )

    const availableCircuits = useMemo(() => {
        const usedIds = new Set(usedEntries.map((entry) => entry.circuit.id))
        return circuits.filter((c) => !usedIds.has(c.id))
    }, [circuits, usedEntries])

    if (circuits.length === 0) return null

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-500 dark:text-muted-foreground">
                <MapPin size={14} />
                <p className="text-xs font-black uppercase tracking-[0.3em]">{title}</p>
            </div>

            <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Disponibili ({availableCircuits.length})
                </p>
                {availableCircuits.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {availableCircuits.map((c) => (
                            <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                <CircuitThumbnail circuit={c} size="xs" />
                                {c.name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 dark:text-muted-foreground">Tutti i circuiti disponibili sono già stati usati.</p>
                )}
            </div>

            <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                    Utilizzati ({usedEntries.length})
                </p>
                {usedEntries.length > 0 ? (
                    <ul className="space-y-1">
                        {usedEntries.map(({ race, circuit }) => (
                            <li key={race.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-muted px-3 py-1.5 text-xs">
                                <span className="flex items-center gap-1.5 truncate">
                                    <CircuitThumbnail circuit={circuit} size="sm" />
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{circuit.name}</span>
                                </span>
                                <span className="flex items-center gap-1.5 shrink-0">
                                    {race.is_duello && (
                                        <span title="Circuito sorteggiato per spareggio" className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">
                                            <Shuffle size={9} /> Random
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 dark:text-muted-foreground">{race.name ?? `Gara ${race.race_order ?? ''}`}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-slate-400 dark:text-muted-foreground">Nessun circuito ancora utilizzato.</p>
                )}
            </div>
        </div>
    )
}

export default PhaseCircuitsCard
