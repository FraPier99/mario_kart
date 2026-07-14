import { useMemo, useState } from 'react'
import { HelpCircle, ChevronDown } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import LeaderboardTable from '@/components/stats/LeaderboardTable'
import PodiumSteps from '@/components/stats/PodiumSteps'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useCommunityUserNav } from '@/hooks/useCommunityUserNav'
import ApiBanner from '@/components/common/ApiBanner'


const ScoreLegend = () => {
    const [open, setOpen] = useState(false)

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground transition hover:bg-slate-50 dark:hover:bg-white/5"
            >
                <HelpCircle size={12} className="text-emerald-500" />
                Come funziona la classifica?
                <ChevronDown size={11} className="shrink-0" />
            </button>
        )
    }

    return (
        <div className="mb-6 overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-border bg-white dark:bg-card">
            <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/3"
            >
                <div className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-emerald-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-foreground">
                        Come funziona la classifica?
                    </span>
                </div>
                <ChevronDown size={13} className="shrink-0 text-slate-400 rotate-180" />
            </button>
            <div className="grid gap-5 border-t border-slate-100 dark:border-border px-5 py-4 sm:grid-cols-2">
                    <div>
                        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Criteri di ordinamento (globale)</p>
                        <ol className="space-y-2 text-xs text-slate-600 dark:text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-slate-900 leading-none">1</span>
                                <span><strong className="text-slate-800 dark:text-foreground">Tornei vinti</strong> — criterio principale</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[8px] font-black text-slate-900 leading-none">2</span>
                                <span><strong className="text-slate-800 dark:text-foreground">Placement Index</strong> — media piazzamenti normalizzata 0–100%. Neutrale per numero di gare e dimensione griglia.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-400 text-[8px] font-black text-slate-900 leading-none">3</span>
                                <span><strong className="text-slate-800 dark:text-foreground">Podium Rate %</strong> — percentuale podi</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600 text-[8px] font-black text-slate-700 dark:text-slate-300 leading-none">4</span>
                                <span><strong className="text-slate-800 dark:text-foreground">Gare giocate</strong> — più partite = più esperienza</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-400 dark:bg-slate-500 text-[8px] font-black text-slate-700 dark:text-slate-300 leading-none">5</span>
                                <span><strong className="text-slate-800 dark:text-foreground">Nickname</strong> — ordine alfabetico finale</span>
                            </li>
                        </ol>
                    </div>
                    <div>
                        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Formule delle colonne</p>
                        <ul className="space-y-2 text-xs">
                            <li className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 text-slate-600 dark:text-muted-foreground">
                                <span className="font-black text-emerald-600 dark:text-emerald-400">Placement Index %</span> = media del piazzamento normalizzato per ogni gara.<br />
                                Ogni posizione viene convertita in 0–100%: 1° = 100%, ultimo = 0%.<br />
                                Un torneo con griglie da 8 e uno da 4 sono confrontabili equamente.
                            </li>
                            <li className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 text-slate-600 dark:text-muted-foreground">
                                <span className="font-black text-emerald-600 dark:text-emerald-400">Win Rate %</span> = gare vinte ÷ gare giocate × 100
                            </li>
                            <li className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 text-slate-600 dark:text-muted-foreground">
                                <span className="font-black text-blue-600 dark:text-blue-400">Podium Rate %</span> = podi ÷ gare giocate × 100
                            </li>
                            <li className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 text-slate-600 dark:text-muted-foreground">
                                <span className="font-black text-slate-700 dark:text-slate-300">Efficienza Media %</span> = media del rapporto punti giocatore / punti vincitore per ogni torneo giocato
                            </li>
                        </ul>
                    </div>
                </div>
        </div>
    )
}

