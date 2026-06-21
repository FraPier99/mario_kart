import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, ChevronDown } from 'lucide-react'
import RaceList from '../tournaments/RaceList'
import LeaderboardTable from '../stats/LeaderboardTable'
import { useAuth } from '@/context/AuthContext'

const TournamentHistoryCard = ({ tournament, circuitsById, charactersById }) => {
    const { user, isAdmin, isSuperadmin } = useAuth()
    const isPrivileged = isAdmin || isSuperadmin
    const [expanded, setExpanded] = useState(false)
    const statusLabel = tournament.status === 'concluso'
        ? 'Concluso'
        : tournament.status === 'da_svolgere'
            ? 'Da svolgere'
            : tournament.status === 'finito'
                ? 'Finito'
                : 'In corso'

    return (
        <article className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20 overflow-hidden">
            <div
                className="flex flex-wrap items-center justify-between gap-4 p-6 cursor-pointer select-none transition-colors hover:bg-slate-50/50 dark:hover:bg-muted/30"
                onClick={() => setExpanded((v) => !v)}
            >
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">TORNEO #{tournament.id}</p>
                    <h3 className="text-xl font-black text-slate-900 dark:text-foreground truncate">{tournament.name?.toUpperCase()}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-muted-foreground uppercase">
                        <span>{tournament.date || 'DATA N/D'}</span>
                        <span>·</span>
                        <span>{tournament.raceCount}/{tournament.n_races} GARE</span>
                        <span>·</span>
                        <span>{statusLabel}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                            <Crown size={12} className="text-amber-500" />
                            {tournament.winner?.nickname?.toUpperCase() ?? 'N/D'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        to={`/tournaments/${tournament.id}/stats`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-2xl bg-emerald-500 dark:bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-emerald-400 dark:hover:bg-emerald-500"
                    >
                        Stats
                    </Link>
                    {(!isPrivileged || tournament.status === 'concluso') ? (
                        <Link
                            to={`/tournaments/${tournament.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500"
                        >
                            Visualizza
                        </Link>
                    ) : (
                        <Link
                            to={`/tournaments/${tournament.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all duration-200 hover:bg-slate-700 dark:hover:bg-slate-600"
                        >
                            Gestisci
                        </Link>
                    )}
                    <Link
                        to={`/schedina/${tournament.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 transition hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                    >
                        Esito schedina
                    </Link>
                    <ChevronDown
                        size={20}
                        className={`text-slate-400 transition-transform duration-300 shrink-0 ${expanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {expanded && (
                <div className="px-6 pb-6 space-y-5 border-t border-slate-100 dark:border-border animate-fade-in">
                    <div className="mt-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground mb-3">CLASSIFICA TORNEO</h4>
                        {tournament.standings?.length > 0 ? (
                            <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-1">
                                <LeaderboardTable
                                    rows={tournament.standings}
                                    showTournamentWins={false}
                                    charactersById={charactersById}
                                    highlightPlayerId={user?.player_id ?? user?.player?.id ?? null}
                                    isSuperadmin={isSuperadmin}
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">Nessuna classifica disponibile.</p>
                        )}
                    </div>

                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground mb-3">GARE E RISULTATI</h4>
                        <RaceList races={tournament.races} circuitsById={circuitsById} charactersById={charactersById} />
                    </div>
                </div>
            )}
        </article>
    )
}

export default TournamentHistoryCard
