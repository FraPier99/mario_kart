import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Rss, Trophy, Flag, Award, Flame } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { buildActivityFeed } from '@/lib/activityFeed'
import { buildAvatarPlaceholder } from '@/lib/placeholders'

const formatEventDate = (value) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

// Un badge icona colorato per tipo evento (stesso principio di RoleBadge/
// PlayerBadge/TournamentStatusBadge — pillola/cerchio con bordo e colore
// dedicato, non un'icona neutra) così il tipo di evento si riconosce a
// colpo d'occhio prima ancora di leggere il testo.
const TYPE_META = {
    win: { Icon: Trophy, badgeBg: 'bg-amber-400', iconColor: 'text-amber-950' },
    started: { Icon: Flag, badgeBg: 'bg-blue-400', iconColor: 'text-white' },
    milestone: { Icon: Award, badgeBg: 'bg-emerald-400', iconColor: 'text-emerald-950' },
    streak: { Icon: Flame, badgeBg: 'bg-orange-500', iconColor: 'text-white' },
}

const EventBadge = ({ type, avatar, primary }) => {
    const { Icon, badgeBg, iconColor } = TYPE_META[type] ?? TYPE_META.started

    if (!avatar) {
        return (
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${badgeBg}`}>
                <Icon size={15} className={iconColor} />
            </span>
        )
    }

    return (
        <div className="relative shrink-0">
            <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-white dark:border-card bg-slate-100 dark:bg-muted">
                <img
                    src={avatar || buildAvatarPlaceholder(primary)}
                    alt={primary}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white dark:border-card ${badgeBg}`}>
                <Icon size={9} className={iconColor} />
            </span>
        </div>
    )
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
                <ul className="space-y-2">
                    {events.map((event) => (
                        <li key={event.id}>
                            <Link
                                to={`/tournaments/${event.tournamentId}`}
                                className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-border bg-white/60 dark:bg-card/40 p-2.5 transition hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10"
                            >
                                <EventBadge type={event.type} avatar={event.avatar} primary={event.primary} />
                                <span className="min-w-0 flex-1 truncate capitalize text-sm">
                                    {event.primary && <span className="font-black text-slate-900 dark:text-foreground">{event.primary} </span>}
                                    <span className="text-slate-500 dark:text-muted-foreground">{event.secondary}</span>
                                </span>
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
