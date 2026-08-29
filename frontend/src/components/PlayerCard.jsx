import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { getProfileCardStyle } from '@/lib/playerBadges'

const PlayerCard = ({ players, bestBadgeByPlayerId, handlePlayerClick }) => {
    if (!players.length) {
        return (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card px-8 py-12 text-center text-slate-500 dark:text-muted-foreground">
                Nessun giocatore presente nel database.
            </div>
        )
    }

    return (
        <>
            {players.map((p, idx) => {
                const bestBadge = bestBadgeByPlayerId?.get(p.id)
                const cardStyle = getProfileCardStyle(bestBadge?.tier)

                return (
                    <div
                        key={p.id}
                        style={{
                            animationDelay: `${idx * 0.04}s`,
                            boxShadow: [
                                cardStyle ? 'var(--circuit-shadow-md)' : 'var(--circuit-shadow-sm)',
                                p.accent_color ? `0 0 0 3px ${p.accent_color}` : null,
                            ].filter(Boolean).join(', '),
                        }}
                        className={`animate-fade-in flex flex-col items-center overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] ${
                            cardStyle
                                ? `border-circuit-ink ${cardStyle.cardBg}`
                                : 'border-slate-300 dark:border-border bg-white dark:bg-card'
                        }`}
                    >
                        <div className="relative h-32 w-full bg-gradient-to-b from-slate-50 dark:from-muted to-slate-200 dark:to-muted pb-2">
                            {cardStyle && (
                                <div className={`absolute right-2 top-2 rounded-full border-2 border-circuit-ink p-1.5 ${cardStyle.badgeBg}`} style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <cardStyle.Icon size={16} className={cardStyle.badgeIconColor} />
                                </div>
                            )}
                            <img
                                src={p.img_url || buildAvatarPlaceholder(p.nickname)}
                                alt={p.first_name}
                                className="h-full w-full rounded-2xl object-contain p-1"
                            />
                        </div>

                        <div className="flex w-full grow flex-col items-center p-4 text-center">
                            <span className="font-title mb-2 rounded-full border-2 border-emerald-700/30 bg-emerald-500 px-3 py-1 text-[9px] tracking-wide text-white">
                                {p.nickname?.toUpperCase()}
                            </span>

                            <h3 className="mb-3 text-base font-black capitalize tracking-tight text-slate-800 dark:text-foreground">
                                {p.first_name} {p.last_name}
                            </h3>

                            <button
                                type="button"
                                onClick={() => handlePlayerClick(p)}
                                className="font-title mt-auto cursor-pointer rounded-xl border-2 border-blue-800/30 bg-blue-600 px-4 py-2 text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-blue-700"
                                style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                            >
                                Visualizza Profilo
                            </button>
                        </div>
                    </div>
                )
            })}
        </>
    )
}

export default PlayerCard