import { useState } from 'react'
import { toast } from 'sonner'
import { Clock, Play, Trophy, ChevronRight, AlertTriangle, Shield, X, Lock } from 'lucide-react'
import { getApiErrorMessage, tournamentsApi } from '@/services/apiClient'

const PIPELINE = [
    {
        value: 'da_svolgere',
        label: 'Da svolgere',
        icon: Clock,
        activeBg: 'bg-slate-600',
        activeText: 'text-white',
        inactiveBg: 'bg-slate-100 dark:bg-slate-800',
        inactiveText: 'text-slate-400 dark:text-slate-500',
        ring: 'ring-slate-400 dark:ring-slate-500',
        description: 'Schedine aperte fino alla scadenza. Il torneo non è ancora iniziato.',
    },
    {
        value: 'in_corso',
        label: 'In corso',
        icon: Play,
        activeBg: 'bg-emerald-500',
        activeText: 'text-white',
        inactiveBg: 'bg-slate-100 dark:bg-slate-800',
        inactiveText: 'text-slate-400 dark:text-slate-500',
        ring: 'ring-emerald-400',
        description: 'Torneo attivo. Puoi inserire gare e risultati.',
    },
    {
        value: 'concluso',
        label: 'Concluso',
        icon: Trophy,
        activeBg: 'bg-amber-500',
        activeText: 'text-white',
        inactiveBg: 'bg-slate-100 dark:bg-slate-800',
        inactiveText: 'text-slate-400 dark:text-slate-500',
        ring: 'ring-amber-400',
        description: 'Vincitore decretato. Il torneo è chiuso.',
    },
]

const getNormalizedStatus = (status) => {
    if (!status || status === 'finito') return 'in_corso'
    return status
}

// Raccoglie avvisi prima di avanzare verso targetStatus
const buildWarnings = (tournament, targetStatus) => {
    const warnings = []
    if (!tournament) return warnings

    if (targetStatus === 'in_corso') {
        const now = new Date()
        const tournamentDate = tournament.date ? new Date(tournament.date) : null
        const deadlineLock = tournament.deadline_lock ? new Date(tournament.deadline_lock) : null
        const raceCount = tournament.raceCount ?? tournament.races?.length ?? 0
        const nRaces = tournament.n_races ?? 0

        if (tournamentDate && tournamentDate > now) {
            warnings.push({
                level: 'warning',
                icon: '📅',
                title: 'Torneo non ancora alla data',
                body: `Il torneo è previsto per il ${tournamentDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}. Stai avanzando prima della data programmata.`,
            })
        }

        if (deadlineLock && deadlineLock > now) {
            warnings.push({
                level: 'critical',
                icon: '⏰',
                title: 'Scadenza schedine non ancora passata',
                body: `La deadline per le schedine scade il ${deadlineLock.toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}. Se avanzi ora, gli utenti non potranno più compilare la schedina.`,
            })
        }

        if (nRaces > 0 && raceCount === 0) {
            warnings.push({
                level: 'warning',
                icon: '🏁',
                title: 'Nessuna gara ancora creata',
                body: `Il torneo prevede ${nRaces} gare ma nessuna è stata ancora creata. Puoi crearle anche dopo, ma è consigliato farlo prima.`,
            })
        }
    }

    if (targetStatus === 'concluso') {
        const winner = tournament.winner ?? tournament.winner_id
        if (!winner) {
            warnings.push({
                level: 'critical',
                icon: '🏆',
                title: 'Nessun vincitore impostato',
                body: 'Non è stato ancora decretato un vincitore. Usa il pulsante "Decreta vincitore" per impostarlo — questo cambierà lo stato a concluso automaticamente.',
            })
        }
        const raceCount = tournament.raceCount ?? tournament.races?.length ?? 0
        const nRaces = tournament.n_races ?? 0
        const missing = Math.max(0, nRaces - raceCount)
        if (missing > 0) {
            warnings.push({
                level: 'warning',
                icon: '🏁',
                title: `${missing} gare non ancora completate`,
                body: `Mancano ${missing} gare su ${nRaces} previste. Stai chiudendo il torneo anticipatamente.`,
            })
        }
    }

    return warnings
}

