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
        className: 'border-circuit-gold bg-linear-to-br from-circuit-gold/75 via-circuit-gold/35 to-circuit-gold text-amber-950 shadow-lg shadow-circuit-gold/40 dark:border-circuit-gold/60 dark:from-circuit-gold/30 dark:via-circuit-gold/15 dark:to-circuit-gold/35 dark:text-amber-200 dark:shadow-circuit-gold/20',
    },
    admin: {
        label: 'ADMIN',
        Icon: ShieldCheck,
        // Stesso --circuit-blue del tier "veterano" (playerBadges.js) — le
        // due gerarchie (ruolo account, tier di gioco) condividono ora lo
        // stesso significante "blu" invece di indigo vs blue leggermente
        // diversi.
        className: 'border-circuit-blue/60 bg-circuit-blue/15 text-blue-800 dark:border-circuit-blue/40 dark:bg-circuit-blue/15 dark:text-blue-300',
    },
    user: {
        label: 'GIOCATORE',
        Icon: Gamepad2,
        className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-border dark:bg-muted dark:text-muted-foreground',
    },
}
