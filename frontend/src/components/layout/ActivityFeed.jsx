import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Rss, Trophy, Flag, Award, Flame, ChevronRight } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { buildActivityFeed } from '@/lib/activityFeed'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import EditableContentImage from '@/components/common/EditableContentImage'

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
    const { detailedTournaments, statsByPlayerId, games, contentImages, updateContentImage } = useAppData()
    const { isSuperadmin } = useAuth()

    const events = useMemo(
        () => buildActivityFeed({ detailedTournaments, statsByPlayerId, games, limit: 10 }),
        [detailedTournaments, statsByPlayerId, games]
    )

    // Sfondo opzionale del pannello, caricabile dal superadmin — stesso
    // principio delle altre card a immagine: SOLO con uno sfondo caricato
    // il pannello diventa un'isola scura con testo chiaro; senza, segue il
    // tema del sito.
    const bgUrl = contentImages['home-activity-bg']
    const hasBg = Boolean(bgUrl)

    if (events.length === 0) return null

    const textStrong = hasBg ? 'text-white' : 'text-slate-900 dark:text-foreground'
    const textSoft = hasBg ? 'text-slate-300' : 'text-slate-500 dark:text-muted-foreground'
    const textFaint = hasBg ? 'text-slate-400' : 'text-slate-400 dark:text-muted-foreground'
    const rowBg = hasBg ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'

    return (
        <div
            className={`relative overflow-hidden rounded-[2rem] border-2 p-6 ${hasBg ? 'border-white/20 bg-slate-900' : 'border-slate-200 dark:border-border bg-white dark:bg-card'}`}
            style={{ boxShadow: 'var(--circuit-shadow-lg)' }}
        >
            {hasBg && (
                <>
                    <EditableContentImage
                        contentKey="home-activity-bg"
                        imageUrl={bgUrl}
                        onUploaded={updateContentImage}
                        alt=""
                        fit="cover"
                        imageClassName="blur-md brightness-[0.45]"
                        className="absolute inset-0 h-full w-full bg-transparent"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-slate-900/40 via-slate-900/60 to-slate-900/90" />
                </>
            )}
            {!hasBg && isSuperadmin && (
                <EditableContentImage
                    contentKey="home-activity-bg"
                    imageUrl={null}
                    onUploaded={updateContentImage}
                    alt=""
                    fit="cover"
                    className="absolute right-3 top-3 z-20 h-9 w-9 rounded-lg"
                />
            )}
            <div className="relative z-10 mb-4 flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hasBg ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
                    <Rss size={18} />
                </span>
                <div className="min-w-0">
                    <p className={`font-title text-sm tracking-wide ${textStrong}`}>Attività recenti</p>
                    <p className={`text-xs ${textSoft}`}>Tutte le tue attività in un unico posto</p>
                </div>
            </div>
            <ul className="relative z-10 space-y-1.5">
                {events.map((event) => (
                    <li key={event.id}>
                        <Link
                            to={`/tournaments/${event.tournamentId}`}
                            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 transition ${rowBg} ${event.type === 'win' ? 'border-l-2 border-amber-400/70' : ''}`}
                        >
                            <EventBadge type={event.type} avatar={event.avatar} primary={event.primary} />
                            {/* Niente `truncate`: con 3+ nomi uniti (traguardi raggiunti
                                insieme) il testo va a capo su più righe invece di tagliarsi
                                illeggibile, soprattutto su mobile dove lo spazio orizzontale
                                è poco. */}
                            <span className="min-w-0 flex-1 break-words capitalize text-xs leading-snug">
                                {event.primary && <span className={`font-black ${textStrong}`}>{event.primary} </span>}
                                <span className={textSoft}>{event.secondary}</span>
                            </span>
                            <span className={`shrink-0 text-[9px] font-black uppercase tracking-wide ${textFaint}`}>
                                {formatEventDate(event.date)}
                            </span>
                            <ChevronRight size={14} className={`shrink-0 ${textFaint}`} />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default ActivityFeed
