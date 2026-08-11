import { Shield, ShieldCheck, Gamepad2 } from 'lucide-react'

/**
 * Badge di ruolo account (User.role), stesso linguaggio visivo dei badge di
 * livello per gioco (vedi playerBadges.js) ma per un concetto diverso e
 * senza game_id: ogni utente ha esattamente un ruolo, sempre lo stesso
 * ovunque compaia.
 */
export const ROLE_BADGES = {
    superadmin: {
        label: 'SUPERADMIN',
        Icon: Shield,
        className: 'border-amber-400 bg-linear-to-br from-amber-300 via-yellow-200 to-amber-400 text-amber-950 shadow-lg shadow-amber-400/40 dark:border-amber-400/60 dark:from-amber-500/30 dark:via-amber-400/20 dark:to-amber-600/30 dark:text-amber-200 dark:shadow-amber-500/20',
    },
    admin: {
        label: 'ADMIN',
        Icon: ShieldCheck,
        className: 'border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300',
    },
    user: {
        label: 'GIOCATORE',
        Icon: Gamepad2,
        className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-border dark:bg-muted dark:text-muted-foreground',
    },
}
