import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Map as MapIcon, Trophy, Medal, BarChart3, Swords, ChevronDown } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { useAppData } from '@/context/AppDataContext'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { statsApi, getApiErrorMessage } from '@/services/apiClient'
import CircuitRankingTable from '@/components/stats/CircuitRankingTable'

const COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0d9488']

const CircuitStats = () => {
    const { games, playersById } = useAppData()
    const [selectedGameId, setSelectedGameId] = useState('')
    const [circuitStats, setCircuitStats] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [expandedId, setExpandedId] = useState(null)
    const [detailByCircuit, setDetailByCircuit] = useState({})
    const [detailLoadingId, setDetailLoadingId] = useState(null)

    const effectiveGameId = selectedGameId || games?.[0]?.id || ''

    useEffect(() => {
        if (!effectiveGameId) return
        setLoading(true)
        setError(null)
        statsApi.circuitList(effectiveGameId)
            .then((res) => setCircuitStats(res.data))
            .catch((err) => setError(getApiErrorMessage(err, 'Impossibile caricare le statistiche dei circuiti')))
            .finally(() => setLoading(false))
    }, [effectiveGameId])

    // Ordinati dal più giocato al meno giocato (i mai giocati, total_races=0,
    // finiscono in fondo) — così i circuiti più/meno scelti si leggono a
    // colpo d'occhio senza dover confrontare i numeri fra le card.
    const sortedCircuits = useMemo(() =>
        circuitStats.slice().sort((a, b) => b.total_races - a.total_races),
        [circuitStats]
    )
    const maxRaces = sortedCircuits[0]?.total_races || 1

    const chartData = useMemo(() =>
        sortedCircuits
            .filter((c) => c.total_races > 0)
            .slice(0, 15)
            .map((c) => ({
                name: c.circuit_name.length > 18 ? c.circuit_name.slice(0, 16) + '…' : c.circuit_name,
                gare: c.total_races,
            })),
        [sortedCircuits]
    )

    const toggleExpand = (circuitId) => {
        if (expandedId === circuitId) {
            setExpandedId(null)
            return
        }
        setExpandedId(circuitId)
        if (!detailByCircuit[circuitId]) {
            setDetailLoadingId(circuitId)
            statsApi.circuitDetail(circuitId)
                .then((res) => setDetailByCircuit((prev) => ({ ...prev, [circuitId]: res.data.ranking })))
                .catch((err) => setError(getApiErrorMessage(err, 'Impossibile caricare il ranking del circuito')))
                .finally(() => setDetailLoadingId(null))
        }
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
                <div className="mb-8 text-center">
                    <p className="font-title text-[10px] tracking-wide text-emerald-600">STATISTICHE CIRCUITI</p>
                    <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">ANALISI PER CIRCUITO</h1>
                    <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground uppercase">
                        FREQUENZA, VITTORIE E PERFORMANCE PER OGNI CIRCUITO DEL GIOCO SELEZIONATO.
                    </p>
                    {games?.length > 1 && (
                        <div className="mt-4 flex justify-center">
                            <select
                                value={effectiveGameId}
                                onChange={(e) => setSelectedGameId(e.target.value)}
                                className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-2.5 text-sm font-black uppercase tracking-widest outline-none focus:border-emerald-500"
                            >
                                {games.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 p-4 text-sm text-red-700 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="mb-10 overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20 hover-lift">
                    <div className="border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-muted-foreground">
                            <BarChart3 size={16} />
                            GARE PER CIRCUITO (TOP 15)
                        </h3>
                    </div>
                    <div className="p-4">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                        labelStyle={{ fontWeight: 800, fontSize: 13 }}
                                    />
                                    <Bar dataKey="gare" radius={[8, 8, 0, 0]} label={{ position: 'top', fontWeight: 800, fontSize: 11 }}>
                                        {chartData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">NESSUN DATO DISPONIBILE.</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-6">
                    {sortedCircuits.map((circuit, i) => {
                        const isExpanded = expandedId === circuit.circuit_id
                        const detail = detailByCircuit[circuit.circuit_id]
                        const detailLoading = detailLoadingId === circuit.circuit_id
                        const neverPlayed = circuit.total_races === 0
                        const intensityPct = maxRaces > 0 ? Math.max((circuit.total_races / maxRaces) * 100, neverPlayed ? 0 : 3) : 0

                        return (
                            <div key={circuit.circuit_id} style={{ animationDelay: `${i * 0.05}s` }} className={`animate-slide-up overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20 hover-lift ${neverPlayed ? 'opacity-60' : ''}`}>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-muted text-xs font-black text-slate-600 dark:text-muted-foreground">
                                            {i + 1}
                                        </span>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-foreground uppercase">{circuit.circuit_name?.toUpperCase()}</h3>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest ${neverPlayed ? 'bg-slate-100 dark:bg-muted text-slate-400 dark:text-muted-foreground' : 'bg-slate-100 dark:bg-muted text-slate-600 dark:text-muted-foreground'}`}>
                                            <Swords size={12} />
                                            {neverPlayed ? 'MAI GIOCATO' : `${circuit.total_races} GARE`}
                                        </span>
                                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${intensityPct}%` }} />
                                        </div>
                                    </div>
                                </div>

                                {!neverPlayed && (
                                    <div className="p-6">
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="rounded-2xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted p-4 hover-lift">
                                                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                                    <Trophy size={12} className="inline mr-1" />
                                                    PIÙ VITTORIE
                                                </p>
                                                {circuit.top_winner ? (
                                                    <div className="flex items-center gap-2.5">
                                                        <img
                                                            src={playersById?.get(circuit.top_winner.player_id)?.img_url || buildAvatarPlaceholder(circuit.top_winner.player_nickname)}
                                                            alt={circuit.top_winner.player_nickname}
                                                            className="h-8 w-8 shrink-0 rounded-full object-cover border border-white/20"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">{circuit.top_winner.player_nickname?.toUpperCase()}</p>
                                                            <p className="text-lg font-black text-emerald-600">{circuit.top_winner.wins} VITTORIE</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-400 dark:text-muted-foreground">—</p>
                                                )}
                                            </div>

                                            <div className="rounded-2xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted p-4 hover-lift">
                                                <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                                    <Medal size={12} className="inline mr-1" />
                                                    PODI TOTALI
                                                </p>
                                                <p className="text-lg font-black text-slate-800 dark:text-foreground">
                                                    {circuit.total_podiums}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => toggleExpand(circuit.circuit_id)}
                                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground transition hover:bg-slate-100 dark:hover:bg-muted/70"
                                        >
                                            <MapIcon size={14} />
                                            {isExpanded ? 'Nascondi ranking completo' : 'Mostra ranking completo'}
                                            <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isExpanded && (
                                            <div className="mt-4">
                                                {detailLoading ? (
                                                    <p className="py-6 text-center text-sm text-slate-400 dark:text-muted-foreground">Caricamento…</p>
                                                ) : (
                                                    <CircuitRankingTable rows={detail ?? []} playersById={playersById} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {!loading && sortedCircuits.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center text-slate-500 dark:text-muted-foreground">
                            NESSUN CIRCUITO PRESENTE NEI TORNEI PER QUESTO GIOCO.
                        </div>
                    )}
                </div>
            </section>
        </AppLayout>
    )
}

export default CircuitStats
