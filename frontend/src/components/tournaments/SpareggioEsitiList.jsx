import { Swords, Trophy, Clock, ChevronDown } from 'lucide-react'

// Esiti spareggi (vista giocatore, read-only) — riusata sia per i tornei
// classic (tab "Classifica", tutti i duelli) sia per quelli a gironi (tab
// "Finale"/"Finalina", solo i duelli del proprio bracket).
const SpareggioEsitiList = ({ duelloGroups, playerMapById, circuitsById, charactersById, expandedDuelGroups, setExpandedDuelGroups }) => {
    if (duelloGroups.length === 0) return null
    return (
        <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">Esiti spareggi</p>
            {duelloGroups.map((group) => {
                const players = group.playerIds.map((id) => playerMapById.get(id)).filter(Boolean)
                const isExpanded = expandedDuelGroups.has(group.groupName)
                const toggle = () => {
                    setExpandedDuelGroups((prev) => {
                        const next = new Set(prev)
                        next.has(group.groupName) ? next.delete(group.groupName) : next.add(group.groupName)
                        return next
                    })
                }
                return (
                    <div key={group.groupName} className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/40 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Swords size={16} className="text-amber-500 shrink-0" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">Spareggio</p>
                                <h4 className="text-lg font-black text-slate-900 dark:text-foreground">{group.label}</h4>
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-muted-foreground leading-relaxed">
                                    Le gare di spareggio <strong>non assegnano punti</strong> in classifica.
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-muted-foreground">
                            Pareggio su punti tra{' '}
                            <span className="font-black text-amber-600 dark:text-amber-400">
                                {players.map((p) => p.nickname).join(', ')}
                            </span>.
                        </p>

                        {group.races.length > 0 && (
                            <div className="flex items-center gap-3 text-xs">
                                {players.map((p) => (
                                    <span key={p.id} className="font-black text-slate-700 dark:text-slate-300">
                                        {p.nickname}: {group.wins.get(p.id) ?? 0} vittorie
                                    </span>
                                ))}
                            </div>
                        )}

                        {group.resolved ? (
                            <p className="flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-400">
                                <Trophy size={14} /> {playerMapById.get(group.winnerId)?.nickname ?? '—'} vince lo spareggio
                            </p>
                        ) : (
                            <div className="flex items-center gap-2 rounded-2xl bg-amber-100 dark:bg-amber-500/20 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 w-fit">
                                <Clock size={14} /> In attesa di completamento
                            </div>
                        )}

                        {group.races.length > 0 && (
                            <div className="space-y-2">
                                <button type="button" onClick={toggle}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600 hover:text-amber-500 transition"
                                >
                                    <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    {isExpanded ? 'Nascondi storico' : 'Mostra storico gare spareggio'}
                                </button>
                                {isExpanded && (
                                    <div className="space-y-3 pl-2 border-l-2 border-amber-200 dark:border-amber-500/30">
                                        {group.races.map((race) => {
                                            const circuit = circuitsById?.get(race.circuit_id)
                                            return (
                                                <div key={race.id} className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Gara {race.race_order}</span>
                                                        <span className="rounded-full bg-slate-100 dark:bg-muted px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-muted-foreground">
                                                            {circuit?.name ?? `Circuito #${race.circuit_id}`}
                                                        </span>
                                                    </div>
                                                    {[...(race.results ?? [])].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).map((result) => {
                                                        const character = charactersById?.get(result.character_id)
                                                        const player = playerMapById.get(result.player_id)
                                                        return (
                                                            <div key={result.id} className="flex items-center justify-between text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-slate-700 dark:text-slate-300">#{result.position}</span>
                                                                    <span>{player?.nickname ?? `#${result.player_id}`}</span>
                                                                    {character && <span className="text-slate-400">· {character.name}</span>}
                                                                </div>
                                                                <span className="font-black text-emerald-600 dark:text-emerald-400">{result.points} pt</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })}
                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            {players.map((p) => (
                                                <span key={p.id} className="font-black text-slate-600 dark:text-slate-400">
                                                    {p.nickname}: {[...group.races].reduce((sum, r) => sum + ((r.results?.find((res) => res.player_id === p.id)?.points) ?? 0), 0)} pt totali
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default SpareggioEsitiList
