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
                        data-player-card
                        style={{ animationDelay: `${idx * 0.04}s` }}
                        className={`animate-fade-in flex flex-col items-center overflow-hidden rounded-2xl border transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${
                            isWinner
                                ? 'border-amber-400/50 dark:border-amber-500/30 bg-linear-to-br from-amber-100/90 via-amber-50/60 to-amber-100/80 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60 shadow-lg shadow-amber-300/30 dark:shadow-amber-950/40 ring-1 ring-amber-400/30 dark:ring-amber-500/20'
                                : 'border-gray-100 dark:border-border bg-white dark:bg-card shadow-sm'
                        }`}
                    >
                        <div className="relative h-32 w-full bg-gradient-to-b from-slate-50 dark:from-muted to-slate-200 dark:to-muted pb-2">
                            {isWinner && (
                                <div className="absolute right-2 top-2 rounded-full bg-amber-400 p-1.5 shadow-lg">
                                    <Crown size={16} className="text-amber-950" />
                                </div>
                            )}
                            <img
                                src={p.img_url || buildAvatarPlaceholder(p.nickname)}
                                alt={p.first_name}
                                className="h-full w-full rounded-2xl object-contain p-1"
                            />
                        </div>

                        <div className="flex w-full grow flex-col items-center p-4 text-center">
                            <span className="mb-2 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                                {p.nickname?.toUpperCase()}
                            </span>

                            <h3 className="mb-3 text-base font-black uppercase tracking-tight text-slate-800 dark:text-foreground">
                                {p.first_name?.toUpperCase()} {p.last_name?.toUpperCase()}
                            </h3>

                            <button
                                onClick={(e) => handlePlayerClick(p, e)}
                                className="mt-auto cursor-pointer rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
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