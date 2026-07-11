import { buildAvatarPlaceholder } from '@/lib/placeholders'

// Podio statico — card unica per posizione (non più avatar+contenuto sopra
// un gradino colorato separato, che a schermi larghi finiva "sospeso" senza
// nulla sotto): l'elevazione/altezza del div stesso comunica il piazzamento,
// tutto il contenuto (badge posizione, avatar, nome, statistiche in riga)
// vive dentro la stessa card. Badge posizione = stessi numeri cerchiati
// oro/argento/bronzo di LeaderboardTable (PositionBadge), non medaglie emoji.
const MEDAL_CLASSES = {
    1: 'bg-circuit-gold text-circuit-ink border-circuit-ink',
    2: 'bg-slate-300 text-slate-800 border-circuit-ink',
    3: 'bg-orange-400 text-orange-950 border-circuit-ink',
}
const RING_COLORS = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7f32' }
const CARD_BORDER = { 1: 'border-amber-400/70 dark:border-amber-500/50', 2: 'border-slate-300/70 dark:border-slate-500/50', 3: 'border-orange-400/70 dark:border-orange-500/50' }

const PodiumSteps = ({ players = [] }) => {
    if (players.length < 3) return null

    // Ordine visivo: 2°, 1°, 3°.
    const order = [players[1], players[0], players[2]]

    return (
        <div className="flex items-end justify-center gap-1.5 sm:gap-4 pt-4 sm:pt-6 mb-6">
            {order.map((player, i) => {
                const position = i === 0 ? 2 : i === 1 ? 1 : 3
                const isFirst = position === 1
                return (
                    <div
                        key={player.playerId}
                        className={`relative flex w-28 sm:w-52 flex-col items-center rounded-2xl border-2 bg-white dark:bg-card pt-6 sm:pt-7 pb-3 sm:pb-4 px-1.5 sm:px-2 ${CARD_BORDER[position]} ${isFirst ? '-translate-y-4 sm:-translate-y-6' : ''}`}
                        style={{
                            boxShadow: isFirst
                                ? '0 0 30px rgba(245,158,11,0.25), inset 0 0 20px rgba(245,158,11,0.08)'
                                : `0 0 14px ${RING_COLORS[position]}22`,
                            animation: 'podium-pop-in 0.6s ease-out both',
                            animationDelay: `${i * 0.1}s`,
                        }}
                    >
                        <span className={`absolute top-2 left-2 sm:top-2.5 sm:left-2.5 inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full font-title text-[10px] sm:text-xs border-2 ${MEDAL_CLASSES[position]}`}>
                            {position}
                        </span>

                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-full blur-md opacity-60" style={{ background: RING_COLORS[position] }} />
                            <img
                                src={player.img_url || buildAvatarPlaceholder(player.nickname)}
                                alt={player.nickname}
                                className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover ring-2 shadow-lg"
                                style={{ borderColor: RING_COLORS[position] }}
                            />
                        </div>

                        <p className="mt-1.5 sm:mt-2 w-full truncate text-center text-[10px] sm:text-sm font-black uppercase tracking-wide text-slate-800 dark:text-foreground">
                            {player.nickname}
                        </p>

                        {player.stats?.length > 0 && (
                            <div className="mt-1.5 sm:mt-2 flex w-full flex-wrap items-start justify-center gap-x-1.5 gap-y-1 sm:flex-nowrap sm:gap-x-2.5">
                                {player.stats.map((stat) => (
                                    <div key={stat.label} className="flex flex-col items-center">
                                        <span className="font-title text-[9px] sm:text-xs text-slate-800 dark:text-foreground">{stat.value}</span>
                                        <span className="text-[6px] sm:text-[8px] font-bold uppercase tracking-wide text-slate-400 dark:text-muted-foreground">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default PodiumSteps
