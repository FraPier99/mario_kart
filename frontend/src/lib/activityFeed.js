import { detectTournamentMilestones } from '@/lib/milestones'

// Feed "cosa è successo di recente nella lega" — nessuna chiamata di rete,
// tutto derivato da detailedTournaments/statsByPlayerId già in
// AppDataContext (stesso principio di milestones.js). I tornei amichevoli
// restano visibili come eventi "iniziato/concluso" ma sono esclusi da
// traguardi e streak, per coerenza con badge/classifiche/statistiche che
// li ignorano ovunque nell'app.
//
// Ogni evento separa `primary` (il giocatore protagonista, reso in
// grassetto dal chiamante) da `secondary` (il resto della frase, peso
// normale) invece di una stringa piatta unica — vedi ActivityFeed.jsx, che
// usa anche `type`/`avatar` per il badge icona colorato e l'avatar cerchiato.
const WIN_STREAK_THRESHOLD = 3
const MAX_NAMES_SHOWN = 3

// "Shiba", "Shiba e Vlad", "Shiba, Vlad e Next Champion", "Shiba, Vlad e altri 2"
// — usato per accorpare in una riga sola più giocatori che raggiungono lo
// stesso traguardo nello stesso torneo, invece di una riga a testa.
const joinNames = (names) => {
    if (names.length <= 1) return names[0] ?? ''
    if (names.length <= MAX_NAMES_SHOWN) {
        return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
    }
    return `${names.slice(0, MAX_NAMES_SHOWN).join(', ')} e altri ${names.length - MAX_NAMES_SHOWN}`
}

export function buildActivityFeed({ detailedTournaments, statsByPlayerId, games, limit = 12 }) {
    const gameNameById = new Map((games ?? []).map((g) => [g.id, g.name]))
    const events = []

    detailedTournaments.forEach((t) => {
        const gameName = gameNameById.get(t.game_id)

        if (t.status === 'concluso' && t.winner_id && t.winner) {
            events.push({
                id: `won-${t.id}`,
                date: t.date,
                type: 'win',
                avatar: t.winner.img_url,
                primary: t.winner.nickname,
                secondary: `ha vinto ${t.name}`,
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

                // Più giocatori possono raggiungere lo STESSO traguardo nello
                // stesso torneo (es. tutti al loro primo torneo) — un'unica
                // riga per traguardo invece di una a testa, per non allungare
                // il feed inutilmente.
                const byMilestoneKey = new Map()
                milestones.forEach((m) => {
                    if (!byMilestoneKey.has(m.key)) byMilestoneKey.set(m.key, { label: m.label, players: [] })
                    byMilestoneKey.get(m.key).players.push(m)
                })

                byMilestoneKey.forEach((group, key) => {
                    const singlePlayer = group.players.length === 1 ? group.players[0] : null
                    events.push({
                        id: `milestone-${t.id}-${key}`,
                        date: t.date,
                        type: 'milestone',
                        avatar: singlePlayer?.img_url ?? null,
                        primary: joinNames(group.players.map((m) => m.nickname)),
                        secondary: group.label,
                        tournamentId: t.id,
                    })
                })
            }
        } else if (t.status === 'in_corso') {
            events.push({
                id: `started-${t.id}`,
                date: t.date,
                type: 'started',
                avatar: null,
                primary: null,
                secondary: `È iniziato ${t.name}${t.is_friendly ? ' (Amichevole)' : ''}`,
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
                type: 'streak',
                avatar: streakLastTournament.winner?.img_url,
                primary: streakLastTournament.winner?.nickname ?? '???',
                secondary: `ha vinto ${streakCount} tornei di fila${gameNameById.get(gameId) ? ` (${gameNameById.get(gameId)})` : ''}`,
                tournamentId: streakLastTournament.id,
            })
        }
    })

    events.sort((a, b) => new Date(b.date) - new Date(a.date))
    return events.slice(0, limit)
}
