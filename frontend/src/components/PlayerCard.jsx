import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { TIER_BADGE_IMAGES, TIER_BORDER_CLASSES, DEFAULT_TIER_BORDER } from '@/lib/playerBadges'
import TierMedallion from '@/components/community/badges/TierMedallion'

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
                const borderClass = TIER_BORDER_CLASSES[bestBadge?.tier] ?? DEFAULT_TIER_BORDER
                const badgeImage = bestBadge ? TIER_BADGE_IMAGES[bestBadge.tier] : null

                return (
                    // Un solo colore di rango per card — bordo sottile, coerente col
                    // badge in alto a destra — invece di più elementi colorati
                    // (riempimento pieno + pillola + bottone) in competizione tra loro.
                    <div
                        key={p.id}
                        style={{ animationDelay: `${idx * 0.04}s`, boxShadow: 'var(--circuit-shadow-sm)' }}
                        className={`animate-fade-in flex flex-col items-center overflow-hidden rounded-2xl border-[1.5px] bg-white dark:bg-slate-900 transition-all duration-300 hover:scale-[1.03] ${borderClass}`}
                    >
                        <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-800">
                            {bestBadge && (
                                badgeImage ? (
                                    <img
                                        src={badgeImage}
                                        alt={`Badge ${bestBadge.label ?? bestBadge.tier}`}
                                        className="absolute right-2 top-2 h-9 w-9 object-contain"
                                        style={{ opacity: bestBadge.tier === 'sfidante' ? 0.85 : 1 }}
                                    />
                                ) : (
                                    <div className="absolute right-2 top-2">
                                        <TierMedallion tier={bestBadge.tier} size={36} />
                                    </div>
                                )
                            )}
                            <img
                                src={p.img_url || buildAvatarPlaceholder(p.nickname)}
                                alt={p.first_name}
                                className="h-full w-full object-contain p-1"
                            />
                        </div>

                        <div className="flex w-full grow flex-col items-center p-4 text-center">
                            <h3 className="text-xl font-black text-slate-900 dark:text-foreground leading-tight">
                                {p.nickname}
                            </h3>
                            <p className="mt-1 mb-3 text-[11px] font-semibold capitalize text-slate-500 dark:text-muted-foreground">
                                {p.first_name} {p.last_name}
                            </p>

                            <button
                                type="button"
                                onClick={() => handlePlayerClick(p)}
                                className="font-title mt-auto cursor-pointer rounded-xl border-[1.5px] border-circuit-blue bg-transparent px-4 py-2 text-[10px] tracking-wide text-blue-600 dark:text-blue-300 transition active:translate-y-px hover:bg-circuit-blue/10"
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
