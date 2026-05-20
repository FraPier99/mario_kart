import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Crown, Trophy } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import LeaderboardTable from '@/components/stats/LeaderboardTable'
import RaceList from '@/components/tournaments/RaceList'
import { useAppData } from '@/context/AppDataContext'
import ApiBanner from '@/components/common/ApiBanner'
import RaceCreator from '@/components/tournaments/RaceCreator'
import ResultEntryForm from '@/components/tournaments/ResultEntryForm'
import WinnerFinalizeCard from '@/components/tournaments/WinnerFinalizeCard'

const TournamentDetail = () => {
    const { tournamentId } = useParams()
    const navigate = useNavigate()
    const { getTournamentById, players, games, refresh, loading, errorMessage, circuits, circuitsById, circuitsByGameId, charactersById } = useAppData()

    const tournament = getTournamentById(tournamentId)

    const tournamentCircuits = (circuitsByGameId.get(tournament?.game_id ?? 0) ?? []).length
        ? circuitsByGameId.get(tournament?.game_id ?? 0)
        : circuits
    const currentLeader = tournament?.standings?.[0] ?? null

    const tournamentParticipants = useMemo(() => {
        if (!tournament?.participant_ids?.length) return []
        return players.filter((p) => tournament.participant_ids.includes(p.id))
    }, [tournament, players])

    if (loading && !tournament) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-7xl px-4 py-12 text-center text-slate-500 dark:text-muted-foreground">Caricamento torneo...</div>
            </AppLayout>
        )
    }

    if (!tournament) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-7xl px-4 py-12 text-center">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-foreground">Torneo non trovato</h1>
                    <button
                        type="button"
                        onClick={() => navigate('/history')}
                        className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white"
                    >
                        Torna allo storico
                    </button>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-12 space-y-10">
                <ApiBanner title="Errore caricamento torneo" message={errorMessage} />
                <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/20">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Gestione torneo</p>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="mt-3 text-4xl font-black uppercase tracking-tight">{tournament.name}</h1>
                            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                                <span className="rounded-full bg-white/10 px-3 py-1">Data: {tournament.date}</span>
                                <span className="rounded-full bg-white/10 px-3 py-1">Gioco: {games.find((game) => game.id === tournament.game_id)?.name ?? `#${tournament.game_id}`}</span>
                                <span className="rounded-full bg-white/10 px-3 py-1">Gare: {tournament.raceCount}/{tournament.n_races}</span>
                                <span className="rounded-full bg-white/10 px-3 py-1">Partecipanti: {tournament.n_players}</span>
                                <span className="rounded-full bg-amber-400/20 px-3 py-1 font-black text-amber-300">
                                    <Crown size={14} className="-mt-0.5 me-1 inline" />
                                    Vincitore finale: {tournament.winner?.nickname ?? 'non impostato'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/tournaments/${tournament.id}/stats`)}
                            className="shrink-0 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-emerald-400"
                        >
                            Statistiche
                        </button>
                    </div>
                </div>

                <div className="grid gap-8 xl:grid-cols-2">
                    <RaceCreator tournament={tournament} circuits={tournamentCircuits} loading={loading} onCreated={refresh} />
                    <ResultEntryForm tournament={tournament} races={tournament.races} tournamentParticipants={tournamentParticipants} onCreated={refresh} />
                </div>

                <WinnerFinalizeCard tournament={tournament} leader={currentLeader} onFinalized={refresh} />

                <div className="grid gap-8 xl:grid-cols-2">
                    <div className="space-y-4">
                        <h2 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">
                            <Trophy size={24} className="text-amber-500" />
                            Classifica live
                        </h2>
                        <div className="rounded-3xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-1 shadow-lg shadow-amber-100/30 dark:shadow-amber-950/30">
                            <LeaderboardTable
                                rows={tournament.standings}
                                showTournamentWins={false}
                                charactersById={charactersById}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Gare del torneo</h2>
                        <RaceList races={tournament.races} circuitsById={circuitsById} charactersById={charactersById} />
                    </div>
                </div>
            </section>
        </AppLayout>
    )
}

export default TournamentDetail