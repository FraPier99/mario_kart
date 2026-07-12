// Traguardi automatici rilevati per i partecipanti di un torneo (Home,
// card "Ultimo torneo") — nessuna chiamata di rete, tutto derivato da dati
// già caricati in AppDataContext (statsByPlayerId, detailedTournaments).

const MILESTONE_META = {
    prima_partecipazione: { icon: '🏁', label: 'Prima partecipazione' },
    prima_vittoria: { icon: '🏆', label: 'Prima vittoria' },
    primo_podio: { icon: '🥉', label: 'Primo podio' },
}

// Tra i tornei classic con standings, il più vecchio (per data) in cui
// playerId compare in posizione <= 3. tournaments è già ordinato per data
// decrescente (vedi sortTournamentByDate in AppDataContext), quindi l'ultimo
// match nell'iterazione è il più vecchio.
const findEarliestPodiumTournamentId = (playerId, detailedTournaments) => {
    let earliest = null
    for (const t of detailedTournaments) {
        if (t.tournament_format === 'group_stage') continue
        const idx = (t.standings ?? []).findIndex((s) => s.playerId === playerId)
        if (idx !== -1 && idx < 3) earliest = t.id
    }
    return earliest
}

export const detectTournamentMilestones = ({ tournament, standings, statsByPlayerId, detailedTournaments }) => {
    if (!tournament || !standings?.length) return []

    const result = []
    const addMilestone = (standing, key) => {
        result.push({
            playerId: standing.playerId,
            nickname: standing.nickname,
            img_url: standing.img_url,
            key,
            ...MILESTONE_META[key],
        })
    }

    standings.forEach((standing) => {
        const stats = statsByPlayerId.get(standing.playerId)
        if (!stats) return

        if (stats.tournamentsPlayed === 1) {
            addMilestone(standing, 'prima_partecipazione')
        }
        if (standing.playerId === tournament.winner_id && stats.tournamentWins === 1) {
            addMilestone(standing, 'prima_vittoria')
        }
    })

    if (tournament.tournament_format !== 'group_stage') {
        standings.slice(0, 3).forEach((standing) => {
            if (findEarliestPodiumTournamentId(standing.playerId, detailedTournaments) === tournament.id) {
                addMilestone(standing, 'primo_podio')
            }
        })
    }

    return result
}
