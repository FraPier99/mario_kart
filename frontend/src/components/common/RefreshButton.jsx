import { RefreshCw } from 'lucide-react'

// Bottone "Aggiorna" riusato ovunque compaia un dato che può andare stale
// (classifica, circuiti) — stesso identico pattern in tutti i punti in cui
// serve, per garantire che restino coerenti nel tempo invece di divergere
// come copie incollate a mano.
const RefreshButton = ({ onClick, loading = false, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 ${className}`}
    >
        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        Aggiorna
    </button>
)

export default RefreshButton
