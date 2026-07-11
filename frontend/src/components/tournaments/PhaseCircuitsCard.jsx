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
import { useMemo } from 'react'
import { MapPin, Check, Shuffle } from 'lucide-react'
import CircuitThumbnail from '@/components/common/CircuitThumbnail'

const PhaseCircuitsCard = ({ circuits = [], races = [], title = 'Circuiti' }) => {
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

    if (circuits.length === 0) return null

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-muted-foreground">
                    <MapPin size={14} />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">{title}</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> {availableCount} libere
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" /> {usedByCircuitId.size} usate
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {circuits.map((circuit) => {
                    const race = usedByCircuitId.get(circuit.id)
                    const isUsed = !!race
                    return (
                        <div
                            key={circuit.id}
                            className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${isUsed
                                ? 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted opacity-60'
                                : 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'}`}
                        >
                            <CircuitThumbnail circuit={circuit} size="sm" />
                            <div className="min-w-0 flex-1">
                                <p className={`truncate text-[11px] font-bold ${isUsed ? 'text-slate-500 dark:text-muted-foreground line-through' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                    {circuit.name}
                                </p>
                                {isUsed ? (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 dark:text-muted-foreground">
                                        <Check size={9} />
                                        {race.name ?? `Gara ${race.race_order ?? ''}`}
                                        {race.is_duello && <Shuffle size={9} className="text-amber-500" title="Circuito sorteggiato per spareggio" />}
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-black uppercase text-emerald-600/70 dark:text-emerald-400/60">Libera</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default PhaseCircuitsCard
