import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage, racesApi } from '@/services/apiClient'

const RaceCreator = ({ tournament, circuits, loading, onCreated }) => {
    const nextRaceOrder = useMemo(() => (tournament.races?.length ?? 0) + 1, [tournament.races])

    const usedCircuitIds = useMemo(() => {
        return new Set((tournament.races ?? []).map((race) => race.circuit_id))
    }, [tournament.races])

    const [formState, setFormState] = useState({
        name: `Gara ${nextRaceOrder}`,
        race_order: nextRaceOrder,
        circuit_id: circuits[0]?.id ?? '',
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const nextRaceOrder = (tournament.races?.length ?? 0) + 1

        setFormState((current) => ({
            ...current,
            name: current.name || `Gara ${nextRaceOrder}`,
            race_order: nextRaceOrder,
            circuit_id: current.circuit_id || circuits[0]?.id || '',
        }))
    }, [circuits, tournament.races])

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormState((current) => ({ ...current, [name]: value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!formState.circuit_id) {
            toast.error('Seleziona un circuito')
            return
        }

        setSaving(true)

        try {
            await racesApi.create({
                name: formState.name.trim() || `Gara ${formState.race_order}`,
                race_order: Number(formState.race_order),
                tournament_id: tournament.id,
                circuit_id: Number(formState.circuit_id),
            })

            toast.success('Gara creata')
            await onCreated()
            setFormState({
                name: `Gara ${(tournament.races?.length ?? 0) + 2}`,
                race_order: (tournament.races?.length ?? 0) + 2,
                circuit_id: circuits[0]?.id ?? '',
            })
        }
        catch (error) {
            const message = getApiErrorMessage(error, 'Creazione gara fallita')
            console.error('[RaceCreator] create failed', error, { tournamentId: tournament.id, ...formState })
            toast.error('Impossibile creare la gara', { description: message })
        }
        finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/20">
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-foreground">Crea gara</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Aggiungi una gara al torneo e seleziona il circuito.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 md:col-span-1">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Ordine gara</span>
                    <input
                        type="number"
                        name="race_order"
                        min="1"
                        value={formState.race_order}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                        required
                    />
                </label>

                <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Nome gara</span>
                    <input
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                        placeholder="Gara 1"
                    />
                </label>
            </div>

            <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Circuito</span>
                <select
                    name="circuit_id"
                    value={formState.circuit_id}
                    onChange={handleChange}
                    disabled={loading || !circuits.length}
                    className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500 disabled:opacity-60"
                    required
                >
                    <option value="">Seleziona un circuito</option>
                    {circuits.map((circuit) => {
                        const isUsed = usedCircuitIds.has(circuit.id)
                        return (
                            <option key={circuit.id} value={circuit.id} disabled={isUsed} className={isUsed ? 'text-slate-300 dark:text-slate-600' : ''}>
                                {circuit.name} - {circuit.description}{isUsed ? ' (già usato)' : ''}
                            </option>
                        )
                    })}
                </select>
            </label>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={saving || loading || !circuits.length}
                    className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:from-emerald-400 hover:to-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? 'Salvataggio...' : 'Aggiungi gara'}
                </button>
            </div>
        </form>
    )
}

export default RaceCreator
