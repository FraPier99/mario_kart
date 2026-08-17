import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, charactersApi, circuitsApi, gamesApi, playersApi, pointAdjustmentsApi, racesApi, resultsApi, tournamentsApi } from '@/services/apiClient'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/apiClient'

const AppDataContext = createContext(null)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Un errore "di rete" (nessuna risposta HTTP, richiesta abortita) è spesso
// transitorio — es. Railway che deve "risvegliare" il backend dopo un
// periodo di inattività — non un errore applicativo reale (4xx/5xx), quindi
// vale la pena ritentare automaticamente prima di mostrare il banner
// d'errore all'utente.
const isNetworkError = (error) => !error?.response

// Tentativi con backoff crescente: il primo retry copre il caso più comune
// (cold start Railway, che di solito richiede solo qualche secondo).
const RETRY_DELAYS_MS = [1000, 2500]

const fetchAllTournamentData = () => Promise.all([
    playersApi.list(),
    charactersApi.list(),
    gamesApi.list(),
    tournamentsApi.list(),
    racesApi.list(),
    resultsApi.list(),
    circuitsApi.list(),
    pointAdjustmentsApi.list(),
])

const fetchAllWithRetry = async () => {
    for (const delay of RETRY_DELAYS_MS) {
        try {
            return await fetchAllTournamentData()
        } catch (error) {
            if (!isNetworkError(error)) throw error
            await sleep(delay)
        }
    }
    return fetchAllTournamentData()
}

const toTimestamp = (value) => {
    if (!value) return 0

    const parsedDate = new Date(value)
    return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime()
}

const sortTournamentByDate = (left, right) => {
    return toTimestamp(right.date) - toTimestamp(left.date) || right.id - left.id
}

const sortRaceByOrder = (left, right) => {
    return (left.race_order ?? 0) - (right.race_order ?? 0) || left.id - right.id
}

const sortResultByPosition = (left, right) => {
    return (left.position ?? 0) - (right.position ?? 0) || left.id - right.id
}

// Classifica equa tra formati (classic vs gironi) e dimensioni gara diverse:
// 1) vittorie torneo (i trofei reali restano il segnale primario)
// 2) Indice di posizione = media dei piazzamenti normalizzati (1°=100%, ultimo=0%):
//    non penalizza chi gioca meno gare e non gonfia le vittorie dei gironi paralleli.
// 3) podi, 4) gare giocate, 5) nickname.
const sortLeaderboard = (left, right) => {
    return (
        right.tournamentWins - left.tournamentWins ||
        (right.placementIndex ?? 0) - (left.placementIndex ?? 0) ||
        (right.podiumRate ?? 0) - (left.podiumRate ?? 0) ||
        (right.racesPlayed ?? 0) - (left.racesPlayed ?? 0) ||
        left.nickname.localeCompare(right.nickname)
    )
}

