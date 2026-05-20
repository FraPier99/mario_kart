import { useMemo, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'

const PAGE_SIZE = 10

const RaceList = ({ races, circuitsById, charactersById }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

    const filteredRaces = useMemo(() => {
        if (!searchTerm.trim()) return races
        const term = searchTerm.toLowerCase()
        return races.filter((race) => {
            const name = (race.name || `Gara ${race.race_order}`).toLowerCase()
            const circuit = (circuitsById?.get(race.circuit_id)?.name ?? '').toLowerCase()
            return name.includes(term) || circuit.includes(term)
        })
    }, [races, searchTerm, circuitsById])

    const visibleRaces = filteredRaces.slice(0, visibleCount)
    const hasMore = visibleCount < filteredRaces.length

    if (!races.length) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-6 text-sm text-slate-500 dark:text-muted-foreground dark:text-muted-foreground">
                Nessuna gara registrata per questo torneo.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Cerca gara o circuito..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(PAGE_SIZE) }}
                    className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted py-3 pe-4 ps-10 outline-none focus:border-emerald-500"
                />
            </div>

            <div className="max-h-[600px] space-y-4 overflow-y-auto pr-1">
                {visibleRaces.length ? (
                    <>
                        {visibleRaces.map((race) => (
                            <section key={race.id} className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Gara {race.race_order}</p>
                                        <h4 className="text-lg font-black text-slate-900 dark:text-foreground">{race.name || `Gara ${race.race_order}`}</h4>
                                    </div>
                                    <span className="rounded-full bg-slate-100 dark:bg-muted px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground">
                                        {circuitsById?.get(race.circuit_id)?.name ?? `Circuito #${race.circuit_id}`}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3">
                                    {race.results.map((result) => (
                                        <div key={result.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-muted px-4 py-3">
                                            <div>
                                                <div className="text-sm font-black text-slate-900 dark:text-foreground">
                                                    #{result.position} {result.player?.nickname ?? `Player ${result.player_id}`}
                                                </div>
                                                <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                                                    {charactersById?.get(result.character_id)?.name ?? `Personaggio #${result.character_id}`}
                                                </div>
                                            </div>
                                            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-700">
                                                {result.points} punti
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                        {hasMore && (
                            <div className="pt-2 text-center">
                                <button
                                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground transition hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-foreground"
                                >
                                    <ChevronDown size={14} />
                                    Mostra altre ({filteredRaces.length - visibleCount} nascoste)
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-muted-foreground">Nessuna gara corrisponde alla ricerca.</p>
                )}
            </div>
        </div>
    )
}

export default RaceList
