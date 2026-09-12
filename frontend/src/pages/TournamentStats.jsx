import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    LineChart, Line,
} from 'recharts'
import { ArrowLeft, BarChart3, Download, TrendingUp, Trophy, Users, CircuitBoard, FileSpreadsheet } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import AppLayout from '@/components/layout/AppLayout'
import { downloadCSV } from '@/lib/utils'
import { tournamentsApi } from '@/services/apiClient'
import { groupColor, groupLabel, GROUP_BADGE_CLASSES } from '@/lib/groupStage'

const COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d']

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-3" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <p className="mb-1 font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">{label}</p>
            {payload.map((entry, idx) => (
                <p key={idx} className="text-sm font-bold" style={{ color: entry.color }}>{entry.name}: {entry.value}</p>
            ))}
        </div>
    )
}

const InfoCard = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-4" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
        <div className={`rounded-xl p-2.5 ${color}`}>{Icon && <Icon size={20} className="text-white" />}</div>
        <div>
            <p className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">{label}</p>
            <p className="font-title text-lg text-slate-900 dark:text-foreground">{value}</p>
        </div>
    </div>
)

const ChartCard = ({ title, icon: Icon, children }) => (
    <div className="rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-6" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
        <div className="mb-4 flex items-center gap-2">
            {Icon && <Icon size={18} className="text-slate-600 dark:text-muted-foreground" />}
            <h3 className="font-title text-xs tracking-wide text-slate-700 dark:text-muted-foreground">{title}</h3>
        </div>
        {children}
    </div>
)

