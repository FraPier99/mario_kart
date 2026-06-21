/**
 * Helpers condivisi per i tornei a gironi N-flessibili (format_data.groups = {"1":[...], "2":[...], ...}).
 *
 * Le chiavi numeriche ("1","2","3"...) rappresentano i gironi di Fase 1,
 * "top"/"bottom" rappresentano rispettivamente Finale e Consolazione di Fase 2.
 */

const PALETTE = ['blue', 'violet', 'emerald', 'rose', 'cyan', 'fuchsia', 'lime', 'orange']
// Palette dedicata alle batterie di semifinale ("S1","S2",…)
const SEMI_PALETTE = ['cyan', 'fuchsia', 'lime', 'orange']

/** True per le batterie di semifinale ("S1","S2",…). */
export function isSemifinalKey(key) {
    return typeof key === 'string' && /^S\d+$/.test(key)
}

export function isFinalsGroup(key) {
    return key === 'top' || key === 'bottom'
}

// Spareggi a gara secca per posizioni più basse (es. "duello_podio_5_6"),
// generati dinamicamente da get_classic_podium_ties per qualunque blocco di
// posizioni in parità che non sia 1°/2° o 3°/4° posto.
const PODIUM_DUEL_RANGE_RE = /^(finals_)?duello_podio_(\d+)_(\d+)$/

/** True per le gare secche di spareggio podio (classic e Finale gironi), incluse quelle a posizioni più basse. */
export function isPodiumDuelKey(key) {
    return typeof key === 'string' && PODIUM_DUEL_RANGE_RE.test(key)
}

export function groupLabel(key) {
    if (key === 'top') return 'Finale'
    if (key === 'bottom') return 'Consolazione'
    if (key === 'duello_podio_1_2' || key === 'finals_duello_podio_1_2') return 'Spareggio 1°/2° posto'
    if (key === 'duello_podio_3_4' || key === 'finals_duello_podio_3_4') return 'Spareggio 3°/4° posto'
    const rangeMatch = typeof key === 'string' && key.match(PODIUM_DUEL_RANGE_RE)
    if (rangeMatch) return `Spareggio ${rangeMatch[2]}°/${rangeMatch[3]}° posto`
    if (isSemifinalKey(key)) return `Semifinale ${key.slice(1)}`
    return `Girone ${key}`
}

export function groupColor(key) {
    if (key === 'top') return 'amber'
    if (key === 'bottom') return 'slate'
    if (key === 'duello_podio_1_2' || key === 'finals_duello_podio_1_2') return 'amber'
    if (key === 'duello_podio_3_4' || key === 'finals_duello_podio_3_4') return 'rose'
    if (isPodiumDuelKey(key)) return 'rose'
    if (isSemifinalKey(key)) {
        const idx = (Number(key.slice(1)) || 1) - 1
        return SEMI_PALETTE[idx % SEMI_PALETTE.length]
    }
    const idx = (Number(key) || 1) - 1
    return PALETTE[idx % PALETTE.length]
}

/** Chiavi dei gironi di Fase 1, ordinate numericamente, dal format_data del torneo. */
export function groupKeysFromFormatData(formatData) {
    const groups = formatData?.groups ?? {}
    return Object.keys(groups).sort((a, b) => Number(a) - Number(b))
}

/** Chiavi delle batterie di semifinale ("S1","S2",…), ordinate, dal format_data. */
export function semifinalKeysFromFormatData(formatData) {
    const semis = formatData?.semifinals ?? {}
    return Object.keys(semis).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
}

/** True se il torneo richiede la fase di semifinale (qualificati > 4). */
export function tournamentNeedsSemifinal(formatData) {
    return Boolean(formatData?.needs_semifinal) || Object.keys(formatData?.semifinals ?? {}).length > 0
}

/**
 * Trova fase e girone in cui si trova attualmente un giocatore, partendo
 * dalla fase più avanzata (finali → semifinali → gironi). Ritorna
 * `{ phase, groupName }` oppure `null` se il giocatore non è ancora
 * assegnato a nessun girone.
 */
export function findPlayerGroup(formatData, playerId) {
    if (playerId == null) return null
    const fd = formatData ?? {}

    const finals = fd.finals ?? {}
    for (const key of ['top', 'bottom']) {
        if ((finals[key] ?? []).includes(playerId)) return { phase: 'finals', groupName: key }
    }

    const semis = fd.semifinals ?? {}
    for (const key of Object.keys(semis)) {
        if ((semis[key] ?? []).includes(playerId)) return { phase: 'semifinal', groupName: key }
    }

    const groups = fd.groups ?? {}
    for (const key of Object.keys(groups)) {
        if ((groups[key] ?? []).includes(playerId)) return { phase: 'group', groupName: key }
    }

    return null
}
