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

// Badge illustrati (asset fotorealistici in /public/badges/), usati al posto
// della vecchia icona lucide+pillola nella card "Ultimo torneo" (home), nella
// card giocatore (/players), nell'header profilo e in FAQ. I chiamanti che
// non trovano un tier qui ricadono su <TierMedallion> (SVG).
export const TIER_BADGE_IMAGES = {
    leggenda: '/badges/small_leggenda.png',
    campione: '/badges/small_campione.png',
    veterano: '/badges/small_veterano.png',
    outsider: '/badges/small_outsider.png',
    esordiente: '/badges/small_esordiente.png',
    sfidante: '/badges/small_sfidante.png',
}

// Stesso concetto per i 3 riconoscimenti extra — i chiamanti senza match qui
// ricadono su <ExtraMedallion> (SVG).
export const EXTRA_BADGE_IMAGES = {
    streak: '/badges/small_costanza.png',
    improving: '/badges/small_crescita.png',
    consolation: '/badges/small_consolazione.png',
}

/** Il badge di rango più alto fra una lista di badge (uno per gioco). */
export function pickBestBadge(badges) {
    if (!badges?.length) return null
    return badges.slice().sort(
        (a, b) => BADGE_TIER_RANK.indexOf(a.tier) - BADGE_TIER_RANK.indexOf(b.tier)
    )[0]
}

// Stessa soglia di PARTICIPATION_NUDGE_THRESHOLD/streak lato backend (vedi
// app/services/tornei/tournaments.py) — sotto questo numero di tornei
// consecutivi giocati l'indicatore "Costanza" non si mostra.
export const STREAK_BADGE_THRESHOLD = 3

/**
 * Indicatori aggiuntivi indipendenti dal tier — "premiano la via di mezzo"
 * (chi non vince ma partecipa con costanza, chi sta migliorando, chi ha
 * vinto la Consolazione) senza introdurre una classifica parallela. Non
 * sostituiscono il badge di tier, si affiancano come annotazioni secondarie
 * (vedi PlayerBadge.jsx: stile volutamente più leggero/compatto del badge
 * di tier — nome breve nel pill, dettaglio completo solo nel tooltip —
 * altrimenti visivamente competono con i badge "veri", basati sui risultati).
 */
export const EXTRA_BADGES = {
    streak: {
        Icon: Repeat,
        label: 'Costanza',
        tooltip: (n) => `Costanza · ${n} tornei di fila`,
        className: 'border-emerald-300 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-400',
    },
    improving: {
        Icon: TrendingUp,
        label: 'In crescita',
        tooltip: () => 'In crescita',
        className: 'border-circuit-blue/50 text-blue-700 dark:border-circuit-blue/40 dark:text-blue-400',
    },
    consolation: {
        Icon: Medal,
        label: 'Consolazione',
        tooltip: (n) => (n > 1 ? `Vinta la Consolazione · ${n}×` : 'Vinta la Consolazione'),
        className: 'border-violet-300 text-violet-700 dark:border-violet-500/40 dark:text-violet-400',
    },
}
