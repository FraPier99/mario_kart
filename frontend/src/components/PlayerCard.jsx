import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { TIER_BADGE_IMAGES } from '@/lib/playerBadges'
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
                // Un giocatore avrà in futuro un tier per ogni gioco della lega —
                // questa riga è già pronta per più badge (oggi ne arriva sempre
                // al più uno, bestBadgeByPlayerId non porta ancora l'elenco
                // completo per gioco).
                const playerBadges = bestBadge ? [bestBadge] : []

                return (
                    // Nessuna colorazione bordo/sfondo legata al tier: stessa card
                    // neutra per tutti, è il badge illustrato a comunicare il
                    // livello (vedi riga badge sotto al nome).
                    <div
                        key={p.id}
                        style={{ animationDelay: `${idx * 0.04}s`, boxShadow: 'var(--circuit-shadow-sm)' }}
                        className="animate-fade-in flex flex-col items-center overflow-hidden rounded-2xl border-[1.5px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-300 hover:scale-[1.03]"
                    >
                        <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-800">
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
                            <p className="mt-1 text-[11px] font-semibold capitalize text-slate-500 dark:text-muted-foreground">
                                {p.first_name} {p.last_name}
                            </p>

                            {/* Riga badge — mai sovrapposta alla foto, scroll
                                orizzontale invece di andare a capo quando i badge
                                (un tier per gioco, in futuro) superano lo spazio. */}
                            {playerBadges.length > 0 && (
                                <div className="mt-2.5 mb-1 flex w-full items-center gap-1.5 overflow-x-auto">
                                    {playerBadges.map((b) => {
                                        const badgeImage = TIER_BADGE_IMAGES[b.tier]
                                        return badgeImage ? (
                                            <img
                                                key={b.game_id ?? b.tier}
                                                src={badgeImage}
                                                alt={`Badge ${b.label ?? b.tier}`}
                                                title={b.label ?? b.tier}
                                                className="h-8 w-8 shrink-0 object-contain"
                                                style={{ opacity: b.tier === 'sfidante' ? 0.85 : 1 }}
                                            />
                                        ) : (
                                            <div key={b.game_id ?? b.tier} className="shrink-0" title={b.label ?? b.tier}>
                                                <TierMedallion tier={b.tier} size={30} />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

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
