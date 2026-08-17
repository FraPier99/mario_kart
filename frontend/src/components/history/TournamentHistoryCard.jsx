import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, ChevronDown, Users, Flag, ArrowRight, PartyPopper } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useAppData } from '@/context/AppDataContext'
import { buildAvatarPlaceholder } from '@/lib/placeholders'

const PODIUM_STYLES = [
    { medal: '🥇', badge: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30' },
    { medal: '🥈', badge: 'bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-500/30' },
    { medal: '🥉', badge: 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-500/30' },
]

const TournamentHistoryCard = ({ tournament }) => {
    const { isAdmin, isSuperadmin } = useAuth()
    const { getTournamentDisplayNumber } = useAppData()
    const isPrivileged = isAdmin || isSuperadmin
    const [expanded, setExpanded] = useState(false)
    const participantCount = tournament.participant_ids?.length ?? tournament.standings?.length ?? 0
    const podium = (tournament.standings ?? []).slice(0, 3)
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
                        {tournament.is_friendly ? (
                            <>
                                <span>·</span>
                                <span className="flex items-center gap-1 font-black text-amber-600 dark:text-amber-400">
                                    <PartyPopper size={12} /> AMICHEVOLE
                                </span>
                            </>
                        ) : (
                            <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                    <Crown size={12} className="text-amber-500" />
                                    {tournament.winner?.nickname?.toUpperCase() ?? 'N/D'}
                                </span>
                            </>
                        )}
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
                    {!tournament.is_friendly && (
                        <Link
                            to={`/schedina/${tournament.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-xl border-2 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 font-title text-[10px] tracking-wide text-emerald-700 dark:text-emerald-300 transition active:translate-y-px hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                        >
                            Esito schedina
                        </Link>
                    )}
                    <ChevronDown
                        size={20}
                        className={`text-slate-400 transition-transform duration-300 shrink-0 ${expanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {expanded && (
                <div className="px-6 pb-6 space-y-5 border-t border-slate-100 dark:border-border animate-fade-in">
                    <div className="mt-4">
                        <h4 className="font-title text-[10px] tracking-wide text-slate-400 dark:text-muted-foreground mb-3">PODIO</h4>
                        {podium.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-3">
                                {podium.map((row, idx) => (
                                    <div key={row.playerId} className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 ${PODIUM_STYLES[idx].badge}`}>
                                        <span className="text-lg leading-none">{PODIUM_STYLES[idx].medal}</span>
                                        <img
                                            src={row.img_url || buildAvatarPlaceholder(row.nickname ?? '?')}
                                            alt={row.nickname}
                                            className="h-8 w-8 shrink-0 rounded-full object-cover bg-white/50 dark:bg-black/20"
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black">{row.nickname}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{row.points} pt</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">Nessuna classifica disponibile.</p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 dark:text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Flag size={13} /> {tournament.raceCount}/{tournament.n_races} gare</span>
                        <span className="flex items-center gap-1.5"><Users size={13} /> {participantCount} partecipanti</span>
                    </div>

                    <Link
                        to={`/tournaments/${tournament.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-title inline-flex items-center gap-1.5 text-[11px] tracking-wide text-emerald-600 dark:text-emerald-400 transition hover:text-emerald-700 dark:hover:text-emerald-300"
                    >
                        Vai ai dettagli completi (classifica, gare, statistiche) <ArrowRight size={13} />
                    </Link>
                </div>
            )}
        </article>
    )
}

export default TournamentHistoryCard
