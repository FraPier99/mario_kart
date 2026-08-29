import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Rss } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { buildActivityFeed } from '@/lib/activityFeed'

const formatEventDate = (value) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

const ActivityFeed = () => {
    const { detailedTournaments, statsByPlayerId, games } = useAppData()

    const events = useMemo(
        () => buildActivityFeed({ detailedTournaments, statsByPlayerId, games, limit: 10 }),
        [detailedTournaments, statsByPlayerId, games]
    )

    if (events.length === 0) return null

    return (
        <section className="mx-auto max-w-7xl px-4 pb-8">
            <div className="rounded-[2rem] border-2 border-slate-900/70 dark:border-white/20 bg-white/70 dark:bg-card/70 backdrop-blur-xl p-6" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <div className="mb-4 flex items-center gap-2">
                    <Rss size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <p className="font-title text-[10px] tracking-[0.3em] text-slate-700 dark:text-muted-foreground">Attività recente</p>
                </div>
                <ul className="space-y-1.5">
                    {events.map((event) => (
                        <li key={event.id}>
                            <Link
                                to={`/tournaments/${event.tournamentId}`}
                                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-muted/40"
                            >
                                <span className="shrink-0 text-base leading-none">{event.icon}</span>
                                <span className="min-w-0 flex-1 truncate capitalize text-slate-700 dark:text-foreground">{event.text}</span>
                                <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-muted-foreground">
                                    {formatEventDate(event.date)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}

export default ActivityFeed
