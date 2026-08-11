import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import TournamentHistoryCard from '@/components/history/TournamentHistoryCard'
import { useAppData } from '@/context/AppDataContext'
import ApiBanner from '@/components/common/ApiBanner'

const PAGE_SIZE = 10

const History = () => {
    const { detailedTournaments, loading, errorMessage, refresh, games, getTournamentsByGame } = useAppData()
    const [selectedGameId, setSelectedGameId] = useState('')
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

    const filteredTournaments = useMemo(() => {
        const list = detailedTournaments ?? []
        if (!selectedGameId) return list
        return getTournamentsByGame(selectedGameId)
    }, [selectedGameId, detailedTournaments, getTournamentsByGame])

    const visibleTournaments = filteredTournaments.slice(0, visibleCount)
    const hasMore = visibleCount < filteredTournaments.length

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
                <div className="mb-6 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">STORICO TORNEI</p>
                    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">ULTIMI TORNEI E GARE</h1>
                    <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground uppercase">
                        QUI TROVI I TORNEI RECENTI CON TUTTE LE GARE REGISTRATE E LE POSIZIONI DI ARRIVO.
                    </p>
                    <div className="mt-4 flex justify-center">
                        <select
                            value={selectedGameId}
                            onChange={(e) => { setSelectedGameId(e.target.value); setVisibleCount(PAGE_SIZE) }}
                            className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-2.5 text-sm font-black uppercase tracking-widest outline-none focus:border-emerald-500"
                        >
                            <option value="">TUTTI I GIOCHI</option>
                            {games.map((g) => (
                                <option key={g.id} value={g.id}>{g.name?.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <ApiBanner
                    title="Errore storico tornei"
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
                {loading ? (
                    <div className="space-y-8">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/20">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="h-4 w-24 animate-shimmer rounded-lg bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-size-[200%_100%]" />
                                        <div className="h-6 w-64 animate-shimmer rounded-lg bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-size-[200%_100%]" />
                                        <div className="h-4 w-32 animate-shimmer rounded-lg bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-size-[200%_100%]" />
                                    </div>
                                </div>
                                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <div key={j} className="h-20 animate-shimmer rounded-2xl bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-size-[200%_100%]" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredTournaments.length ? (
                    <>
                        <div className="space-y-8">
                            {visibleTournaments.map((tournament, idx) => (
                                <div key={tournament.id} style={{ animationDelay: `${idx * 0.06}s` }} className="animate-slide-up">
                                    <TournamentHistoryCard tournament={tournament} />
                                </div>
                            ))}
                        </div>
                        {hasMore && (
                            <div className="mt-8 text-center">
                                <button
                                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground transition hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-foreground hover-lift"
                                >
                                    <ChevronDown size={14} />
                                    MOSTRA ALTRI ({filteredTournaments.length - visibleCount} NASCOSTI)
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center text-slate-500 dark:text-muted-foreground">
                        NESSUN TORNEO PRESENTE. CREA IL PRIMO TORNEO DALLA PAGINA NUOVO TORNEO.
                    </div>
                )}
            </section>
        </AppLayout>
    )
}

export default History
