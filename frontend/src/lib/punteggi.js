/**
 * Tabella punti per gara — specchio di app/data/punteggi.py (_compute_punteggi).
 *
 * I punti reali sono SEMPRE calcolati dal backend: create_result usa
 * PUNTEGGI_CONFIG[tournament.n_players][position - 1] e lo schema CreateResult
 * non espone nemmeno un campo `points`. Quanto c'è qui serve solo a mostrare
 * un'anteprima lato UI (form di inserimento gara, stima distacchi schedina) —
 * se le due formule divergono è questa a essere sbagliata, non il backend.
 */

const PUNTEGGI_STATIC = {
    4: [5, 3, 2, 1],
    5: [6, 4, 3, 2, 1],
    6: [7, 5, 4, 3, 2, 1],
    7: [8, 6, 5, 4, 3, 2, 1],
    8: [9, 7, 6, 5, 4, 3, 2, 1],
}

/** Punti per posizione (indice 0 = 1° posto) con n partecipanti. */
export const computePunteggi = (n) => {
    if (PUNTEGGI_STATIC[n]) return PUNTEGGI_STATIC[n]
    if (n < 4) return Array.from({ length: n }, (_, i) => n + 1 - i)
    return [n + 1, ...Array.from({ length: n - 1 }, (_, i) => n - 1 - i)]
}

// Il backend costruisce PUNTEGGI_CONFIG solo per range(2, 13): fuori da questo
// intervallo l'anteprima non avrebbe un corrispettivo reale e va nascosta.
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12
export const hasPunteggi = (n) => Number.isInteger(n) && n >= MIN_PLAYERS && n <= MAX_PLAYERS

/**
 * Etichetta di posizione: medaglia per il podio, "N°" oltre. Sostituisce gli
 * array MEDAL a lunghezza fissa, che oltre il 4° posto davano undefined.
 */
export const medalFor = (index) => ['🥇', '🥈', '🥉'][index] ?? `${index + 1}°`
