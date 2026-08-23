import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Clock, Play, Trophy, ChevronRight, AlertTriangle, Shield, X, Lock, Info } from 'lucide-react'
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

    // Nei tornei a gironi le gare si creano per fase (girone → semifinale →
    // finale), progressivamente, DOPO l'avvio: il conteggio globale n_races è
    // solo informativo (vedi "Configurazione fasi" in GroupManagementSection),
    // quindi confrontarlo con raceCount per avvisare di "gare mancanti" non ha
    // senso e segnalava un problema inesistente avviando il torneo.
    const isGroupStage = tournament.tournament_format === 'group_stage'

    if (targetStatus === 'in_corso') {
        const now = new Date()
        const tournamentDate = tournament.date ? new Date(tournament.date) : null

        // Le gare si possono creare solo a torneo "in corso" (vedi
        // isTournamentLocked in TournamentDetail.jsx): a questo punto
        // raceCount è SEMPRE 0, per ogni torneo — non è un'anomalia da
        // segnalare, è l'unico stato possibile. Un avviso qui sparerebbe
        // sempre, senza mai indicare un problema reale (stessa ragione per
        // cui i gironi non hanno un controllo analogo, vedi commento sopra).
        if (tournamentDate && tournamentDate > now) {
            warnings.push({
                level: 'warning',
                icon: '📅',
                title: 'Torneo non ancora alla data',
                body: `Il torneo è previsto per il ${tournamentDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}. Stai avanzando prima della data programmata.`,
            })
        }
    }

    if (targetStatus === 'concluso') {
        // I tornei amichevoli non hanno un vincitore ufficiale da decretare —
        // "concluso" significa solo "abbiamo finito di giocare".
        if (!tournament.is_friendly) {
            const winner = tournament.winner ?? tournament.winner_id
            if (!winner) {
                warnings.push({
                    level: 'critical',
                    icon: '🏆',
                    title: 'Nessun vincitore impostato',
                    body: 'Non è stato ancora decretato un vincitore. Usa il pulsante "Decreta vincitore" per impostarlo — questo cambierà lo stato a concluso automaticamente.',
                })
            }
        }
        if (!isGroupStage) {
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

const TournamentStatusManager = ({ tournament, disabled = false, onUpdated, allowDirectConclusion = false }) => {
    const rawStatus = tournament?.status ?? 'da_svolgere'
    const [saving, setSaving] = useState(false)
    const [closingSchedine, setClosingSchedine] = useState(false)
    const [pendingTarget, setPendingTarget] = useState(null) // { value, label, warnings }

    const currentIndex = PIPELINE.findIndex((s) => s.value === getNormalizedStatus(rawStatus))
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const currentStep = PIPELINE[safeIndex]
    const nextStep = safeIndex < PIPELINE.length - 1 ? PIPELINE[safeIndex + 1] : null

    // Il torneo amichevole non ha un vincitore da decretare: la descrizione
    // dello step "concluso" della pipeline statica (PIPELINE, sopra) non si
    // applica, va sovrascritta qui invece di duplicare l'intera pipeline.
    const describeStep = (step) =>
        step?.value === 'concluso' && allowDirectConclusion
            ? 'Avete finito di giocare. Il torneo è chiuso — nessun vincitore ufficiale da impostare.'
            : step?.description

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
            {pendingTarget && createPortal(
                <SafetyModal
                    warnings={pendingTarget.warnings}
                    targetLabel={pendingTarget.label}
                    onConfirm={() => { setPendingTarget(null); doSetStatus(pendingTarget.value) }}
                    onCancel={() => setPendingTarget(null)}
                />,
                document.body
            )}

            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-5">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">Stato torneo</p>
                    <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-foreground">Ciclo di vita del torneo</h3>
                </div>

                {/* Torneo appena creato: nessuno dei due passaggi qui sotto è
                    obbligatorio né bloccante, ma un ordine consigliato aiuta a
                    non chiudersi fuori (es. avviare prima di aver verificato i
                    partecipanti). Sparisce da sola appena si esce da "da svolgere". */}
                {rawStatus === 'da_svolgere' && !disabled && (
                    <div className="flex items-start gap-2 rounded-2xl border border-dashed border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/10 px-4 py-3 text-xs text-sky-700 dark:text-sky-300">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <p>
                            <span className="font-black">Ordine consigliato:</span> verifica i partecipanti nella sezione qui sotto,
                            {!tournament?.is_friendly && (
                                <> poi quando i pronostici sono pronti premi <span className="font-black">Chiudi Schedine</span>,</>
                            )}
                            {' '}infine <span className="font-black">Avanza</span> per avviare il torneo e iniziare a inserire le gare.
                        </p>
                    </div>
                )}

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
                                    // "concluso" non è raggiungibile a mano: ci si arriva
                                    // solo decretando il vincitore (Decreta Vincitore) — tranne
                                    // per i tornei amichevoli, che non hanno quel passaggio e
                                    // possono chiudersi direttamente da qui.
                                    disabled={disabled || saving || isConcluded || step.value === rawStatus || (step.value === 'concluso' && !allowDirectConclusion)}
                                    onClick={() => requestSetStatus(step.value)}
                                    title={step.value === 'concluso' && !allowDirectConclusion ? 'Si conclude decretando il vincitore (Decreta Vincitore)' : describeStep(step)}
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

                {/* STATO ATTUALE + SCHEDINE — due fatti "pari grado", affiancati invece che impilati */}
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-2xl p-3 text-sm ${
                        rawStatus === 'da_svolgere' ? 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300' :
                        rawStatus === 'in_corso' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300' :
                        'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300'
                    }`}>
                        <p className="font-black uppercase tracking-wider text-[10px] mb-0.5 opacity-70">Stato attuale</p>
                        <p className="font-bold">{describeStep(currentStep)}</p>
                        {rawStatus === 'finito' && (
                            <p className="mt-1 text-[10px] opacity-60 italic">Stato legacy "finito" — clicca sulla pipeline per aggiornare.</p>
                        )}
                    </div>

                    {/* SCHEDINE */}
                    <div className={`flex flex-wrap items-start sm:items-center justify-between gap-3 rounded-2xl p-3 text-sm ${
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
                                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-2xl bg-rose-500 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
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
                </div>

                {/* AVANZA — solo per da_svolgere → in_corso. La conclusione NON
                    passa da qui: avviene tramite "Decreta Vincitore" (che imposta
                    vincitore + stato concluso e salda le schedine). Un "Avanza"
                    verso "concluso" sarebbe fuorviante e, senza vincitore,
                    imposterebbe solo lo stato legacy "finito" — eccetto per i
                    tornei amichevoli, che non hanno un vincitore da decretare e
                    possono avanzare a "concluso" direttamente da qui. */}
                {nextStep && (nextStep.value !== 'concluso' || allowDirectConclusion) && !isConcluded && !disabled && (
                    <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70">Prossimo step</p>
                            <p className="text-sm font-black text-emerald-900 dark:text-emerald-200 mt-0.5">{nextStep.label}</p>
                            <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/60 mt-0.5">{describeStep(nextStep)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAdvance}
                            disabled={saving}
                            className={`w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition ${nextStep.activeBg} hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed`}
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

                {/* In corso: niente "Avanza" — il vincitore (e la conclusione) si
                    decretano dalla sezione "Classifica Finale" → Decreta Vincitore.
                    I tornei amichevoli non hanno questo passaggio: l'"Avanza" sopra
                    porta già direttamente a "Concluso". */}
                {rawStatus === 'in_corso' && !disabled && !allowDirectConclusion && (
                    <div className="flex items-center gap-2 rounded-2xl border border-dashed border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                        <Trophy size={14} className="shrink-0" />
                        Per concludere il torneo usa <span className="font-black">Decreta Vincitore</span> nella sezione Classifica Finale.
                    </div>
                )}

                {isConcluded && (
                    <div className="flex items-center gap-2 rounded-2xl bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        <Trophy size={14} />
                        {allowDirectConclusion ? 'Torneo amichevole concluso' : 'Torneo concluso — vincitore impostato'}
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
