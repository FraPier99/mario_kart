import { buildAvatarPlaceholder } from '@/lib/placeholders'

// Podio a gradini statico — stessa estetica del podio animato di
// GlobalCelebrationOverlay.jsx (colonne di altezza diversa, medaglia,
// bordo/gradiente oro-argento-bronzo), ma senza la coreografia di reveal
// progressivo/roulette: qui i tre giocatori sono già noti e visibili da
// subito, con solo un'animazione di ingresso una tantum al mount.
const HEIGHTS = { 1: 'h-32', 2: 'h-24', 3: 'h-20' }
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }
const MEDAL_LABELS = { 1: '1°', 2: '2°', 3: '3°' }
const BG_COLORS = {
    1: 'linear-gradient(180deg, rgba(245,158,11,0.5) 0%, rgba(245,158,11,0.15) 100%)',
    2: 'linear-gradient(180deg, rgba(192,192,192,0.35) 0%, rgba(192,192,192,0.08) 100%)',
    3: 'linear-gradient(180deg, rgba(205,127,50,0.3) 0%, rgba(205,127,50,0.08) 100%)',
}
const BORDER_COLORS = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7f32' }

const PodiumSteps = ({ players = [] }) => {
    if (players.length < 3) return null

    // Ordine visivo: 2°, 1°, 3° — stesso layout del podio dell'overlay.
    const order = [players[1], players[0], players[2]]

    return (
        <div className="flex items-end justify-center gap-2 sm:gap-4 mb-6">
            {order.map((player, i) => {
                const position = i === 0 ? 2 : i === 1 ? 1 : 3
                return (
                    <div key={player.playerId} className="flex flex-col items-center gap-1.5" style={{ animation: 'fade-in 0.5s ease-out both' }}>
                        <div className="flex flex-col items-center" style={{ animation: 'podium-pop-in 0.6s ease-out both' }}>
                            <img
                                src={player.img_url || buildAvatarPlaceholder(player.nickname)}
                                alt={player.nickname}
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover ring-2 shadow-lg"
                                style={{ borderColor: BORDER_COLORS[position] }}
                            />
                            <p className="mt-1.5 max-w-20 sm:max-w-24 truncate text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-800 dark:text-foreground">
                                {player.nickname}
                            </p>
                            {player.stats?.length > 0 && (
                                <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 w-20 sm:w-24">
                                    {player.stats.map((stat) => (
                                        <div key={stat.label} className="flex flex-col items-center">
                                            <span className="font-title text-[11px] sm:text-xs text-slate-800 dark:text-foreground">{stat.value}</span>
                                            <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wide text-slate-400 dark:text-muted-foreground">{stat.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div
                            className={`w-20 sm:w-28 origin-bottom ${HEIGHTS[position]} rounded-t-2xl flex items-center justify-center relative overflow-hidden`}
                            style={{
                                borderTop: `3px solid ${BORDER_COLORS[position]}`,
                                background: BG_COLORS[position],
                                boxShadow: position === 1
                                    ? '0 0 30px rgba(245,158,11,0.3), inset 0 0 20px rgba(245,158,11,0.1)'
                                    : `0 0 14px ${BORDER_COLORS[position]}33, inset 0 0 10px ${BORDER_COLORS[position]}11`,
                                animation: 'podium-column-grow 0.8s ease-out both',
                            }}
                        >
                            <span className="relative z-10 text-2xl sm:text-3xl">{MEDALS[position]}</span>
                        </div>
                        <p className="text-xs sm:text-sm font-black" style={{ color: BORDER_COLORS[position] }}>
                            {MEDAL_LABELS[position]}
                        </p>
                    </div>
                )
            })}
        </div>
    )
}

export default PodiumSteps
