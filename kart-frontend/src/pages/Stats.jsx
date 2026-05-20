import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import LeaderboardTable from '@/components/stats/LeaderboardTable'
import { useAppData } from '@/context/AppDataContext'
import ApiBanner from '@/components/common/ApiBanner'
import { downloadCSV } from '@/lib/utils'

const Stats = () => {
    const { leaderboardRows, homeMetrics, loading, errorMessage, refresh, charactersById, games, getLeaderboardByGame, getHomeMetricsByGame } = useAppData()
    const [selectedGameId, setSelectedGameId] = useState('')

    const filteredRows = useMemo(() => {
        if (!selectedGameId) return leaderboardRows
        return getLeaderboardByGame(selectedGameId)
    }, [selectedGameId, leaderboardRows, getLeaderboardByGame])

    const metrics = useMemo(() => {
        if (!selectedGameId) return homeMetrics
        return getHomeMetricsByGame(selectedGameId)
    }, [selectedGameId, homeMetrics, getHomeMetricsByGame])

    const handleExportCSV = () => {
        const gameLabel = selectedGameId ? games.find((g) => g.id === Number(selectedGameId))?.name ?? 'game' : 'global'
        downloadCSV(
            ['Pos', 'Giocatore', 'Nome', 'Cognome', 'Tornei vinti', 'Gare vinte', 'Podi', 'Punti', 'Gare giocate'],
            filteredRows.map((r, idx) => [idx + 1, r.nickname, r.first_name, r.last_name, r.tournamentWins, r.raceWins, r.podiums, r.points, r.racesPlayed]),
            `classifica-${gameLabel}.csv`
        )
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-12">
                <div className="mb-8 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Classifica generale</p>
                    <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Tornei vinti, gare vinte e podi</h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
                        La classifica usa i dati del backend e ordina i piloti per tornei vinti, gare vinte e podi.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        <select
                            value={selectedGameId}
                            onChange={(e) => setSelectedGameId(e.target.value)}
                            className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-2.5 text-sm font-black uppercase tracking-widest outline-none focus:border-emerald-500"
                        >
                            <option value="">Tutti i giochi</option>
                            {games.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleExportCSV}
                            className="flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-slate-700"
                        >
                            <Download size={14} />
                            CSV
                        </button>
                    </div>
                </div>

                <ApiBanner
                    title="Errore classifica"
                    message={errorMessage}
                    action={errorMessage ? (
                        <button
                            type="button"
                            onClick={refresh}
                            className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
                        >
                            Riprova
                        </button>
                    ) : null}
                />

                <div className="mb-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl bg-white dark:bg-card p-5 shadow-lg shadow-slate-200/60 dark:shadow-black/20">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Giocatori attivi</p>
                        <p className="mt-2 text-4xl font-black text-slate-900 dark:text-foreground">{metrics.activePlayers}</p>
                    </div>
                    <div className="rounded-3xl bg-white dark:bg-card p-5 shadow-lg shadow-slate-200/60 dark:shadow-black/20">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Gare completate</p>
                        <p className="mt-2 text-4xl font-black text-slate-900 dark:text-foreground">{metrics.completedRaces}</p>
                    </div>
                    <div className="rounded-3xl bg-white dark:bg-card p-5 shadow-lg shadow-slate-200/60 dark:shadow-black/20">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Trofei vinti</p>
                        <p className="mt-2 text-4xl font-black text-slate-900 dark:text-foreground">{metrics.trophiesWon}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center text-slate-500 dark:text-muted-foreground dark:text-muted-foreground">Caricamento classifica...</div>
                ) : (
                    <LeaderboardTable rows={filteredRows} charactersById={charactersById} />
                )}
            </section>
        </AppLayout>
    )
}

export default Stats
