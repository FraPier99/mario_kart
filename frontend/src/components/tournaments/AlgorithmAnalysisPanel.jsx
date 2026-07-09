import { useMemo, useState } from 'react'

// Pannello "Algoritmo (live)" della classifica classic — analisi derivata
// interamente da `tournament` (nessuna chiamata API propria): gare
// rimanenti/blindaggio, scontro diretto, streak/forma, previsioni di
// vittoria, tassi podio e best/worst. Estratto da TournamentDetail.jsx
// (sezione admin "leaderboard", solo tornei classic) perché self-contained.
const AlgorithmAnalysisPanel = ({ tournament }) => {
    const [algoTab, setAlgoTab] = useState('overview')
    const [statsTab, setStatsTab] = useState('podium')

    const leaderboardAnalytics = useMemo(() => {
        const standings = tournament?.standings ?? []
        const sortedRaces = [...(tournament?.races ?? [])].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))

        const computeTournamentScores = (playersCount) => {
            const staticMap = {
                4: [5, 3, 2, 1],
                5: [6, 4, 3, 2, 1],
                6: [7, 5, 4, 3, 2, 1],
                7: [8, 6, 5, 4, 3, 2, 1],
                8: [9, 7, 6, 5, 4, 3, 2, 1],
            }

            const n = Number(playersCount) || 0
            if (staticMap[n]) return staticMap[n]
            if (n < 4) return Array.from({ length: n }, (_, index) => n + 1 - index)
            const first = n + 1
            const rest = Array.from({ length: Math.max(n - 1, 0) }, (_, index) => n - 1 - index)
            return [first, ...rest]
        }

        const scoreTable = computeTournamentScores(tournament?.n_players ?? standings.length)
        const maxPointsPerRace = scoreTable[0] ?? 0

        if (!standings.length) {
            return {
                remainingRaces: 0,
                maxPointsPerRace,
                pointsToSecure: 0,
                lockStatus: 'ok',
                requiredLead: 0,
                currentLead: 0,
                hottestPlayer: null,
                mostConsistent: null,
                predictions: [],
                momentumRanking: [],
                consistencyRanking: [],
                streakRows: [],
                podiumRates: [],
                headToHead: null,
                bestWorst: [],
                scoreTable: [],
                tieBreakRules: [],
            }
        }

        const getCurrentStreak = (playerId, predicate) => {
            let streak = 0
            for (let index = sortedRaces.length - 1; index >= 0; index -= 1) {
                const race = sortedRaces[index]
                const playerResult = race.results?.find((result) => result.player_id === playerId)
                if (!playerResult) break
                if (predicate(playerResult)) streak += 1
                else break
            }
            return streak
        }

        const streakRows = standings.map((row) => {
            const winStreak = getCurrentStreak(row.playerId, (result) => (result.position ?? 0) === 1)
            const podiumStreak = getCurrentStreak(row.playerId, (result) => (result.position ?? 99) <= 3)

            const resultsByPlayer = sortedRaces
                .map((race) => race.results?.find((result) => result.player_id === row.playerId) ?? null)
                .filter(Boolean)

            const recent = resultsByPlayer.slice(-3)
            const recentAvgPoints = recent.length
                ? recent.reduce((sum, result) => sum + (result.points ?? 0), 0) / recent.length
                : 0

            const seasonAvgPoints = resultsByPlayer.length
                ? resultsByPlayer.reduce((sum, result) => sum + (result.points ?? 0), 0) / resultsByPlayer.length
                : 0

            const avgPosition = resultsByPlayer.length
                ? resultsByPlayer.reduce((sum, result) => sum + (result.position ?? 0), 0) / resultsByPlayer.length
                : 99

            const positionVariance = resultsByPlayer.length
                ? resultsByPlayer.reduce((sum, result) => {
                    const delta = (result.position ?? 0) - avgPosition
                    return sum + delta * delta
                }, 0) / resultsByPlayer.length
                : 0

            const positionStdDev = Math.sqrt(positionVariance)

            const consistency = avgPosition > 0 ? Number((1 / avgPosition).toFixed(3)) : 0

            return {
                playerId: row.playerId,
                nickname: row.nickname,
                winStreak,
                podiumStreak,
                recentAvgPoints,
                seasonAvgPoints,
                formDelta: Number((recentAvgPoints - seasonAvgPoints).toFixed(2)),
                avgPosition,
                positionStdDev,
                consistency,
                racesPlayed: resultsByPlayer.length,
            }
        })

        const remainingRaces = Math.max((tournament?.n_races ?? 0) - (tournament?.raceCount ?? 0), 0)

        const predictionBase = standings.map((row) => {
            const playerStreak = streakRows.find((entry) => entry.playerId === row.playerId)
            const momentum = playerStreak?.podiumStreak ?? 0
            const formBoost = (playerStreak?.recentAvgPoints ?? 0) * 2
            const consistencyBoost = (playerStreak?.consistency ?? 0) * 20
            const score = Math.max(1, (row.points ?? 0) + (row.raceWins ?? 0) * 8 + (row.podiums ?? 0) * 3 + momentum * 4 + formBoost + consistencyBoost)
            return {
                playerId: row.playerId,
                nickname: row.nickname,
                score,
            }
        })

        const scoreSum = predictionBase.reduce((sum, row) => sum + row.score, 0)
        const predictions = predictionBase
            .map((row) => ({
                ...row,
                probability: Number(((row.score / scoreSum) * 100).toFixed(1)),
            }))
            .sort((left, right) => right.probability - left.probability)
            .slice(0, 4)

        const leader = standings[0]
        const second = standings[1]
        const currentLead = second ? Math.max((leader.points ?? 0) - (second.points ?? 0), 0) : 0
        const requiredLead = remainingRaces * maxPointsPerRace + 1
        const pointsToSecure = Math.max(requiredLead - currentLead, 0)
        const maxAdditionalLeaderPoints = remainingRaces * maxPointsPerRace
        const lockStatus = pointsToSecure > maxAdditionalLeaderPoints ? 'unreachable' : 'ok'

        const hottestPlayer = streakRows
            .slice()
            .sort((left, right) => right.recentAvgPoints - left.recentAvgPoints || right.podiumStreak - left.podiumStreak || right.winStreak - left.winStreak)[0] ?? null

        const mostConsistent = streakRows
            .slice()
            .sort((left, right) => right.consistency - left.consistency)[0] ?? null

        const momentumRanking = streakRows
            .slice()
            .sort((left, right) => right.formDelta - left.formDelta || right.recentAvgPoints - left.recentAvgPoints || right.podiumStreak - left.podiumStreak)
            .slice(0, 5)

        const consistencyRanking = streakRows
            .slice()
            .sort((left, right) => right.consistency - left.consistency || left.positionStdDev - right.positionStdDev)
            .slice(0, 5)

        const podiumRates = streakRows.map((row) => ({
            playerId: row.playerId,
            nickname: row.nickname,
            podiumRate: row.racesPlayed > 0 ? Number(((standings.find((s) => s.playerId === row.playerId)?.podiums ?? 0) / row.racesPlayed * 100).toFixed(0)) : 0,
            winRate: row.racesPlayed > 0 ? Number(((standings.find((s) => s.playerId === row.playerId)?.raceWins ?? 0) / row.racesPlayed * 100).toFixed(0)) : 0,
            racesPlayed: row.racesPlayed,
            avgPos: row.avgPosition,
        })).sort((a, b) => b.podiumRate - a.podiumRate)

        const headToHead = (() => {
            if (standings.length < 2) return null
            const top2 = standings.slice(0, 2)
            let wins1 = 0, wins2 = 0, ties = 0
            sortedRaces.forEach((race) => {
                const r1 = race.results?.find((r) => r.player_id === top2[0].playerId)
                const r2 = race.results?.find((r) => r.player_id === top2[1].playerId)
                if (!r1 || !r2) return
                if (r1.position < r2.position) wins1++
                else if (r2.position < r1.position) wins2++
                else ties++
            })
            return { p1: top2[0].nickname, p2: top2[1].nickname, wins1, wins2, ties }
        })()

        const bestWorst = streakRows.map((row) => {
            const results = sortedRaces
                .map((race) => race.results?.find((r) => r.player_id === row.playerId))
                .filter(Boolean)
            return {
                playerId: row.playerId,
                nickname: row.nickname,
                best: results.length ? Math.min(...results.map((r) => r.position ?? 99)) : null,
                worst: results.length ? Math.max(...results.map((r) => r.position ?? 0)) : null,
                avgPos: row.avgPosition,
            }
        }).sort((a, b) => (a.avgPos || 99) - (b.avgPos || 99))

        const tieBreakRules = [
            'Punti totali',
            'Vittorie di gara',
            'Podi',
            'Scontro diretto tra pari punti se disponibile',
        ]

        return {
            remainingRaces,
            maxPointsPerRace,
            pointsToSecure,
            lockStatus,
            requiredLead,
            currentLead,
            hottestPlayer,
            mostConsistent,
            predictions,
            momentumRanking,
            consistencyRanking,
            streakRows,
            podiumRates,
            headToHead,
            bestWorst,
            scoreTable,
            tieBreakRules,
            topTieOnPoints: standings.length > 1 && (standings[0].points ?? 0) === (standings[1].points ?? 0),
        }
    }, [tournament])

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 shadow-sm h-full min-h-0 flex flex-col overflow-hidden">
                <p className="text-xs font-black uppercase tracking-widest text-amber-600">Algoritmo (live)</p>
                <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-foreground">Analisi torneo (live)</h3>

                <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 dark:bg-muted p-1 shrink-0">
                    <button type="button" onClick={() => setAlgoTab('overview')} className={`rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${algoTab === 'overview' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Classifica</button>
                    <button type="button" onClick={() => setAlgoTab('dynamics')} className={`rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${algoTab === 'dynamics' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Dinamica</button>
                    <button type="button" onClick={() => setAlgoTab('projection')} className={`rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${algoTab === 'projection' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Previsioni</button>
                    <button type="button" onClick={() => setAlgoTab('stats')} className={`rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${algoTab === 'stats' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Stats</button>
                </div>

                <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 text-sm">
                    {algoTab === 'overview' && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 will-change-transform" style={{ animation: 'slide-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) both', animationDelay: '0.03s' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Gare rimanenti</p>
                                    <p className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">{leaderboardAnalytics.remainingRaces}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 will-change-transform" style={{ animation: 'slide-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) both', animationDelay: '0.06s' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Max pt per gara</p>
                                    <p className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">{leaderboardAnalytics.maxPointsPerRace}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 will-change-transform" style={{ animation: 'slide-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) both', animationDelay: '0.09s' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Vantaggio</p>
                                    <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">{leaderboardAnalytics.currentLead}</p>
                                </div>
                                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Da blindare</p>
                                    <p className="mt-1 text-lg font-black text-amber-700 dark:text-amber-300">{leaderboardAnalytics.lockStatus === 'unreachable' ? 'N/A' : leaderboardAnalytics.pointsToSecure}</p>
                                </div>
                            </div>
                            <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-0.5">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Gap classifica</p>
                                {tournament.standings.slice(0, 5).map((s, i) => (
                                    <div key={s.playerId} className="flex items-center justify-between text-xs">
                                        <span className="capitalize text-slate-600 dark:text-slate-400">#{i + 1} {s.nickname}</span>
                                        <span className={`font-black ${i === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{i === 0 ? `${s.points} pt` : `-${tournament.standings[0].points - s.points} pt`}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-0.5">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Lettura rapida</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Leader: <span className="font-black text-slate-900 dark:text-foreground capitalize">{tournament.standings?.[0]?.nickname ?? '-'}</span></p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Blindaggio: <span className="font-black text-emerald-600 dark:text-emerald-400">{leaderboardAnalytics.lockStatus === 'unreachable' ? 'non chiudibile' : 'chiudibile'}</span></p>
                            </div>
                        </>
                    )}

                    {algoTab === 'dynamics' && (
                        <>
                            <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Confronto diretto tra i primi due</p>
                                {leaderboardAnalytics.headToHead ? (
                                    <div className="mt-1 space-y-1 text-xs">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-black capitalize text-slate-900 dark:text-foreground">{leaderboardAnalytics.headToHead.p1}</span>
                                            <span className="font-black text-amber-600 dark:text-amber-400">{leaderboardAnalytics.headToHead.wins1} vittorie</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-black capitalize text-slate-900 dark:text-foreground">{leaderboardAnalytics.headToHead.p2}</span>
                                            <span className="font-black text-amber-600 dark:text-amber-400">{leaderboardAnalytics.headToHead.wins2} vittorie</span>
                                        </div>
                                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pareggi nello scontro diretto: {leaderboardAnalytics.headToHead.ties}</p>
                                    </div>
                                ) : <p className="text-xs text-slate-400">Non disponibile</p>}
                            </div>
                            <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Streak attivi</p>
                                {(() => {
                                    const active = leaderboardAnalytics.streakRows.filter((e) => e.winStreak > 0 || e.podiumStreak > 0).sort((a, b) => b.winStreak - a.winStreak || b.podiumStreak - a.podiumStreak).slice(0, 5)
                                    if (!active.length) return <p className="text-xs text-slate-400">Nessuno streak attivo</p>
                                    return active.map((e) => (
                                        <div key={e.playerId} className="flex items-center justify-between text-xs">
                                            <span className="capitalize text-slate-600 dark:text-slate-400">{e.nickname}</span>
                                            <span className="font-black">
                                                {e.winStreak > 0 && <span className="text-emerald-600 dark:text-emerald-400">{e.winStreak}W</span>}
                                                {e.winStreak > 0 && e.podiumStreak > 0 && <span className="text-slate-400 mx-1">·</span>}
                                                {e.podiumStreak > e.winStreak && <span className="text-sky-600 dark:text-sky-400">{e.podiumStreak}P</span>}
                                            </span>
                                        </div>
                                    ))
                                })()}
                            </div>
                            <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Forma recente</p>
                                {leaderboardAnalytics.momentumRanking.slice(0, 4).map((e, i) => (
                                    <div key={e.playerId} className="flex items-center justify-between text-xs">
                                        <span className="capitalize text-slate-600 dark:text-slate-400">#{i + 1} {e.nickname}</span>
                                        <span className={`font-black ${e.formDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{e.formDelta >= 0 ? '+' : ''}{e.formDelta}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {algoTab === 'projection' && (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Previsione vittoria (%)</p>
                            {leaderboardAnalytics.predictions.map((entry) => (
                                <div key={entry.playerId} className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2">
                                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                        <span className="capitalize">{entry.nickname}</span>
                                        <span>{entry.probability}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(entry.probability, 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                            <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-0.5">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Sintesi</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Favorito: <span className="font-black text-emerald-600 dark:text-emerald-400 capitalize">{leaderboardAnalytics.predictions?.[0]?.nickname ?? '-'}</span></p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Gare residue: <span className="font-black text-slate-900 dark:text-foreground">{leaderboardAnalytics.remainingRaces}</span></p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Blindaggio: <span className="font-black text-amber-600 dark:text-amber-400">{leaderboardAnalytics.lockStatus === 'unreachable' ? 'non chiudibile' : `${leaderboardAnalytics.pointsToSecure} pt`}</span></p>
                            </div>
                        </>
                    )}

                    {algoTab === 'stats' && (
                        <>
                            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-muted p-1 shrink-0">
                                <button type="button" onClick={() => setStatsTab('podium')} className={`rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${statsTab === 'podium' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Tasso podio</button>
                                <button type="button" onClick={() => setStatsTab('bestworst')} className={`rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${statsTab === 'bestworst' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Best/Worst</button>
                            </div>

                            {statsTab === 'podium' && leaderboardAnalytics.podiumRates.slice(0, 5).map((entry, index) => (
                                <div key={entry.playerId} className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-black text-slate-900 dark:text-foreground">#{index + 1} <span className="capitalize">{entry.nickname}</span></span>
                                        <span className="font-black text-amber-600 dark:text-amber-400">{entry.podiumRate}%</span>
                                    </div>
                                    <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${entry.podiumRate}%` }} />
                                    </div>
                                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">Pos media: {(entry.avgPos ?? 0).toFixed(1)} · {entry.racesPlayed} gare</p>
                                </div>
                            ))}

                            {statsTab === 'bestworst' && leaderboardAnalytics.bestWorst.slice(0, 5).map((entry, index) => (
                                <div key={entry.playerId} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 text-xs">
                                    <span className="font-black text-slate-900 dark:text-foreground">#{index + 1} <span className="capitalize">{entry.nickname}</span></span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-black">Best: #{entry.best ?? '-'}</span>
                                        <span className="text-rose-500 dark:text-rose-400 font-black">Worst: #{entry.worst ?? '-'}</span>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AlgorithmAnalysisPanel
