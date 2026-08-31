import { Crown, Trophy, Star, Flame, Swords, Flag, Repeat, TrendingUp, Medal } from 'lucide-react'

/**
 * Metadati visivi per i 6 tier badge (vedi app/services/tornei/stats.py::
 * BADGE_TIER_RANK per la logica di calcolo). Il backend manda `tier` come
 * codice stabile e `label` come testo — qui mappiamo solo icona/palette,
 * mai il testo (che resta deciso dal backend).
 */
export const BADGE_TIERS = {
    leggenda: {
        Icon: Crown,
        className: 'border-circuit-gold bg-gradient-to-br from-circuit-gold/75 via-circuit-gold/35 to-circuit-gold text-amber-950 shadow-lg shadow-circuit-gold/40 dark:border-circuit-gold/60 dark:from-circuit-gold/30 dark:via-circuit-gold/15 dark:to-circuit-gold/35 dark:text-amber-200 dark:shadow-circuit-gold/20',
    },
    campione: {
        Icon: Trophy,
        className: 'border-circuit-gold/60 bg-circuit-gold/15 text-amber-800 dark:border-circuit-gold/40 dark:bg-circuit-gold/15 dark:text-amber-300',
    },
    veterano: {
        Icon: Star,
        className: 'border-circuit-blue/60 bg-circuit-blue/15 text-blue-800 dark:border-circuit-blue/40 dark:bg-circuit-blue/15 dark:text-blue-300',
    },
    outsider: {
        Icon: Flame,
        className: 'border-circuit-red/60 bg-circuit-red/15 text-red-800 dark:border-circuit-red/40 dark:bg-circuit-red/15 dark:text-red-300',
    },
    sfidante: {
        Icon: Swords,
        className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-border dark:bg-muted dark:text-muted-foreground',
    },
    esordiente: {
        Icon: Flag,
        className: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
}

// Dal più al meno esclusivo — stesso ordine di BADGE_TIER_RANK nel backend.
export const BADGE_TIER_RANK = ['leggenda', 'campione', 'veterano', 'outsider', 'esordiente', 'sfidante']

/** Il badge di rango più alto fra una lista di badge (uno per gioco). */
export function pickBestBadge(badges) {
    if (!badges?.length) return null
    return badges.slice().sort(
        (a, b) => BADGE_TIER_RANK.indexOf(a.tier) - BADGE_TIER_RANK.indexOf(b.tier)
    )[0]
}

/**
 * Stile "carta speciale" (bordo/sfondo/avatar/icona overlay) per la card
 * profilo — SOLO i 3 tier più esclusivi lo attivano; gli altri (outsider/
 * sfidante/esordiente) e l'assenza di badge restano allo stile normale
 * (vedi getProfileCardStyle, che ritorna null in quel caso). Sostituisce il
 * vecchio flag binario "isChampion" (tornei vinti > 0) con il tier reale del
 * badge migliore del giocatore.
 */
export const PROFILE_CARD_STYLES = {
    leggenda: {
        Icon: Crown,
        shimmer: true,
        cardBorder: 'border-circuit-gold/50 dark:border-circuit-gold/30 shadow-circuit-gold/20 dark:shadow-amber-950/40 ring-1 ring-circuit-gold/30 dark:ring-circuit-gold/20',
        cardBg: 'bg-linear-to-br from-amber-100/90 via-amber-50/60 to-amber-100/80 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60',
        avatarBorder: 'border-circuit-gold shadow-circuit-gold/20',
        badgeBg: 'bg-circuit-gold',
        badgeIconColor: 'text-amber-950',
        textColor: 'text-circuit-gold',
    },
    campione: {
        Icon: Trophy,
        shimmer: false,
        cardBorder: 'border-circuit-gold/40 dark:border-circuit-gold/20 shadow-amber-200/10 dark:shadow-amber-950/20',
        cardBg: 'bg-amber-50/50 dark:bg-amber-950/20',
        avatarBorder: 'border-circuit-gold/70 shadow-circuit-gold/15',
        badgeBg: 'bg-circuit-gold/80',
        badgeIconColor: 'text-amber-950',
        textColor: 'text-circuit-gold',
    },
    veterano: {
        Icon: Star,
        shimmer: false,
        // Sfondo/bordo volutamente tenui (non un gradiente pieno come
        // leggenda): stessa palette --circuit-blue di RoleBadge "admin" e
        // del badge-pill "veterano" stesso — una card di sfondo altrettanto
        // satura li fa sparire tutti nello stesso azzurro.
        cardBorder: 'border-circuit-blue/40 dark:border-circuit-blue/20 shadow-blue-200/10 dark:shadow-blue-950/20',
        cardBg: 'bg-blue-50/50 dark:bg-blue-950/20',
        avatarBorder: 'border-circuit-blue/70 shadow-circuit-blue/15',
        badgeBg: 'bg-circuit-blue',
        badgeIconColor: 'text-white',
        textColor: 'text-circuit-blue',
    },
}

/** null per outsider/sfidante/esordiente/nessun badge — i chiamanti lo
 * trattano esattamente come l'attuale "non campione". */
export function getProfileCardStyle(tier) {
    return PROFILE_CARD_STYLES[tier] ?? null
}

// Stessa soglia di PARTICIPATION_NUDGE_THRESHOLD/streak lato backend (vedi
// app/services/tornei/tournaments.py) — sotto questo numero di tornei
// consecutivi giocati l'indicatore "Costanza" non si mostra.
export const STREAK_BADGE_THRESHOLD = 3

/**
 * Indicatori aggiuntivi indipendenti dal tier — "premiano la via di mezzo"
 * (chi non vince ma partecipa con costanza, chi sta migliorando, chi ha
 * vinto la Consolazione) senza introdurre una classifica parallela. Non
 * sostituiscono il badge di tier, si affiancano (vedi PlayerBadge.jsx).
 */
export const EXTRA_BADGES = {
    streak: {
        Icon: Repeat,
        label: (n) => `Costanza · ${n} tornei di fila`,
        className: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    improving: {
        Icon: TrendingUp,
        label: 'In crescita',
        className: 'border-circuit-blue/60 bg-circuit-blue/15 text-blue-800 dark:border-circuit-blue/40 dark:bg-circuit-blue/15 dark:text-blue-300',
    },
    consolation: {
        Icon: Medal,
        label: (n) => (n > 1 ? `Re della Consolazione · ${n}×` : 'Re della Consolazione'),
        className: 'border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300',
    },
}
