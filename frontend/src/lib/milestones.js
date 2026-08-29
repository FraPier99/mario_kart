// Traguardi automatici rilevati per i partecipanti di un torneo (Home,
// card "Ultimo torneo") — nessuna chiamata di rete, tutto derivato da dati
// già caricati in AppDataContext (statsByPlayerId, detailedTournaments).
// Logica documentata in docs/MILESTONES.md — tenerla in sync.

const MILESTONE_ICON = {
    prima_partecipazione: '🏁',
    prima_vittoria: '🏆',
    primo_podio: '🥉',
    debutto_gioco: '🎮',
}

// Tra i tornei di detailedTournaments filtrati da matchesScope, il più
// vecchio (per data) per cui predicate(t, playerId) è vero. tournaments è
// già ordinato per data decrescente (vedi sortTournamentByDate in
// AppDataContext), quindi l'ultimo match nell'iterazione è il più vecchio.
const findEarliestMatchingTournamentId = (playerId, detailedTournaments, matchesScope, predicate) => {
    let earliest = null
    for (const t of detailedTournaments) {
        if (!matchesScope(t)) continue
        if (predicate(t, playerId)) earliest = t.id
    }
    return earliest
}

const sameGameAndFormat = (tournament) => (t) =>
    t.game_id === tournament.game_id && t.tournament_format === tournament.tournament_format

const sameGame = (tournament) => (t) => t.game_id === tournament.game_id

const wonBy = (playerId) => (t) => t.winner_id === playerId

const podiumedBy = (playerId) => (t) =>
    t.tournament_format !== 'group_stage' && (t.standings ?? []).slice(0, 3).some((s) => s.playerId === playerId)

const participatedBy = (playerId) => (t) => (t.standings ?? []).some((s) => s.playerId === playerId)

export const detectTournamentMilestones = ({ tournament, standings, statsByPlayerId, detailedTournaments, gameName }) => {
    if (!tournament || !standings?.length) return []

    const result = []
    const addMilestone = (standing, key, label) => {
        result.push({ playerId: standing.playerId, nickname: standing.nickname, img_url: standing.img_url, key, icon: MILESTONE_ICON[key], label })
    }

    const gameSuffix = gameName ? ` (${gameName})` : ''

    standings.forEach((standing) => {
        const stats = statsByPlayerId.get(standing.playerId)
        if (!stats) return

        if (stats.tournamentsPlayed === 1) {
            addMilestone(standing, 'prima_partecipazione', 'Prima partecipazione')
        }

        if (stats.tournamentsPlayed > 1) {
            const earliestInGame = findEarliestMatchingTournamentId(
                standing.playerId, detailedTournaments, sameGame(tournament), participatedBy(standing.playerId)
            )
            if (earliestInGame === tournament.id) {
                addMilestone(standing, 'debutto_gioco', `Debutto${gameSuffix}`)
            }
        }

        if (standing.playerId === tournament.winner_id) {
            const earliestWin = findEarliestMatchingTournamentId(
                standing.playerId, detailedTournaments, sameGameAndFormat(tournament), wonBy(standing.playerId)
            )
            if (earliestWin === tournament.id) {
                addMilestone(standing, 'prima_vittoria', `Primo torneo vinto${gameSuffix}`)
            }
        }
    })

    if (tournament.tournament_format !== 'group_stage') {
        standings.slice(0, 3).forEach((standing) => {
            const earliestPodium = findEarliestMatchingTournamentId(
                standing.playerId, detailedTournaments, sameGameAndFormat(tournament), podiumedBy(standing.playerId)
            )
            if (earliestPodium === tournament.id) {
                addMilestone(standing, 'primo_podio', `Primo podio${gameSuffix}`)
            }
        })
    }

    return result
}
