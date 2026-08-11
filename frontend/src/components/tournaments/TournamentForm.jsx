import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, Gamepad2, Users } from 'lucide-react'

const todayIso = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyForm = {
    name: '',
    date: '',
    game_id: '',
    tournament_format: 'classic',
    n_races: '',
}

const TournamentForm = ({
    players,
    games,
    initialValues,
    submitLabel,
    onSubmit,
    loading,
    existingTournamentNames = [],
    excludePlayerIds = [],
}) => {
    const [formState, setFormState] = useState(emptyForm)
    const [selectedPlayerIds, setSelectedPlayerIds] = useState([])
    const [errors, setErrors] = useState({})

    // Players selectable: exclude superadmin-linked
    const selectablePlayers = useMemo(() => {
        if (!excludePlayerIds.length) return players
        const excl = new Set(excludePlayerIds)
        return players.filter((p) => !excl.has(p.id))
    }, [players, excludePlayerIds])

    useEffect(() => {
        const nextValues = initialValues ?? emptyForm
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormState({
            name: nextValues.name ?? '',
            date: nextValues.date ? String(nextValues.date).slice(0, 10) : '',
            game_id: nextValues.game_id ?? (games[0]?.id ?? ''),
            tournament_format: nextValues.tournament_format ?? 'classic',
            n_races: nextValues.n_races ?? '',
        })
        if (nextValues.participantIds?.length) {
            setSelectedPlayerIds(nextValues.participantIds)
        } else {
            setSelectedPlayerIds(selectablePlayers.map((p) => p.id))
        }
    }, [initialValues, games, selectablePlayers])

    // ── Derived validations ────────────────────────────────────────────────
    const validate = (state) => {
        const errs = {}
        const today = todayIso()

        if (!state.name.trim()) {
            errs.name = 'Il nome è obbligatorio'
        } else if (existingTournamentNames.includes(state.name.trim().toLowerCase())) {
            errs.name = 'Esiste già un torneo con questo nome'
        }

        if (!state.date) {
            errs.date = 'La data è obbligatoria'
        } else if (state.date < today) {
            errs.date = 'La data non può essere nel passato'
        }

        return errs
    }

    const handleChange = (event) => {
        const { name, value } = event.target
        setFormState((current) => {
            const next = { ...current, [name]: value }
            setErrors(validate(next))
            return next
        })
    }

    const handleTodayDate = () => {
        const today = todayIso()
        setFormState((curr) => ({ ...curr, date: today }))
    }

    const togglePlayer = (playerId) => {
        setSelectedPlayerIds((current) =>
            current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]
        )
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        const errs = validate(formState)
        setErrors(errs)
        if (Object.keys(errs).length > 0) return

        const isGroupStage = formState.tournament_format === 'group_stage'
        if (isGroupStage && selectedPlayerIds.length < 8) {
            setErrors((e) => ({ ...e, tournament_format: 'La modalità a gironi richiede almeno 8 partecipanti.' }))
            return
        }
        if (!isGroupStage && selectedPlayerIds.length > 8) {
            setErrors((e) => ({ ...e, tournament_format: 'La modalità a classifica unica supporta al massimo 8 partecipanti.' }))
            return
        }
        const nRaces = !isGroupStage && formState.n_races
            ? Number(formState.n_races)
            : undefined
        onSubmit({
            name: formState.name.trim(),
            date: formState.date,
            game_id: Number(formState.game_id),
            n_players: selectedPlayerIds.length || selectablePlayers.length || 1,
            participant_ids: selectedPlayerIds,
            tournament_format: formState.tournament_format,
            ...(nRaces ? { n_races: nRaces } : {}),
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
            <div className="grid gap-5 md:grid-cols-2">

                {/* NOME */}
                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Nome torneo</span>
                    <input
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        className={`w-full rounded-2xl border px-4 py-3 text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500 ${errors.name ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-500/5' : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted'}`}
                        placeholder="Es. Lega Kart Sprint"
                        required
                    />
                    {errors.name && (
                        <p className="flex items-center gap-1 text-[10px] font-black text-rose-500">
                            <AlertTriangle size={10} /> {errors.name}
                        </p>
                    )}
                </label>

                {/* DATA */}
                <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Data torneo</span>
                    <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <CalendarDays size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="date"
                                name="date"
                                value={formState.date}
                                min={todayIso()}
                                onChange={handleChange}
                                className={`w-full rounded-2xl border px-4 py-3 ps-10 text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500 ${errors.date ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-500/5' : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted'}`}
                                required
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleTodayDate}
                            title="Imposta data odierna"
                            className="shrink-0 rounded-2xl border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                        >
                            Oggi
                        </button>
                    </div>
                    {errors.date && (
                        <p className="flex items-center gap-1 text-[10px] font-black text-rose-500">
                            <AlertTriangle size={10} /> {errors.date}
                        </p>
                    )}
                </label>

                {/* GIOCO */}
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
                            <option key={game.id} value={game.id}>{game.name}</option>
                        ))}
                    </select>
                </label>

                {/* NUMERO GARE (solo classico) */}
                {formState.tournament_format === 'classic' && (
                    <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Numero gare</span>
                        <input
                            name="n_races"
                            type="number"
                            min="8"
                            max="32"
                            value={formState.n_races}
                            onChange={handleChange}
                            className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none transition focus:border-emerald-500"
                            placeholder="Default 20 se lasciato vuoto"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-muted-foreground">Minimo 8, massimo 32 — qualunque numero, anche dispari. Modificabile in seguito.</p>
                    </label>
                )}

                {/* MODALITÀ TORNEO */}
                <div className="space-y-2 md:col-span-2">
                    <span className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                        Modalità di gioco
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            {
                                value: 'classic',
                                icon: Users,
                                label: 'Classico',
                                desc: 'Tutti i giocatori insieme in ogni gara',
                                color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
                            },
                            {
                                value: 'group_stage',
                                icon: Gamepad2,
                                label: 'A Gironi',
                                desc: 'Gironi flessibili da max 4 su TV → semifinale + finale (min. 8 giocatori)',
                                color: 'border-violet-400 bg-violet-50 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200',
                            },
                        ].map(({ value, icon: Icon, label, desc, color }) => {
                            const active = formState.tournament_format === value
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                        setFormState((c) => ({ ...c, tournament_format: value }))
                                        setErrors((e) => { const n = { ...e }; delete n.tournament_format; return n })
                                    }}
                                    className={`flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all ${active ? color : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-500 dark:text-muted-foreground hover:border-slate-300 dark:hover:border-slate-600'}`}
                                >
                                    <Icon size={18} className="shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-widest">{label}</p>
                                        <p className="mt-0.5 text-[10px] leading-snug opacity-70">{desc}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                    {errors.tournament_format && (
                        <p className="flex items-center gap-1 text-[10px] font-black text-rose-500">
                            <AlertTriangle size={10} /> {errors.tournament_format}
                        </p>
                    )}
                </div>

            </div>

            {/* SELEZIONE GIOCATORI */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-foreground">Giocatori del torneo</h3>
                        <p className="text-sm text-slate-500 dark:text-muted-foreground">Seleziona i partecipanti. Il numero aggiorna automaticamente il campo n_players.</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                        {selectedPlayerIds.length} selezionati
                    </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {selectablePlayers.map((player) => {
                        const selected = selectedPlayerIds.includes(player.id)
                        return (
                            <button
                                key={player.id}
                                type="button"
                                onClick={() => togglePlayer(player.id)}
                                className={`relative flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-150 ${
                                    selected
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 shadow-sm shadow-emerald-200/50 dark:shadow-emerald-900/20'
                                        : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                {/* Avatar */}
                                <div className={`h-10 w-10 shrink-0 overflow-hidden rounded-xl border-2 ${selected ? 'border-emerald-400' : 'border-slate-200 dark:border-slate-600'}`}>
                                    {player.img_url ? (
                                        <img src={player.img_url} alt={player.nickname} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className={`flex h-full w-full items-center justify-center text-sm font-black ${selected ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                            {(player.nickname ?? '?').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <div className={`text-xs font-black uppercase tracking-widest truncate ${selected ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {player.nickname}
                                    </div>
                                    <div className="mt-0.5 truncate text-[10px] capitalize text-slate-500 dark:text-muted-foreground">
                                        {player.first_name} {player.last_name}
                                    </div>
                                </div>

                                {/* Checkmark */}
                                {selected && (
                                    <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                                        <Check size={11} />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* SUBMIT */}
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-muted px-4 py-4">
                <div className="text-sm text-slate-600 dark:text-muted-foreground">
                    <span className="font-black text-slate-900 dark:text-foreground">Partecipanti selezionati:</span>{' '}
                    {selectedPlayerIds.length} / {selectablePlayers.length}
                </div>
                <button
                    type="submit"
                    disabled={loading || games.length === 0 || selectablePlayers.length === 0 || Object.keys(errors).length > 0}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitLabel}
                </button>
            </div>
        </form>
    )
}

export default TournamentForm
