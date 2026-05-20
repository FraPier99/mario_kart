import { useMemo, useState } from 'react'
import { Search, Swords, Trophy, Target, Rat, Medal } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { useAppData } from '@/context/AppDataContext'

const Compare = () => {
    const { players, detailedTournaments } = useAppData()
    const [searchA, setSearchA] = useState('')
    const [searchB, setSearchB] = useState('')
    const [playerA, setPlayerA] = useState(null)
    const [playerB, setPlayerB] = useState(null)

    const sortedPlayers = useMemo(() =>
        players.slice().sort((a, b) => a.nickname.localeCompare(b.nickname)),
        [players]
    )

    const filteredA = useMemo(() => {
        if (!searchA.trim()) return sortedPlayers
        const t = searchA.toLowerCase()
        return sortedPlayers.filter((p) =>
            p.nickname.toLowerCase().includes(t) ||
            p.first_name.toLowerCase().includes(t) ||
            p.last_name.toLowerCase().includes(t)
        )
    }, [sortedPlayers, searchA])

    const filteredB = useMemo(() => {
        if (!searchB.trim()) return sortedPlayers
        const t = searchB.toLowerCase()
        return sortedPlayers.filter((p) =>
            p.nickname.toLowerCase().includes(t) ||
            p.first_name.toLowerCase().includes(t) ||
            p.last_name.toLowerCase().includes(t)
        )
    }, [sortedPlayers, searchB])

    const comparison = useMemo(() => {
        if (!playerA || !playerB) return null

        let aWins = 0, bWins = 0, draws = 0
        let aPoints = 0, bPoints = 0
        let aSumPos = 0, bSumPos = 0
        let commonRaces = 0
        let commonTournaments = 0
        let aTournamentWins = 0, bTournamentWins = 0
        let aPodiums = 0, bPodiums = 0

        ;(detailedTournaments ?? []).forEach((t) => {
            const aStanding = (t.standings ?? []).find((s) => s.playerId === playerA.id)
            const bStanding = (t.standings ?? []).find((s) => s.playerId === playerB.id)
            if (!aStanding || !bStanding) return

            commonTournaments++

            if (t.winner_id === playerA.id) aTournamentWins++
            if (t.winner_id === playerB.id) bTournamentWins++

            ;(t.races ?? []).forEach((race) => {
                const aRes = (race.results ?? []).find((r) => r.player_id === playerA.id)
                const bRes = (race.results ?? []).find((r) => r.player_id === playerB.id)
                if (!aRes || !bRes) return

                commonRaces++
                aPoints += aRes.points
                bPoints += bRes.points
                aSumPos += aRes.position
                bSumPos += bRes.position

                if (aRes.position < bRes.position) aWins++
                else if (bRes.position < aRes.position) bWins++
                else draws++

                if (aRes.position <= 3) aPodiums++
                if (bRes.position <= 3) bPodiums++
            })
        })

        return {
            commonTournaments,
            commonRaces,
            aWins, bWins, draws,
            aPoints, bPoints,
            aAvgPos: commonRaces ? (aSumPos / commonRaces).toFixed(2) : '-',
            bAvgPos: commonRaces ? (bSumPos / commonRaces).toFixed(2) : '-',
            aTournamentWins, bTournamentWins,
            aPodiums, bPodiums,
        }
    }, [playerA, playerB, detailedTournaments])

    const Selector = ({ label, search, setSearch, filtered, selected, setSelected, excludeId }) => (
        <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 dark:text-muted-foreground">{label}</p>
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Cerca giocatore..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card px-9 py-3 text-sm outline-none focus:border-emerald-500"
                />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-1.5">
                {filtered.filter((p) => p.id !== excludeId).length === 0 ? (
                    <p className="p-3 text-center text-sm text-slate-400 dark:text-muted-foreground">Nessun risultato</p>
                ) : (
                    filtered.filter((p) => p.id !== excludeId).map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => { setSelected(p); setSearch('') }}
                            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                selected?.id === p.id
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-muted-foreground'
                            }`}
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-muted text-xs font-black text-slate-500 dark:text-muted-foreground">
                                {p.nickname.charAt(0).toUpperCase()}
                            </span>
                            <div>
                                <p className="font-bold">{p.nickname}</p>
                                <p className="text-xs text-slate-400 dark:text-muted-foreground">{p.first_name} {p.last_name}</p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    )

    const StatCard = ({ icon: Icon, label, valueA, valueB, suffix, highlight }) => {
        const a = valueA ?? '-'
        const b = valueB ?? '-'
        const aBetter = highlight === 'a'
        const bBetter = highlight === 'b'
        const tie = highlight === 'tie'

        return (
            <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                    <Icon size={14} />
                    {label}
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className={`text-xl font-black ${aBetter ? 'text-emerald-600' : tie ? 'text-slate-800 dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground'}`}>
                        {a}{suffix ?? ''}
                    </span>
                    <span className="text-xs font-black text-slate-300 dark:text-muted-foreground">vs</span>
                    <span className={`text-xl font-black ${bBetter ? 'text-emerald-600' : tie ? 'text-slate-800 dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground'}`}>
                        {b}{suffix ?? ''}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-12">
                <div className="mb-10 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Confronto 1vs1</p>
                    <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Sfida testa a testa</h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
                        Seleziona due giocatori per confrontare le loro statistiche nelle gare comuni.
                    </p>
                </div>

                <div className="mb-10 grid gap-6 md:grid-cols-2">
                    <Selector label="Giocatore A" search={searchA} setSearch={setSearchA} filtered={filteredA} selected={playerA} setSelected={setPlayerA} excludeId={playerB?.id} />
                    <Selector label="Giocatore B" search={searchB} setSearch={setSearchB} filtered={filteredB} selected={playerB} setSelected={setPlayerB} excludeId={playerA?.id} />
                </div>

                {comparison && (
                    <>
                        <div className="mb-3 text-center">
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-muted px-4 py-1.5 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground">
                                <Swords size={14} />
                                {comparison.commonTournaments} tornei in comune ({comparison.commonRaces} gare)
                            </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <StatCard icon={Trophy} label="Vittorie torneo" valueA={comparison.aTournamentWins} valueB={comparison.bTournamentWins}
                                highlight={comparison.aTournamentWins > comparison.bTournamentWins ? 'a' : comparison.bTournamentWins > comparison.aTournamentWins ? 'b' : 'tie'} />
                            <StatCard icon={Medal} label="Podi" valueA={comparison.aPodiums} valueB={comparison.bPodiums}
                                highlight={comparison.aPodiums > comparison.bPodiums ? 'a' : comparison.bPodiums > comparison.aPodiums ? 'b' : 'tie'} />
                            <StatCard icon={Rat} label="Punti totali" valueA={comparison.aPoints} valueB={comparison.bPoints}
                                highlight={comparison.aPoints > comparison.bPoints ? 'a' : comparison.bPoints > comparison.aPoints ? 'b' : 'tie'} />
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                    <Target size={14} />
                                    Posizione media
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className={`text-xl font-black ${Number(comparison.aAvgPos) < Number(comparison.bAvgPos) ? 'text-emerald-600' : Number(comparison.bAvgPos) < Number(comparison.aAvgPos) ? 'text-slate-500 dark:text-muted-foreground' : 'text-slate-800 dark:text-foreground'}`}>
                                        #{comparison.aAvgPos}
                                    </span>
                                    <span className="text-xs font-black text-slate-300 dark:text-muted-foreground">vs</span>
                                    <span className={`text-xl font-black ${Number(comparison.bAvgPos) < Number(comparison.aAvgPos) ? 'text-emerald-600' : Number(comparison.aAvgPos) < Number(comparison.bAvgPos) ? 'text-slate-500 dark:text-muted-foreground' : 'text-slate-800 dark:text-foreground'}`}>
                                        #{comparison.bAvgPos}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                    <Swords size={14} />
                                    Gare vinte (testa a testa)
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex h-10 overflow-hidden rounded-xl bg-slate-100 dark:bg-muted">
                                        <div
                                            className="flex items-center justify-center bg-emerald-500 text-xs font-black text-white transition-all"
                                            style={{ width: `${comparison.aWins + comparison.bWins + comparison.draws > 0 ? ((comparison.aWins / (comparison.aWins + comparison.bWins + comparison.draws)) * 100) : 0}%` }}
                                        >
                                            {comparison.aWins}
                                        </div>
                                        <div
                                            className="flex items-center justify-center bg-slate-300 text-xs font-black text-white transition-all"
                                            style={{ width: `${comparison.aWins + comparison.bWins + comparison.draws > 0 ? ((comparison.draws / (comparison.aWins + comparison.bWins + comparison.draws)) * 100) : 0}%` }}
                                        >
                                            {comparison.draws || ''}
                                        </div>
                                        <div
                                            className="flex items-center justify-center bg-amber-500 text-xs font-black text-white transition-all"
                                            style={{ width: `${comparison.aWins + comparison.bWins + comparison.draws > 0 ? ((comparison.bWins / (comparison.aWins + comparison.bWins + comparison.draws)) * 100) : 0}%` }}
                                        >
                                            {comparison.bWins}
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-muted-foreground">
                                        <span>{playerA?.nickname} {((comparison.aWins / (comparison.aWins + comparison.bWins + comparison.draws)) * 100 || 0).toFixed(0)}%</span>
                                        <span>Pareggi {comparison.draws}</span>
                                        <span>{((comparison.bWins / (comparison.aWins + comparison.bWins + comparison.draws)) * 100 || 0).toFixed(0)}% {playerB?.nickname}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {comparison.commonTournaments > 0 && (
                            <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20">
                                <div className="border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                                    <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-muted-foreground">
                                        <Trophy size={16} />
                                        Storico tornei in comune
                                    </h3>
                                </div>
                                <div className="overflow-x-auto p-1">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-border text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                                                <th className="px-4 py-3">Torneo</th>
                                                <th className="px-4 py-3 text-right">{playerA?.nickname}</th>
                                                <th className="px-4 py-3 text-right">{playerB?.nickname}</th>
                                                <th className="px-4 py-3 text-right">Risultato</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(detailedTournaments ?? [])
                                                .filter((t) => (t.standings ?? []).some((s) => s.playerId === playerA.id) && (t.standings ?? []).some((s) => s.playerId === playerB.id))
                                                .map((t, i) => {
                                                    const aTotal = (t.standings ?? []).find((s) => s.playerId === playerA.id)
                                                    const bTotal = (t.standings ?? []).find((s) => s.playerId === playerB.id)
                                                    const aBetter = aTotal.points > bTotal.points
                                                    const bBetter = bTotal.points > aTotal.points
                                                    return (
                                                        <tr key={t.id} className={`border-b border-slate-100 dark:border-border ${i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50/50 dark:bg-muted/50'}`}>
                                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-foreground">{t.name}</td>
                                                            <td className={`px-4 py-3 text-right font-bold ${aBetter ? 'text-emerald-600' : 'text-slate-500 dark:text-muted-foreground'}`}>
                                                                {aTotal.points}pt
                                                            </td>
                                                            <td className={`px-4 py-3 text-right font-bold ${bBetter ? 'text-emerald-600' : 'text-slate-500 dark:text-muted-foreground'}`}>
                                                                {bTotal.points}pt
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${aBetter ? 'bg-emerald-100 text-emerald-700' : bBetter ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground'}`}>
                                                                    {aBetter ? `${playerA?.nickname}` : bBetter ? `${playerB?.nickname}` : 'Pareggio'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </AppLayout>
    )
}

export default Compare
