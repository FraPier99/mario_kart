import { Trophy, Percent, Flag, Medal, Star } from 'lucide-react'
import { buildAvatarPlaceholder } from '@/lib/placeholders'

const STAT_ICONS = {
    'Tornei': Trophy,
    'Placement': Percent,
    'Vittorie': Flag,
    'Podi': Medal,
    'Punti': Star,
}

const MEDAL_CLASSES = {
    1: 'bg-circuit-gold text-circuit-ink border-circuit-ink',
    2: 'bg-slate-300 text-slate-800 border-circuit-ink',
    3: 'bg-orange-400 text-orange-950 border-circuit-ink',
}
const RING_COLORS = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7f32' }
const CARD_BORDER = {
    1: 'border-amber-400 dark:border-amber-500/60',
    2: 'border-slate-300/70 dark:border-slate-500/40',
    3: 'border-orange-400/70 dark:border-orange-500/40',
}

const PodiumSteps = ({ players = [] }) => {
    if (players.length < 3) return null

    const order = [players[1], players[0], players[2]]

    return (
        <div className="flex items-end justify-center gap-1.5 sm:gap-4 md:gap-6 pt-6 sm:pt-8 md:pt-10 mb-6">
            {order.map((player, i) => {
                const position = i === 0 ? 2 : i === 1 ? 1 : 3
                const isFirst = position === 1

                return (
                    <div
                        key={player.playerId}
                        className={`relative flex flex-col items-center rounded-2xl border-2 bg-white dark:bg-card ${CARD_BORDER[position]} ${isFirst ? 'w-24 sm:w-48 md:w-64 pt-6 pb-2.5 px-1.5 sm:pt-8 sm:pb-5 sm:px-4 md:px-5 -translate-y-2 sm:-translate-y-3 md:-translate-y-5' : 'w-20 sm:w-40 md:w-52 pt-5 pb-2 px-1 sm:pt-7 sm:pb-4 sm:px-3 md:px-4'}`}
                        style={{
                            boxShadow: isFirst
                                ? '0 8px 30px rgba(245,158,11,0.25), 0 0 60px rgba(245,158,11,0.08)'
                                : `0 4px 14px ${RING_COLORS[position]}18`,
                            animation: 'podium-pop-in 0.6s ease-out both',
                            animationDelay: `${i * 0.12}s`,
                        }}
                    >
                        {/* Position badge */}
                        <span className={`absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 inline-flex h-4 w-4 sm:h-6 sm:w-6 md:h-7 md:w-7 items-center justify-center rounded-full font-title text-[8px] sm:text-xs border-2 ${MEDAL_CLASSES[position]}`}>
                            {position}
                        </span>

                        {/* Avatar with glow */}
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-full blur-lg opacity-50 scale-125" style={{ background: RING_COLORS[position] }} />
                            <img
                                src={player.img_url || buildAvatarPlaceholder(player.nickname)}
                                alt={player.nickname}
                                className={`relative rounded-full object-cover ring-2 shadow-lg ${isFirst ? 'h-11 w-11 sm:h-20 sm:w-20 md:h-28 md:w-28' : 'h-8 w-8 sm:h-14 sm:w-14 md:h-20 md:w-20'}`}
                                style={{ borderColor: RING_COLORS[position] }}
                            />
                        </div>

                        {/* Nickname */}
                        <p className={`mt-1 sm:mt-2.5 md:mt-3 w-full truncate text-center font-black uppercase tracking-wide text-slate-800 dark:text-foreground ${isFirst ? 'text-[9px] sm:text-sm md:text-base' : 'text-[8px] sm:text-xs md:text-sm'}`}>
                            {player.nickname}
                        </p>

                        {/* Campione badge — only for 1st place, nascosto sotto sm perché non c'è spazio */}
                        {isFirst && (
                            <span className="mt-1 hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                                <Trophy size={11} /> Campione
                            </span>
                        )}

                        {/* Stats as mini KPIs */}
                        {player.stats?.length > 0 && (
                            <div className={`mt-1.5 sm:mt-3 flex w-full flex-wrap items-center justify-center ${isFirst ? 'gap-1.5 sm:gap-5' : 'gap-1 sm:gap-4'}`}>
                                {player.stats.map((stat) => {
                                    const Icon = STAT_ICONS[stat.label]
                                    const isPlacement = stat.label === 'Placement'
                                    return (
                                        <div key={stat.label} className="flex flex-col items-center gap-0.5">
                                            {Icon && <Icon size={isPlacement ? 15 : 13} className={`hidden sm:inline ${isPlacement ? '' : 'text-slate-400 dark:text-muted-foreground'}`} style={isPlacement ? { color: RING_COLORS[position] } : undefined} />}
                                            <span className={`font-black leading-none ${isFirst ? 'text-[9px] sm:text-sm' : 'text-[8px] sm:text-xs'} ${isPlacement ? '' : 'text-slate-800 dark:text-foreground'}`} style={isPlacement ? { color: RING_COLORS[position] } : undefined}>
                                                {stat.value}
                                            </span>
                                            <span className="text-[6px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground">{stat.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default PodiumSteps
