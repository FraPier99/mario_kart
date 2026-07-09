import { Crown } from 'lucide-react'
import { buildAvatarPlaceholder } from '@/lib/placeholders'

const PlayerCard = ({ players, statsByPlayerId, handlePlayerClick }) => {
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
                const playerStats = statsByPlayerId?.get(p.id)
                const isWinner = (playerStats?.tournamentWins ?? 0) > 0

                return (
                    <div
                        key={p.id}
                        style={{
                            animationDelay: `${idx * 0.04}s`,
                            boxShadow: isWinner ? 'var(--circuit-shadow-md)' : 'var(--circuit-shadow-sm)',
                        }}
                        className={`animate-fade-in flex flex-col items-center overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] ${
                            isWinner
                                ? 'border-circuit-ink bg-linear-to-br from-amber-100/90 via-amber-50/60 to-amber-100/80 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60'
                                : 'border-slate-300 dark:border-border bg-white dark:bg-card'
                        }`}
                    >
                        <div className="relative h-32 w-full bg-gradient-to-b from-slate-50 dark:from-muted to-slate-200 dark:to-muted pb-2">
                            {isWinner && (
                                <div className="absolute right-2 top-2 rounded-full border-2 border-circuit-ink bg-circuit-gold p-1.5" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <Crown size={16} className="text-circuit-ink" />
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

                            <h3 className="mb-3 text-base font-black uppercase tracking-tight text-slate-800 dark:text-foreground">
                                {p.first_name?.toUpperCase()} {p.last_name?.toUpperCase()}
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