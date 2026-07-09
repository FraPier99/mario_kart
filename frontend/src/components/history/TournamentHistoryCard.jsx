import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, ChevronDown } from 'lucide-react'
import RaceList from '../tournaments/RaceList'
import LeaderboardTable from '../stats/LeaderboardTable'
import { useAuth } from '@/context/AuthContext'
import { useAppData } from '@/context/AppDataContext'

const TournamentHistoryCard = ({ tournament, circuitsById, charactersById }) => {
    const { user, isAdmin, isSuperadmin } = useAuth()
    const { getTournamentDisplayNumber } = useAppData()
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
        <article
            className="rounded-2xl border-2 border-slate-900 dark:border-white/20 bg-white dark:bg-card overflow-hidden"
            style={{ boxShadow: 'var(--circuit-shadow-md)' }}
        >
            <div
                className="flex flex-wrap items-center justify-between gap-4 p-6 cursor-pointer select-none transition-colors hover:bg-slate-50/50 dark:hover:bg-muted/30"
                onClick={() => setExpanded((v) => !v)}
            >
                <div className="min-w-0 flex-1">
                    <p className="font-title text-[10px] tracking-wide text-emerald-600 dark:text-emerald-400">TORNEO #{getTournamentDisplayNumber(tournament.id)}</p>
                    <h3 className="font-title text-lg text-slate-900 dark:text-foreground truncate mt-1">{tournament.name?.toUpperCase()}</h3>
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

                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        to={`/tournaments/${tournament.id}/stats`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-xl border-2 border-emerald-700/30 bg-emerald-500 dark:bg-emerald-600 px-4 py-2 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-400 dark:hover:bg-emerald-500"
                        style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                    >
                        Stats
                    </Link>
                    {(!isPrivileged || tournament.status === 'concluso') ? (
                        <Link
                            to={`/tournaments/${tournament.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-xl border-2 border-slate-300 dark:border-border bg-slate-50 dark:bg-muted px-4 py-2 font-title text-[10px] tracking-wide text-slate-600 dark:text-muted-foreground transition-all duration-200 active:translate-y-px hover:border-slate-400 dark:hover:border-slate-500"
                        >
                            Visualizza
                        </Link>
                    ) : (
                        <Link
                            to={`/tournaments/${tournament.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-xl border-2 border-slate-900 dark:bg-slate-700 bg-slate-900 px-4 py-2 font-title text-[10px] tracking-wide text-white transition-all duration-200 active:translate-y-px hover:bg-slate-700 dark:hover:bg-slate-600"
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                        >
                            Gestisci
                        </Link>
                    )}
                    <Link
                        to={`/schedina/${tournament.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-xl border-2 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 font-title text-[10px] tracking-wide text-emerald-700 dark:text-emerald-300 transition active:translate-y-px hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
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
                        <h4 className="font-title text-[10px] tracking-wide text-slate-400 dark:text-muted-foreground mb-3">CLASSIFICA TORNEO</h4>
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
                        <h4 className="font-title text-[10px] tracking-wide text-slate-400 dark:text-muted-foreground mb-3">GARE E RISULTATI</h4>
                        <RaceList races={tournament.races} circuitsById={circuitsById} charactersById={charactersById} />
                    </div>
                </div>
            )}
        </article>
    )
}

export default TournamentHistoryCard
