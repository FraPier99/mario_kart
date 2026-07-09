import { Zap, History, Shield, Ban, CheckCircle2 } from 'lucide-react'
import { groupLabel } from '@/lib/groupStage'

const formatTimestamp = (iso) =>
    new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// Riga di una singola carta usata. "log" = registro ufficiale (chi l'ha usata
// contro chi, chi l'ha registrata) — entry di card_log/apiClient. "history" =
// registro di sistema (fase/gara collegata) — entry di UserInventory/cardHistory.
const CardEntryRow = ({ entry, variant }) => {
    const isMaster = entry.card_type === 'master'
    const nickname = variant === 'log' ? entry.used_by_nickname : (entry.player_nickname ?? '—')
    const timestamp = variant === 'log' ? entry.used_at : entry.consumed_at

    return (
        <div className={`flex items-start gap-3 rounded-2xl border p-4 ${isMaster ? 'border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5' : 'border-sky-200/60 dark:border-sky-500/20 bg-sky-50/30 dark:bg-sky-500/5'}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${isMaster ? 'from-amber-400 to-orange-500' : 'from-cyan-400 to-blue-600'}`}>
                {isMaster ? <Shield size={16} /> : <Ban size={16} />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-sm font-black text-slate-900 dark:text-foreground">{nickname}</span>
                    <span className="text-xs text-slate-400">usò</span>
                    <span className={`text-xs font-black ${isMaster ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>{entry.card_name}</span>
                    {variant === 'log' && entry.target_nickname && (
                        <><span className="text-xs text-slate-400">contro</span>
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">{entry.target_nickname}</span></>
                    )}
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-black">Effetto:</span> {variant === 'log' ? entry.effect : (entry.effect ?? '—')}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                    {timestamp && <span>{formatTimestamp(timestamp)}</span>}
                    {variant === 'log' && entry.registered_by && <span>Registrata da: {entry.registered_by}</span>}
                    {variant === 'history' && entry.group_name && <span>{groupLabel(entry.group_name)}</span>}
                    {variant === 'history' && entry.race_name && <span>{entry.race_name}</span>}
                </div>
            </div>
            <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isMaster ? 'text-amber-400' : 'text-sky-400'}`} />
        </div>
    )
}

// Pannello "registro carte" (ufficiale o di sistema) — stesso markup usato sia
// nella vista giocatore (tab Carte) sia in quella admin (sezione Carte),
// prima duplicato 4 volte quasi verbatim in TournamentDetail.jsx.
const CardLogPanel = ({ variant, entries, eyebrow, title, emptyMessage }) => {
    const EmptyIcon = variant === 'log' ? Zap : History
    return (
        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-3">
            {variant === 'history' ? (
                <div className="flex items-center gap-2">
                    <History size={14} className="text-slate-400 dark:text-slate-500" />
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">{eyebrow}</p>
                        <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">{title}</h3>
                    </div>
                </div>
            ) : (
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">{eyebrow}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">{title}</h3>
                </div>
            )}
            {entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center">
                    <EmptyIcon size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-sm text-slate-400 dark:text-muted-foreground">{emptyMessage}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {entries.map((entry, idx) => (
                        <CardEntryRow key={idx} entry={entry} variant={variant} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default CardLogPanel