const Stats = () => {
    const { leaderboardRows, loading, errorMessage, refresh, charactersById, games, getLeaderboardByGame } = useAppData()
    const { user, isSuperadmin } = useAuth()
    const { users, goToPlayerProfile } = useCommunityUserNav()
    const [selectedGameId, setSelectedGameId] = useState('')

    const superadminPlayerIds = useMemo(() => {
        return new Set(
            users.filter(u => u.role === 'superadmin').map(u => u.player_id).filter(Boolean)
        )
    }, [users])

    const filteredRows = useMemo(() => {
        const base = !selectedGameId ? leaderboardRows : getLeaderboardByGame(selectedGameId)
        return base.filter(row => !superadminPlayerIds.has(row.playerId))
    }, [selectedGameId, leaderboardRows, getLeaderboardByGame, superadminPlayerIds])

    const selectedGame = selectedGameId ? games.find((g) => g.id === Number(selectedGameId)) : null
    // getLeaderboardByGame ritorna sempre una riga per giocatore (con stats
    // a zero come fallback), mai un array vuoto — quindi "nessun torneo per
    // questo gioco" si verifica controllando che nessuno abbia mai giocato
    // un torneo per quel gioco, non la lunghezza dell'array.
    const hasGameActivity = !selectedGameId || filteredRows.some((r) => (r.tournamentsPlayed ?? 0) > 0)

    // Il podio mostra già i dati dei primi 3 (con le stesse metriche della
    // tabella, stile arcade) — la tabella sotto parte dal 4° posto per non
    // ripeterli.
    const showPodium = filteredRows.length >= 3
    const podiumPlayers = showPodium
        ? filteredRows.slice(0, 3).map((r) => ({
            ...r,
            stats: [
                { label: 'Tornei', value: r.tournamentWins },
                { label: 'Placement', value: `${r.placementIndex ?? 0}%` },
                { label: 'Vittorie', value: r.raceWins },
                { label: 'Podi', value: r.podiums },
            ],
        }))
        : []
    const tableRows = showPodium ? filteredRows.slice(3) : filteredRows

    const handlePlayerClick = (row) => {
        goToPlayerProfile(row.playerId)
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-12">
                <div className="mb-8 text-center">
                    <p className="font-title text-[10px] tracking-wide text-emerald-600 dark:text-emerald-400">Classifica generale</p>
                    <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Tornei vinti, placement e podi</h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
                        La classifica ordina i piloti per tornei vinti, placement index (media piazzamenti normalizzata) e podi rate. I punti assoluti sono solo informativi.
                    </p>
                    <div className="mt-4 flex justify-center">
                        <select
                            value={selectedGameId}
                            onChange={(e) => setSelectedGameId(e.target.value)}
                            className="font-title rounded-xl border-2 border-slate-300 dark:border-border bg-white dark:bg-card px-4 py-2.5 text-[10px] tracking-wide outline-none focus:border-emerald-500"
                        >
                            <option value="">Tutti i giochi</option>
                            {games.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 dark:border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 md:p-8">

                <ApiBanner
                    title="Errore classifica"
                    message={errorMessage}
                    action={errorMessage ? (
                        <button
                            type="button"
                            onClick={refresh}
                            className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
                        >
                            Riprova
                        </button>
                    ) : null}
                />

                <ScoreLegend />

                {loading ? (
                    <div className="space-y-3">
                        {[1,2,3,4,5].map((i) => (
                            <div key={i} className="flex items-center gap-4 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 animate-pulse">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-muted">
                                    <span className="text-sm font-black text-slate-300 dark:text-muted-foreground">#{i}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-muted" />
                                    <div className="space-y-1.5">
                                        <div className="h-4 w-28 rounded bg-slate-200 dark:bg-muted" />
                                        <div className="h-3 w-20 rounded bg-slate-200/60 dark:bg-muted/60" />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    {[1,2,3,4].map((j) => (
                                        <div key={j} className="h-6 w-10 rounded bg-slate-200 dark:bg-muted" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : selectedGame && !hasGameActivity ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center text-sm text-slate-500 dark:text-muted-foreground">
                        Nessun torneo ancora svolto per {selectedGame.name}.
                    </div>
                ) : (
                    <>
                        <div className="mb-3">
                            <PodiumSteps players={podiumPlayers} onPlayerClick={handlePlayerClick} />
                        </div>
                        <LeaderboardTable
                            rows={tableRows}
                            startIndex={showPodium ? 3 : 0}
                            charactersById={charactersById}
                            highlightPlayerId={user?.player_id ?? user?.player?.id ?? null}
                            isSuperadmin={isSuperadmin}
                            onPlayerClick={handlePlayerClick}
                        />
                    </>
                )}
                </div>
            </section>
        </AppLayout>
    )
}

export default Stats
