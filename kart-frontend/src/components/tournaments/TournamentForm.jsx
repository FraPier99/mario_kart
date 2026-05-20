import { useEffect, useState } from 'react'

const emptyForm = {
    name: '',
    date: '',
    game_id: '',
}

const TournamentForm = ({ players, games, initialValues, submitLabel, onSubmit, loading }) => {
    const [formState, setFormState] = useState(emptyForm)
    const [selectedPlayerIds, setSelectedPlayerIds] = useState([])

    useEffect(() => {
        const nextValues = initialValues ?? emptyForm

        setFormState({
            name: nextValues.name ?? '',
            date: nextValues.date ? String(nextValues.date).slice(0, 10) : '',
            game_id: nextValues.game_id ?? (games[0]?.id ?? ''),
        })

        if (nextValues.participantIds?.length) {
            setSelectedPlayerIds(nextValues.participantIds)
        }
        else {
            setSelectedPlayerIds(players.map((player) => player.id))
        }
    }, [initialValues, games, players])

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormState((current) => ({ ...current, [name]: value }))
    }

    const togglePlayer = (playerId) => {
        setSelectedPlayerIds((current) => {
            if (current.includes(playerId)) {
                return current.filter((currentId) => currentId !== playerId)
            }

            return [...current, playerId]
        })
    }

    const handleSubmit = (event) => {
        event.preventDefault()

        onSubmit({
            name: formState.name.trim(),
            date: formState.date,
            game_id: Number(formState.game_id),
            n_players: selectedPlayerIds.length || players.length || 1,
            participant_ids: selectedPlayerIds,
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
            <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Nome torneo</span>
                    <input
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500"
                        placeholder="Es. Lega Kart Sprint"
                        required
                    />
                </label>

                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Data</span>
                    <input
                        type="date"
                        name="date"
                        value={formState.date}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500"
                        required
                    />
                </label>

                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Gioco</span>
                    <select
                        name="game_id"
                        value={formState.game_id}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500"
                        required
                    >
                        <option value="">Seleziona un gioco</option>
                        {games.map((game) => (
                            <option key={game.id} value={game.id}>
                                {game.name}
                            </option>
                        ))}
                    </select>
                </label>

            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-foreground">Giocatori del torneo</h3>
                        <p className="text-sm text-slate-500 dark:text-muted-foreground">La selezione aggiorna automaticamente il numero di giocatori salvato nel BE.</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                        {selectedPlayerIds.length} selezionati
                    </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {players.map((player) => (
                        <button
                            key={player.id}
                            type="button"
                            onClick={() => togglePlayer(player.id)}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                                selectedPlayerIds.includes(player.id)
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                                    : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <div className="text-xs font-black uppercase tracking-widest">{player.nickname}</div>
                            <div className="mt-1 text-sm font-medium text-slate-500 dark:text-muted-foreground">
                                {player.first_name} {player.last_name}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-muted px-4 py-4">
                <div className="text-sm text-slate-600 dark:text-muted-foreground">
                    <span className="font-black text-slate-900 dark:text-foreground">n_players:</span> {selectedPlayerIds.length || players.length || 1}
                </div>
                <button
                    type="submit"
                    disabled={loading || games.length === 0 || players.length === 0}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitLabel}
                </button>
            </div>
        </form>
    )
}

export default TournamentForm
