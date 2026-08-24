import { Fragment, useEffect, useState } from 'react'
import { Pencil, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import OwnershipForm from '@/components/common/OwnershipForm'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { ownershipApi, getApiErrorMessage } from '@/services/apiClient'

export default function PossessiTab() {
    const { games, consoles } = useAppData()
    const { isSuperadmin } = useAuth()
    const [ownershipRows, setOwnershipRows] = useState([])
    const [ownershipLoading, setOwnershipLoading] = useState(false)
    const [expandedUserId, setExpandedUserId] = useState(null)
    const [savingUserId, setSavingUserId] = useState(null)

    const consoleLabel = (key) => consoles.find((c) => c.key === key)?.label ?? key

    const loadOwnership = async () => {
        setOwnershipLoading(true)
        try { const res = await ownershipApi.all(); setOwnershipRows(res.data ?? []) }
        catch { toast.error('Impossibile caricare i possessi') }
        finally { setOwnershipLoading(false) }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadOwnership()
    }, [])

    const handleSaveRow = async (row, payload) => {
        setSavingUserId(row.user_id)
        try {
            const res = await ownershipApi.updateForUser(row.user_id, payload)
            const updated = res.data ?? {}
            setOwnershipRows((prev) => prev.map((r) => (
                r.user_id === row.user_id
                    ? { ...updated, user_id: r.user_id, username: r.username, player_nickname: r.player_nickname }
                    : r
            )))
            toast.success('Possessi aggiornati')
        } catch (error) {
            toast.error('Aggiornamento fallito', {
                description: getApiErrorMessage(error, 'Impossibile salvare i possessi'),
            })
        } finally {
            setSavingUserId(null)
        }
    }

    return (
        <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
            <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                    <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground">Panoramica possessi</p>
                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Chi possiede cosa</h2>
                </div>
                <button type="button" onClick={loadOwnership}
                    className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2 font-title text-[10px] tracking-wide text-slate-700 dark:text-foreground transition active:translate-y-px">
                    <RefreshCw size={12} /> Aggiorna
                </button>
            </div>

            {ownershipLoading ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">Caricamento...</p>
            ) : ownershipRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">Nessun dato disponibile</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Utente</TableHead>
                            <TableHead>Stato</TableHead>
                            {games.map((g) => (
                                <TableHead key={g.id}>{g.name}</TableHead>
                            ))}
                            <TableHead>Console</TableHead>
                            <TableHead>R4 compatibile</TableHead>
                            {isSuperadmin && <TableHead />}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ownershipRows.map((row) => {
                            const hasDeclared = row.has_declared
                            const isExpanded = expandedUserId === row.user_id
                            return (
                            <Fragment key={row.user_id}>
                            <TableRow className={hasDeclared ? undefined : 'opacity-60'}>
                                <TableCell>
                                    <p className="font-bold text-slate-900 dark:text-foreground">{row.player_nickname ?? row.username}</p>
                                    <p className="text-xs text-slate-400">{row.username}</p>
                                </TableCell>
                                <TableCell>
                                    {hasDeclared ? (
                                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Dichiarato</span>
                                    ) : (
                                        <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">Non compilato</span>
                                    )}
                                </TableCell>
                                {games.map((g) => {
                                    const quantity = row.games.find((rg) => rg.game_id === g.id)?.quantity ?? 0
                                    return (
                                        <TableCell key={g.id}>
                                            {!hasDeclared ? (
                                                <span className="text-slate-300 dark:text-slate-600 italic">n.d.</span>
                                            ) : (
                                                <span className={quantity > 0 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}>
                                                    {quantity > 0 ? quantity : '—'}
                                                </span>
                                            )}
                                        </TableCell>
                                    )
                                })}
                                <TableCell>
                                    {!hasDeclared ? (
                                        <span className="text-slate-300 dark:text-slate-600 italic">n.d.</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-1">
                                            {row.consoles.length === 0 ? (
                                                <span className="text-slate-400">—</span>
                                            ) : row.consoles.map(({ key, quantity }) => (
                                                <span key={key} className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                                    {consoleLabel(key)} ×{quantity}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {!hasDeclared ? (
                                        <span className="text-slate-300 dark:text-slate-600 italic">n.d.</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-1">
                                            {row.r4_devices.length === 0 ? (
                                                <span className="text-slate-400">—</span>
                                            ) : row.r4_devices.map(({ key, quantity }) => (
                                                <span key={key} className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                                    {consoleLabel(key)} ×{quantity}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </TableCell>
                                {isSuperadmin && (
                                    <TableCell>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedUserId(isExpanded ? null : row.user_id)}
                                            className="flex items-center gap-1.5 rounded-lg border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-2.5 py-1.5 font-title text-[9px] tracking-wide text-slate-700 dark:text-foreground transition active:translate-y-px"
                                        >
                                            {isExpanded ? <X size={11} /> : <Pencil size={11} />}
                                            {isExpanded ? 'Chiudi' : 'Modifica'}
                                        </button>
                                    </TableCell>
                                )}
                            </TableRow>
                            {isSuperadmin && isExpanded && (
                                <TableRow>
                                    <TableCell colSpan={3 + games.length + (isSuperadmin ? 1 : 0)} className="bg-slate-50 dark:bg-muted/40">
                                        <div className="py-2">
                                            <OwnershipForm
                                                ownership={row}
                                                games={games.map((g) => ({
                                                    game_id: g.id,
                                                    game_name: g.name,
                                                    quantity: row.games.find((rg) => rg.game_id === g.id)?.quantity ?? 0,
                                                }))}
                                                consoles={consoles}
                                                onSave={(payload) => handleSaveRow(row, payload)}
                                                saving={savingUserId === row.user_id}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            </Fragment>
                            )
                        })}
                    </TableBody>
                </Table>
            )}
        </div>
    )
}
