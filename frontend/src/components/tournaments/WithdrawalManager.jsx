import { useMemo, useState } from 'react'
import { Search, UserX, Undo2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { tournamentsApi, getApiErrorMessage } from '@/services/apiClient'

/**
 * Gestione "Giocatore Ritirato": permette all'admin di segnare un partecipante
 * come ritirato (o di reintegrarlo) senza toccare i risultati già registrati.
 * Un giocatore ritirato resta in classifica con i punti già ottenuti, ma viene
 * escluso dal pool selezionabile per le gare ancora da disputare.
 */
const WithdrawalManager = ({ tournament, players = [], disabled = false, onUpdated }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [pendingId, setPendingId] = useState(null)

    const withdrawnIds = useMemo(() => new Set(tournament?.withdrawn_player_ids ?? []), [tournament?.withdrawn_player_ids])

    const participants = useMemo(() => {
        const ids = tournament?.participant_ids ?? []
        return players.filter((p) => ids.includes(p.id))
    }, [tournament?.participant_ids, players])

    const filteredParticipants = useMemo(() => {
        if (!searchTerm.trim()) return participants
        const term = searchTerm.toLowerCase()
        return participants.filter((player) => `${player.nickname} ${player.first_name} ${player.last_name}`.toLowerCase().includes(term))
    }, [participants, searchTerm])

    const toggleWithdrawal = async (playerId, nextWithdrawn) => {
        if (disabled || pendingId) return

        setPendingId(playerId)
        try {
            await tournamentsApi.setPlayerWithdrawal(tournament.id, playerId, nextWithdrawn)
            toast.success(nextWithdrawn ? 'Giocatore segnato come ritirato' : 'Giocatore reintegrato')
            await onUpdated?.()
        }
        catch (error) {
            toast.error('Operazione non riuscita', {
                description: getApiErrorMessage(error),
            })
        }
        finally {
            setPendingId(null)
        }
    }

    if (!participants.length) return null

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-600">Giocatore ritirato</p>
                    <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-foreground">Gestisci abbandoni a torneo in corso</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                        I risultati già registrati restano validi e continuano a valere in classifica:
                        il ritiro esclude solo il giocatore dal pool per le gare successive.
                    </p>
                </div>
                {withdrawnIds.size > 0 && (
                    <div className="flex items-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-4 py-3 text-sm font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                        <AlertTriangle size={14} />
                        {withdrawnIds.size} ritirat{withdrawnIds.size === 1 ? 'o' : 'i'}
                    </div>
                )}
            </div>

            <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Cerca giocatore..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted py-3 pe-4 ps-10 text-slate-900 dark:text-foreground outline-none focus:border-rose-500"
                />
            </div>

            <div className="max-h-96 overflow-y-auto pr-1">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredParticipants.map((player) => {
                        const isWithdrawn = withdrawnIds.has(player.id)
                        const isPending = pendingId === player.id

                        return (
                            <button
                                key={player.id}
                                type="button"
                                disabled={disabled || isPending}
                                onClick={() => toggleWithdrawal(player.id, !isWithdrawn)}
                                className={`rounded-2xl border px-4 py-3 text-left transition ${isWithdrawn ? 'border-rose-400 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200' : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'} ${disabled || isPending ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            {player.nickname}
                                            {isWithdrawn && (
                                                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] text-rose-600 dark:text-rose-300 border border-rose-500/30">Ritirato</span>
                                            )}
                                        </div>
                                        <div className="mt-1 text-sm capitalize text-slate-500 dark:text-muted-foreground">{player.first_name} {player.last_name}</div>
                                    </div>
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isWithdrawn ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                        {isWithdrawn ? <Undo2 size={16} /> : <UserX size={16} />}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default WithdrawalManager
