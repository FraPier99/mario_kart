import { Crown } from 'lucide-react'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { useAppData } from '@/context/AppDataContext'

const ModalPlayer = ({ player, stats, onClose }) => {
    const { charactersById, detailedTournaments } = useAppData()

    if (!player) return null

    const favoriteCharacter = charactersById.get(player.favorite_character_id) ?? null

    const playerStats = stats ?? {
        racesPlayed: 0,
        tournamentWins: 0,
        raceWins: 0,
        podiums: 0,
    }

    const wonTournaments = detailedTournaments.filter((t) => t.winner_id === player.id)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative max-h-[85vh] w-104 animate-fadeIn overflow-y-auto rounded-lg border-4 border-emerald-500 bg-white dark:bg-card p-5 shadow-lg">
                <button onClick={onClose} className="absolute right-2 top-2 z-10 text-2xl text-red-500 hover:text-red-700">
                    &times;
                </button>

                <div className="flex flex-col items-center justify-center">
                    <div>
                        <img
                            src={player.img_url || buildAvatarPlaceholder(player.nickname)}
                            alt={`${player.first_name} ${player.last_name}`}
                            className="mb-3 h-20 w-20 rounded-full object-cover object-center ring-4 ring-emerald-200"
                        />
                    </div>

                    <span className="mb-2 rounded-full border border-emerald-400 bg-emerald-500 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                        {player.nickname}
                    </span>

                    <h3 className="mb-3 text-lg font-black uppercase tracking-tight text-slate-800 dark:text-foreground">
                        {player.first_name} {player.last_name}
                    </h3>

                    <div className="mb-2 flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-1.5">
                        <img
                            src={favoriteCharacter?.img_url || buildAvatarPlaceholder(favoriteCharacter?.name ?? 'character')}
                            alt={favoriteCharacter ? favoriteCharacter.name : 'Nessun pg preferito'}
                            className="h-10 w-10 rounded-full object-cover object-center"
                        />
                        <div className="text-left">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">PG preferito</p>
                            <p className="text-xs font-bold text-slate-800 dark:text-foreground">
                                {favoriteCharacter ? favoriteCharacter.name : 'Nessun pg preferito'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 w-full rounded-2xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted p-4">
                    <h3 className="mb-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                        Statistiche Giocatore
                    </h3>

                    <div className="grid w-full grid-cols-2 gap-2">
                        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/60 dark:border-border/60 bg-white dark:bg-card p-3 text-center shadow-sm">
                            <span className="text-xl font-black text-slate-800 dark:text-foreground">{playerStats.racesPlayed || 0}</span>
                            <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Gare fatte</span>
                        </div>

                        <div className="flex flex-col items-center justify-center rounded-xl border border-amber-200/60 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950 p-3 text-center shadow-sm">
                            <span className="text-xl font-black text-amber-500">{playerStats.tournamentWins || 0}</span>
                            <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Tornei Vinti</span>
                        </div>

                        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/60 dark:border-border/60 bg-white dark:bg-card p-3 text-center shadow-sm">
                            <span className="text-xl font-black text-emerald-600">{playerStats.raceWins || 0}</span>
                            <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Vittorie</span>
                        </div>

                        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/60 dark:border-border/60 bg-white dark:bg-card p-3 text-center shadow-sm">
                            <span className="text-xl font-black text-blue-600">{playerStats.podiums || 0}</span>
                            <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Podi</span>
                        </div>
                    </div>

                    {wonTournaments.length > 0 && (
                        <div className="mt-3">
                            <h4 className="mb-1.5 text-center text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                                <Crown size={11} className="-mt-0.5 me-1 inline" />
                                Tornei vinti
                            </h4>
                            <div className="space-y-1">
                                {wonTournaments.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between rounded-xl bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-100"
                                    >
                                        <span>{t.name}</span>
                                        <span className="text-[9px] text-amber-600 dark:text-amber-400">{t.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ModalPlayer

    