import { useEffect, useMemo, useState } from 'react'
import { Search, Swords, Trophy, Target, Medal, MapPin } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { useAppData } from '@/context/AppDataContext'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { statsApi, getApiErrorMessage } from '@/services/apiClient'

const Selector = ({ label, search, setSearch, filtered, selected, setSelected, excludeId }) => (
    <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 dark:text-muted-foreground">{label}</p>
        <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
            <input
                type="text"
                placeholder="Cerca giocatore..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card px-9 py-3 text-sm outline-none focus:border-emerald-500"
            />
        </div>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-1.5">
            {filtered.filter((p) => p.id !== excludeId).length === 0 ? (
                <p className="p-3 text-center text-sm text-slate-400 dark:text-muted-foreground">Nessun risultato</p>
            ) : (
                filtered.filter((p) => p.id !== excludeId).map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelected(p); setSearch('') }}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover-lift ${
                            selected?.id === p.id
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-muted-foreground'
                        }`}
                    >
                        <img
                            src={p.img_url || buildAvatarPlaceholder(p.nickname)}
                            alt={p.nickname}
                            className="h-8 w-8 shrink-0 rounded-full object-cover border border-white/20"
                        />
                        <div>
                            <p className="font-bold uppercase">{p.nickname?.toUpperCase()}</p>
                            <p className="text-xs text-slate-400 dark:text-muted-foreground uppercase">{p.first_name?.toUpperCase()} {p.last_name?.toUpperCase()}</p>
                        </div>
                    </button>
                ))
            )}
        </div>
    </div>
)

const StatCard = ({ icon: Icon, label, valueA, valueB, suffix, highlight }) => {
    const a = valueA ?? '-'
    const b = valueB ?? '-'
    const aBetter = highlight === 'a'
    const bBetter = highlight === 'b'
    const tie = highlight === 'tie'

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm hover-lift">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                <Icon size={14} />
                {label}
            </div>
            <div className="flex items-center justify-between gap-4">
                <span className={`text-xl font-black ${aBetter ? 'text-emerald-600' : tie ? 'text-slate-800 dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground'}`}>
                    {a}{suffix ?? ''}
                </span>
                <span className="text-xs font-black text-slate-300 dark:text-muted-foreground">vs</span>
                <span className={`text-xl font-black ${bBetter ? 'text-emerald-600' : tie ? 'text-slate-800 dark:text-foreground' : 'text-slate-500 dark:text-muted-foreground'}`}>
                    {b}{suffix ?? ''}
                </span>
            </div>
        </div>
    )
}

const Compare = () => {
    const { players, games } = useAppData()
    const [gameId, setGameId] = useState('')
    const [searchA, setSearchA] = useState('')
    const [searchB, setSearchB] = useState('')
    const [playerA, setPlayerA] = useState(null)
    const [playerB, setPlayerB] = useState(null)
    const [comparison, setComparison] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [circuitSearch, setCircuitSearch] = useState('')

    const sortedPlayers = useMemo(() =>
        players.slice().sort((a, b) => a.nickname.localeCompare(b.nickname)),
        [players]
    )

    const filteredA = useMemo(() => {
        if (!searchA.trim()) return sortedPlayers
        const t = searchA.toLowerCase()
        return sortedPlayers.filter((p) =>
            p.nickname.toLowerCase().includes(t) ||
            p.first_name.toLowerCase().includes(t) ||
            p.last_name.toLowerCase().includes(t)
        )
    }, [sortedPlayers, searchA])

    const filteredB = useMemo(() => {
        if (!searchB.trim()) return sortedPlayers
        const t = searchB.toLowerCase()
        return sortedPlayers.filter((p) =>
            p.nickname.toLowerCase().includes(t) ||
            p.first_name.toLowerCase().includes(t) ||
            p.last_name.toLowerCase().includes(t)
        )
    }, [sortedPlayers, searchB])

    const canCompare = Boolean(gameId) && Boolean(playerA) && Boolean(playerB) && playerA.id !== playerB.id

    useEffect(() => {
        if (!canCompare) {
            setComparison(null)
            return
        }
        setLoading(true)
        setError(null)
        statsApi.headToHead(gameId, playerA.id, playerB.id)
            .then((res) => setComparison(res.data))
            .catch((err) => {
                setComparison(null)
                setError(getApiErrorMessage(err, 'Impossibile caricare il confronto'))
            })
            .finally(() => setLoading(false))
    }, [canCompare, gameId, playerA, playerB])

    // Solo i circuiti dove i due giocatori si sono davvero incontrati:
    // mostrare l'elenco completo del gioco (molti a 0 gare in comune) rende
    // la tabella lunga e poco leggibile quando i due hanno pochi incroci.
    const playedCircuits = useMemo(() =>
        (comparison?.by_circuit ?? []).filter((c) => c.total_races > 0),
        [comparison]
    )

    const filteredCircuits = useMemo(() => {
        if (!circuitSearch.trim()) return playedCircuits
        const t = circuitSearch.toLowerCase()
        return playedCircuits.filter((c) => c.circuit_name.toLowerCase().includes(t))
    }, [playedCircuits, circuitSearch])

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
                <div className="mb-8 text-center">
                    <p className="font-title text-[10px] tracking-wide text-emerald-600">Confronto 1vs1</p>
                    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">SFIDA TESTA A TESTA</h1>
                    <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
                        Seleziona un gioco e due giocatori per confrontare le loro statistiche nelle gare comuni.
                    </p>
                    <div className="mt-4 flex justify-center">
                        <select
                            value={gameId}
                            onChange={(e) => setGameId(e.target.value)}
                            className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-2.5 text-sm font-black uppercase tracking-widest outline-none focus:border-emerald-500"
                        >
                            <option value="">Seleziona un gioco...</option>
                            {(games ?? []).map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-10 grid gap-6 md:grid-cols-2">
                    <Selector label="Giocatore A" search={searchA} setSearch={setSearchA} filtered={filteredA} selected={playerA} setSelected={setPlayerA} excludeId={playerB?.id} />
                    <Selector label="Giocatore B" search={searchB} setSearch={setSearchB} filtered={filteredB} selected={playerB} setSelected={setPlayerB} excludeId={playerA?.id} />
                </div>

                {!gameId && (playerA || playerB) && (
                    <p className="mb-6 text-center text-sm font-bold text-amber-600">Seleziona un gioco per vedere il confronto.</p>
                )}

                {error && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 p-4 text-center text-sm text-red-700 dark:text-red-400">
                        {error}
                    </div>
                )}

                {loading && (
                    <p className="mb-6 text-center text-sm text-slate-400 dark:text-muted-foreground">Caricamento confronto…</p>
                )}

                {comparison && (
                    <>
                        <div className="mb-3 text-center animate-slide-up">
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-muted px-4 py-1.5 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground">
                                <Swords size={14} />
                                {comparison.summary.total_races} GARE IN COMUNE
                            </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <StatCard icon={Trophy} label="VITTORIE TESTA A TESTA" valueA={comparison.summary.wins_a} valueB={comparison.summary.wins_b}
                                highlight={comparison.summary.wins_a > comparison.summary.wins_b ? 'a' : comparison.summary.wins_b > comparison.summary.wins_a ? 'b' : 'tie'} />
                            <StatCard icon={Medal} label="% VITTORIE" valueA={comparison.summary.win_pct_a} valueB={comparison.summary.win_pct_b} suffix="%"
                                highlight={comparison.summary.win_pct_a > comparison.summary.win_pct_b ? 'a' : comparison.summary.win_pct_b > comparison.summary.win_pct_a ? 'b' : 'tie'} />
                        </div>

                        <div className="mt-4 grid gap-4">
                            <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm hover-lift">
                                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                    <Target size={14} />
                                    GARE VINTE (TESTA A TESTA)
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex h-10 overflow-hidden rounded-xl bg-slate-100 dark:bg-muted">
                                        <div
                                            className="flex items-center justify-center bg-emerald-500 text-xs font-black text-white transition-all"
                                            style={{ width: `${comparison.summary.total_races > 0 ? (comparison.summary.wins_a / comparison.summary.total_races) * 100 : 0}%` }}
                                        >
                                            {comparison.summary.wins_a}
                                        </div>
                                        {comparison.summary.ties > 0 && (
                                            <div
                                                className="flex items-center justify-center bg-slate-300 text-xs font-black text-white transition-all"
                                                style={{ width: `${(comparison.summary.ties / comparison.summary.total_races) * 100}%` }}
                                            >
                                                {comparison.summary.ties}
                                            </div>
                                        )}
                                        <div
                                            className="flex items-center justify-center bg-amber-500 text-xs font-black text-white transition-all"
                                            style={{ width: `${comparison.summary.total_races > 0 ? (comparison.summary.wins_b / comparison.summary.total_races) * 100 : 0}%` }}
                                        >
                                            {comparison.summary.wins_b}
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-muted-foreground">
                                        <span>{comparison.player_a.nickname?.toUpperCase()} {comparison.summary.win_pct_a}%</span>
                                        <span>{comparison.summary.win_pct_b}% {comparison.player_b.nickname?.toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20 animate-slide-up">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-muted-foreground">
                                    <MapPin size={16} />
                                    CONFRONTO PER CIRCUITO
                                </h3>
                                {playedCircuits.length > 0 && (
                                    <div className="relative">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Cerca circuito..."
                                            value={circuitSearch}
                                            onChange={(e) => setCircuitSearch(e.target.value)}
                                            className="w-48 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card py-1.5 pl-8 pr-3 text-xs outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                )}
                            </div>
                            {playedCircuits.length === 0 ? (
                                <p className="p-6 text-center text-sm text-slate-400 dark:text-muted-foreground">
                                    Nessun circuito in comune tra {comparison.player_a.nickname} e {comparison.player_b.nickname}.
                                </p>
                            ) : filteredCircuits.length === 0 ? (
                                <p className="p-6 text-center text-sm text-slate-400 dark:text-muted-foreground">Nessun circuito trovato.</p>
                            ) : (
                                <div className="overflow-x-auto p-1">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-border text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                                                <th className="px-4 py-3">CIRCUITO</th>
                                                <th className="px-4 py-3 text-right">GARE</th>
                                                <th className="px-4 py-3 text-right">{comparison.player_a.nickname?.toUpperCase()}</th>
                                                <th className="px-4 py-3 text-right">{comparison.player_b.nickname?.toUpperCase()}</th>
                                                <th className="px-4 py-3 text-right">PAREGGI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCircuits.map((c, i) => (
                                                <tr key={c.circuit_id} className={`border-b border-slate-100 dark:border-border ${i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50/50 dark:bg-muted/50'}`}>
                                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-foreground uppercase">{c.circuit_name?.toUpperCase()}</td>
                                                    <td className="px-4 py-3 text-right text-slate-500 dark:text-muted-foreground">{c.total_races}</td>
                                                    <td className={`px-4 py-3 text-right font-bold ${c.wins_a > c.wins_b ? 'text-emerald-600' : 'text-slate-500 dark:text-muted-foreground'}`}>{c.wins_a}</td>
                                                    <td className={`px-4 py-3 text-right font-bold ${c.wins_b > c.wins_a ? 'text-emerald-600' : 'text-slate-500 dark:text-muted-foreground'}`}>{c.wins_b}</td>
                                                    <td className="px-4 py-3 text-right text-slate-400 dark:text-muted-foreground">{c.ties}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {comparison.history.length > 0 && (
                            <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20 animate-slide-up">
                                <div className="border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                                    <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-muted-foreground">
                                        <Trophy size={16} />
                                        STORICO GARE IN COMUNE
                                    </h3>
                                </div>
                                <div className="overflow-x-auto p-1">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-border text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                                                <th className="px-4 py-3">TORNEO</th>
                                                <th className="px-4 py-3">CIRCUITO</th>
                                                <th className="px-4 py-3 text-right">{comparison.player_a.nickname?.toUpperCase()}</th>
                                                <th className="px-4 py-3 text-right">{comparison.player_b.nickname?.toUpperCase()}</th>
                                                <th className="px-4 py-3 text-right">RISULTATO</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comparison.history.map((h, i) => (
                                                <tr key={h.race_id} className={`border-b border-slate-100 dark:border-border ${i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50/50 dark:bg-muted/50'}`}>
                                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-foreground uppercase">{h.tournament_name?.toUpperCase()}</td>
                                                    <td className="px-4 py-3 text-slate-500 dark:text-muted-foreground uppercase">{h.circuit_name?.toUpperCase()}</td>
                                                    <td className={`px-4 py-3 text-right font-bold ${h.winner === 'a' ? 'text-emerald-600' : 'text-slate-500 dark:text-muted-foreground'}`}>
                                                        #{h.position_a}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-bold ${h.winner === 'b' ? 'text-emerald-600' : 'text-slate-500 dark:text-muted-foreground'}`}>
                                                        #{h.position_b}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${h.winner === 'a' ? 'bg-emerald-100 text-emerald-700' : h.winner === 'b' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground'}`}>
                                                            {h.winner === 'a' ? comparison.player_a.nickname?.toUpperCase() : h.winner === 'b' ? comparison.player_b.nickname?.toUpperCase() : 'PAREGGIO'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </AppLayout>
    )
}

export default Compare
