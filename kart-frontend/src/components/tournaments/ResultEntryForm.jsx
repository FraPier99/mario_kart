import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '@/context/AppDataContext'
import { toast } from 'sonner'
import { getApiErrorMessage, resultsApi } from '@/services/apiClient'

const ResultEntryForm = ({ tournament, races, tournamentParticipants, onCreated }) => {
    const initialRaceId = races[0]?.id ?? ''
    const [formState, setFormState] = useState({
        race_id: initialRaceId,
        player_id: tournamentParticipants[0]?.id ?? '',
        character_id: tournamentParticipants[0]?.favorite_character_id ?? '',
        position: 1,
    })
    const [saving, setSaving] = useState(false)

    const { characters, results, circuitsById } = useAppData()

    useEffect(() => {
        const fallbackPlayer = tournamentParticipants[0] ?? null

        setFormState((current) => ({
            ...current,
            race_id: races[0]?.id ?? current.race_id ?? '',
            player_id: current.player_id || fallbackPlayer?.id || '',
            character_id: current.character_id || fallbackPlayer?.favorite_character_id || '',
        }))
    }, [tournamentParticipants, races])

    const selectedPlayer = useMemo(() => {
        return tournamentParticipants.find((player) => player.id === Number(formState.player_id)) ?? null
    }, [formState.player_id, tournamentParticipants])

    const alreadyEnteredPlayerIds = useMemo(() => {
        if (!formState.race_id) return new Set()
        return new Set(
            results
                .filter((r) => r.race_id === Number(formState.race_id))
                .map((r) => r.player_id)
        )
    }, [formState.race_id, results])

    const sortedPlayers = useMemo(() => {
        const entered = []
        const notEntered = []

        tournamentParticipants.forEach((player) => {
            if (alreadyEnteredPlayerIds.has(player.id)) {
                entered.push(player)
            } else {
                notEntered.push(player)
            }
        })

        return [...notEntered, ...entered]
    }, [tournamentParticipants, alreadyEnteredPlayerIds])

    const sortedRacesDesc = useMemo(() => {
        return [...races].sort((a, b) => (b.race_order ?? 0) - (a.race_order ?? 0))
    }, [races])

    const handleChange = (event) => {
        const { name, value } = event.target

        setFormState((current) => ({
            ...current,
            [name]: value,
            ...(name === 'player_id' ? { character_id: tournamentParticipants.find((player) => player.id === Number(value))?.favorite_character_id ?? '' } : {}),
        }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!formState.race_id || !formState.player_id || !formState.character_id || !formState.position) {
            toast.error('Compila tutti i campi del risultato')
            return
        }

        setSaving(true)

        try {
            await resultsApi.create({
                race_id: Number(formState.race_id),
                player_id: Number(formState.player_id),
                character_id: Number(formState.character_id),
                position: Number(formState.position),
            })

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
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/20">
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-foreground">Inserisci risultato</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Seleziona la gara e il pilota, poi inserisci posizione e personaggio.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Gara</span>
                    <select
                        name="race_id"
                        value={formState.race_id}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                        required
                    >
                        <option value="">Seleziona una gara</option>
                        {sortedRacesDesc.map((race) => (
                            <option key={race.id} value={race.id}>
                                Gara {race.race_order} — {circuitsById?.get(race.circuit_id)?.name ?? race.name ?? 'Senza nome'}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Pilota</span>
                    <select
                        name="player_id"
                        value={formState.player_id}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                        required
                    >
                        <option value="">Seleziona un pilota</option>
                        {sortedPlayers.map((player) => {
                            const isEntered = alreadyEnteredPlayerIds.has(player.id)
                            return (
                                <option key={player.id} value={player.id} disabled={isEntered} className={isEntered ? 'text-slate-300 dark:text-slate-600' : ''}>
                                    {player.nickname}{isEntered ? ' (già inserito)' : ''}
                                </option>
                            )
                        })}
                    </select>
                    {formState.race_id && alreadyEnteredPlayerIds.size > 0 && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            {alreadyEnteredPlayerIds.size} pilota/i già inserito/i per questa gara
                        </p>
                    )}
                </label>

                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Personaggio</span>
                    <select
                        name="character_id"
                        value={formState.character_id}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                        required
                    >
                        <option value="">Seleziona un personaggio</option>
                        {characters.map((ch) => (
                            <option key={ch.id} value={ch.id}>
                                {ch.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Posizione</span>
                    <input
                        type="number"
                        name="position"
                        min="1"
                        max={tournamentParticipants.length}
                        value={formState.position}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                        required
                    />
                    <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">Max {tournamentParticipants.length} giocatori</p>
                </label>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={saving || !races.length || !tournamentParticipants.length}
                    className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-700 dark:hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? 'Salvataggio...' : 'Salva risultato'}
                </button>
            </div>
        </form>
    )
}

export default ResultEntryForm