const buildPlayerStats = (players, tournaments, results, races = []) => {
    const raceToTournament = new Map()
    const duelloRaceIds = new Set()
    races.forEach((race) => {
        raceToTournament.set(race.id, race.tournament_id)
        if (race.is_duello) duelloRaceIds.add(race.id)
    })

    const statsByPlayerId = new Map()

    players.forEach((player) => {
        statsByPlayerId.set(player.id, {
            playerId: player.id,
            nickname: player.nickname,
            first_name: player.first_name,
            last_name: player.last_name,
            tournamentWins: 0,
            raceWins: 0,
            podiums: 0,
            points: 0,
            racesPlayed: 0,
            tournamentsPlayed: 0,
            avgEfficiency: 0,
            placementIndex: 0,
            podiumRate: 0,
            winRate: 0,
        })
    })

    const playerTournamentsMap = new Map()
    players.forEach((p) => playerTournamentsMap.set(p.id, new Set()))

    const tournamentPlayerPoints = new Map()

    // Numero di piloti per gara (dimensione del "campo"), per normalizzare i piazzamenti
    const raceFieldSize = new Map()
    results.forEach((r) => raceFieldSize.set(r.race_id, (raceFieldSize.get(r.race_id) ?? 0) + 1))
    // Somma/conteggio dei piazzamenti normalizzati per giocatore
    const placementAgg = new Map()

    results.forEach((result) => {
        // Le gare di spareggio/duello decidono solo l'ordine in classifica:
        // non devono contribuire a punti/vittorie/podi/placement index, stessa
        // regola già applicata in buildTournamentDetails per le stesse statistiche
        // viste a livello di singolo torneo.
        if (duelloRaceIds.has(result.race_id)) {
            return
        }

        const currentStats = statsByPlayerId.get(result.player_id)

        if (!currentStats) {
            return
        }

        currentStats.points += result.points ?? 0
        currentStats.racesPlayed += 1

        if ((result.position ?? 0) === 1) {
            currentStats.raceWins += 1
        }

        if ((result.position ?? 0) <= 3) {
            currentStats.podiums += 1
        }

        // Piazzamento normalizzato: 1° → 1.0, ultimo → 0.0, in proporzione al campo.
        const fieldSize = raceFieldSize.get(result.race_id) ?? 1
        const pos = result.position ?? 0
        if (pos > 0) {
            const pct = fieldSize > 1
                ? Math.min(1, Math.max(0, (fieldSize - pos) / (fieldSize - 1)))
                : 1
            const agg = placementAgg.get(result.player_id) ?? { sum: 0, count: 0 }
            agg.sum += pct
            agg.count += 1
            placementAgg.set(result.player_id, agg)
        }

        const tId = raceToTournament.get(result.race_id)
        if (tId) {
            playerTournamentsMap.get(result.player_id)?.add(tId)

            if (!tournamentPlayerPoints.has(tId)) {
                tournamentPlayerPoints.set(tId, new Map())
            }
            const tMap = tournamentPlayerPoints.get(tId)
            tMap.set(result.player_id, (tMap.get(result.player_id) ?? 0) + (result.points ?? 0))
        }
    })

    tournaments.forEach((tournament) => {
        if (!tournament.winner_id) {
            return
        }

        const currentStats = statsByPlayerId.get(tournament.winner_id)

        if (currentStats) {
            currentStats.tournamentWins += 1
        }
    })

    const playerEfficiencies = new Map()

    for (const [, playerPointsMap] of tournamentPlayerPoints) {
        let winnerPoints = 0
        for (const points of playerPointsMap.values()) {
            if (points > winnerPoints) winnerPoints = points
        }

        if (winnerPoints <= 0) continue

        for (const [playerId, points] of playerPointsMap) {
            const eff = (points / winnerPoints) * 100
            const arr = playerEfficiencies.get(playerId) ?? []
            arr.push(eff)
            playerEfficiencies.set(playerId, arr)
        }
    }

    for (const [playerId, tournamentSet] of playerTournamentsMap) {
        const stats = statsByPlayerId.get(playerId)
        if (!stats) continue

        const tPlayed = tournamentSet.size
        const totalRaces = stats.racesPlayed
        stats.tournamentsPlayed = tPlayed

        const effArr = playerEfficiencies.get(playerId) ?? []
        stats.avgEfficiency = effArr.length > 0
            ? Number((effArr.reduce((a, b) => a + b, 0) / effArr.length).toFixed(1))
            : 0

        stats.podiumRate = totalRaces > 0 ? Number((stats.podiums / totalRaces * 100).toFixed(0)) : 0
        stats.winRate = totalRaces > 0 ? Number((stats.raceWins / totalRaces * 100).toFixed(0)) : 0

        const agg = placementAgg.get(playerId)
        stats.placementIndex = agg && agg.count > 0
            ? Number((agg.sum / agg.count * 100).toFixed(1))
            : 0
    }

    return { statsByPlayerId }
}

