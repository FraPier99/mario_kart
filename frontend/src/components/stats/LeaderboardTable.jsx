import { buildAvatarPlaceholder } from '@/lib/placeholders'

const LeaderboardTable = ({ rows, showTournamentWins = true, charactersById = null, theme = null, highlightPlayerId = null, isSuperadmin = false, onPlayerClick = null, startIndex = 0 }) => {
    if (!rows.length) {
        // startIndex > 0 vuol dire che questa tabella continua un podio già
        // mostrato sopra (es. rows = standings.slice(3)) — vuota in quel
        // caso è legittimo (torneo con solo 3 partecipanti), non un errore:
        // mostrare "Nessun dato disponibile" qui contraddiceva il podio
        // pieno appena sopra. Il messaggio resta solo quando la tabella è
        // l'unica fonte di classifica (startIndex === 0).
        if (startIndex > 0) return null
        return (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-6 text-sm text-slate-500 dark:text-muted-foreground">
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

    const resolveUsedCharacters = (row) => {
        if (!charactersById) return []
        const usedIds = Array.isArray(row.usedCharacterIds) ? row.usedCharacterIds : []
        if (!usedIds.length) {
            const single = resolveCharacter(row)
            return single ? [single] : []
        }
        return usedIds
            .map((id) => charactersById.get(id) ?? null)
            .filter(Boolean)
    }

    const charImage = (character) => {
        if (character?.img_url) return character.img_url
        return buildAvatarPlaceholder(character?.name ?? '')
    }

    // Medaglia circolare per il podio (1°/2°/3°), numero nudo oltre —
    // vedi piano "Circuito": le posizioni podio si leggono a colpo
    // d'occhio invece di dover distinguere solo dal colore del testo.
    const medalClasses = (index) => {
        if (index === 0) return 'bg-circuit-gold text-circuit-ink border-circuit-ink'
        if (index === 1) return 'bg-slate-300 text-slate-800 border-circuit-ink'
        if (index === 2) return 'bg-orange-400 text-orange-950 border-circuit-ink'
        return 'bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground border-transparent'
    }

    const PositionBadge = ({ index, size = 'md' }) => (
        <span
            className={`inline-flex items-center justify-center rounded-full font-title shrink-0 ${medalClasses(index)} ${size === 'lg' ? 'h-9 w-9 text-sm border-2' : 'h-7 w-7 text-xs border-2'}`}
        >
            {index + 1}
        </span>
    )

    const placementTextColor = (index) => {
        if (index === 0) return 'text-emerald-600 dark:text-emerald-400'
        if (index === 1) return 'text-emerald-500 dark:text-emerald-300'
        if (index === 2) return 'text-emerald-400 dark:text-emerald-200'
        return 'text-slate-700 dark:text-slate-300'
    }

    const podiumBg = (index) => {
        if (index === 0) return 'bg-amber-50 dark:bg-amber-950/20'
        if (index === 1) return 'bg-slate-50 dark:bg-slate-800/30'
        if (index === 2) return 'bg-orange-50 dark:bg-orange-950/20'
        return ''
    }

    const podiumBgMobile = (index) => {
        if (index === 0) return 'border-l-4 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
        if (index === 1) return 'border-l-4 border-slate-300 bg-slate-50/50 dark:bg-slate-800/30'
        if (index === 2) return 'border-l-4 border-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
        return ''
    }

    // L'intera cella giocatore è cliccabile (non solo il testo del nickname):
    // un piccolo testo come unico target era troppo facile da mancare,
    // specialmente su mobile — il problema persisteva anche dopo aver
    // ingrandito leggermente il padding del solo nickname.
    const PlayerCell = ({ row, charactersUsed, onPlayerClick }) => (
        <button
            type="button"
            onClick={() => onPlayerClick?.(row)}
            className="-m-2 flex items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer"
        >
            <div className="shrink-0">
                <img
                    src={row.img_url || buildAvatarPlaceholder(row.nickname)}
                    alt={row.nickname}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-full object-cover shrink-0"
                />
            </div>
            <div className="min-w-0">
                <p className="truncate font-black text-slate-900 dark:text-foreground capitalize hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                    {row.nickname}
                </p>
                <div className="text-xs text-slate-500 dark:text-muted-foreground truncate capitalize">
                    {row.first_name} {row.last_name}
                </div>
                {charactersUsed.length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 overflow-x-auto">
                        {charactersUsed.slice(0, 6).map((character) => (
                            <img
                                key={character.id}
                                src={charImage(character)}
                                alt={character.name}
                                title={character.name}
                                loading="lazy"
                                decoding="async"
                                className="h-6 w-6 rounded-full border border-white/70 dark:border-slate-700 object-cover shrink-0"
                            />
                        ))}
                    </div>
                )}
            </div>
        </button>
    )

    return (
        <div
            className="h-full overflow-hidden rounded-2xl border-2 border-slate-900 dark:border-white/20 bg-white dark:bg-card flex flex-col"
            style={{ boxShadow: 'var(--circuit-shadow-md)' }}
        >
            <div className="divide-y divide-slate-200 dark:divide-border md:hidden">
                {rows.map((row, index) => {
                    const absoluteIndex = startIndex + index
                    const charactersUsed = resolveUsedCharacters(row)
                    const isCurrentUser = !isSuperadmin && highlightPlayerId != null && row.playerId === highlightPlayerId

                    return (
                        <div key={row.playerId} className={`px-4 py-4 space-y-2 ${isCurrentUser ? `${theme?.tailwind?.bgSoft ?? 'bg-amber-500/10'} border-l-4 ${theme?.tailwind?.border ?? 'border-amber-500'}` : podiumBgMobile(absoluteIndex)}`}>
                            <div className="flex items-center justify-between gap-2">
                                <PositionBadge index={absoluteIndex} size="lg" />
                                {showTournamentWins && (
                                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-black text-amber-700 dark:text-amber-400">
                                        {row.tournamentWins} vinti / {row.tournamentsPlayed} fatti
                                    </span>
                                )}
                            </div>
                            <PlayerCell row={row} charactersUsed={charactersUsed} onPlayerClick={onPlayerClick} />
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex flex-col gap-0.5">
                                    {showTournamentWins ? (
                                        <>
                                            <span className={`text-sm font-black ${placementTextColor(absoluteIndex)}`}>{row.placementIndex ?? 0}%</span>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">placement</span>
                                            <span className="text-[10px] text-slate-400">{row.points} pt</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className={`text-sm font-black ${placementTextColor(absoluteIndex)}`}>{row.points} pt</span>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">punti</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{row.raceWins} vittorie</span>
                                    <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(row.winRate ?? 0, 100)}%` }} />
                                    </div>
                                    <span className="text-[10px] text-slate-400">{row.winRate}% WR</span>
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-xs font-black text-blue-700 dark:text-blue-400">{row.podiums} podi</span>
                                    <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.min(row.podiumRate ?? 0, 100)}%` }} />
                                    </div>
                                    <span className="text-[10px] text-slate-400">{row.podiumRate}% gare</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="hidden md:block flex-1 overflow-x-auto overflow-y-auto">
                <table className="min-w-[600px] w-full text-left">
                    <thead className="bg-slate-50 dark:bg-muted font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">
                        <tr>
                            <th className="px-5 py-4 text-center">Pos</th>
                            <th className="px-5 py-4 text-center">Giocatore</th>
                            <th className="px-5 py-4 text-center text-emerald-600 dark:text-emerald-400">{showTournamentWins ? 'Placement' : 'Punti'}</th>
                            {showTournamentWins && <th className="px-5 py-4 text-center">Tornei vinti</th>}
                            <th className="px-5 py-4 text-center">Gare vinte</th>
                            <th className="px-5 py-4 text-center">Podi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const absoluteIndex = startIndex + index
                            const charactersUsed = resolveUsedCharacters(row)
                            const isCurrentUser = !isSuperadmin && highlightPlayerId != null && row.playerId === highlightPlayerId

                            return (
                                <tr key={row.playerId} className={`border-b border-slate-200 dark:border-slate-800/50 ${isCurrentUser ? `${theme?.tailwind?.bgSoft ?? 'bg-amber-500/10'} border-l-4 ${theme?.tailwind?.border ?? 'border-amber-500'}` : podiumBg(absoluteIndex)}`}>
                                    <td className="px-5 py-4 text-center align-middle">
                                        <PositionBadge index={absoluteIndex} size="lg" />
                                    </td>
                                    <td className="px-5 py-4 text-center align-middle w-[35%]">
                                        <div className="flex justify-center">
                                            <PlayerCell row={row} charactersUsed={charactersUsed} onPlayerClick={onPlayerClick} />
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center align-middle">
                                        {showTournamentWins ? (
                                            <>
                                                <span className={`text-lg font-black ${placementTextColor(absoluteIndex)}`}>{row.placementIndex ?? 0}%</span>
                                                <div className="text-[10px] text-slate-400 leading-tight">{row.points} pt</div>
                                            </>
                                        ) : (
                                            <span className={`text-lg font-black ${placementTextColor(absoluteIndex)}`}>{row.points} pt</span>
                                        )}
                                    </td>
                                    {showTournamentWins && (
                                        <td className="px-5 py-4 text-center align-middle">
                                            <span className="text-sm font-black text-amber-700 dark:text-amber-400">{row.tournamentWins}</span>
                                            <div className="text-[10px] text-slate-400 leading-tight">di {row.tournamentsPlayed}</div>
                                        </td>
                                    )}
                                    <td className="px-5 py-4 text-center align-middle">
                                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{row.raceWins}</span>
                                        <div className="mt-1 h-1 w-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                            <div className="h-full rounded-full bg-emerald-400 dark:bg-emerald-500 transition-all" style={{ width: `${Math.min(row.winRate ?? 0, 100)}%` }} />
                                        </div>
                                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{row.winRate}% WR</div>
                                    </td>
                                    <td className="px-5 py-4 text-center align-middle">
                                        <span className="text-sm font-black text-blue-700 dark:text-blue-400">{row.podiums}</span>
                                        <div className="mt-1 h-1 w-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                            <div className="h-full rounded-full bg-blue-400 dark:bg-blue-500 transition-all" style={{ width: `${Math.min(row.podiumRate ?? 0, 100)}%` }} />
                                        </div>
                                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{row.podiumRate}% gare</div>
                                    </td>
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