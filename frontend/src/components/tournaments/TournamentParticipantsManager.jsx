import { useEffect, useMemo, useState } from 'react'
import { Search, UserMinus2, UserPlus2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { tournamentsApi, getApiErrorMessage } from '@/services/apiClient'

const TournamentParticipantsManager = ({ tournament, players = [], initialParticipantIds = [], disabled = false, onUpdated, excludePlayerIds = [] }) => {
    const [selectedIds, setSelectedIds] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [saving, setSaving] = useState(false)

    // Players selectable: exclude any ID in excludePlayerIds (e.g. superadmin-linked players)
    const selectablePlayers = useMemo(() => {
        if (!excludePlayerIds.length) return players
        const excluded = new Set(excludePlayerIds)
        return players.filter((p) => !excluded.has(p.id))
    }, [players, excludePlayerIds])

    useEffect(() => {
        if (initialParticipantIds?.length) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedIds(initialParticipantIds)
        }
        else {
            setSelectedIds(selectablePlayers.map((player) => player.id))
        }
    }, [initialParticipantIds, selectablePlayers])

    const filteredPlayers = useMemo(() => {
        if (!searchTerm.trim()) return selectablePlayers
        const term = searchTerm.toLowerCase()
        return selectablePlayers.filter((player) => `${player.nickname} ${player.first_name} ${player.last_name}`.toLowerCase().includes(term))
    }, [selectablePlayers, searchTerm])

    const togglePlayer = (playerId) => {
        setSelectedIds((current) => current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId])
    }

    const handleSave = async () => {
        if (disabled) return

        setSaving(true)
        try {
            await tournamentsApi.update(tournament.id, { participant_ids: selectedIds })
            toast.success('Partecipanti aggiornati')
            await onUpdated?.()
        }
        catch (error) {
            toast.error('Aggiornamento partecipanti fallito', {
                description: getApiErrorMessage(error),
            })
        }
        finally {
            setSaving(false)
        }
    }

    const isInCorso = tournament?.status === 'in_corso'

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-4">
            {isInCorso && (
                <div className="flex items-center gap-3 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/8 px-4 py-3">
                    <Lock size={14} className="shrink-0 text-rose-500" />
                    <p className="text-xs font-black text-rose-600 dark:text-rose-400">
                        Torneo in corso — la rosa è bloccata. Impossibile modificare i partecipanti.
                    </p>
                </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">Partecipanti torneo</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-foreground">Escludi o reintegra un giocatore</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                        La modifica aggiorna i partecipanti del torneo senza toccare i risultati già inseriti.
                    </p>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-muted px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground">
                    {selectedIds.length}/{selectablePlayers.length} attivi
                </div>
            </div>

            <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Cerca giocatore..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted py-3 pe-4 ps-10 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                />
            </div>

            <div className="max-h-96 overflow-y-auto pr-1">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredPlayers.map((player) => {
                        const selected = selectedIds.includes(player.id)

                        return (
                            <button
                                key={player.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => togglePlayer(player.id)}
                                className={`rounded-2xl border px-4 py-3 text-left transition ${selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200' : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-widest">{player.nickname}</div>
                                        <div className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">{player.first_name} {player.last_name}</div>
                                    </div>
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${selected ? 'bg-emerald-500 text-white' : 'bg-white/60 dark:bg-black/20 text-slate-400'}`}>
                                        {selected ? <UserMinus2 size={16} /> : <UserPlus2 size={16} />}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-muted px-4 py-4">
                <div className="text-sm text-slate-600 dark:text-muted-foreground">
                    <span className="font-black text-slate-900 dark:text-foreground">Selezionati:</span> {selectedIds.length}
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={disabled || saving}
                    className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? 'Salvataggio...' : 'Aggiorna partecipanti'}
                </button>
            </div>
        </div>
    )
}

export default TournamentParticipantsManager