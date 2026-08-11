import { Crown, Trophy, Star, Flame, Swords, Flag } from 'lucide-react'

/**
 * Metadati visivi per i 6 tier badge (vedi app/services/tornei/stats.py::
 * BADGE_TIER_RANK per la logica di calcolo). Il backend manda `tier` come
 * codice stabile e `label` come testo — qui mappiamo solo icona/palette,
 * mai il testo (che resta deciso dal backend).
 */
export const BADGE_TIERS = {
    leggenda: {
        Icon: Crown,
        className: 'border-amber-400 bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 text-amber-950 shadow-lg shadow-amber-400/40 dark:border-amber-400/60 dark:from-amber-500/30 dark:via-amber-400/20 dark:to-amber-600/30 dark:text-amber-200 dark:shadow-amber-500/20',
    },
    campione: {
        Icon: Trophy,
        className: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300',
    },
    veterano: {
        Icon: Star,
        className: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300',
    },
    outsider: {
        Icon: Flame,
        className: 'border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300',
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
export const BADGE_TIER_RANK = ['leggenda', 'campione', 'veterano', 'outsider', 'sfidante', 'esordiente']

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
        cardBorder: 'border-amber-400/50 dark:border-amber-500/30 shadow-amber-300/20 dark:shadow-amber-950/40 ring-1 ring-amber-400/30 dark:ring-amber-500/20',
        cardBg: 'bg-linear-to-br from-amber-100/90 via-amber-50/60 to-amber-100/80 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60',
        avatarBorder: 'border-amber-400 shadow-amber-400/20',
        badgeBg: 'bg-amber-400',
        badgeIconColor: 'text-amber-950',
        textColor: 'text-amber-600 dark:text-amber-400',
    },
    campione: {
        Icon: Trophy,
        shimmer: false,
        cardBorder: 'border-amber-300/40 dark:border-amber-500/20 shadow-amber-200/10 dark:shadow-amber-950/20',
        cardBg: 'bg-amber-50/50 dark:bg-amber-950/20',
        avatarBorder: 'border-amber-300 shadow-amber-300/15',
        badgeBg: 'bg-amber-300',
        badgeIconColor: 'text-amber-950',
        textColor: 'text-amber-600 dark:text-amber-400',
    },
    veterano: {
        Icon: Star,
        shimmer: false,
        cardBorder: 'border-blue-400/50 dark:border-blue-500/30 shadow-blue-300/20 dark:shadow-blue-950/40 ring-1 ring-blue-400/30 dark:ring-blue-500/20',
        cardBg: 'bg-linear-to-br from-blue-100/90 via-blue-50/60 to-blue-100/80 dark:from-blue-950/60 dark:via-blue-900/30 dark:to-blue-950/60',
        avatarBorder: 'border-blue-400 shadow-blue-400/20',
        badgeBg: 'bg-blue-400',
        badgeIconColor: 'text-white',
        textColor: 'text-blue-600 dark:text-blue-400',
    },
}

/** null per outsider/sfidante/esordiente/nessun badge — i chiamanti lo
 * trattano esattamente come l'attuale "non campione". */
export function getProfileCardStyle(tier) {
    return PROFILE_CARD_STYLES[tier] ?? null
}
