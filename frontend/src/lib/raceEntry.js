/**
 * Helper condivisi per i form di inserimento gara/risultato.
 *
 * Erano duplicati identici in GroupRaceForm.jsx (gironi) e ResultEntryForm.jsx
 * (classic) — un commento in GroupRaceForm lo dichiarava esplicitamente.
 */

/**
 * Personaggio da preselezionare per un pilota: quello usato nella sua gara più
 * recente di QUESTO torneo. Dalla seconda gara in poi è quasi sempre quello
 * giusto (i piloti cambiano personaggio di rado), così il picker si tocca solo
 * quando serve davvero.
 *
 * @param {object}  args
 * @param {number|string} args.playerId
 * @param {Array}   args.results          tutti i risultati (AppDataContext)
 * @param {Array}   args.races            gare del torneo corrente
 * @param {number?} args.beforeRaceOrder  se valorizzato, considera solo le gare
 *                                        PRECEDENTI a questo race_order (serve a
 *                                        ResultEntryForm, che compila una gara
 *                                        specifica e non l'ultima in assoluto)
 * @returns {number|null} character_id, o null se il pilota non ha precedenti
 */
export const getPlayerPreviousCharacterId = ({ playerId, results = [], races = [], beforeRaceOrder = null }) => {
    if (!playerId) return null

    const raceByIdOrder = new Map(races.map((race) => [race.id, race.race_order ?? 0]))

    const previous = results
        .filter((r) => r.player_id === Number(playerId))
        .filter((r) => raceByIdOrder.has(r.race_id))
        .filter((r) => beforeRaceOrder == null || raceByIdOrder.get(r.race_id) < beforeRaceOrder)
        .sort((a, b) => raceByIdOrder.get(b.race_id) - raceByIdOrder.get(a.race_id))[0]

    return previous?.character_id ?? null
}

/**
 * favorite_character_id è un unico campo per giocatore (Player), non uno per
 * gioco: se il personaggio preferito appartiene a un gioco diverso da quello
 * del torneo corrente, non compare nella lista `characters` di quel gioco.
 * Usarlo comunque come fallback lascia il picker vuoto in apparenza (l'id
 * salvato non ha un'opzione corrispondente da mostrare) o, peggio, rischia di
 * inviare al backend un character_id non valido per questo gioco. Va quindi
 * sempre validato contro la lista dei personaggi del gioco in corso prima di
 * usarlo come default.
 *
 * @param {object?} player      giocatore con eventuale .favorite_character_id
 * @param {Array}   characters  personaggi del GIOCO CORRENTE (non tutti i giochi)
 * @returns {number|null} favorite_character_id se valido per questo gioco, altrimenti null
 */
export const resolveFavoriteCharacterId = (player, characters = []) => {
    const favoriteId = player?.favorite_character_id
    if (favoriteId == null) return null
    return characters.some((c) => String(c.id) === String(favoriteId)) ? favoriteId : null
}

/**
 * Suggerisce un circuito "casuale" ma STABILE tra un elemento di una lista,
 * derivato da una stringa seed invece che da Math.random(). Usato per
 * pre-selezionare un circuito nei tornei/giochi dove la pista è a sorteggio
 * (gironi, classifica unica su Mario Kart 8 Deluxe): con Math.random() il
 * suggerimento cambiava a ogni nuovo montaggio del form (es. cambio tab e
 * ritorno, prima che la gara sia stata salvata davvero) — confuso e
 * imprevedibile. Con lo stesso seed (es. torneo+fase+girone+numero gara
 * successiva) il suggerimento resta identico finché il contesto non cambia
 * per davvero (la gara viene creata, o la pista non è più disponibile).
 * Resta comunque solo un SUGGERIMENTO: l'admin può sempre scegliere un
 * circuito diverso dal menu manuale.
 *
 * @param {Array}  list  elementi tra cui scegliere (non vuota)
 * @param {string} seed  stringa stabile che identifica il contesto
 * @returns {*} un elemento di `list`, sempre lo stesso per lo stesso seed+list
 */
export const pickDeterministic = (list, seed) => {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }
    return list[hash % list.length]
}

const CIRCUIT_CHOICE_PREFIX = 'kart_circuit_choice:'

/**
 * La scelta MANUALE dell'admin (dal menu del CircuitPicker) va persistita
 * oltre pickDeterministic: quest'ultimo dà solo il SUGGERIMENTO iniziale, ma
 * lo stato del form (circuitId) vive in useState e sparisce comunque a ogni
 * remount (es. cambio tab e ritorno) prima del salvataggio — senza questa
 * persistenza, al rientro l'effetto di auto-suggerimento ripartiva da zero e
 * sovrascriveva silenziosamente la scelta manuale con quella suggerita.
 * sessionStorage (non localStorage): la bozza deve sopravvivere alla
 * navigazione ma non ha senso che resti per sempre dopo il salvataggio o la
 * chiusura del browser.
 *
 * @param {string} key stesso seed usato per pickDeterministic in questo contesto
 * @returns {string|null} id circuito salvato, o null se assente/non disponibile
 */
export const getStoredCircuitChoice = (key) => {
    try {
        return sessionStorage.getItem(CIRCUIT_CHOICE_PREFIX + key)
    } catch {
        return null
    }
}

/**
 * @param {string} key stesso seed usato per pickDeterministic in questo contesto
 * @param {string|number|null} circuitId id da salvare, o null/'' per rimuovere la voce
 */
export const setStoredCircuitChoice = (key, circuitId) => {
    try {
        if (circuitId) sessionStorage.setItem(CIRCUIT_CHOICE_PREFIX + key, String(circuitId))
        else sessionStorage.removeItem(CIRCUIT_CHOICE_PREFIX + key)
    } catch {
        // sessionStorage non disponibile (es. modalità privata): il
        // suggerimento deterministico resta comunque un fallback valido
    }
}
