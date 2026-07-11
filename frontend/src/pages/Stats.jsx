import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, HelpCircle, ChevronDown } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import LeaderboardTable from '@/components/stats/LeaderboardTable'
import PodiumSteps from '@/components/stats/PodiumSteps'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import ApiBanner from '@/components/common/ApiBanner'
import { authApi } from '@/services/apiClient'
import { downloadCSV } from '@/lib/utils'

const ScoreLegend = () => {
    const [open, setOpen] = useState(false)
    return (
        <div className="mb-6 overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-border bg-white dark:bg-card">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/3"
            >
                <div className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-emerald-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-foreground">
                        Come funziona la classifica?
                    </span>
                </div>
                <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
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
            )}
        </div>
    )
}

const Stats = () => {
    const { leaderboardRows, homeMetrics, loading, errorMessage, refresh, charactersById, games, getLeaderboardByGame, getHomeMetricsByGame, players } = useAppData()
    const { user, isSuperadmin } = useAuth()
    const navigate = useNavigate()
    const [selectedGameId, setSelectedGameId] = useState('')
    const [users, setUsers] = useState([])

    // listUsers() (/auth/users) è riservato al superadmin: un utente normale
    // riceveva un 403 silenzioso (.catch vuoto), restava con users=[] per
    // sempre e il click sul nickname in classifica non trovava mai lo user_id
    // a cui navigare — sembrava "non fare nulla". listCommunityUsers()
    // (/auth/community/users) è pubblico (solo autenticazione) e basta per
    // questa mappatura playerId → user.id.
    useEffect(() => {
        authApi.listCommunityUsers().then(res => setUsers(res.data ?? [])).catch(() => {})
    }, [])

    const superadminPlayerIds = useMemo(() => {
        return new Set(
            users.filter(u => u.role === 'superadmin').map(u => u.player_id).filter(Boolean)
        )
    }, [users])

    const filteredRows = useMemo(() => {
        const base = !selectedGameId ? leaderboardRows : getLeaderboardByGame(selectedGameId)
        return base.filter(row => !superadminPlayerIds.has(row.playerId))
    }, [selectedGameId, leaderboardRows, getLeaderboardByGame, superadminPlayerIds])

    const metrics = useMemo(() => {
        if (!selectedGameId) return homeMetrics
        return getHomeMetricsByGame(selectedGameId)
    }, [selectedGameId, homeMetrics, getHomeMetricsByGame])

    const selectedGame = selectedGameId ? games.find((g) => g.id === Number(selectedGameId)) : null
    // getLeaderboardByGame ritorna sempre una riga per giocatore (con stats
    // a zero come fallback), mai un array vuoto — quindi "nessun torneo per
    // questo gioco" si verifica controllando che nessuno abbia mai giocato
    // un torneo per quel gioco, non la lunghezza dell'array.
    const hasGameActivity = !selectedGameId || filteredRows.some((r) => (r.tournamentsPlayed ?? 0) > 0)

    const handlePlayerClick = (row) => {
        const user = users.find(u => u.player_id === row.playerId)
        if (user) {
            navigate(`/community/user/${user.id}`)
        } else {
            const player = players.find((p) => p.id === row.playerId)
            if (player?.user_id) {
                navigate(`/community/user/${player.user_id}`)
            }
        }
    }

    const handleExportCSV = () => {
        const gameLabel = selectedGameId ? games.find((g) => g.id === Number(selectedGameId))?.name ?? 'game' : 'global'
        downloadCSV(
            ['Pos', 'Giocatore', 'Nome', 'Cognome', 'Tornei vinti', 'Tornei giocati', 'Placement Index %', 'Gare vinte', 'Podi', 'Punti totali', 'Efficienza Media %', 'Win Rate %', 'Podium Rate %', 'Gare giocate'],
            filteredRows.map((r, idx) => [
                idx + 1, r.nickname, r.first_name, r.last_name,
                r.tournamentWins, r.tournamentsPlayed, r.placementIndex,
                r.raceWins, r.podiums, r.points,
                r.avgEfficiency, r.winRate, r.podiumRate, r.racesPlayed
            ]),
            `classifica-${gameLabel}.csv`
        )
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
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
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
                        <button
                            onClick={handleExportCSV}
                            className="font-title flex cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-900 bg-slate-900 px-4 py-2.5 text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-slate-700"
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                        >
                            <Download size={14} />
                            CSV
                        </button>
                    </div>
                </div>

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

                <div className="mb-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border-2 border-slate-900/15 dark:border-white/15 bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Giocatori attivi</p>
                        <p className="font-title mt-2 text-3xl text-slate-900 dark:text-foreground">{metrics.activePlayers}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-900/15 dark:border-white/15 bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Gare completate</p>
                        <p className="font-title mt-2 text-3xl text-slate-900 dark:text-foreground">{metrics.completedRaces}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-slate-900/15 dark:border-white/15 bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Trofei vinti</p>
                        <p className="font-title mt-2 text-3xl text-slate-900 dark:text-foreground">{metrics.trophiesWon}</p>
                    </div>
                </div>

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
                        <PodiumSteps players={filteredRows.slice(0, 3)} />
                        <LeaderboardTable
                            rows={filteredRows}
                            charactersById={charactersById}
                            highlightPlayerId={user?.player_id ?? user?.player?.id ?? null}
                            isSuperadmin={isSuperadmin}
                            onPlayerClick={handlePlayerClick}
                        />
                    </>
                )}
            </section>
        </AppLayout>
    )
}

export default Stats
