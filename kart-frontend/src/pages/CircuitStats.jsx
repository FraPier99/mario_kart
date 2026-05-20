import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Map as MapIcon, Trophy, Medal, BarChart3, TrendingUp, Swords, Users } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { useAppData } from '@/context/AppDataContext'

const COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0d9488']

const CircuitStats = () => {
    const { detailedTournaments, circuits, circuitsById, playersById } = useAppData()

    const circuitData = useMemo(() => {
        const stats = new Map()

        ;(circuits ?? []).forEach((c) => stats.set(c.id, {
            id: c.id,
            name: c.name,
            totalRaces: 0,
            wins: {},
            podiums: {},
            totalPoints: {},
            appearances: {},
            players: new Set(),
        }))

        ;(detailedTournaments ?? []).forEach((t) => {
            ;(t.races ?? []).forEach((race) => {
                const s = stats.get(race.circuit_id)
                if (!s) return

                s.totalRaces++
                ;(race.results ?? []).forEach((r) => {
                    s.players.add(r.player_id)
                    s.totalPoints[r.player_id] = (s.totalPoints[r.player_id] ?? 0) + r.points
                    s.appearances[r.player_id] = (s.appearances[r.player_id] ?? 0) + 1
                    if (r.position === 1) s.wins[r.player_id] = (s.wins[r.player_id] ?? 0) + 1
                    if (r.position <= 3) s.podiums[r.player_id] = (s.podiums[r.player_id] ?? 0) + 1
                })
            })
        })

        return Array.from(stats.values())
            .filter((s) => s.totalRaces > 0)
            .sort((a, b) => b.totalRaces - a.totalRaces)
    }, [detailedTournaments, circuits])

    const chartData = useMemo(() =>
        circuitData.slice(0, 15).map((c) => ({
            name: c.name.length > 18 ? c.name.slice(0, 16) + '…' : c.name,
            gare: c.totalRaces,
            giocatori: c.players.size,
        })),
        [circuitData]
    )

    const topPlayerOnCircuit = (circuit) => {
        let topId = null, topWins = 0
        Object.entries(circuit.wins).forEach(([pid, w]) => {
            if (w > topWins) { topWins = w; topId = Number(pid) }
        })
        if (!topId) return null
        const p = playersById?.get(topId)
        return { playerId: topId, wins: topWins, nickname: p?.nickname ?? `#${topId}` }
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-12">
                <div className="mb-10 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Statistiche circuiti</p>
                    <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Analisi per circuito</h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
                        Frequenza, vittorie e performance per ogni circuito presente nei tornei.
                    </p>
                </div>

                <div className="mb-10 overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20">
                    <div className="border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-muted-foreground">
                            <BarChart3 size={16} />
                            Gare per circuito (top 15)
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
                            <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">Nessun dato disponibile.</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-6">
                    {circuitData.map((circuit, i) => {
                        const top = topPlayerOnCircuit(circuit)
                        const total = Object.values(circuit.wins).reduce((s, v) => s + v, 0) || 1

                        return (
                            <div key={circuit.id} style={{ animationDelay: `${i * 0.05}s` }} className="animate-fade-in overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-muted text-xs font-black text-slate-600 dark:text-muted-foreground">
                                            {i + 1}
                                        </span>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-foreground">{circuit.name}</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs font-black uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-muted px-3 py-1.5 text-slate-600 dark:text-muted-foreground">
                                            <Swords size={12} />
                                            {circuit.totalRaces} gare
                                        </span>
                                        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-muted px-3 py-1.5 text-slate-600 dark:text-muted-foreground">
                                            <Users size={12} />
                                            {circuit.players.size} piloti
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                        <div className="rounded-2xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted p-4">
                                            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                                <Trophy size={12} className="inline mr-1" />
                                                Più vittorie
                                            </p>
                                            {top ? (
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{top.nickname}</p>
                                                    <p className="text-lg font-black text-emerald-600">{top.wins} vittorie</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 dark:text-muted-foreground">—</p>
                                            )}
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted p-4">
                                            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                                <Medal size={12} className="inline mr-1" />
                                                Podi totali
                                            </p>
                                            <p className="text-lg font-black text-slate-800 dark:text-foreground">
                                                {Object.values(circuit.podiums).reduce((s, v) => s + v, 0)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted p-4">
                                            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                                <TrendingUp size={12} className="inline mr-1" />
                                                Media punti/gara
                                            </p>
                                            <p className="text-lg font-black text-slate-800 dark:text-foreground">
                                                {circuit.totalRaces > 0
                                                    ? (Object.values(circuit.totalPoints).reduce((s, v) => s + v, 0) / circuit.totalRaces).toFixed(1)
                                                    : '-'}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted p-4">
                                            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">
                                                <MapIcon size={12} className="inline mr-1" />
                                                Giocatori unici
                                            </p>
                                            <p className="text-lg font-black text-slate-800 dark:text-foreground">{circuit.players.size}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground">Distribuzione vittorie</p>
                                        <div className="flex h-6 overflow-hidden rounded-xl bg-slate-100 dark:bg-muted/50">
                                            {Object.entries(circuit.wins).map(([pid, w]) => {
                                                const p = playersById?.get(Number(pid))
                                                const label = p?.nickname ?? `#${pid}`
                                                return (
                                                    <div
                                                        key={pid}
                                                        className="flex items-center justify-center text-[10px] font-bold text-white transition-all"
                                                        style={{ width: `${(w / total) * 100}%`, backgroundColor: COLORS[Number(pid) % COLORS.length] }}
                                                        title={`${label}: ${w} vittorie`}
                                                    >
                                                        {w / total >= 0.12 ? label : ''}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {circuitData.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center text-slate-500 dark:text-muted-foreground">
                            Nessun circuito presente nei tornei.
                        </div>
                    )}
                </div>
            </section>
        </AppLayout>
    )
}

export default CircuitStats
