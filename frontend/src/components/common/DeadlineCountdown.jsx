import { Clock, Lock } from 'lucide-react'
import { useCountdown } from '@/hooks/useCountdown'

const formatDeadline = (deadline) => new Date(deadline).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

/**
 * Badge con scadenza e conto alla rovescia live (si aggiorna da solo,
 * senza bisogno di ricaricare la pagina quando la deadline scatta).
 */
const DeadlineCountdown = ({ deadline, passedLabel = 'Scadenza passata', className = '', hideWhenPassed = false }) => {
    const { label, isPassed } = useCountdown(deadline)
    if (!deadline) return null
    // Su questa app la chiusura reale delle schedine è a evento
    // (schedine_locked / avvio torneo), non a data: la deadline qui è solo
    // indicativa. Se è già passata ma la schedina è ancora aperta, mostrare
    // "Scadenza passata" sarebbe contraddittorio — meglio non mostrare nulla.
    if (isPassed && hideWhenPassed) return null

    return (
        <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest ${isPassed ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'} ${className}`}>
            {isPassed ? <Lock size={14} /> : <Clock size={14} />}
            <span>{isPassed ? passedLabel : `Scadenza: ${formatDeadline(deadline)}`}</span>
            {!isPassed && label && (
                <span className="rounded-full bg-white/60 dark:bg-black/20 px-2 py-0.5 text-[10px] font-black tracking-widest text-current normal-case">
                    tra {label}
                </span>
            )}
        </div>
    )
}

export default DeadlineCountdown
