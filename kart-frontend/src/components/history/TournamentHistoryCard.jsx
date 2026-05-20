import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import RaceList from '../tournaments/RaceList'

const TournamentHistoryCard = ({ tournament, circuitsById, charactersById }) => {
    return (
        <article className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Torneo #{tournament.id}</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-foreground">{tournament.name}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Data: {tournament.date || 'Non disponibile'}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 dark:bg-muted px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground">
                        {tournament.raceCount}/{tournament.n_races} gare
                    </span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-700">
                        <Crown size={12} className="-mt-0.5 me-0.5 inline" />
                        Vincitore: {tournament.winner?.nickname ?? 'N/D'}
                    </span>
                </div>
            </div>

            <div className="mt-5 space-y-5">
                <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-foreground">Classifica torneo</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {tournament.standings.slice(0, 6).map((standing, idx) => {
                            const isWinner = idx === 0 && tournament.winner
                            return (
                                <div key={standing.playerId} className={`rounded-2xl p-4 ${isWinner ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-slate-50 dark:bg-muted'}`}>
                                    <div className="flex items-center gap-1.5 text-sm font-black text-slate-900 dark:text-foreground">
                                        {isWinner && <Crown size={14} className="text-amber-600" />}
                                        {standing.nickname}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                                        <span>{standing.points} punti</span>
                                        <span>{standing.raceWins} vittorie</span>
                                        <span>{standing.podiums} podi</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-foreground">Gare e risultati</h4>
                    <div className="mt-3">
                        <RaceList races={tournament.races} circuitsById={circuitsById} charactersById={charactersById} />
                    </div>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
                <Link
                    to={`/tournaments/${tournament.id}/stats`}
                    className="inline-flex items-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-emerald-400"
                >
                    Statistiche
                </Link>
                <Link
                    to={`/tournaments/${tournament.id}`}
                    className="inline-flex items-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-700"
                >
                    Gestisci torneo
                </Link>
            </div>
        </article>
    )
}

export default TournamentHistoryCard
