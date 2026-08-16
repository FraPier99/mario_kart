// Colori per trofeo — assegnati per posizione nell'elenco ordinato dei
// trofei del gioco/torneo corrente (stabile finché l'ordine dei circuiti
// non cambia). Condiviso tra catalogo circuiti (superadmin), picker gara
// e vista circuiti torneo, così la stessa gerarchia visiva (bordo laterale
// colorato + pallino) è coerente ovunque appaiano gruppi di circuiti per
// trofeo, non solo nel catalogo admin.
export const TROPHY_PALETTE = [
    { border: 'border-l-blue-400 dark:border-l-blue-500', dot: 'bg-blue-400', badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30', label: 'text-blue-500 dark:text-blue-400' },
    { border: 'border-l-violet-400 dark:border-l-violet-500', dot: 'bg-violet-400', badge: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30', label: 'text-violet-500 dark:text-violet-400' },
    { border: 'border-l-emerald-400 dark:border-l-emerald-500', dot: 'bg-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30', label: 'text-emerald-500 dark:text-emerald-400' },
    { border: 'border-l-rose-400 dark:border-l-rose-500', dot: 'bg-rose-400', badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30', label: 'text-rose-500 dark:text-rose-400' },
    { border: 'border-l-cyan-400 dark:border-l-cyan-500', dot: 'bg-cyan-400', badge: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30', label: 'text-cyan-500 dark:text-cyan-400' },
    { border: 'border-l-fuchsia-400 dark:border-l-fuchsia-500', dot: 'bg-fuchsia-400', badge: 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-500/30', label: 'text-fuchsia-500 dark:text-fuchsia-400' },
    { border: 'border-l-lime-400 dark:border-l-lime-500', dot: 'bg-lime-400', badge: 'bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-500/30', label: 'text-lime-500 dark:text-lime-400' },
    { border: 'border-l-orange-400 dark:border-l-orange-500', dot: 'bg-orange-400', badge: 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30', label: 'text-orange-500 dark:text-orange-400' },
]

export const DEFAULT_TROPHY_COLOR = { border: 'border-l-slate-300 dark:border-l-slate-600', dot: 'bg-slate-400', badge: 'bg-slate-100 dark:bg-muted text-slate-600 dark:text-muted-foreground border-slate-200 dark:border-border', label: 'text-slate-400 dark:text-slate-500' }

export const trophyColor = (index) => TROPHY_PALETTE[index % TROPHY_PALETTE.length]
