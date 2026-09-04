// Sfondo "foto circuito" per le card che altrimenti sono piatte — riusa le
// immagini circuito già caricate via CDN (circuit.image_url, vedi
// AppDataContext), zero chiamate di rete aggiuntive. La scelta è casuale ma
// stabile per la durata della sessione del browser: sessionStorage (non
// localStorage) così a un nuovo avvio del browser la scelta si rigenera
// invece di restare fissa per sempre.
const STORAGE_PREFIX = 'circuitBg:'

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

const readCachedId = (key) => {
    try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
        return raw ? Number(raw) : null
    } catch {
        return null
    }
}

const writeCachedId = (key, id) => {
    try { sessionStorage.setItem(STORAGE_PREFIX + key, String(id)) } catch { /* storage non disponibile: si ripesca ad ogni render */ }
}

/**
 * Sceglie un circuito per lo sfondo di una card e lo mantiene stabile per
 * tutta la sessione del browser (stessa `key` → stesso circuito finché non
 * si chiude il browser, invece di cambiare ad ogni refresh).
 *
 * - Se `candidateIds` è dato (es. i circuiti effettivamente giocati in un
 *   torneo), la scelta ricade solo su quelli.
 * - Altrimenti pesca da tutti i circuiti disponibili (`allCircuits`).
 */
export function pickSessionCircuit(key, allCircuits, candidateIds = null) {
    const pool = candidateIds?.length
        ? allCircuits.filter((c) => candidateIds.includes(c.id))
        : allCircuits
    if (!pool?.length) return null

    const cachedId = readCachedId(key)
    const cached = cachedId ? pool.find((c) => c.id === cachedId) : null
    if (cached) return cached

    const picked = pickRandom(pool)
    writeCachedId(key, picked.id)
    return picked
}
