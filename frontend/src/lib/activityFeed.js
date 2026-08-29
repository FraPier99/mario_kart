import { detectTournamentMilestones } from '@/lib/milestones'

// Feed "cosa è successo di recente nella lega" — nessuna chiamata di rete,
// tutto derivato da detailedTournaments/statsByPlayerId già in
// AppDataContext (stesso principio di milestones.js). I tornei amichevoli
// restano visibili come eventi "iniziato/concluso" ma sono esclusi da
// traguardi e streak, per coerenza con badge/classifiche/statistiche che
// li ignorano ovunque nell'app.
const WIN_STREAK_THRESHOLD = 3

export function buildActivityFeed({ detailedTournaments, statsByPlayerId, games, limit = 12 }) {
    const gameNameById = new Map((games ?? []).map((g) => [g.id, g.name]))
    const events = []

    detailedTournaments.forEach((t) => {
        const gameName = gameNameById.get(t.game_id)

        if (t.status === 'concluso' && t.winner_id && t.winner) {
            events.push({
                id: `won-${t.id}`,
                date: t.date,
                icon: '🏆',
                text: `${t.winner.nickname} ha vinto ${t.name}`,
                tournamentId: t.id,
            })

            if (!t.is_friendly) {
                const milestones = detectTournamentMilestones({
                    tournament: t,
                    standings: t.standings ?? [],
                    statsByPlayerId,
                    detailedTournaments,
                    gameName,
                })
                milestones.forEach((m) => {
                    events.push({
                        id: `milestone-${t.id}-${m.playerId}-${m.key}`,
                        date: t.date,
                        icon: m.icon,
                        text: `${m.nickname} — ${m.label}`,
                        tournamentId: t.id,
                    })
                })
            }
        } else if (t.status === 'in_corso') {
            events.push({
                id: `started-${t.id}`,
                date: t.date,
                icon: '🏁',
                text: `È iniziato ${t.name}${t.is_friendly ? ' (Amichevole)' : ''}`,
                tournamentId: t.id,
            })
        }
    })

    // Streak di vittorie correnti per gioco — solo tornei ufficiali, in
    // ordine cronologico (i tornei arrivano già ordinati data-desc, qui
    // servono in ordine asc per camminare la sequenza).
    const byGame = new Map()
    detailedTournaments
        .filter((t) => !t.is_friendly && t.status === 'concluso' && t.winner_id)
        .forEach((t) => {
            if (!byGame.has(t.game_id)) byGame.set(t.game_id, [])
            byGame.get(t.game_id).push(t)
        })

    byGame.forEach((list, gameId) => {
        const chrono = [...list].sort((a, b) => new Date(a.date) - new Date(b.date))
        let streakPlayerId = null
        let streakCount = 0
        let streakLastTournament = null
        chrono.forEach((t) => {
            streakCount = t.winner_id === streakPlayerId ? streakCount + 1 : 1
            streakPlayerId = t.winner_id
            streakLastTournament = t
        })
        if (streakCount >= WIN_STREAK_THRESHOLD && streakLastTournament) {
            events.push({
                id: `streak-${gameId}-${streakLastTournament.id}`,
                date: streakLastTournament.date,
                icon: '🔥',
                text: `${streakLastTournament.winner?.nickname ?? '???'} ha vinto ${streakCount} tornei di fila${gameNameById.get(gameId) ? ` (${gameNameById.get(gameId)})` : ''}`,
                tournamentId: streakLastTournament.id,
            })
        }
    })

    events.sort((a, b) => new Date(b.date) - new Date(a.date))
    return events.slice(0, limit)
}
