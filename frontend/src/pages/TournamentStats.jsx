import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    LineChart, Line,
} from 'recharts'
import { ArrowLeft, BarChart3, Download, TrendingUp, Trophy, Users, CircuitBoard, FileSpreadsheet } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import AppLayout from '@/components/layout/AppLayout'
import { downloadCSV } from '@/lib/utils'

const COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d']

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3 shadow-lg">
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">{label}</p>
            {payload.map((entry, idx) => (
                <p key={idx} className="text-sm font-bold" style={{ color: entry.color }}>{entry.name}: {entry.value}</p>
            ))}
        </div>
    )
}

const InfoCard = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 shadow-sm">
        <div className={`rounded-xl p-2.5 ${color}`}>{Icon && <Icon size={20} className="text-white" />}</div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">{label}</p>
            <p className="text-lg font-black text-slate-900 dark:text-foreground">{value}</p>
        </div>
    </div>
)

const ChartCard = ({ title, icon: Icon, children }) => (
    <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/20">
        <div className="mb-4 flex items-center gap-2">
            {Icon && <Icon size={18} className="text-slate-600 dark:text-muted-foreground" />}
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-muted-foreground">{title}</h3>
        </div>
        {children}
    </div>
)

const TournamentStats = () => {
    const { tournamentId } = useParams()
    const navigate = useNavigate()
    const { getTournamentById, circuitsById } = useAppData()

    const tournament = getTournamentById(tournamentId)

    const chartData = useMemo(() => {
        if (!tournament) return {}

        const sortedRaces = [...tournament.races].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))

        const cumulativePoints = {}
        tournament.standings.forEach((s) => { cumulativePoints[s.playerId] = 0 })

        const pointsProgression = sortedRaces.map((race) => {
            const point = { name: `Gara ${race.race_order}` }
            race.results.forEach((r) => {
                cumulativePoints[r.player_id] = (cumulativePoints[r.player_id] ?? 0) + (r.points ?? 0)
            })
            tournament.standings.forEach((s) => {
                point[s.nickname] = cumulativePoints[s.playerId] ?? 0
            })
            return point
        })

        const standingsChart = tournament.standings.map((s, idx) => ({
            name: s.nickname,
            Punti: s.points,
            fill: COLORS[idx % COLORS.length],
        }))

        const raceWinsChart = tournament.standings.map((s, idx) => ({
            name: s.nickname,
            'Gare vinte': s.raceWins,
            fill: COLORS[idx % COLORS.length],
        }))

        const podiumsChart = tournament.standings.map((s, idx) => ({
            name: s.nickname,
            Podi: s.podiums,
            fill: COLORS[idx % COLORS.length],
        }))

        const maxPositions = tournament.n_players
        const posCounts = {}
        tournament.standings.forEach((s) => {
            posCounts[s.nickname] = {}
            for (let i = 1; i <= maxPositions; i++) posCounts[s.nickname][i] = 0
        })
        sortedRaces.forEach((race) => {
            race.results.forEach((r) => {
                const player = tournament.standings.find((s) => s.playerId === r.player_id)
                if (player && posCounts[player.nickname]) {
                    posCounts[player.nickname][r.position] = (posCounts[player.nickname][r.position] ?? 0) + 1
                }
            })
        })
        const positionData = []
        for (let pos = 1; pos <= maxPositions; pos++) {
            const entry = { name: `#${pos}` }
            tournament.standings.forEach((s) => {
                entry[s.nickname] = posCounts[s.nickname]?.[pos] ?? 0
            })
            positionData.push(entry)
        }

        const avgPointsChart = tournament.standings.map((s, idx) => ({
            name: s.nickname,
            'Media punti': s.racesPlayed > 0 ? Number((s.points / s.racesPlayed).toFixed(1)) : 0,
            'Media gare vinte': s.racesPlayed > 0 ? Number((s.raceWins / s.racesPlayed).toFixed(2)) : 0,
            'Media podi': s.racesPlayed > 0 ? Number((s.podiums / s.racesPlayed).toFixed(2)) : 0,
            fill: COLORS[idx % COLORS.length],
        }))

        return { pointsProgression, standingsChart, raceWinsChart, podiumsChart, positionData, avgPointsChart }
    }, [tournament])

    const { pointsProgression = [], standingsChart = [], raceWinsChart = [], podiumsChart = [], positionData = [], avgPointsChart = [] } = chartData

    const handleDownloadPDF = () => {
        window.print()
    }

    useEffect(() => {
        const style = document.createElement('style')
        style.textContent = `
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                nav, .no-print { display: none !important; }
                @page { size: A4 landscape; margin: 8mm; }
                .max-w-7xl { max-width: 100% !important; padding: 0 !important; }
                .lg\\:grid-cols-2 { grid-template-columns: 1fr !important; gap: 1rem !important; }
                .recharts-responsive-container { height: 220px !important; }
                .recharts-responsive-container svg { overflow: visible !important; }
                .rounded-3xl { box-shadow: none !important; }
                .space-y-10 { gap: 0.75rem !important; }
                .mb-8 { margin-bottom: 0.75rem !important; }
                .mt-8 { margin-top: 0.75rem !important; }
            }
        `
        document.head.appendChild(style)
        return () => style.remove()
    }, [])

    if (!tournament) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-7xl px-4 py-12 text-center">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-foreground">Torneo non trovato</h1>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-7xl px-4 py-12">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <button
                            onClick={() => navigate(`/tournaments/${tournament.id}`)}
                            className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-600 transition hover:text-emerald-500"
                        >
                            <ArrowLeft size={14} />
                            Torna al torneo
                        </button>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Statistiche</p>
                        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">{tournament.name}</h1>
                    </div>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-700"
                    >
                        <Download size={16} />
                        Scarica PDF
                    </button>
                </div>

                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoCard icon={BarChart3} label="Gare" value={`${tournament.raceCount}/${tournament.n_races}`} color="bg-emerald-500" />
                    <InfoCard icon={Users} label="Giocatori" value={tournament.n_players} color="bg-blue-500" />
                    <InfoCard icon={Trophy} label="Vincitore" value={tournament.winner?.nickname ?? 'N/D'} color="bg-amber-500" />
                    <InfoCard icon={TrendingUp} label="Media punti" value={(tournament.standings.reduce((a, s) => a + s.points, 0) / tournament.standings.length || 0).toFixed(1)} color="bg-purple-500" />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <ChartCard title="Andamento punti" icon={TrendingUp}>
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={pointsProgression} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                                {tournament.standings.map((s, idx) => (
                                    <Line key={s.playerId} type="monotone" dataKey={s.nickname} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Classifica finale" icon={Trophy}>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={standingsChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="Punti" radius={[6, 6, 0, 0]}>
                                    {standingsChart.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Gare vinte per giocatore" icon={Trophy}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={raceWinsChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="Gare vinte" radius={[6, 6, 0, 0]}>
                                    {raceWinsChart.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Podi per giocatore" icon={Trophy}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={podiumsChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="Podi" radius={[6, 6, 0, 0]}>
                                    {podiumsChart.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Distribuzione posizioni" icon={BarChart3}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={positionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                                {tournament.standings.map((s, idx) => (
                                    <Bar key={s.playerId} dataKey={s.nickname} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Medie per gara" icon={TrendingUp}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={avgPointsChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                                <Bar dataKey="Media punti" radius={[6, 6, 0, 0]}>
                                    {avgPointsChart.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-lg shadow-slate-200/60 dark:shadow-black/20">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-muted-foreground">
                            <CircuitBoard size={16} />
                            Dettaglio gare
                        </h3>
                        <button
                            onClick={() => {
                                const sortedRaces = [...tournament.races].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))
                                const headers = ['Gara', 'Circuito', ...tournament.standings.map((s) => s.nickname)]
                                const rows = sortedRaces.map((race) => {
                                    const resultMap = {}
                                    race.results.forEach((r) => { resultMap[r.player_id] = r })
                                    return [
                                        `Gara ${race.race_order}`,
                                        circuitsById?.get(race.circuit_id)?.name ?? '',
                                        ...tournament.standings.map((s) => {
                                            const res = resultMap[s.playerId]
                                            return res ? `#${res.position} (${res.points}pt)` : '-'
                                        }),
                                    ]
                                })
                                downloadCSV(headers, rows, `${tournament.name}-gare.csv`)
                            }}
                            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-700"
                        >
                            <FileSpreadsheet size={12} />
                            CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto p-1">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-border text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">
                                    <th className="px-4 py-3">Gara</th>
                                    <th className="px-4 py-3">Circuito</th>
                                    {tournament.standings.slice().reverse().map((s) => (
                                        <th key={s.playerId} className="px-3 py-3 text-right">{s.nickname}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[...tournament.races].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0)).map((race, rIdx) => {
                                    const resultMap = {}
                                    race.results.forEach((r) => { resultMap[r.player_id] = r })
                                    return (
                                        <tr key={race.id} className={`border-b border-slate-100 dark:border-border transition hover:bg-slate-50 dark:hover:bg-muted ${rIdx % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50/50 dark:bg-muted/50'}`}>
                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-foreground">Gara {race.race_order}</td>
                                            <td className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-muted-foreground">
                                                <span className="rounded-full bg-slate-100 dark:bg-muted px-2.5 py-1">
                                                    {circuitsById?.get(race.circuit_id)?.name ?? `Circuito #${race.circuit_id}`}
                                                </span>
                                            </td>
                                            {tournament.standings.slice().reverse().map((s) => {
                                                const res = resultMap[s.playerId]
                                                let badge = 'bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground'
                                                if (res?.position === 1) badge = 'bg-emerald-100 text-emerald-700'
                                                else if (res?.position === 2) badge = 'bg-blue-100 text-blue-700'
                                                else if (res?.position === 3) badge = 'bg-amber-100 text-amber-700'
                                                return (
                                                    <td key={s.playerId} className="px-3 py-3 text-right">
                                                        <span className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-black ${badge}`}>
                                                            {res ? `#${res.position}  ${res.points}pt` : '—'}
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}

export default TournamentStats