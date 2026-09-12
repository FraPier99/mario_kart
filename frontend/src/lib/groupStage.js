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

/** True per le batterie della Finalina ("bottom_B1","bottom_B2",…), quando supera i 4 giocatori. */
export function isConsolationHeatKey(key) {
    return typeof key === 'string' && /^bottom_B\d+$/.test(key)
}

export function isFinalsGroup(key) {
    return key === 'top' || key === 'bottom' || isConsolationHeatKey(key)
}

// Baseline informative di gare per fase — non un tetto: un girone può
// disputare più (o meno) gare del target senza che nulla si blocchi, stesso
// principio già usato da Tournament.n_races nei tornei classic. L'admin può
// sovrascriverle per torneo da "Configurazione fasi" (format_data.n_races_*);
// questi valori sono solo il fallback quando non l'ha fatto.
const DEFAULT_TARGET_RACES = { group: 8, semifinal: 10, finals: 12 }

// Stessa palette di GroupPlancia.jsx (COLOR_CLASSES), qui ridotta al solo
// badge — condivisa da RaceList.jsx e TournamentStats.jsx per coerenza
// visiva col colore di ogni girone/fase.
export const GROUP_BADGE_CLASSES = {
    blue:    'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
    violet:  'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    rose:    'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
    cyan:    'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30',
    fuchsia: 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-500/30',
    lime:    'bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-500/30',
    orange:  'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
    amber:   'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    slate:   'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
}

/** Numero di gare "baseline" per il girone/batteria/fase di `groupKey`, o
 * `null` per chiavi senza un target sensato (es. spareggi a gara secca). */
export function targetRacesForGroup(groupKey, formatData) {
    if (isPodiumDuelKey(groupKey) || (typeof groupKey === 'string' && groupKey.startsWith('finals_duello_'))) {
        return null
    }
    if (isFinalsGroup(groupKey)) return formatData?.n_races_final ?? DEFAULT_TARGET_RACES.finals
    if (isSemifinalKey(groupKey)) return formatData?.n_races_semifinals ?? DEFAULT_TARGET_RACES.semifinal
    return formatData?.n_races_group_stage ?? DEFAULT_TARGET_RACES.group
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
    if (key === 'finals_duello_ultimo_posto') return 'Spareggio ultimo posto Finale'
    const rangeMatch = typeof key === 'string' && key.match(PODIUM_DUEL_RANGE_RE)
    if (rangeMatch) return `Spareggio ${rangeMatch[2]}°/${rangeMatch[3]}° posto`
    if (isSemifinalKey(key)) return `Semifinale ${key.slice(1)}`
    if (isConsolationHeatKey(key)) return `Consolazione ${key.slice('bottom_'.length)}`
    return `Girone ${key}`
}

export function groupColor(key) {
    if (key === 'top') return 'amber'
    if (key === 'bottom') return 'slate'
    if (key === 'duello_podio_1_2' || key === 'finals_duello_podio_1_2') return 'amber'
    if (key === 'duello_podio_3_4' || key === 'finals_duello_podio_3_4') return 'rose'
    if (key === 'finals_duello_ultimo_posto') return 'rose'
    if (isPodiumDuelKey(key)) return 'rose'
    if (isSemifinalKey(key)) {
        const idx = (Number(key.slice(1)) || 1) - 1
        return SEMI_PALETTE[idx % SEMI_PALETTE.length]
    }
    if (isConsolationHeatKey(key)) {
        const idx = (Number(key.slice('bottom_B'.length)) || 1) - 1
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
 * Chiavi delle batterie della Finalina ("B1","B2",…), ordinate, dal
 * format_data — presenti solo quando la Consolazione supera i 4 giocatori
 * (vincolo schermo) e viene quindi divisa in più batterie, stesso schema
 * delle batterie di semifinale. Vuoto se la Finalina entra in un'unica gara
 * (group_name "bottom" semplice, caso più comune).
 */
export function consolationHeatKeysFromFormatData(formatData) {
    const heats = formatData?.finals?.bottom_heats ?? {}
    return Object.keys(heats).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
}

/**
 * Trova fase e girone in cui si trova attualmente un giocatore, partendo
 * dalla fase più avanzata (finali → semifinali → gironi). Ritorna
 * `{ phase, groupName }` oppure `null` se il giocatore non è ancora
 * assegnato a nessun girone.
 */
/**
 * Chiave di scope usata in format_data.pass_enabled per attivare/
 * disattivare l'inclusione dei circuiti a pass/DLC — un torneo classic ha
 * un unico scope fisso "classic"; un torneo a gironi ha uno scope
 * indipendente per ogni girone/batteria/fase (stesso vocabolario
 * phase/groupName già usato in tutto questo file).
 */
export function passScopeKey(phase, groupName) {
    if (phase === 'group') return `group:${groupName}`
    if (phase === 'semifinal') return `semifinal:${groupName}`
    if (phase === 'finals') return `finals:${groupName}`
    return 'classic'
}

/** True (default, se lo scope non è mai stato impostato) se i circuiti a
 * pass/DLC sono inclusi per quello scope. */
export function isPassEnabledForScope(formatData, scopeKey) {
    return formatData?.pass_enabled?.[scopeKey] ?? true
}

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
