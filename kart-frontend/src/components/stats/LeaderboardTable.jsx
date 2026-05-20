import { buildAvatarPlaceholder } from '@/lib/placeholders'

const LeaderboardTable = ({ rows, showTournamentWins = true, charactersById = null }) => {
    if (!rows.length) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-6 text-sm text-slate-500 dark:text-muted-foreground dark:text-muted-foreground">
                Nessun dato disponibile per la classifica.
            </div>
        )
    }

    const resolveCharacter = (row) => {
        if (!charactersById) return null
        const charId = row.favoriteCharacterId || row.favorite_character_id || row.lastCharacterId
        if (!charId) return null
        return charactersById.get(charId) ?? null
    }

    const charImage = (character) => {
        if (character?.img_url) return character.img_url
        return buildAvatarPlaceholder(character?.name ?? '')
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20">
            {/* Vista mobile: cards */}
            <div className="divide-y divide-slate-100 dark:divide-border md:hidden">
                {rows.map((row, index) => {
                    const character = resolveCharacter(row)
                    const characterName = character?.name

                    return (
                        <div key={row.playerId} className="px-4 py-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black text-slate-400 dark:text-muted-foreground">#{index + 1}</span>
                                {showTournamentWins && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
                                        {row.tournamentWins} tornei
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <img
                                    src={row.img_url || buildAvatarPlaceholder(row.nickname)}
                                    alt={row.nickname}
                                    className="h-10 w-10 rounded-full object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                    <div className="font-black text-slate-900 dark:text-foreground truncate">{row.nickname}</div>
                                    <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-muted-foreground truncate">
                                        {row.first_name} {row.last_name}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                {characterName ? (
                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-muted-foreground">
                                        <img src={charImage(character)} alt={characterName} className="h-5 w-5 rounded-full object-cover shrink-0" />
                                        <span className="text-xs font-medium">{characterName}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-300 dark:text-muted-foreground">—</span>
                                )}
                                <span className="ml-auto text-xs font-black text-emerald-700">{row.raceWins} vittorie</span>
                                <span className="text-xs font-black text-blue-700">{row.podiums} podi</span>
                                <span className="text-xs font-black text-slate-900 dark:text-foreground">{row.points} pt</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Vista desktop: tabella */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-[600px] w-full text-left">
                    <thead className="bg-slate-50 dark:bg-muted text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                        <tr>
                            <th className="px-5 py-4">Pos</th>
                            <th className="px-5 py-4">Giocatore</th>
                            <th className="px-5 py-4">Personaggio</th>
                            {showTournamentWins && <th className="px-5 py-4">Tornei vinti</th>}
                            <th className="px-5 py-4">Gare vinte</th>
                            <th className="px-5 py-4">Podi</th>
                            <th className="px-5 py-4">Punti</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const character = resolveCharacter(row)
                            const characterName = character?.name

                            return (
                                <tr key={row.playerId} className="border-t border-slate-100 dark:border-border">
                                    <td className="px-5 py-4 text-sm font-black text-slate-500 dark:text-muted-foreground">{index + 1}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={row.img_url || buildAvatarPlaceholder(row.nickname)}
                                                alt={row.nickname}
                                                className="h-8 w-8 rounded-full object-cover shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-900 dark:text-foreground truncate">{row.nickname}</div>
                                                <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-muted-foreground truncate">
                                                    {row.first_name} {row.last_name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        {characterName ? (
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={charImage(character)}
                                                    alt={characterName}
                                                    className="h-6 w-6 rounded-full object-cover shrink-0"
                                                />
                                                <span className="text-sm font-medium text-slate-700 dark:text-muted-foreground truncate">{characterName}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-400 dark:text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    {showTournamentWins && (
                                        <td className="px-5 py-4 text-sm font-black text-amber-700">{row.tournamentWins}</td>
                                    )}
                                    <td className="px-5 py-4 text-sm font-black text-emerald-700">{row.raceWins}</td>
                                    <td className="px-5 py-4 text-sm font-black text-blue-700">{row.podiums}</td>
                                    <td className="px-5 py-4 text-sm font-black text-slate-900 dark:text-foreground">{row.points}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default LeaderboardTable