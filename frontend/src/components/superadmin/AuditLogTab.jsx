import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { SkeletonRows } from '@/components/common/Skeleton'
import { auditApi } from '@/services/apiClient'

const ACTION_COLOR = {
    login: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    user_created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    user_deleted: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    user_role_changed: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    password_reset: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
}

// Estratto da SuperAdminPanel.jsx (tab "Audit Log"), componente autonomo
// come UsersTab.jsx/DatabaseTab.jsx: nessuna prop necessaria, gestisce da
// solo fetch e stato.
const AuditLogTab = () => {
    const [auditLogs, setAuditLogs] = useState([])
    const [auditLogsLoading, setAuditLogsLoading] = useState(false)

    const loadAuditLogs = async () => {
        setAuditLogsLoading(true)
        try { const res = await auditApi.list(); setAuditLogs(res.data ?? []) }
        catch { toast.error('Impossibile caricare l\'audit log') }
        finally { setAuditLogsLoading(false) }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadAuditLogs()
    }, [])

    return (
        <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
            <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                    <p className="font-title text-xs tracking-wide text-emerald-600 dark:text-emerald-400">Tracciamento azioni</p>
                    <h2 className="mt-0.5 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Audit Log</h2>
                </div>
                <button type="button" onClick={loadAuditLogs}
                    className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 font-title text-[10px] tracking-wide text-slate-700 dark:text-slate-100 transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-slate-700">
                    <RefreshCw size={12} /> Aggiorna
                </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
                {Object.entries(ACTION_COLOR).map(([action, cls]) => (
                    <span key={action} className={`rounded-full px-2 py-0.5 font-title text-[9px] tracking-wide ${cls}`}>
                        {action.replace(/_/g, ' ')}
                    </span>
                ))}
            </div>
            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {auditLogsLoading ? (
                    <SkeletonRows count={5} />
                ) : auditLogs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">Nessuna azione registrata</p>
                ) : auditLogs.map(log => (
                    <div key={log.id} className="rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`rounded-full px-2 py-0.5 font-title text-[9px] tracking-wide ${ACTION_COLOR[log.action] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                        {log.action.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-muted-foreground">da {log.actor_username ?? '—'}</span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-200">{log.description}</p>
                            </div>
                            <span className="shrink-0 text-[10px] text-slate-400">
                                {new Date(log.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default AuditLogTab
