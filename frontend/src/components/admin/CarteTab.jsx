import { useEffect, useState } from 'react'
import { RefreshCw, Zap } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmModal from '@/components/common/ConfirmModal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useAppData } from '@/context/AppDataContext'
import { inventoryApi, getApiErrorMessage } from '@/services/apiClient'

export default function CarteTab() {
    const { players, games, communityUsers } = useAppData()

    const [cardTargetPlayerId, setCardTargetPlayerId] = useState('')
    const [cardType, setCardType] = useState('master')
    const [cardGranting, setCardGranting] = useState(false)
    const [cardGameId, setCardGameId] = useState('')
    const [cardNote, setCardNote] = useState('')

    const [cardsRows, setCardsRows] = useState([])
    const [cardsLoading, setCardsLoading] = useState(false)
    const [revokingCardId, setRevokingCardId] = useState(null)

    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmText: '', confirmVariant: 'danger', onConfirm: null })

    const loadCards = async () => {
        setCardsLoading(true)
        try { const res = await inventoryApi.all(); setCardsRows(res.data ?? []) }
        catch { toast.error('Impossibile caricare le carte assegnate') }
        finally { setCardsLoading(false) }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadCards()
    }, [])

    const handleGrantCard = async () => {
        if (!cardTargetPlayerId) { toast.error('Seleziona un giocatore'); return }
        if (!cardGameId) { toast.error('Seleziona un gioco'); return }
        if (!cardNote.trim()) { toast.error('Inserisci una nota sul motivo dell\'assegnazione'); return }
        const targetUser = communityUsers.find(u => String(u.player_id) === String(cardTargetPlayerId))
        if (!targetUser) { toast.error('Nessun account collegato a questo giocatore'); return }
        setCardGranting(true)
        try {
            await inventoryApi.adminGrant({
                user_id: targetUser.id,
                card_type: cardType,
                game_id: Number(cardGameId),
                note: cardNote.trim(),
                source_tournament_id: null,
            })
            const nick = players.find(p => String(p.id) === String(cardTargetPlayerId))?.nickname ?? `#${cardTargetPlayerId}`
            toast.success(`Carta ${cardType === 'master' ? 'Master' : 'Guscio Blu'} assegnata a ${nick}`)
            setCardTargetPlayerId('')
            setCardNote('')
            await loadCards()
        } catch (err) { toast.error('Impossibile assegnare la carta', { description: getApiErrorMessage(err) }) }
        finally { setCardGranting(false) }
    }

    const handleRevokeCard = (item) => {
        const nick = item.user_nickname ?? `#${item.user_id}`
        setConfirmModal({
            open: true,
            title: 'Revoca carta',
            message: `Revocare "${item.card_name}" a ${nick}? L'azione non può essere annullata.`,
            confirmText: 'Revoca',
            confirmVariant: 'danger',
            onConfirm: async () => {
                setConfirmModal((p) => ({ ...p, open: false }))
                setRevokingCardId(item.id)
                try {
                    await inventoryApi.adminRevoke(item.id)
                    toast.success(`Carta revocata a ${nick}`)
                    setCardsRows((rows) => rows.filter((r) => r.id !== item.id))
                } catch (err) {
                    toast.error('Impossibile revocare la carta', { description: getApiErrorMessage(err) })
                } finally {
                    setRevokingCardId(null)
                }
            },
        })
    }

    return (
        <div className="space-y-6">
            <ConfirmModal
                isOpen={confirmModal.open}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmVariant={confirmModal.confirmVariant}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal((p) => ({ ...p, open: false }))}
            />

            <div className="rounded-[2rem] border-2 border-amber-200 dark:border-amber-500/30 bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
                        <Zap size={16} />
                    </div>
                    <div>
                        <p className="font-title text-xs tracking-wide text-amber-600 dark:text-amber-400">Assegnazione manuale</p>
                        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Carte Potere</h2>
                    </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-muted-foreground mb-4">Assegna manualmente le Carte Potere ai giocatori come eccezione alla logica automatica delle schedine.</p>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex-1 min-w-40 space-y-1.5">
                        <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-muted-foreground">Giocatore</span>
                        <select value={cardTargetPlayerId} onChange={e => setCardTargetPlayerId(e.target.value)}
                            className="w-full rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5 text-sm text-slate-900 dark:text-foreground outline-none focus:border-amber-500 transition">
                            <option value="">Seleziona giocatore...</option>
                            {players.map(p => {
                                const linked = communityUsers.some(u => u.player_id === p.id)
                                return <option key={p.id} value={p.id} disabled={!linked}>{p.nickname}{!linked ? ' (no account)' : ''}</option>
                            })}
                        </select>
                    </label>
                    <label className="min-w-36 space-y-1.5">
                        <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-muted-foreground">Carta</span>
                        <select value={cardType} onChange={e => setCardType(e.target.value)}
                            className="w-full rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5 text-sm text-slate-900 dark:text-foreground outline-none focus:border-amber-500 transition">
                            <option value="master">★ Carta Master</option>
                            <option value="blue_shell">⚡ Guscio Blu</option>
                        </select>
                    </label>
                    <label className="min-w-36 space-y-1.5">
                        <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-muted-foreground">Gioco</span>
                        <select value={cardGameId} onChange={e => setCardGameId(e.target.value)}
                            className="w-full rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5 text-sm text-slate-900 dark:text-foreground outline-none focus:border-amber-500 transition">
                            <option value="">Seleziona gioco...</option>
                            {games.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="mt-3">
                    <label className="space-y-1.5">
                        <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-muted-foreground">Nota * (obbligatoria — spiega perché viene assegnata)</span>
                        <textarea value={cardNote} onChange={e => setCardNote(e.target.value)}
                            className="w-full rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5 text-sm text-slate-900 dark:text-foreground outline-none focus:border-amber-500 transition resize-none"
                            rows={2} placeholder="Es: premio speciale per il torneo X, sostituzione carta persa, ..." />
                    </label>
                </div>
                <div className="mt-3 flex justify-end">
                    <button type="button" onClick={handleGrantCard} disabled={!cardTargetPlayerId || !cardGameId || !cardNote.trim() || cardGranting}
                        className="rounded-xl bg-amber-500 px-4 py-2.5 font-title text-[10px] tracking-wide text-white transition-all active:translate-y-px hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed">
                        {cardGranting ? 'Assegnando...' : 'Assegna Carta'}
                    </button>
                </div>
            </div>

            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground mb-1">Informazioni</p>
                <p className="text-sm text-slate-600 dark:text-muted-foreground">
                    Le carte vengono normalmente assegnate automaticamente al termine dei tornei tramite il sistema di schedine. Usa questo strumento solo per correzioni manuali o eccezioni. Ogni assegnazione è tracciata nell'Audit Log.
                </p>
            </div>

            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground">Elenco carte</p>
                        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Carte assegnate</h2>
                    </div>
                    <button type="button" onClick={loadCards}
                        className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2 font-title text-[10px] tracking-wide text-slate-700 dark:text-foreground transition active:translate-y-px">
                        <RefreshCw size={12} /> Aggiorna
                    </button>
                </div>

                {cardsLoading ? (
                    <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">Caricamento...</p>
                ) : cardsRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">Nessuna carta assegnata</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Giocatore</TableHead>
                                <TableHead>Carta</TableHead>
                                <TableHead>Torneo di provenienza</TableHead>
                                <TableHead>Stato</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cardsRows.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.user_nickname ?? `#${item.user_id}`}</TableCell>
                                    <TableCell>{item.card_name}</TableCell>
                                    <TableCell>{item.source_tournament_name ?? '—'}</TableCell>
                                    <TableCell>
                                        <span className={item.is_consumed ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400 font-black'}>
                                            {item.is_consumed ? 'Consumata' : 'Disponibile'}
                                        </span>
                                    </TableCell>
                                    <TableCell>{item.created_at ? new Date(item.created_at).toLocaleDateString('it-IT') : '—'}</TableCell>
                                    <TableCell>
                                        {!item.is_consumed && (
                                            <button type="button" disabled={revokingCardId === item.id}
                                                onClick={() => handleRevokeCard(item)}
                                                className="rounded-lg border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 font-title text-[9px] tracking-wide text-rose-600 dark:text-rose-400 transition active:translate-y-px hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed">
                                                {revokingCardId === item.id ? 'Revoca...' : 'Revoca'}
                                            </button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    )
}