const buildTournamentDetails = (tournaments, races, results, playersById, pointAdjustments = []) => {
    const racesByTournamentId = new Map()
    races.forEach((race) => {
        const list = racesByTournamentId.get(race.tournament_id)
        if (list) list.push(race)
        else racesByTournamentId.set(race.tournament_id, [race])
    })

    const adjustmentsByTournamentId = new Map()
    pointAdjustments.forEach((adjustment) => {
        const list = adjustmentsByTournamentId.get(adjustment.tournament_id)
        if (list) list.push(adjustment)
        else adjustmentsByTournamentId.set(adjustment.tournament_id, [adjustment])
    })

    const resultsByRaceId = new Map()
    results.forEach((result) => {
        const list = resultsByRaceId.get(result.race_id)
        if (list) list.push(result)
        else resultsByRaceId.set(result.race_id, [result])
    })

    return tournaments
        .slice()
        .sort(sortTournamentByDate)
        .map((tournament) => {
            const tournamentRaces = (racesByTournamentId.get(tournament.id) ?? [])
                .slice()
                .sort(sortRaceByOrder)

            const standingsByPlayerId = new Map()
            const lastCharacterByPlayerId = new Map()

            const detailedRaces = tournamentRaces.map((race) => {
                const raceResults = (resultsByRaceId.get(race.id) ?? [])
                    .slice()
                    .sort(sortResultByPosition)
                    .map((result) => ({
                        ...result,
                        player: playersById.get(result.player_id) ?? null,
                    }))

                // Le gare di spareggio (is_duello) decidono solo l'ordine in classifica:
                // non contribuiscono a punti/vittorie/podi/statistiche.
                if (!race.is_duello) {
                    const raceNPlayers = raceResults.length
                    raceResults.forEach((result) => {
                        const player = playersById.get(result.player_id)
                        const currentStanding = standingsByPlayerId.get(result.player_id) ?? {
                            playerId: result.player_id,
                            player: player ?? null,
                            nickname: player?.nickname ?? 'Sconosciuto',
                            img_url: player?.img_url ?? null,
                            favoriteCharacterId: player?.favorite_character_id ?? null,
                            points: 0,
                            raceWins: 0,
                            podiums: 0,
                            racesPlayed: 0,
                            placementPctSum: 0,
                            positionSum: 0,
                            usedCharacterIds: [],
                            lastCharacterId: null,
                        }

                        currentStanding.points += result.points ?? 0
                        currentStanding.racesPlayed += 1
                        currentStanding.positionSum += result.position ?? 0

                        const pos = result.position ?? 0
                        if (pos > 0 && raceNPlayers > 1) {
                            currentStanding.placementPctSum += (raceNPlayers - pos) / (raceNPlayers - 1)
                        } else if (pos > 0) {
                            currentStanding.placementPctSum += 1
                        }

                        if (pos === 1) {
                            currentStanding.raceWins += 1
                        }

                        if (pos >= 1 && pos <= 3) {
                            currentStanding.podiums += 1
                        }

                        if (result.character_id && !currentStanding.usedCharacterIds.includes(result.character_id)) {
                            currentStanding.usedCharacterIds.push(result.character_id)
                        }

                        standingsByPlayerId.set(result.player_id, currentStanding)
                        lastCharacterByPlayerId.set(result.player_id, result.character_id)
                    })
                }

                return {
                    ...race,
                    results: raceResults,
                    resultCount: raceResults.length,
                }
            })

            for (const [playerId, characterId] of lastCharacterByPlayerId) {
                const standing = standingsByPlayerId.get(playerId)
                if (standing) {
                    standing.lastCharacterId = characterId
                }
            }

            // Risultati spareggi (duello): chi vince più gare duello ottiene la
            // posizione di podio più alta a parità di punti nelle gare regolari.
            const duelWinsByPlayerId = new Map()
            detailedRaces.forEach((race) => {
                if (race.is_duello) {
                    (race.results ?? []).forEach((result) => {
                        if (result.position === 1) {
                            duelWinsByPlayerId.set(
                                result.player_id,
                                (duelWinsByPlayerId.get(result.player_id) ?? 0) + 1,
                            )
                        }
                    })
                }
            })

            // Rettifiche punti manuali del superadmin (vedi PointAdjustmentsPanel):
            // si sommano al totale già accumulato dalle gare, creando la riga
            // standing anche per un giocatore che ha solo una rettifica e
            // nessuna gara giocata in questo torneo (racesPlayed resta 0, già
            // gestito sotto da `rp = s.racesPlayed || 1`).
            const tournamentPointAdjustments = adjustmentsByTournamentId.get(tournament.id) ?? []
            tournamentPointAdjustments.forEach((adjustment) => {
                const player = playersById.get(adjustment.player_id)
                const currentStanding = standingsByPlayerId.get(adjustment.player_id) ?? {
                    playerId: adjustment.player_id,
                    player: player ?? null,
                    nickname: player?.nickname ?? 'Sconosciuto',
                    img_url: player?.img_url ?? null,
                    favoriteCharacterId: player?.favorite_character_id ?? null,
                    points: 0,
                    raceWins: 0,
                    podiums: 0,
                    racesPlayed: 0,
                    placementPctSum: 0,
                    positionSum: 0,
                    usedCharacterIds: [],
                    lastCharacterId: null,
                }
                currentStanding.points += adjustment.points ?? 0
                standingsByPlayerId.set(adjustment.player_id, currentStanding)
            })

        const standings = Array.from(standingsByPlayerId.values()).map((s) => {
            const rp = s.racesPlayed || 1
            const placementIndex = Number(((s.placementPctSum / rp) * 100).toFixed(1))
            const avgPosition = Number((s.positionSum / rp).toFixed(2))
            const winRate = Number(((s.raceWins / rp) * 100).toFixed(0))
            const podiumRate = Number(((s.podiums / rp) * 100).toFixed(0))
            const duelWins = duelWinsByPlayerId.get(s.playerId) ?? 0
            return { ...s, placementIndex, avgPosition, winRate, podiumRate, duelWins }
        }).sort((left, right) => {
            return (
                (right.points ?? 0) - (left.points ?? 0) ||
                (right.raceWins ?? 0) - (left.raceWins ?? 0) ||
                (right.podiums ?? 0) - (left.podiums ?? 0) ||
                (right.duelWins ?? 0) - (left.duelWins ?? 0) ||
                (right.winRate ?? 0) - (left.winRate ?? 0) ||
                (right.podiumRate ?? 0) - (left.podiumRate ?? 0) ||
                (left.avgPosition ?? 99) - (right.avgPosition ?? 99) ||
                left.nickname.localeCompare(right.nickname)
            )
        })

            return {
                ...tournament,
                status: tournament.winner_id ? 'concluso' : (tournament.status ?? 'in_corso'),
                winner: playersById.get(tournament.winner_id) ?? null,
                races: detailedRaces,
                standings,
                raceCount: detailedRaces.length,
                pointAdjustments: tournamentPointAdjustments,
            }
        })
}

