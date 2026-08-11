/**
 * PointAdjustmentsPanel — Rettifiche punti manuali del superadmin per un
 * torneo classic (bonus/penalità fuori dalle gare). La lista è sempre
 * pubblica quando esistono rettifiche (giocatore, punti, motivo, chi/quando
 * — stesso registro di TournamentResolutionNotes.jsx); il form per crearne
 * di nuove è visibile solo al superadmin.
 *
 * Solo tornei classic: nei tornei a gironi non esiste un totale punti unico
 * per l'intero torneo (i punti non si sommano tra girone/semifinale/finale),
 * quindi non c'è un posto sensato dove applicare la rettifica — vedi
 * create_point_adjustment nel backend, che la rifiuta per group_stage.
 */
import { useState } from 'react'
import { Coins, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { pointAdjustmentsApi, getApiErrorMessage } from '@/services/apiClient'

const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PointAdjustmentsPanel = ({ tournament, participants = [], isSuperadmin = false, onChanged }) => {
    const [playerId, setPlayerId] = useState('')
    const [points, setPoints] = useState('')
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)

    const adjustments = tournament?.pointAdjustments ?? []

    if (tournament?.tournament_format === 'group_stage') return null
    if (!isSuperadmin && adjustments.length === 0) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        const pts = Number(points)
        if (!playerId || !pts || !reason.trim()) {
            toast.error('Compila giocatore, punti e motivo')
            return
        }

        setSaving(true)
        try {
            await pointAdjustmentsApi.create({
                tournament_id: tournament.id,
                player_id: Number(playerId),
                points: pts,
                reason: reason.trim(),
            })
            toast.success('Rettifica salvata')
            setPlayerId('')
            setPoints('')
            setReason('')
            await onChanged?.()
        }
        catch (error) {
            toast.error('Salvataggio rettifica fallito', { description: getApiErrorMessage(error) })
        }
        finally {
            setSaving(false)
        }
    }

    const handleDelete = async (adjustmentId) => {
        try {
            await pointAdjustmentsApi.remove(adjustmentId)
            toast.success('Rettifica rimossa')
            await onChanged?.()
        }
        catch (error) {
            toast.error('Rimozione fallita', { description: getApiErrorMessage(error) })
        }
    }

    return (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-900/10 p-4 space-y-3">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                <Coins size={14} />
                <p className="text-xs font-black uppercase tracking-[0.3em]">Rettifiche punti</p>
            </div>

            {adjustments.length > 0 && (
                <ul className="space-y-2">
                    {adjustments.map((a) => (
                        <li key={a.id} className="flex items-start justify-between gap-2 text-sm text-slate-700 dark:text-foreground">
                            <p>
                                <span className={`font-black ${a.points > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {a.points > 0 ? `+${a.points}` : a.points}
                                </span>
                                {' '}a <span className="font-bold">{a.player_nickname}</span> — {a.reason}
                                <span className="block text-[11px] text-slate-400 dark:text-muted-foreground">
                                    {a.created_by_username} · {formatDate(a.created_at)}
                                </span>
                            </p>
                            {isSuperadmin && (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(a.id)}
                                    className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                                    aria-label="Rimuovi rettifica"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {isSuperadmin && (
                <form onSubmit={handleSubmit} className="grid gap-2 border-t border-violet-100 dark:border-violet-500/20 pt-3 sm:grid-cols-[1fr_5rem_2fr_auto]">
                    <select
                        value={playerId}
                        onChange={(e) => setPlayerId(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted px-3 py-2 text-sm text-slate-900 dark:text-foreground outline-none focus:border-violet-500"
                    >
                        <option value="">Giocatore…</option>
                        {participants.map((p) => (
                            <option key={p.id} value={p.id}>{p.nickname}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
                        placeholder="±punti"
                        className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted px-3 py-2 text-sm text-slate-900 dark:text-foreground outline-none focus:border-violet-500"
                    />
                    <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motivo (obbligatorio, visibile a tutti)"
                        className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted px-3 py-2 text-sm text-slate-900 dark:text-foreground outline-none focus:border-violet-500"
                    />
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-violet-500 disabled:opacity-60"
                    >
                        {saving ? '...' : 'Aggiungi'}
                    </button>
                </form>
            )}
        </div>
    )
}

export default PointAdjustmentsPanel
