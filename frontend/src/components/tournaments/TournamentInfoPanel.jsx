/**
 * TournamentInfoPanel — Sezione informativa del torneo: stato/fase con badge,
 * info riassuntive (partecipanti, gironi, gare, schedine), timeline di
 * avanzamento e cronologia (creazione, attività recenti).
 */
import { useState, useEffect } from 'react'
import { Info, History, ChevronDown } from 'lucide-react'
import { tournamentsApi } from '@/services/apiClient'

const STATUS_BADGE = {
    'In Attesa': 'bg-slate-500 text-white',
    'In Corso': 'bg-emerald-500 text-white',
    'Gironi': 'bg-emerald-500 text-white',
    'Semifinali': 'bg-blue-500 text-white',
    'Finale': 'bg-amber-500 text-white',
    'Concluso': 'bg-slate-900 text-white',
}

const STEP_CIRCLE_CLASSES = {
    done: 'bg-emerald-500 text-white border-emerald-500',
    current: 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-200 dark:ring-amber-500/20',
    pending: 'bg-white dark:bg-card text-slate-400 dark:text-muted-foreground border-slate-200 dark:border-border',
    skipped: 'bg-slate-100 dark:bg-muted text-slate-300 dark:text-slate-600 border-slate-100 dark:border-muted',
}

const STEP_LABEL_CLASSES = {
    done: 'text-emerald-600 dark:text-emerald-400',
    current: 'text-amber-600 dark:text-amber-400',
    pending: 'text-slate-400 dark:text-muted-foreground',
    skipped: 'text-slate-300 dark:text-slate-600 line-through',
}

const FORMAT_LABEL = {
    classic: 'Classifica unica',
    group_stage: 'Gironi',
}

const formatDateTime = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
}

const InfoItem = ({ label, value }) => (
    <div className="rounded-xl border border-slate-100 dark:border-border bg-slate-50/60 dark:bg-muted/30 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-foreground">{value}</p>
    </div>
)

const Timeline = ({ steps }) => (
    <div className="flex items-start overflow-x-auto pb-1">
        {steps.map((step, i) => (
            <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1 min-w-[5.5rem]">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-black ${STEP_CIRCLE_CLASSES[step.status]}`}>
                        {step.status === 'done' ? '✓' : i + 1}
                    </div>
                    <p className={`text-center text-[10px] font-black uppercase tracking-widest ${STEP_LABEL_CLASSES[step.status]}`}>
                        {step.label}
                    </p>
                </div>
                {i < steps.length - 1 && (
                    <div className={`h-0.5 w-6 sm:w-10 ${step.status === 'done' ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-border'}`} />
                )}
            </div>
        ))}
    </div>
)

const TournamentInfoPanel = ({ tournament, isAdmin, isSuperadmin, collapsible = false, defaultOpen = true, showOverviewBasics = true }) => {
    const [overview, setOverview] = useState(null)
    const [audit, setAudit] = useState(null)
    const [open, setOpen] = useState(defaultOpen)

    useEffect(() => {
        let active = true
        tournamentsApi.overview(tournament.id)
            .then((res) => { if (active) setOverview(res.data) })
            .catch(() => { if (active) setOverview(null) })
        return () => { active = false }
    }, [tournament.id, tournament.races, tournament.status, tournament.format_data, tournament.winner_id])

    useEffect(() => {
        let active = true
        tournamentsApi.audit(tournament.id)
            .then((res) => { if (active) setAudit(res.data) })
            .catch(() => { if (active) setAudit(null) })
        return () => { active = false }
    }, [tournament.id, tournament.races, tournament.status, tournament.format_data])

    if (!overview) return null

    const infoItems = [
        ...(showOverviewBasics ? [{ label: 'Data', value: overview.date ?? '—' }] : []),
        { label: 'Tipo', value: FORMAT_LABEL[overview.tournament_format] ?? overview.tournament_format },
        { label: 'Partecipanti', value: `${overview.participants_count}/${overview.n_players}` },
        ...(overview.groups_count != null ? [{ label: 'Gironi', value: overview.groups_count }] : []),
        ...(showOverviewBasics ? [{ label: 'Gare', value: `${overview.races_completed}/${overview.races_total}` }] : []),
        { label: 'Schedine', value: `${overview.schedine_count} · ${overview.schedina_status_label}` },
    ]

    const headerContent = (
        <>
            <div className="flex items-center gap-2">
                <Info size={16} className="text-emerald-500 shrink-0" />
                <h3 className="text-lg font-black text-slate-900 dark:text-foreground">Informazioni torneo</h3>
            </div>
            <div className="flex items-center gap-2">
                {showOverviewBasics && (
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE[overview.status_label] ?? 'bg-slate-500 text-white'}`}>
                        {overview.status_label}
                    </span>
                )}
                {collapsible && (
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                )}
            </div>
        </>
    )

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-4">
            {collapsible ? (
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 text-left transition hover:opacity-80"
                >
                    {headerContent}
                </button>
            ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {headerContent}
                </div>
            )}

            {(!collapsible || open) && (
                <>
                    <Timeline steps={overview.timeline} />

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {infoItems.map((item) => (
                            <InfoItem key={item.label} label={item.label} value={item.value} />
                        ))}
                    </div>

                    {audit && (
                        <div className="rounded-2xl border border-slate-200 dark:border-border bg-slate-50/60 dark:bg-muted/30 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-muted-foreground">
                                <History size={14} />
                                <p className="text-xs font-black uppercase tracking-[0.3em]">Cronologia torneo</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-muted-foreground">
                                <p>
                                    <span className="font-black text-slate-900 dark:text-foreground">Creato da:</span>{' '}
                                    {audit.created_by?.username ?? '—'} il {formatDateTime(audit.created_at)}
                                </p>
                                <p>
                                    <span className="font-black text-slate-900 dark:text-foreground">Ultimo avanzamento fase:</span>{' '}
                                    {audit.last_phase_change_at
                                        ? `${formatDateTime(audit.last_phase_change_at)}${audit.last_phase_change_by ? ` (${audit.last_phase_change_by.username})` : ''}`
                                        : '—'}
                                </p>
                            </div>
                            {audit.recent_activity.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Attività recenti</p>
                                    <ul className="space-y-1">
                                        {audit.recent_activity.map((entry, i) => (
                                            <li key={i} className="text-xs text-slate-600 dark:text-muted-foreground">
                                                <span className="font-black text-slate-900 dark:text-foreground">{formatDateTime(entry.created_at)}</span>
                                                {' — '}{entry.description}
                                                {entry.actor_username ? ` (${entry.actor_username})` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default TournamentInfoPanel
