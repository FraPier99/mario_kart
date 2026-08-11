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
