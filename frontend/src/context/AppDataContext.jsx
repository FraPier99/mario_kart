import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { charactersApi, circuitsApi, gamesApi, playersApi, racesApi, resultsApi, tournamentsApi } from '@/services/apiClient'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/apiClient'

const AppDataContext = createContext(null)

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

const buildTournamentDetails = (tournaments, races, results, playersById) => {
    return tournaments
        .slice()
        .sort(sortTournamentByDate)
        .map((tournament) => {
            const tournamentRaces = races
                .filter((race) => race.tournament_id === tournament.id)
                .sort(sortRaceByOrder)

            const standingsByPlayerId = new Map()
            const lastCharacterByPlayerId = new Map()

            const detailedRaces = tournamentRaces.map((race) => {
                const raceResults = results
                    .filter((result) => result.race_id === race.id)
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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [errorMessage, setErrorMessage] = useState('')

    const refresh = useCallback(async () => {
        setLoading(true)
        setError(null)
        setErrorMessage('')

        try {
            const [playersResponse, charactersResponse, gamesResponse, tournamentsResponse, racesResponse, resultsResponse, circuitsResponse] = await Promise.all([
                playersApi.list(),
                charactersApi.list(),
                gamesApi.list(),
                tournamentsApi.list(),
                racesApi.list(),
                resultsApi.list(),
                circuitsApi.list(),
            ])

            setPlayers(playersResponse.data ?? [])
            setCharacters(charactersResponse.data ?? [])
            setGames(gamesResponse.data ?? [])
            setTournaments(tournamentsResponse.data ?? [])
            setRaces(racesResponse.data ?? [])
            setResults(resultsResponse.data ?? [])
            setCircuits(circuitsResponse.data ?? [])
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
        return buildTournamentDetails(tournaments, races, results, playersById)
    }, [tournaments, races, results, playersById])

    const { statsByPlayerId } = useMemo(() => {
        return buildPlayerStats(players, tournaments, results, races)
    }, [players, tournaments, results, races])

    const latestTournament = detailedTournaments[0] ?? null
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
            trophiesWon: tournaments.filter((tournament) => Boolean(tournament.winner_id)).length,
        }
    }, [players, races, tournaments])

    const getTournamentById = (tournamentId) => {
        return detailedTournaments.find((tournament) => tournament.id === Number(tournamentId)) ?? null
    }

    const getLeaderboardByGame = useCallback((gameId) => {
        const filteredTourns = tournaments.filter((t) => t.game_id === Number(gameId))
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
    }, [players, tournaments, races, results])

    const getTournamentsByGame = useCallback((gameId) => {
        return detailedTournaments.filter((t) => t.game_id === Number(gameId))
    }, [detailedTournaments])

    const getHomeMetricsByGame = useCallback((gameId) => {
        const filteredTourns = tournaments.filter((t) => t.game_id === Number(gameId))
        const filteredRaces = races.filter((r) => filteredTourns.some((t) => t.id === r.tournament_id))
        return {
            activePlayers: new Set(filteredTourns.flatMap((t) => t.participant_ids ?? [])).size || players.length,
            completedRaces: filteredRaces.length,
            trophiesWon: filteredTourns.filter((t) => Boolean(t.winner_id)).length,
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
