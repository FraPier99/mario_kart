import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Rss, Trophy, Flag, Award, Flame } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { buildActivityFeed } from '@/lib/activityFeed'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { pickSessionCircuit } from '@/lib/circuitBackground'
import CircuitBackdrop from '@/components/common/CircuitBackdrop'

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
            <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-white/70 bg-slate-100">
                <img
                    src={avatar || buildAvatarPlaceholder(primary)}
                    alt={primary}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white/70 ${badgeBg}`}>
                <Icon size={9} className={iconColor} />
            </span>
        </div>
    )
}

const ActivityFeed = () => {
    const { detailedTournaments, statsByPlayerId, games, circuits } = useAppData()

    const events = useMemo(
        () => buildActivityFeed({ detailedTournaments, statsByPlayerId, games, limit: 10 }),
        [detailedTournaments, statsByPlayerId, games]
    )

    // Sfondo "foto circuito" per l'intero riquadro — non legato a un torneo
    // specifico (la lista ne raccoglie più d'uno), casuale e stabile per la
    // sessione del browser.
    const bgCircuit = pickSessionCircuit('activity-feed', circuits)

    if (events.length === 0) return null

    return (
        <section className="mx-auto max-w-7xl px-4 pb-8">
            <div className="relative overflow-hidden rounded-[2rem] border-2 border-white/15 bg-slate-900 p-6" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <CircuitBackdrop imageUrl={bgCircuit?.image_url} />
                <div className="relative z-10">
                <div className="mb-4 flex items-center gap-2">
                    <Rss size={16} className="text-emerald-400" />
                    <p className="font-title text-[10px] tracking-[0.3em] text-slate-200">Attività recente</p>
                </div>
                <ul className="space-y-2">
                    {events.map((event) => (
                        <li key={event.id}>
                            <Link
                                to={`/tournaments/${event.tournamentId}`}
                                className="flex items-start gap-3 rounded-xl border border-white/15 bg-black/30 backdrop-blur-sm p-2.5 transition hover:border-emerald-400/50 hover:bg-emerald-950/30"
                            >
                                <EventBadge type={event.type} avatar={event.avatar} primary={event.primary} />
                                {/* Niente `truncate`: con 3+ nomi uniti (traguardi raggiunti
                                    insieme) il testo va a capo su più righe invece di tagliarsi
                                    illeggibile, soprattutto su mobile dove lo spazio orizzontale
                                    è poco. */}
                                <span className="min-w-0 flex-1 break-words capitalize text-sm">
                                    {event.primary && <span className="font-black text-white">{event.primary} </span>}
                                    <span className="text-slate-300">{event.secondary}</span>
                                </span>
                                <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    {formatEventDate(event.date)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
                </div>
            </div>
        </section>
    )
}

export default ActivityFeed
