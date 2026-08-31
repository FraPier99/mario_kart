import { Clock, Play, CheckCircle2, Trophy } from 'lucide-react'

// Stesso linguaggio visivo di RoleBadge/PlayerBadge (pillola bordata +
// icona) applicato ai badge di stato torneo — prima erano chip piatti
// senza bordo né icona, un'idiom diversa per la stessa categoria di
// informazione (un'etichetta colorata).
export const TOURNAMENT_STATUS_META = {
    da_svolgere: { label: 'In attesa', Icon: Clock, className: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    in_corso: { label: 'In corso', Icon: Play, className: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    finito: { label: 'Gare finite', Icon: CheckCircle2, className: 'border-circuit-blue/40 dark:border-circuit-blue/30 bg-circuit-blue/10 dark:bg-circuit-blue/10 text-blue-700 dark:text-blue-300' },
    concluso: { label: 'Concluso', Icon: Trophy, className: 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300' },
}

export const getTournamentStatusMeta = (status) => TOURNAMENT_STATUS_META[status] ?? TOURNAMENT_STATUS_META.da_svolgere
