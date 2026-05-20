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

const sortLeaderboard = (left, right) => {
    return (
        right.tournamentWins - left.tournamentWins ||
        right.raceWins - left.raceWins ||
        right.points - left.points ||
        right.podiums - left.podiums ||
        left.nickname.localeCompare(right.nickname)
    )
}

const buildPlayerStats = (players, tournaments, results) => {
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
        })
    })

    results.forEach((result) => {
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
                        lastCharacterId: null,
                    }

                    currentStanding.points += result.points ?? 0
                    currentStanding.racesPlayed += 1

                    if ((result.position ?? 0) === 1) {
                        currentStanding.raceWins += 1
                    }

                    if ((result.position ?? 0) <= 3) {
                        currentStanding.podiums += 1
                    }

                    standingsByPlayerId.set(result.player_id, currentStanding)
                    lastCharacterByPlayerId.set(result.player_id, result.character_id)
                })

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

            const standings = Array.from(standingsByPlayerId.values()).sort((left, right) => {
                return (
                    right.raceWins - left.raceWins ||
                    right.points - left.points ||
                    right.podiums - left.podiums ||
                    left.nickname.localeCompare(right.nickname)
                )
            })

            return {
                ...tournament,
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

    const tournamentsById = useMemo(() => {
        return new Map(tournaments.map((tournament) => [tournament.id, tournament]))
    }, [tournaments])

    const detailedTournaments = useMemo(() => {
        return buildTournamentDetails(tournaments, races, results, playersById)
    }, [tournaments, races, results, playersById])

    const { statsByPlayerId } = useMemo(() => {
        return buildPlayerStats(players, tournaments, results)
    }, [players, tournaments, results])

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
        const filteredRaceIds = new Set(
            races.filter((r) => filteredTourns.some((t) => t.id === r.tournament_id)).map((r) => r.id)
        )
        const filteredResults = results.filter((r) => filteredRaceIds.has(r.race_id))
        const { statsByPlayerId: filteredStats } = buildPlayerStats(players, filteredTourns, filteredResults)

        return players
            .map((player) => {
                const ps = filteredStats.get(player.id) ?? {
                    playerId: player.id, nickname: player.nickname,
                    first_name: player.first_name, last_name: player.last_name,
                    img_url: player.img_url, favorite_character_id: player.favorite_character_id,
                    tournamentWins: 0, raceWins: 0, podiums: 0, points: 0, racesPlayed: 0,
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
        tournamentsById,
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
