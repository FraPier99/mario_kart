import { buildAvatarPlaceholder } from '@/lib/placeholders'
import PlayerLink from '@/components/common/PlayerLink'

// Ranking per-circuito: gare giocate/vittorie/podi/posizione media. Righe
// dalla forma di app/services/tornei/stats.py::get_circuit_stats_detail
// (player_id, player_nickname, races_played, wins, podiums, podium_rate,
// avg_position) — contratto diverso da LeaderboardTable (che è a livello
// torneo con points/placementIndex/tournamentWins), quindi componente a parte.
const CircuitRankingTable = ({ rows, playersById = null }) => {
    if (!rows?.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-6 text-sm text-slate-500 dark:text-muted-foreground">
                Nessun dato disponibile per questo circuito.
            </div>
        )
    }

    const avatarFor = (row) => playersById?.get(row.player_id)?.img_url || buildAvatarPlaceholder(row.player_nickname)

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card">
            <div className="divide-y divide-slate-200 dark:divide-border md:hidden">
                {rows.map((row, index) => (
                    <div key={row.player_id} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-muted text-xs font-black text-slate-600 dark:text-muted-foreground">
                            {index + 1}
                        </span>
                        <img src={avatarFor(row)} alt={row.player_nickname} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        <div className="min-w-0 flex-1">
                            <PlayerLink playerId={row.player_id} className="block truncate text-sm font-black text-slate-800 dark:text-foreground uppercase">
                                {row.player_nickname}
                            </PlayerLink>
                            <p className="text-[10px] text-slate-400 dark:text-muted-foreground">
                                {row.races_played} gare · {row.wins} vittorie · {row.podiums} podi
                            </p>
                        </div>
                        <div className="text-right text-xs font-black text-slate-500 dark:text-muted-foreground">
                            #{row.avg_position ?? '-'}
                        </div>
                    </div>
                ))}
            </div>

            <table className="hidden w-full text-left text-sm md:table">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-border text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                        <th className="px-4 py-3">Pos</th>
                        <th className="px-4 py-3">Giocatore</th>
                        <th className="px-4 py-3 text-right">Gare giocate</th>
                        <th className="px-4 py-3 text-right">Vittorie</th>
                        <th className="px-4 py-3 text-right">Podi</th>
                        <th className="px-4 py-3 text-right">Posizione media</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={row.player_id} className={`border-b border-slate-100 dark:border-border ${index % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50/50 dark:bg-muted/50'}`}>
                            <td className="px-4 py-3 font-black text-slate-500 dark:text-muted-foreground">{index + 1}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                    <img src={avatarFor(row)} alt={row.player_nickname} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                                    <PlayerLink playerId={row.player_id} className="font-bold text-slate-800 dark:text-foreground uppercase hover:text-emerald-600 dark:hover:text-emerald-400">
                                        {row.player_nickname}
                                    </PlayerLink>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-muted-foreground">{row.races_played}</td>
                            <td className="px-4 py-3 text-right">
                                <span className="font-black text-emerald-600">{row.wins}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex flex-col items-end gap-1">
                                    <span className="font-black text-blue-600">{row.podiums}</span>
                                    <div className="h-1 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.min(row.podium_rate ?? 0, 100)}%` }} />
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-muted-foreground">
                                {row.avg_position != null ? `#${row.avg_position}` : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default CircuitRankingTable
