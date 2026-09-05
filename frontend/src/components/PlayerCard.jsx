import { User, ArrowRight } from 'lucide-react'
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
                        <div className="relative h-24 w-full bg-slate-100 dark:bg-slate-800 sm:h-32">
                            <img
                                src={p.img_url || buildAvatarPlaceholder(p.nickname)}
                                alt={p.first_name}
                                className="h-full w-full object-contain p-1"
                            />
                        </div>

                        <div className="flex w-full grow flex-col items-center p-2.5 text-center sm:p-4">
                            <h3 className="truncate text-base font-black text-slate-900 dark:text-foreground leading-tight sm:text-xl">
                                {p.nickname}
                            </h3>
                            <p className="mt-1 truncate text-[10px] font-semibold capitalize text-slate-500 dark:text-muted-foreground sm:text-[11px]">
                                {p.first_name} {p.last_name}
                            </p>

                            {/* Riga badge — mai sovrapposta alla foto, scroll
                                orizzontale invece di andare a capo quando i badge
                                (un tier per gioco, in futuro) superano lo spazio. */}
                            {playerBadges.length > 0 && (
                                <div className="mt-2 mb-1 flex w-full max-w-full items-center justify-center gap-1.5 overflow-x-auto">
                                    {playerBadges.map((b) => {
                                        const badgeImage = TIER_BADGE_IMAGES[b.tier]
                                        return badgeImage ? (
                                            <img
                                                key={b.game_id ?? b.tier}
                                                src={badgeImage}
                                                alt={`Badge ${b.label ?? b.tier}`}
                                                title={b.label ?? b.tier}
                                                className="h-8 w-8 shrink-0 object-contain sm:h-11 sm:w-11"
                                                style={{ opacity: b.tier === 'sfidante' ? 0.85 : 1 }}
                                            />
                                        ) : (
                                            <div key={b.game_id ?? b.tier} className="shrink-0" title={b.label ?? b.tier}>
                                                <TierMedallion tier={b.tier} size={32} />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Label accorciata ("Profilo" invece di "Visualizza
                                Profilo") — su una card stretta a 2 colonne su
                                mobile, il testo più lungo andava a capo su due
                                righe con un pulsante enorme e sproporzionato. */}
                            <button
                                type="button"
                                onClick={() => handlePlayerClick(p)}
                                className="font-title mt-auto flex w-full cursor-pointer items-center justify-center gap-1 rounded-xl border-[1.5px] border-circuit-blue bg-transparent px-2 py-1.5 text-[9px] tracking-wide whitespace-nowrap text-blue-600 dark:text-blue-300 transition active:translate-y-px hover:bg-circuit-blue/10 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-[10px]"
                            >
                                <User size={11} className="shrink-0" />
                                Profilo
                                <ArrowRight size={11} className="shrink-0" />
                            </button>
                        </div>
                    </div>
                )
            })}
        </>
    )
}

export default PlayerCard
