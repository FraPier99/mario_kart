import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getApiErrorMessage, racesApi } from '@/services/apiClient'
import CircuitPicker from '@/components/tournaments/CircuitPicker'
import RefreshButton from '@/components/common/RefreshButton'

const RaceCreator = ({ tournament, circuits, loading, onCreated, disabled = false, results = [], tournamentParticipants = [], onRefresh = null, refreshing = false }) => {
    const nextRaceOrder = useMemo(() => (tournament.races?.length ?? 0) + 1, [tournament.races])

    const isLastRaceComplete = useMemo(() => {
        if (!tournament.races?.length) return true
        const lastRace = tournament.races.reduce((max, r) => (r.race_order ?? 0) > (max.race_order ?? 0) ? r : max, tournament.races[0])
        const enteredCount = results.filter((r) => r.race_id === lastRace.id).length
        return enteredCount >= tournamentParticipants.length
    }, [tournament.races, results, tournamentParticipants])

    const usedCircuitIds = useMemo(() => {
        return new Set((tournament.races ?? []).filter((race) => !race.is_duello).map((race) => race.circuit_id))
    }, [tournament.races])

    const availableCircuits = useMemo(() => circuits.filter((circuit) => !usedCircuitIds.has(circuit.id)), [circuits, usedCircuitIds])

    const [formState, setFormState] = useState({
        name: `Gara ${nextRaceOrder}`,
        race_order: nextRaceOrder,
        circuit_id: availableCircuits[0]?.id ?? circuits[0]?.id ?? '',
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const nextRaceOrder = (tournament.races?.length ?? 0) + 1

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormState((current) => ({
            ...current,
            name: current.name || `Gara ${nextRaceOrder}`,
            race_order: nextRaceOrder,
                circuit_id: current.circuit_id || availableCircuits[0]?.id || circuits[0]?.id || '',
        }))
    }, [availableCircuits, circuits, tournament.races])

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
                circuit_id: availableCircuits[0]?.id ?? circuits[0]?.id ?? '',
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
        <form onSubmit={handleSubmit} className={`space-y-4 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/20 ${disabled ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 dark:bg-slate-200 text-xs font-black text-white dark:text-slate-900">1</span>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-foreground">Crea gara</h3>
                        {disabled ? (
                            <p className="mt-1 text-sm font-medium text-amber-600 dark:text-amber-400">Torneo completato — non è possibile aggiungere altre gare.</p>
                        ) : (
                            <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Aggiungi una gara al torneo e seleziona il circuito.</p>
                        )}
                    </div>
                </div>
                {onRefresh && <RefreshButton onClick={onRefresh} loading={refreshing} />}
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
                        disabled={disabled}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                    />
                </label>

                <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Nome gara</span>
                    <input
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        disabled={disabled}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Gara 1"
                    />
                </label>
            </div>

            <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Circuito</span>
                <CircuitPicker
                    circuits={circuits}
                    value={formState.circuit_id}
                    onChange={(circuitId) => setFormState((current) => ({ ...current, circuit_id: circuitId }))}
                    disabled={disabled || loading || !circuits.length || availableCircuits.length === 0}
                    usedCircuitIds={usedCircuitIds}
                    label="Scegli tra le cup"
                    placeholder="Seleziona un circuito"
                />
                {circuits.length > 0 && availableCircuits.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Hai già usato tutti i circuiti disponibili per questo torneo.</p>
                )}
            </label>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={disabled || saving || loading || !circuits.length || !isLastRaceComplete || availableCircuits.length === 0}
                    className="rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:from-emerald-400 hover:to-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? 'Salvataggio...' : 'Aggiungi gara'}
                </button>
            </div>
            {!disabled && !saving && !loading && circuits.length > 0 && !isLastRaceComplete && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 text-right">
                    Inserisci tutti i risultati della gara precedente prima di aggiungerne un'altra.
                </p>
            )}
        </form>
    )
}

export default RaceCreator