const TournamentStats = () => {
    const { tournamentId } = useParams()
    const navigate = useNavigate()
    const { getTournamentById, circuitsById } = useAppData()

    const tournament = getTournamentById(tournamentId)
    const isGroupStage = tournament?.tournament_format === 'group_stage'

    // Filtro per fase/girone — solo per i tornei a gironi, dove altrimenti
    // gironi/semifinali/finale/finalina finiscono tutti mischiati in un
    // unico set di grafici/tabella senza modo di isolarli (stesso pattern a
    // pillole già introdotto in RaceList.jsx).
    const [phaseFilter, setPhaseFilter] = useState('all')

    const groupKeys = useMemo(() => {
        if (!tournament || !isGroupStage) return []
        const orderByKey = new Map()
        for (const race of tournament.races ?? []) {
            if (!race.group_name) continue
            const existing = orderByKey.get(race.group_name)
            if (existing === undefined || race.race_order < existing) {
                orderByKey.set(race.group_name, race.race_order)
            }
        }
        return [...orderByKey.entries()].sort((a, b) => a[1] - b[1]).map(([key]) => key)
    }, [tournament, isGroupStage])

    // "Classifica finale" deve restare l'ordine ufficiale dell'intero torneo
    // (Finale prima della Finalina, sempre) indipendentemente dal filtro
    // fase — tournament.standings (somma punti su tutte le fasi mischiate)
    // non lo garantisce per i tornei a gironi, va richiesto al backend.
    const [overallOrder, setOverallOrder] = useState([])
    useEffect(() => {
        if (!tournament?.id || !isGroupStage) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOverallOrder([])
            return
        }
        let mounted = true
        tournamentsApi.overallClassifica(tournament.id)
            .then((res) => { if (mounted) setOverallOrder(res.data?.order ?? []) })
            .catch(() => { if (mounted) setOverallOrder([]) })
        return () => { mounted = false }
    }, [tournament?.id, isGroupStage])

    // Gare della fase selezionata, escluse quelle di spareggio — usate dai
    // grafici (coerente con sortedRaces di prima, solo ora scoped alla fase).
    const filteredRaces = useMemo(() => {
        if (!tournament) return []
        const base = (tournament.races ?? []).filter((r) => !r.is_duello)
        if (!isGroupStage || phaseFilter === 'all') return base
        return base.filter((r) => r.group_name === phaseFilter)
    }, [tournament, isGroupStage, phaseFilter])

    // Stessa lista ma per la tabella "Dettaglio gare"/CSV, che include
    // deliberatamente anche gli spareggi (comportamento preesistente).
    const tableRaces = useMemo(() => {
        if (!tournament) return []
        const base = [...(tournament.races ?? [])].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))
        if (!isGroupStage || phaseFilter === 'all') return base
        return base.filter((r) => r.group_name === phaseFilter)
    }, [tournament, isGroupStage, phaseFilter])

    // Aggregazione punti/vittorie/podi scoped alla fase selezionata — quando
    // "Tutte le fasi" resta l'aggregato cross-fase esistente (tournament.standings),
    // qui esplicitamente solo una statistica aggregata, non la classifica ufficiale
    // (quella è sempre standingsChart/overallOrder sopra).
    const perPhaseStandings = useMemo(() => {
        if (!tournament) return []
        if (!isGroupStage || phaseFilter === 'all') return tournament.standings ?? []
        const playerInfoById = new Map((tournament.standings ?? []).map((s) => [s.playerId, s]))
        const byId = new Map()
        for (const race of filteredRaces) {
            for (const r of race.results ?? []) {
                const info = playerInfoById.get(r.player_id)
                if (!info) continue
                const row = byId.get(r.player_id) ?? {
                    playerId: r.player_id, nickname: info.nickname, img_url: info.img_url,
                    points: 0, raceWins: 0, podiums: 0, racesPlayed: 0,
                }
                row.points += r.points ?? 0
                row.racesPlayed += 1
                if (r.position === 1) row.raceWins += 1
                if (r.position <= 3) row.podiums += 1
                byId.set(r.player_id, row)
            }
        }
        return [...byId.values()].sort((a, b) => b.points - a.points)
    }, [tournament, isGroupStage, phaseFilter, filteredRaces])

    const chartData = useMemo(() => {
        if (!tournament) return {}

        const sortedRaces = [...filteredRaces].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))

        const cumulativePoints = {}
        perPhaseStandings.forEach((s) => { cumulativePoints[s.playerId] = 0 })

        const pointsProgression = sortedRaces.map((race) => {
            const point = { name: `Gara ${race.race_order}` }
            race.results.forEach((r) => {
                cumulativePoints[r.player_id] = (cumulativePoints[r.player_id] ?? 0) + (r.points ?? 0)
            })
            perPhaseStandings.forEach((s) => {
                point[s.nickname] = cumulativePoints[s.playerId] ?? 0
            })
            return point
        })

        // La classifica finale ufficiale resta sempre sull'intero torneo,
        // ordinata con l'ordine del backend per i tornei a gironi (Finale
        // prima della Finalina) — vedi overallOrder sopra.
        const standingsSource = (isGroupStage && overallOrder.length > 0)
            ? (() => {
                const byId = new Map((tournament.standings ?? []).map((s) => [s.playerId, s]))
                return overallOrder.map((pid) => byId.get(pid)).filter(Boolean)
            })()
            : (tournament.standings ?? [])

        const standingsChart = standingsSource.map((s, idx) => ({
            name: s.nickname,
            Punti: s.points,
            fill: COLORS[idx % COLORS.length],
        }))

        const raceWinsChart = perPhaseStandings.map((s, idx) => ({
            name: s.nickname,
            'Gare vinte': s.raceWins,
            fill: COLORS[idx % COLORS.length],
        }))

        const podiumsChart = perPhaseStandings.map((s, idx) => ({
            name: s.nickname,
            Podi: s.podiums,
            fill: COLORS[idx % COLORS.length],
        }))

        const maxPositions = (isGroupStage && phaseFilter !== 'all') ? perPhaseStandings.length : tournament.n_players
        const posCounts = {}
        perPhaseStandings.forEach((s) => {
            posCounts[s.nickname] = {}
            for (let i = 1; i <= maxPositions; i++) posCounts[s.nickname][i] = 0
        })
        sortedRaces.forEach((race) => {
            race.results.forEach((r) => {
                const player = perPhaseStandings.find((s) => s.playerId === r.player_id)
                if (player && posCounts[player.nickname]) {
                    posCounts[player.nickname][r.position] = (posCounts[player.nickname][r.position] ?? 0) + 1
                }
            })
        })
        const positionData = []
        for (let pos = 1; pos <= maxPositions; pos++) {
            const entry = { name: `#${pos}` }
            perPhaseStandings.forEach((s) => {
                entry[s.nickname] = posCounts[s.nickname]?.[pos] ?? 0
            })
            positionData.push(entry)
        }

        const avgPointsChart = perPhaseStandings.map((s, idx) => ({
            name: s.nickname,
            'Media punti': s.racesPlayed > 0 ? Number((s.points / s.racesPlayed).toFixed(1)) : 0,
            'Media gare vinte': s.racesPlayed > 0 ? Number((s.raceWins / s.racesPlayed).toFixed(2)) : 0,
            'Media podi': s.racesPlayed > 0 ? Number((s.podiums / s.racesPlayed).toFixed(2)) : 0,
            fill: COLORS[idx % COLORS.length],
        }))

        return { pointsProgression, standingsChart, raceWinsChart, podiumsChart, positionData, avgPointsChart }
    }, [tournament, filteredRaces, perPhaseStandings, isGroupStage, overallOrder, phaseFilter])

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
                .rounded-3xl, .rounded-2xl, [style*="box-shadow"] { box-shadow: none !important; }
                .rounded-2xl, .rounded-3xl { border-width: 1px !important; }
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
                        <p className="font-title text-[10px] tracking-wide text-emerald-600">Statistiche</p>
                        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">{tournament.name}</h1>
                    </div>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-slate-900 bg-slate-900 px-5 py-3 font-title text-[11px] tracking-wide text-white transition active:translate-y-px hover:bg-slate-700"
                        style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                    >
                        <Download size={16} />
                        Scarica PDF
                    </button>
                </div>

                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoCard icon={BarChart3} label="Gare" value={`${tournament.raceCount}/${tournament.n_races}`} color="bg-emerald-500" />
                    <InfoCard icon={Users} label="Giocatori" value={tournament.n_players} color="bg-blue-500" />
                    <InfoCard icon={Trophy} label="Vincitore" value={tournament.winner?.nickname ?? 'N/D'} color="bg-amber-500" />
                </div>

                {/* Filtro fase/girone — solo tornei a gironi. "Classifica finale"
                    resta sempre sull'intero torneo (vedi standingsChart sopra);
                    gli altri grafici e la tabella sotto seguono questo filtro. */}
                {groupKeys.length > 0 && (
                    <div className="no-print mb-6 flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => setPhaseFilter('all')}
                            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                                phaseFilter === 'all'
                                    ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'border-slate-200 dark:border-border text-slate-500 dark:text-muted-foreground hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            Tutte le fasi
                        </button>
                        {groupKeys.map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setPhaseFilter(key)}
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                                    phaseFilter === key
                                        ? GROUP_BADGE_CLASSES[groupColor(key)]
                                        : 'border-slate-200 dark:border-border text-slate-500 dark:text-muted-foreground hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                {groupLabel(key)}
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <ChartCard title="Andamento punti" icon={TrendingUp}>
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={pointsProgression} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                                {perPhaseStandings.map((s, idx) => (
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
                                {perPhaseStandings.map((s, idx) => (
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

                <div className="mt-8 overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-6 py-4">
                        <h3 className="flex items-center gap-2 font-title text-xs tracking-wide text-slate-700 dark:text-muted-foreground">
                            <CircuitBoard size={16} />
                            Dettaglio gare
                        </h3>
                        <button
                            onClick={() => {
                                const headers = ['Gara', ...(isGroupStage ? ['Fase'] : []), 'Circuito', ...tournament.standings.map((s) => s.nickname)]
                                const rows = tableRaces.map((race) => {
                                    const resultMap = {}
                                    race.results.forEach((r) => { resultMap[r.player_id] = r })
                                    return [
                                        `Gara ${race.race_order}${race.is_duello ? ' (Spareggio)' : ''}`,
                                        ...(isGroupStage ? [race.group_name ? groupLabel(race.group_name) : ''] : []),
                                        circuitsById?.get(race.circuit_id)?.name ?? '',
                                        ...tournament.standings.map((s) => {
                                            const res = resultMap[s.playerId]
                                            return res ? `#${res.position} (${res.points}pt)` : '-'
                                        }),
                                    ]
                                })
                                downloadCSV(headers, rows, `${tournament.name}-gare.csv`)
                            }}
                            className="flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-slate-800 bg-slate-800 px-3 py-1.5 font-title text-[9px] tracking-wide text-white transition active:translate-y-px hover:bg-slate-700"
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                        >
                            <FileSpreadsheet size={12} />
                            CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto p-1">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-border font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">
                                    <th className="px-4 py-3">Gara</th>
                                    {isGroupStage && <th className="px-4 py-3">Fase</th>}
                                    <th className="px-4 py-3">Circuito</th>
                                    {tournament.standings.slice().reverse().map((s) => (
                                        <th key={s.playerId} className="px-3 py-3 text-right">{s.nickname}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableRaces.map((race, rIdx) => {
                                    const resultMap = {}
                                    race.results.forEach((r) => { resultMap[r.player_id] = r })
                                    return (
                                        <tr key={race.id} className={`border-b border-slate-100 dark:border-border transition hover:bg-slate-50 dark:hover:bg-muted ${rIdx % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50/50 dark:bg-muted/50'}`}>
                                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-foreground">
                                                Gara {race.race_order}
                                                {race.is_duello && <span className="ms-1.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">(Spareggio)</span>}
                                            </td>
                                            {isGroupStage && (
                                                <td className="px-4 py-3">
                                                    {race.group_name && (
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${GROUP_BADGE_CLASSES[groupColor(race.group_name)]}`}>
                                                            {groupLabel(race.group_name)}
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-xs font-medium text-slate-500 dark:text-muted-foreground">
                                                <span className="rounded-full bg-slate-100 dark:bg-muted px-2.5 py-1">
                                                    {circuitsById?.get(race.circuit_id)?.name ?? `Circuito #${race.circuit_id}`}
                                                </span>
                                            </td>
                                            {tournament.standings.slice().reverse().map((s) => {
                                                const res = resultMap[s.playerId]
                                                let badge = 'bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground border-transparent'
                                                if (res?.position === 1) badge = 'bg-circuit-gold text-circuit-ink border-circuit-ink'
                                                else if (res?.position === 2) badge = 'bg-slate-300 text-slate-800 border-circuit-ink'
                                                else if (res?.position === 3) badge = 'bg-orange-400 text-orange-950 border-circuit-ink'
                                                return (
                                                    <td key={s.playerId} className="px-3 py-3 text-right">
                                                        <span className="inline-flex items-center justify-end gap-1.5">
                                                            {res ? (
                                                                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border-2 font-title text-[10px] ${badge}`}>
                                                                    {res.position}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] font-black text-slate-400 dark:text-muted-foreground">—</span>
                                                            )}
                                                            {res && <span className="text-[11px] font-black text-slate-600 dark:text-muted-foreground">{res.points}pt</span>}
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
