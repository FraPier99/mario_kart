import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Map as MapIcon, Trophy, BarChart3, Swords, ChevronDown, Search, TrendingDown } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { useAppData } from '@/context/AppDataContext'
import { useTheme } from '@/context/ThemeContext'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { statsApi, getApiErrorMessage } from '@/services/apiClient'
import CircuitRankingTable from '@/components/stats/CircuitRankingTable'
import CircuitThumbnail from '@/components/common/CircuitThumbnail'

const COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0d9488']

const CircuitStats = () => {
    const { games, playersById, circuitsById } = useAppData()
    const { dark } = useTheme()
    const [selectedGameId, setSelectedGameId] = useState('')
    const [circuitStats, setCircuitStats] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [search, setSearch] = useState('')
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

    // Arricchisce ogni riga di statistiche con i dati del circuito già
    // disponibili in AppDataContext (image_url per la thumbnail, description
    // per raggruppare per Gran Premio) — nessuna nuova chiamata backend.
    const enrichedCircuits = useMemo(() =>
        circuitStats.map((c) => ({ ...c, meta: circuitsById?.get(c.circuit_id) ?? null })),
        [circuitStats, circuitsById]
    )

    const maxRaces = useMemo(() => Math.max(1, ...enrichedCircuits.map((c) => c.total_races)), [enrichedCircuits])

    const filteredCircuits = useMemo(() => {
        if (!search.trim()) return enrichedCircuits
        const t = search.toLowerCase()
        return enrichedCircuits.filter((c) => c.circuit_name.toLowerCase().includes(t))
    }, [enrichedCircuits, search])

    // Raggruppa per Gran Premio (Circuit.description, es. "trofeo fungo"):
    // i gruppi seguono l'ordine di apparizione dei circuiti (che rispecchia
    // l'ordine ufficiale delle coppe nel gioco), i circuiti dentro ogni
    // gruppo sono ordinati per gare giocate decrescente.
    const groupedCircuits = useMemo(() => {
        const groups = new Map()
        filteredCircuits.forEach((c) => {
            const key = c.meta?.description || 'Altri circuiti'
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push(c)
        })
        groups.forEach((list) => list.sort((a, b) => b.total_races - a.total_races))
        return Array.from(groups.entries())
    }, [filteredCircuits])

    const chartData = useMemo(() =>
        enrichedCircuits
            .filter((c) => c.total_races > 0)
            .slice()
            .sort((a, b) => b.total_races - a.total_races)
            .slice(0, 15)
            .map((c) => ({
                name: c.circuit_name.length > 18 ? c.circuit_name.slice(0, 16) + '…' : c.circuit_name,
                gare: c.total_races,
            })),
        [enrichedCircuits]
    )

    // I 10 circuiti meno scelti nei tornei di questo gioco (compresi quelli
    // mai giocati) — speculare al grafico dei più giocati sopra.
    const leastUsedData = useMemo(() =>
        enrichedCircuits
            .slice()
            .sort((a, b) => a.total_races - b.total_races || a.circuit_name.localeCompare(b.circuit_name))
            .slice(0, 10),
        [enrichedCircuits]
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
                                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e2e8f0'} />
                                    <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11, fill: dark ? '#94a3b8' : '#64748b' }} stroke="#94a3b8" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: dark ? '#94a3b8' : '#64748b' }} stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: 16,
                                            border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
                                            background: dark ? '#0f172a' : '#ffffff',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                        }}
                                        labelStyle={{ fontWeight: 800, fontSize: 13, color: dark ? '#f1f5f9' : '#0f172a' }}
                                        itemStyle={{ color: dark ? '#e2e8f0' : '#334155' }}
                                    />
                                    <Bar dataKey="gare" radius={[8, 8, 0, 0]} label={{ position: 'top', fontWeight: 800, fontSize: 11, fill: dark ? '#e2e8f0' : '#334155' }}>
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

                {leastUsedData.length > 0 && (
                    <div className="mb-10 overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20 hover-lift">
                        <div className="border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-muted-foreground">
                                <TrendingDown size={16} />
                                CIRCUITI MENO UTILIZZATI
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-border">
                            {leastUsedData.map((circuit, i) => {
                                const neverPlayed = circuit.total_races === 0
                                return (
                                    <div key={circuit.circuit_id} className="flex items-center gap-3 px-6 py-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-muted text-[10px] font-black text-slate-500 dark:text-muted-foreground">
                                            {i + 1}
                                        </span>
                                        <CircuitThumbnail circuit={circuit.meta} size="sm" />
                                        <span className="flex-1 truncate text-sm font-bold text-slate-700 dark:text-foreground uppercase">{circuit.circuit_name}</span>
                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${neverPlayed ? 'bg-red-50 text-red-500 dark:bg-red-950/30 dark:text-red-400' : 'bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground'}`}>
                                            {neverPlayed ? 'MAI GIOCATO' : `${circuit.total_races} GARE`}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div className="mb-6 relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cerca circuito..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                </div>

                <div className="space-y-10">
                    {groupedCircuits.map(([groupName, groupCircuits]) => (
                        <div key={groupName}>
                            <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-slate-500 dark:text-muted-foreground">
                                <Trophy size={14} className="text-emerald-600" />
                                {groupName}
                            </h2>
                            <div className="grid gap-6">
                                {groupCircuits.map((circuit, i) => {
                                    const isExpanded = expandedId === circuit.circuit_id
                                    const detail = detailByCircuit[circuit.circuit_id]
                                    const detailLoading = detailLoadingId === circuit.circuit_id
                                    const neverPlayed = circuit.total_races === 0
                                    const intensityPct = maxRaces > 0 ? Math.max((circuit.total_races / maxRaces) * 100, neverPlayed ? 0 : 3) : 0

                                    return (
                                        <div key={circuit.circuit_id} style={{ animationDelay: `${i * 0.05}s` }} className={`animate-slide-up overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20 hover-lift ${neverPlayed ? 'opacity-60' : ''}`}>
                                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <CircuitThumbnail circuit={circuit.meta} size="lg" />
                                                    <h3 className="text-lg font-black text-slate-900 dark:text-foreground uppercase">{circuit.circuit_name?.toUpperCase()}</h3>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-muted px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground">
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
                            </div>
                        </div>
                    ))}

                    {!loading && groupedCircuits.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center text-slate-500 dark:text-muted-foreground">
                            {search.trim() ? 'NESSUN CIRCUITO TROVATO.' : 'NESSUN CIRCUITO PRESENTE NEI TORNEI PER QUESTO GIOCO.'}
                        </div>
                    )}
                </div>
            </section>
        </AppLayout>
    )
}

export default CircuitStats