// Modal di sicurezza
const SafetyModal = ({ warnings, targetLabel, onConfirm, onCancel }) => {
    const hasCritical = warnings.some((w) => w.level === 'critical')
    return (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onCancel}>
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${hasCritical ? 'bg-rose-500/20' : 'bg-amber-500/20'}`}>
                            <AlertTriangle size={20} className={hasCritical ? 'text-rose-400' : 'text-amber-400'} />
                        </div>
                        <div>
                            <p className={`text-xs font-black uppercase tracking-[0.3em] ${hasCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                                {hasCritical ? 'Attenzione richiesta' : 'Conferma operazione'}
                            </p>
                            <h4 className="text-base font-black text-white">Avanzare a "{targetLabel}"?</h4>
                        </div>
                    </div>
                    <button type="button" onClick={onCancel} className="text-slate-500 hover:text-white transition">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {warnings.map((w, i) => (
                        <div key={i} className={`rounded-2xl border p-3 ${w.level === 'critical' ? 'border-rose-500/30 bg-rose-500/8' : 'border-amber-500/30 bg-amber-500/8'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span>{w.icon}</span>
                                <p className={`text-xs font-black uppercase tracking-wider ${w.level === 'critical' ? 'text-rose-400' : 'text-amber-400'}`}>{w.title}</p>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">{w.body}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex gap-3">
                    <button type="button" onClick={onCancel}
                        className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
                        Annulla
                    </button>
                    <button type="button" onClick={onConfirm}
                        className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white transition ${hasCritical ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-500 hover:bg-amber-400'}`}>
                        {hasCritical ? 'Forza avanzamento' : 'Conferma'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const TournamentStatusManager = ({ tournament, disabled = false, onUpdated }) => {
    const rawStatus = tournament?.status ?? 'da_svolgere'
    const [saving, setSaving] = useState(false)
    const [closingSchedine, setClosingSchedine] = useState(false)
    const [pendingTarget, setPendingTarget] = useState(null) // { value, label, warnings }

    const currentIndex = PIPELINE.findIndex((s) => s.value === getNormalizedStatus(rawStatus))
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const currentStep = PIPELINE[safeIndex]
    const nextStep = safeIndex < PIPELINE.length - 1 ? PIPELINE[safeIndex + 1] : null

    const doSetStatus = async (value) => {
        setSaving(true)
        try {
            await tournamentsApi.update(tournament.id, { status: value })
            toast.success(`Stato aggiornato: "${PIPELINE.find((s) => s.value === value)?.label ?? value}"`)
            await onUpdated?.()
        } catch (error) {
            toast.error('Aggiornamento stato fallito', { description: getApiErrorMessage(error) })
        } finally {
            setSaving(false)
        }
    }

    const requestSetStatus = (value) => {
        if (disabled || value === rawStatus) return
        const targetStep = PIPELINE.find((s) => s.value === value)
        const warnings = buildWarnings(tournament, value)
        if (warnings.length === 0) {
            doSetStatus(value)
        } else {
            setPendingTarget({ value, label: targetStep?.label ?? value, warnings })
        }
    }

    const handleAdvance = () => {
        if (!nextStep) return
        requestSetStatus(nextStep.value)
    }

    const handleCloseSchedine = async () => {
        setClosingSchedine(true)
        try {
            await tournamentsApi.closeSchedine(tournament.id)
            toast.success('Schedine chiuse', { description: 'Non sarà più possibile compilare o modificare pronostici per questo torneo.' })
            await onUpdated?.()
        } catch (error) {
            toast.error('Chiusura schedine fallita', { description: getApiErrorMessage(error) })
        } finally {
            setClosingSchedine(false)
        }
    }

    const isConcluded = rawStatus === 'concluso'

    return (
        <>
            {pendingTarget && (
                <SafetyModal
                    warnings={pendingTarget.warnings}
                    targetLabel={pendingTarget.label}
                    onConfirm={() => { setPendingTarget(null); doSetStatus(pendingTarget.value) }}
                    onCancel={() => setPendingTarget(null)}
                />
            )}

            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-5">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">Stato torneo</p>
                    <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-foreground">Ciclo di vita del torneo</h3>
                </div>

                {/* PIPELINE VISUALE */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {PIPELINE.map((step, idx) => {
                        const Icon = step.icon
                        const isActive = step.value === getNormalizedStatus(rawStatus)
                        const isPast = idx < safeIndex

                        return (
                            <div key={step.value} className="flex items-center gap-1 min-w-0">
                                <button
                                    type="button"
                                    disabled={disabled || saving || isConcluded || step.value === rawStatus}
                                    onClick={() => requestSetStatus(step.value)}
                                    title={step.description}
                                    className={`flex flex-col items-center gap-1.5 rounded-2xl px-3 py-2.5 text-center transition-all min-w-22.5 ${
                                        isActive
                                            ? `${step.activeBg} ${step.activeText} shadow-md ring-2 ring-offset-1 ${step.ring} dark:ring-offset-slate-900`
                                            : isPast
                                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 disabled:cursor-default'
                                            : `${step.inactiveBg} ${step.inactiveText} ${!disabled && !isConcluded ? 'hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer' : 'cursor-default'}`
                                    }`}
                                >
                                    <Icon size={16} className={isPast && !isActive ? 'text-emerald-500 dark:text-emerald-400' : ''} />
                                    <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{step.label}</span>
                                    {isPast && !isActive && <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500 dark:text-emerald-400">✓</span>}
                                </button>
                                {idx < PIPELINE.length - 1 && (
                                    <ChevronRight size={14} className={`shrink-0 ${idx < safeIndex ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* STATO CORRENTE */}
                <div className={`rounded-2xl p-3 text-sm ${
                    rawStatus === 'da_svolgere' ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300' :
                    rawStatus === 'in_corso' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' :
                    'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300'
                }`}>
                    <p className="font-black uppercase tracking-wider text-[10px] mb-0.5 opacity-70">Stato attuale</p>
                    <p className="font-bold">{currentStep?.description}</p>
                    {rawStatus === 'finito' && (
                        <p className="mt-1 text-[10px] opacity-60 italic">Stato legacy "finito" — clicca sulla pipeline per aggiornare.</p>
                    )}
                </div>

                {/* SCHEDINE */}
                <div className={`flex items-center justify-between gap-3 rounded-2xl p-3 text-sm ${
                    tournament?.schedine_locked
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                        : 'bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300'
                }`}>
                    <div className="min-w-0 flex items-center gap-2">
                        <Lock size={14} className="shrink-0" />
                        <div>
                            <p className="font-black uppercase tracking-wider text-[10px] opacity-70">Schedine</p>
                            <p className="font-bold">
                                {tournament?.schedine_locked ? 'Chiuse — nessun nuovo pronostico ammesso' : 'Aperte alla compilazione'}
                            </p>
                        </div>
                    </div>
                    {!tournament?.schedine_locked && !disabled && rawStatus === 'da_svolgere' && (
                        <button
                            type="button"
                            onClick={handleCloseSchedine}
                            disabled={closingSchedine}
                            className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-rose-500 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {closingSchedine ? 'Chiusura...' : (
                                <>
                                    <Lock size={12} />
                                    Chiudi Schedine
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* AVANZA */}
                {nextStep && !isConcluded && !disabled && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-border p-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Prossimo step</p>
                            <p className="text-sm font-black text-slate-700 dark:text-slate-300 mt-0.5">{nextStep.label}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{nextStep.description}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAdvance}
                            disabled={saving}
                            className={`shrink-0 flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition ${nextStep.activeBg} hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                            {saving ? 'Salvataggio...' : (
                                <>
                                    <ChevronRight size={12} />
                                    Avanza
                                </>
                            )}
                        </button>
                    </div>
                )}

                {isConcluded && (
                    <div className="flex items-center gap-2 rounded-2xl bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        <Trophy size={14} />
                        Torneo concluso — vincitore impostato
                    </div>
                )}

                {disabled && !isConcluded && (
                    <div className="flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-muted px-4 py-3 text-xs text-slate-500 dark:text-muted-foreground">
                        <Shield size={14} />
                        Solo gli admin possono cambiare lo stato del torneo.
                    </div>
                )}
            </div>
        </>
    )
}

export default TournamentStatusManager
