import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useAppData } from '@/context/AppDataContext'
import { ownershipApi } from '@/services/apiClient'
import { consoleLabel } from '@/lib/consoles'

export default function PossessiTab() {
    const { games } = useAppData()
    const [ownershipRows, setOwnershipRows] = useState([])
    const [ownershipLoading, setOwnershipLoading] = useState(false)

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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ownershipRows.map((row) => {
                            const hasDeclared = row.has_declared
                            return (
                            <TableRow key={row.user_id} className={hasDeclared ? undefined : 'opacity-60'}>
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
                            </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            )}
        </div>
    )
}