export function AppDataProvider({ children }) {
    const [players, setPlayers] = useState([])
    const [characters, setCharacters] = useState([])
    const [games, setGames] = useState([])
    const [tournaments, setTournaments] = useState([])
    const [races, setRaces] = useState([])
    const [results, setResults] = useState([])
    const [circuits, setCircuits] = useState([])
    const [pointAdjustments, setPointAdjustments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [errorMessage, setErrorMessage] = useState('')
    const [communityUsers, setCommunityUsers] = useState([])

    // Caricata una sola volta per l'intera sessione (AppDataProvider è
    // montato una volta sola alla radice dell'app) — sostituisce i fetch
    // indipendenti che ogni pagina faceva prima tramite useCommunityUserNav,
    // che diventavano N richieste duplicate con N componenti che linkano al
    // profilo di un giocatore nella stessa pagina. Fetch separata dal
    // Promise.all critico di refresh(): questo endpoint richiede solo
    // autenticazione (non un ruolo specifico), ma un suo fallimento non deve
    // far fallire il caricamento dei dati principali (stesso motivo del
    // .catch silenzioso che aveva l'hook originale).
    useEffect(() => {
        authApi.listCommunityUsers()
            .then((res) => setCommunityUsers(res.data ?? []))
            .catch(() => {})
    }, [])

    const refresh = useCallback(async () => {
        setLoading(true)
        setError(null)
        setErrorMessage('')

        try {
            const [playersResponse, charactersResponse, gamesResponse, tournamentsResponse, racesResponse, resultsResponse, circuitsResponse, pointAdjustmentsResponse] = await fetchAllWithRetry()

            setPlayers(playersResponse.data ?? [])
            setCharacters(charactersResponse.data ?? [])
            setGames(gamesResponse.data ?? [])
            setTournaments(tournamentsResponse.data ?? [])
            setRaces(racesResponse.data ?? [])
            setResults(resultsResponse.data ?? [])
            setCircuits(circuitsResponse.data ?? [])
            setPointAdjustments(pointAdjustmentsResponse.data ?? [])
        }
        catch (requestError) {
            const message = getApiErrorMessage(requestError, 'Impossibile caricare i dati del backend')

            console.error('[AppDataContext] Failed to load dashboard data', requestError)
            toast.error('Caricamento dati fallito', {
                description: message,
            })

            setError(requestError)
            setErrorMessage(message)
        }
        finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refresh()
    }, [refresh])

    // Applica localmente i campi già noti di un torneo (es. la risposta di
    // una mutazione mirata come PUT/POST su un singolo torneo) senza
    // aspettare un nuovo giro di refresh(): GET /tournaments ha una cache
    // HTTP breve (10s, vedi commento sul controller) pensata per il polling
    // periodico, che altrimenti farebbe sembrare "non salvata" una modifica
    // appena fatta finché la cache non scade.
    const patchTournament = useCallback((tournamentId, patch) => {
        setTournaments((prev) => prev.map((t) => (t.id === tournamentId ? { ...t, ...patch } : t)))
    }, [])

    // Stesso principio di patchTournament, per le modifiche inline di
    // circuiti/personaggi nel pannello admin: senza questo, ogni salvataggio
    // richiamava l'intero refresh() (rifetch di giocatori, tornei, gare,
    // risultati, ecc. — tutto il dataset), causando un ricaricamento
    // percepibile dell'intera pagina per una modifica di una singola riga.
    const patchCircuit = useCallback((circuitId, patch) => {
        setCircuits((prev) => prev.map((c) => (c.id === circuitId ? { ...c, ...patch } : c)))
    }, [])

    const patchCharacter = useCallback((characterId, patch) => {
        setCharacters((prev) => prev.map((c) => (c.id === characterId ? { ...c, ...patch } : c)))
    }, [])

    // Stesso principio delle patch sopra, per l'aggiunta di un nuovo
    // circuito/personaggio dal pannello admin: appende localmente invece
    // di rifare l'intero refresh().
    const addCircuit = useCallback((circuit) => {
        setCircuits((prev) => [...prev, circuit])
    }, [])

    // Stesso principio di patchCircuit/addCircuit, per l'eliminazione di un
    // circuito dal pannello admin: rimuove localmente invece di rifare
    // l'intero refresh().
    const removeCircuit = useCallback((circuitId) => {
        setCircuits((prev) => prev.filter((c) => c.id !== circuitId))
    }, [])

    const addCharacter = useCallback((character) => {
        setCharacters((prev) => [...prev, character])
    }, [])

    const playersById = useMemo(() => {
        return new Map(players.map((player) => [player.id, player]))
    }, [players])

    const charactersById = useMemo(() => {
        return new Map(characters.map((character) => [character.id, character]))
    }, [characters])

    const gamesById = useMemo(() => {
        return new Map(games.map((game) => [game.id, game]))
    }, [games])
     

    
    const circuitsById = useMemo(() => {
        return new Map(circuits.map((circuit) => [circuit.id, circuit]))
    }, [circuits])
     
    
    const circuitsByGameId = useMemo(() => {
        return circuits.reduce((groups, circuit) => {
            const currentCircuits = groups.get(circuit.game_id) ?? []
            currentCircuits.push(circuit)
            groups.set(circuit.game_id, currentCircuits)
            return groups
        }, new Map())
    }, [circuits])

    const charactersByGameId = useMemo(() => {
        return characters.reduce((groups, character) => {
            const current = groups.get(character.game_id) ?? []
            current.push(character)
            groups.set(character.game_id, current)
            return groups
        }, new Map())
    }, [characters])

    const tournamentsById = useMemo(() => {
        return new Map(tournaments.map((tournament) => [tournament.id, tournament]))
    }, [tournaments])

    // Numero "torneo #N" mostrato agli utenti: l'id del DB ha dei buchi (es.
    // 2, 16, 127 dopo che dei tornei intermedi sono stati eliminati) e non è
    // un buon numero progressivo da mostrare. Qui si deriva un numero
    // sequenziale 1,2,3... in base all'ordine di creazione (id crescente,
    // dato che è auto-increment) — solo per la UI, le chiamate API
    // continuano a usare l'id reale.
    const tournamentDisplayNumberById = useMemo(() => {
        const map = new Map()
        ;[...tournaments].sort((a, b) => a.id - b.id).forEach((t, i) => map.set(t.id, i + 1))
        return map
    }, [tournaments])
    const getTournamentDisplayNumber = useCallback(
        (tournamentId) => tournamentDisplayNumberById.get(Number(tournamentId)) ?? tournamentId,
        [tournamentDisplayNumberById]
    )

    const racesById = useMemo(() => {
        return new Map(races.map((race) => [race.id, race]))
    }, [races])

    const raceToTournamentId = useMemo(() => {
        const m = new Map()
        races.forEach((race) => m.set(race.id, race.tournament_id))
        return m
    }, [races])

    const detailedTournaments = useMemo(() => {
        return buildTournamentDetails(tournaments, races, results, playersById, pointAdjustments)
    }, [tournaments, races, results, playersById, pointAdjustments])

    // I tornei amichevoli non contano per nessuna statistica/classifica
    // aggregata (niente in palio) — esclusi qui prima di calcolare le stats
    // per giocatore, così "non fanno punti statistici" vale ovunque questo
    // aggregato viene consumato (leaderboard, profilo, ecc.), senza dover
    // toccare detailedTournaments (che invece serve intatto per far
    // funzionare la pagina di dettaglio del singolo torneo amichevole).
    const statsTournaments = useMemo(() => tournaments.filter((t) => !t.is_friendly), [tournaments])
    const statsRaces = useMemo(() => {
        const statsTournamentIds = new Set(statsTournaments.map((t) => t.id))
        return races.filter((r) => statsTournamentIds.has(r.tournament_id))
    }, [races, statsTournaments])
    const statsResults = useMemo(() => {
        const statsRaceIds = new Set(statsRaces.map((r) => r.id))
        return results.filter((r) => statsRaceIds.has(r.race_id))
    }, [results, statsRaces])

    const { statsByPlayerId } = useMemo(() => {
        return buildPlayerStats(players, statsTournaments, statsResults, statsRaces)
    }, [players, statsTournaments, statsResults, statsRaces])

    const latestTournament = detailedTournaments.find((t) => !t.is_friendly) ?? null
    const lastWinner = latestTournament?.winner ?? null
    const lastWinnerStats = lastWinner ? statsByPlayerId.get(lastWinner.id) ?? null : null

    const leaderboardRows = useMemo(() => {
        return players
            .map((player) => {
                const playerStats = statsByPlayerId.get(player.id) ?? {
                    playerId: player.id,
                    nickname: player.nickname,
                    first_name: player.first_name,
                    last_name: player.last_name,
                    img_url: player.img_url,
                    favorite_character_id: player.favorite_character_id,
                    tournamentWins: 0,
                    raceWins: 0,
                    podiums: 0,
                    points: 0,
                    racesPlayed: 0,
                    tournamentsPlayed: 0,
                    avgEfficiency: 0,
                    placementIndex: 0,
                    podiumRate: 0,
                    winRate: 0,
                }

                return {
                    ...playerStats,
                    nickname: player.nickname,
                    first_name: player.first_name,
                    last_name: player.last_name,
                    img_url: player.img_url,
                    favorite_character_id: player.favorite_character_id,
                }
            })
            .sort(sortLeaderboard)
    }, [players, statsByPlayerId])

    const homeMetrics = useMemo(() => {
        return {
            activePlayers: players.length,
            completedRaces: races.length,
            trophiesWon: statsTournaments.filter((tournament) => Boolean(tournament.winner_id)).length,
        }
    }, [players, races, statsTournaments])

    const getTournamentById = (tournamentId) => {
        return detailedTournaments.find((tournament) => tournament.id === Number(tournamentId)) ?? null
    }

    const getLeaderboardByGame = useCallback((gameId) => {
        const filteredTourns = statsTournaments.filter((t) => t.game_id === Number(gameId))
        const filteredRaces = races.filter((r) => filteredTourns.some((t) => t.id === r.tournament_id))
        const filteredRaceIds = new Set(filteredRaces.map((r) => r.id))
        const filteredResults = results.filter((r) => filteredRaceIds.has(r.race_id))
        const { statsByPlayerId: filteredStats } = buildPlayerStats(players, filteredTourns, filteredResults, filteredRaces)

        return players
            .map((player) => {
                const ps = filteredStats.get(player.id) ?? {
                    playerId: player.id, nickname: player.nickname,
                    first_name: player.first_name, last_name: player.last_name,
                    img_url: player.img_url, favorite_character_id: player.favorite_character_id,
                    tournamentWins: 0, raceWins: 0, podiums: 0, points: 0, racesPlayed: 0,
                    tournamentsPlayed: 0, avgEfficiency: 0, placementIndex: 0, podiumRate: 0, winRate: 0,
                }
                return { ...ps, nickname: player.nickname, first_name: player.first_name, last_name: player.last_name, img_url: player.img_url, favorite_character_id: player.favorite_character_id }
            })
            .sort(sortLeaderboard)
    }, [players, statsTournaments, races, results])

    const getTournamentsByGame = useCallback((gameId) => {
        return detailedTournaments.filter((t) => t.game_id === Number(gameId))
    }, [detailedTournaments])

    const getHomeMetricsByGame = useCallback((gameId) => {
        const filteredTourns = tournaments.filter((t) => t.game_id === Number(gameId))
        const filteredRaces = races.filter((r) => filteredTourns.some((t) => t.id === r.tournament_id))
        return {
            activePlayers: new Set(filteredTourns.flatMap((t) => t.participant_ids ?? [])).size || players.length,
            completedRaces: filteredRaces.length,
            trophiesWon: filteredTourns.filter((t) => !t.is_friendly && Boolean(t.winner_id)).length,
        }
    }, [players, tournaments, races])

    const value = {
        players,
        characters,
        games,
        tournaments,
        races,
        results,
        circuits,
        communityUsers,
        playersById,
        charactersById,
        gamesById,
        circuitsById,
        circuitsByGameId,
        charactersByGameId,
        tournamentsById,
        tournamentDisplayNumberById,
        getTournamentDisplayNumber,
        racesById,
        raceToTournamentId,
        detailedTournaments,
        leaderboardRows,
        statsByPlayerId,
        latestTournament,
        lastWinner,
        lastWinnerStats,
        homeMetrics,
        loading,
        error,
        errorMessage,
        refresh,
        patchTournament,
        patchCircuit,
        patchCharacter,
        addCircuit,
        removeCircuit,
        addCharacter,
        getTournamentById,
        getLeaderboardByGame,
        getTournamentsByGame,
        getHomeMetricsByGame,
    }

    return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export const useAppData = () => {
    const context = useContext(AppDataContext)

    if (!context) {
        throw new Error('useAppData must be used inside AppDataProvider')
    }

    return context
}
