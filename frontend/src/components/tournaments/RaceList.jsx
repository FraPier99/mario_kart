import { useMemo, useState } from 'react'
import { Search, ChevronDown, PencilLine, Trash2, X, MapPin, Swords } from 'lucide-react'
import { toast } from 'sonner'
import CircuitPicker from '@/components/tournaments/CircuitPicker'
import { getApiErrorMessage, racesApi } from '@/services/apiClient'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import CircuitThumbnail from '@/components/common/CircuitThumbnail'

const getCupStyle = (description = '') => {
    const d = description.toLowerCase()
    if (d.includes('mushroom')) return { dot: 'bg-amber-400', badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' }
    if (d.includes('flower'))   return { dot: 'bg-rose-400',   badge: 'bg-rose-50   dark:bg-rose-500/10   text-rose-700   dark:text-rose-300   border-rose-200   dark:border-rose-500/30' }
    if (d.includes('star'))     return { dot: 'bg-yellow-400', badge: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30' }
    if (d.includes('special'))  return { dot: 'bg-purple-400', badge: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30' }
    if (d.includes('shell'))    return { dot: 'bg-sky-400',    badge: 'bg-sky-50    dark:bg-sky-500/10    text-sky-700    dark:text-sky-300    border-sky-200    dark:border-sky-500/30' }
    if (d.includes('banana'))   return { dot: 'bg-yellow-300', badge: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-200 border-yellow-200 dark:border-yellow-500/30' }
    if (d.includes('leaf'))     return { dot: 'bg-emerald-400',badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' }
    if (d.includes('lightning'))return { dot: 'bg-blue-400',   badge: 'bg-blue-50   dark:bg-blue-500/10   text-blue-700   dark:text-blue-300   border-blue-200   dark:border-blue-500/30' }
    return { dot: 'bg-slate-400', badge: 'bg-slate-100 dark:bg-muted text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border' }
}

const PAGE_SIZE = 10

const RaceList = ({ races, circuits = [], circuitsById, charactersById, tournamentId, onChanged, canEdit = false }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
    const [expandedRaces, setExpandedRaces] = useState(new Set())
    const [editingRace, setEditingRace] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [editForm, setEditForm] = useState({ name: '', race_order: '', circuit_id: '' })
    const [duelloFilter, setDuelloFilter] = useState('all') // 'all' | 'duelli' | 'regolari'

    const toggleRace = (id) => {
        setExpandedRaces((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const filteredRaces = useMemo(() => {
        let filtered = races
        if (duelloFilter === 'duelli') filtered = filtered.filter((r) => r.is_duello)
        else if (duelloFilter === 'regolari') filtered = filtered.filter((r) => !r.is_duello)

        if (!searchTerm.trim()) return filtered
        const term = searchTerm.toLowerCase()
        return filtered.filter((race) => {
            const name = (race.name || `Gara ${race.race_order}`).toLowerCase()
            const circuit = (circuitsById?.get(race.circuit_id)?.name ?? '').toLowerCase()
            return name.includes(term) || circuit.includes(term)
        })
    }, [races, searchTerm, circuitsById, duelloFilter])

    const visibleRaces = filteredRaces.slice(0, visibleCount)
    const hasMore = visibleCount < filteredRaces.length

    const usedCircuitIds = useMemo(() => {
        const ids = new Set(races.map((race) => race.circuit_id))
        if (editingRace) {
            ids.delete(editingRace.circuit_id)
        }
        return ids
    }, [editingRace, races])

    const openEdit = (race) => {
        setEditingRace(race)
        setEditForm({
            name: race.name ?? '',
            race_order: race.race_order ?? '',
            circuit_id: race.circuit_id ?? '',
        })
    }

    const closeEdit = () => {
        setEditingRace(null)
        setEditForm({ name: '', race_order: '', circuit_id: '' })
    }

    const handleEditChange = (event) => {
        const { name, value } = event.target
        setEditForm((current) => ({ ...current, [name]: value }))
    }

    const handleEditSave = async () => {
        if (!editingRace) return
        if (!editForm.circuit_id) return

        setSaving(true)
        try {
            await racesApi.update(editingRace.id, {
                name: editForm.name.trim() || `Gara ${editForm.race_order}`,
                race_order: Number(editForm.race_order),
                tournament_id: tournamentId,
                circuit_id: Number(editForm.circuit_id),
            })
            toast.success('Gara aggiornata')
            closeEdit()
            await onChanged?.()
        }
        catch (error) {
            toast.error('Aggiornamento gara fallito', { description: getApiErrorMessage(error) })
        }
        finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirmDelete) return

        setSaving(true)
        try {
            await racesApi.remove(confirmDelete.id)
            toast.success('Gara eliminata')
            setConfirmDelete(null)
            await onChanged?.()
        }
        catch (error) {
            toast.error('Eliminazione gara fallita', { description: getApiErrorMessage(error) })
        }
        finally {
            setSaving(false)
        }
    }

    if (!races.length) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-6 text-sm text-slate-500 dark:text-muted-foreground">
                Nessuna gara registrata per questo torneo.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {editingRace && (
                <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeEdit}>
                    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">Modifica gara</p>
                                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">{editingRace.name ?? `Gara ${editingRace.race_order}`}</h3>
                            </div>
                            <button type="button" onClick={closeEdit} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"><X size={16} /></button>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            <label className="space-y-2 md:col-span-1">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Ordine gara</span>
                                <input name="race_order" type="number" min="1" value={editForm.race_order} onChange={handleEditChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400" />
                            </label>
                            <label className="space-y-2 md:col-span-2">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Nome gara</span>
                                <input name="name" value={editForm.name} onChange={handleEditChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400" />
                            </label>
                        </div>

                        <div className="mt-4 space-y-2">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Circuito</span>
                            <CircuitPicker
                                circuits={circuits}
                                value={editForm.circuit_id}
                                onChange={(circuitId) => setEditForm((current) => ({ ...current, circuit_id: circuitId }))}
                                usedCircuitIds={usedCircuitIds}
                                label="Aggiorna circuito"
                                placeholder="Seleziona un circuito"
                            />
                        </div>

                        <div className="mt-6 flex items-center justify-between gap-3">
                            <button type="button" onClick={() => setConfirmDelete(editingRace)} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-black uppercase tracking-widest text-rose-200 transition hover:bg-rose-500/20">
                                Elimina gara
                            </button>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={closeEdit} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-200 transition hover:bg-white/10">
                                    Annulla
                                </button>
                                <button type="button" onClick={handleEditSave} disabled={saving} className="rounded-2xl bg-linear-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:from-emerald-400 hover:to-green-500 disabled:opacity-60">
                                    {saving ? 'Salvataggio...' : 'Salva'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div className="fixed inset-0 z-210 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
                    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <p className="text-lg font-black uppercase tracking-tight">Eliminare la gara {confirmDelete.race_order}?</p>
                        <p className="mt-2 text-sm text-slate-400">L'operazione rimuove anche i risultati collegati a questa gara.</p>
                        <div className="mt-6 flex gap-3">
                            <button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black uppercase tracking-widest text-white transition hover:bg-white/10">Annulla</button>
                            <button type="button" onClick={handleDelete} disabled={saving} className="flex-1 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-black uppercase tracking-widest text-white transition hover:bg-rose-400 disabled:opacity-60">{saving ? 'Elimino...' : 'Elimina'}</button>
                        </div>
                    </div>
                </div>
            )}

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

            <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-muted p-1 w-fit">
                {[
                    { key: 'all', label: 'Tutte' },
                    { key: 'regolari', label: 'Gare' },
                    { key: 'duelli', label: '⚔️ Spareggi' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => { setDuelloFilter(key); setVisibleCount(PAGE_SIZE) }}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                            duelloFilter === key
                                ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-sm'
                                : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="max-h-150 space-y-4 overflow-y-auto pr-1">
                {visibleRaces.length ? (
                    <>
                        {visibleRaces.map((race) => {
                            const isExpanded = expandedRaces.has(race.id)
                            return (
                                <section
                                    key={race.id}
                                    className={`rounded-3xl border bg-white dark:bg-card shadow-sm transition-all cursor-pointer ${isExpanded ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-200 dark:border-border hover:border-slate-300 dark:hover:border-slate-600'}`}
                                    onClick={() => toggleRace(race.id)}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
                                                Gara {race.race_order}
                                                {race.is_duello && (
                                                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                                        <Swords size={9} /> Spareggio
                                                    </span>
                                                )}
                                            </p>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-foreground">{race.name || `Gara ${race.race_order}`}</h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const circuit = circuitsById?.get(race.circuit_id)
                                                const cupStyle = getCupStyle(circuit?.description ?? '')
                                                return (
                                                    <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${cupStyle.badge}`}>
                                                    <CircuitThumbnail circuit={circuit} size="sm" />
                                                        {circuit?.name ?? `Circuito #${race.circuit_id}`}
                                                    </span>
                                                )
                                            })()}
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => { event.stopPropagation(); openEdit(race) }}
                                                    className="rounded-full border border-slate-200 dark:border-border bg-white dark:bg-card p-2 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600"
                                                    aria-label="Modifica gara"
                                                >
                                                    <PencilLine size={14} />
                                                </button>
                                            )}
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => { event.stopPropagation(); setConfirmDelete(race) }}
                                                    className="rounded-full border border-slate-200 dark:border-border bg-white dark:bg-card p-2 text-slate-500 transition hover:border-rose-300 hover:text-rose-600"
                                                    aria-label="Elimina gara"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-5 pb-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                                            {(race.results ?? []).map((result) => (
                                                <div key={result.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-muted px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative shrink-0">
                                                            <img
                                                                src={result.player?.img_url || buildAvatarPlaceholder(result.player?.nickname ?? 'P')}
                                                                alt={result.player?.nickname}
                                                                className="h-10 w-10 rounded-xl object-cover shrink-0"
                                                            />
                                                            {charactersById?.get(result.character_id) && (
                                                                <img
                                                                    src={charactersById.get(result.character_id).img_url || buildAvatarPlaceholder(charactersById.get(result.character_id).name)}
                                                                    alt={charactersById.get(result.character_id).name}
                                                                    className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white dark:border-card object-cover"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-black uppercase text-slate-900 dark:text-foreground">
                                                                #{result.position} {result.player?.nickname ?? `Player ${result.player_id}`}
                                                            </div>
                                                            <div className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                                                                {charactersById?.get(result.character_id)?.name ?? `Personaggio #${result.character_id}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-700">
                                                        {result.points} pt
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )
                        })}
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
