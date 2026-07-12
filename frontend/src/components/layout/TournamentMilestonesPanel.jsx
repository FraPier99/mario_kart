import { buildAvatarPlaceholder } from '@/lib/placeholders'

// Traguardi automatici (prima partecipazione / primo podio / prima
// vittoria) rilevati da detectTournamentMilestones — vedi @/lib/milestones.
// Nessuno stato vuoto: se non c'è nulla da mostrare, il componente non
// renderizza nulla (il chiamante lo condiziona su milestones.length > 0).
const TournamentMilestonesPanel = ({ milestones = [] }) => {
    if (milestones.length === 0) return null

    const byPlayer = new Map()
    milestones.forEach((m) => {
        if (!byPlayer.has(m.playerId)) {
            byPlayer.set(m.playerId, { playerId: m.playerId, nickname: m.nickname, img_url: m.img_url, badges: [] })
        }
        byPlayer.get(m.playerId).badges.push(m)
    })

    return (
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-emerald-400/40 dark:border-emerald-500/20 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600/70 dark:text-emerald-400/60">Traguardi</p>
            <div className="space-y-1.5">
                {Array.from(byPlayer.values()).map((player) => (
                    <div key={player.playerId} className="flex items-center gap-2 rounded-xl bg-white/30 dark:bg-black/15 px-2 py-1.5">
                        <img
                            src={player.img_url || buildAvatarPlaceholder(player.nickname)}
                            alt={player.nickname}
                            loading="lazy"
                            decoding="async"
                            className="h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                        <span className="min-w-0 shrink-0 truncate text-xs font-bold capitalize text-slate-800 dark:text-foreground">{player.nickname}</span>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {player.badges.map((badge) => (
                                <span key={badge.key} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                    {badge.icon} {badge.label}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TournamentMilestonesPanel
