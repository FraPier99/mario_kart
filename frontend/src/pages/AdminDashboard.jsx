import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    Users, Trophy, BarChart3, Shield, ExternalLink, ArrowRight,
    Activity, Award, Plus, Flag, LayoutDashboard, Search,
    Clock, Play,
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/services/apiClient'

// ── Sparkline ────────────────────────────────────────────────────
const Sparkline = ({ data, color = '#10b981', height = 30, width = 72 }) => {
    if (!data?.length || data.length < 2) return null
    const max = Math.max(...data, 1)
    const min = Math.min(...data)
    const range = max - min || 1
    const step = width / (data.length - 1)
    const pts = data.map((v, i) => [
        +(i * step).toFixed(1),
        +(height - ((v - min) / range) * (height * 0.8) - height * 0.1).toFixed(1),
    ])
    const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
    return (
        <svg width={width} height={height} className="shrink-0 overflow-visible">
            <path d={`${d} L${pts.at(-1)[0]},${height} L${pts[0][0]},${height} Z`} fill={color} fillOpacity="0.12" />
            <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="2.5" fill={color} />
        </svg>
    )
}

// ── shared primitives ────────────────────────────────────────────
const METRIC_CARD_COLORS = {
    amber:   'border-amber-100 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/8 text-amber-700 dark:text-amber-300 [&>div>svg]:text-amber-500',
    emerald: 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/8 text-emerald-700 dark:text-emerald-300 [&>div>svg]:text-emerald-500',
    blue:    'border-blue-100 dark:border-blue-500/20 bg-blue-50/70 dark:bg-blue-500/8 text-blue-700 dark:text-blue-300 [&>div>svg]:text-blue-500',
    violet:  'border-violet-100 dark:border-violet-500/20 bg-violet-50/70 dark:bg-violet-500/8 text-violet-700 dark:text-violet-300 [&>div>svg]:text-violet-500',
}

const MetricMini = ({ icon: Icon, label, value, sub, color = 'amber' }) => (
    <div className={`rounded-2xl border-2 p-4 flex flex-col gap-1 ${METRIC_CARD_COLORS[color] ?? METRIC_CARD_COLORS.amber}`} style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
        <div className="flex items-center justify-between mb-0.5">
            <p className="font-title text-[8px] tracking-wide text-slate-500 dark:text-muted-foreground leading-none">{label}</p>
            <Icon size={12} />
        </div>
        <p className="font-title text-2xl leading-none">{value}</p>
        {sub && <p className="text-[9px] text-slate-400 dark:text-muted-foreground">{sub}</p>}
    </div>
)

const STATUS_LABEL = { da_svolgere: 'In attesa', in_corso: 'In corso', finito: 'Gare finite', concluso: 'Concluso' }
const STATUS_COLOR = {
    in_corso:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    concluso:    'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    da_svolgere: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    finito:      'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
}

const TABS = [
    { key: 'panoramica', label: 'Panoramica', icon: LayoutDashboard },
    { key: 'tornei',     label: 'Tornei',     icon: Trophy },
    { key: 'giocatori',  label: 'Giocatori',  icon: Users },
]

const FILTERS = ['all', 'in_corso', 'da_svolgere', 'concluso']
const FILTER_LABELS = { all: 'Tutti', in_corso: 'In corso', da_svolgere: 'In attesa', concluso: 'Conclusi' }

// ── Admin Profile Card ────────────────────────────────────────────
const AdminProfileCard = ({ user, players, charactersById }) => {
    const pid = user?.player_id ?? user?.player?.id
    const playerData = pid ? players.find(p => p.id === pid) : null
    const favChar = playerData?.favorite_character_id
        ? (charactersById?.get(playerData.favorite_character_id) ?? null)
        : null
    const avatarSrc = favChar?.img_url ?? playerData?.img_url ?? null

    return (
        <div className="flex h-full flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <div className="relative mt-1">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl scale-150 pointer-events-none" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-[2.5px] border-emerald-400 overflow-hidden bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-400/20">
                    {avatarSrc
                        ? <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
                        : <Shield size={30} className="text-white" />}
                </div>
                <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-white dark:border-card bg-emerald-400" />
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 text-center">
                <p className="text-sm font-black text-slate-900 dark:text-foreground">{playerData?.nickname ?? user?.username}</p>
                <p className="font-title text-[9px] tracking-wide text-emerald-600 dark:text-emerald-400">Admin</p>
                {favChar && (
                    <div className="mt-1 flex items-center gap-1">
                        {favChar.img_url && <img src={favChar.img_url} alt={favChar.name} className="h-4 w-4 rounded-full object-cover" />}
                        <span className="text-[10px] text-slate-400 dark:text-muted-foreground">{favChar.name}</span>
                    </div>
                )}
            </div>
            <Link to="/dashboard"
                className="w-full rounded-xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 py-2 text-center font-title text-[9px] tracking-wide text-emerald-700 dark:text-emerald-300 transition active:translate-y-px hover:bg-emerald-100 dark:hover:bg-emerald-500/15">
                Vedi Profilo
            </Link>
        </div>
    )
}

// ── Horizontal stat cards ────────────────────────────────────────
const PlayersStatCard = ({ players, tournaments }) => {
    const faces = players.slice(0, 5)
    const sparkData = tournaments.slice(-8).map(t => t.participant_ids?.length ?? 0)
    return (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/8 px-4 py-3" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <div className="flex -space-x-2 shrink-0">
                {faces.map((p, i) => (
                    <div key={p.id} style={{ zIndex: 10 - i }}
                        className="relative h-7 w-7 rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-emerald-300 dark:bg-emerald-700 shrink-0">
                        {p.img_url
                            ? <img src={p.img_url} alt={p.nickname} className="h-full w-full object-cover" />
                            : <span className="flex h-full w-full items-center justify-center text-[8px] font-black text-white">{(p.nickname ?? '?')[0]}</span>
                        }
                    </div>
                ))}
                {players.length > 5 && (
                    <div className="relative z-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-[7px] font-black text-slate-500 dark:text-slate-300 shrink-0">
                        +{players.length - 5}
                    </div>
                )}
            </div>
            <Sparkline data={sparkData} color="#10b981" height={28} width={68} />
            <div className="ml-auto text-right shrink-0">
                <p className="font-title text-xl text-emerald-700 dark:text-emerald-300 leading-none">{players.length}</p>
                <p className="font-title text-[8px] tracking-wide text-slate-500 mt-0.5">Giocatori</p>
            </div>
        </div>
    )
}

const RacesStatCard = ({ completedRaces, totalRaces }) => {
    const pct = totalRaces > 0 ? Math.min(100, Math.round((completedRaces / totalRaces) * 100)) : 0
    return (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-rose-100 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-500/8 px-4 py-3" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <p className="font-title text-[8px] tracking-wide text-slate-500">Completamento</p>
                    <p className="text-[9px] font-black text-rose-600 dark:text-rose-400">{pct}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-rose-100 dark:bg-rose-900/40 overflow-hidden mb-2">
                    <div className="h-full rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex flex-wrap gap-px">
                    {Array.from({ length: Math.min(completedRaces, 10) }).map((_, i) => (
                        <span key={i} className="text-[9px] leading-none">🏁</span>
                    ))}
                    {completedRaces > 10 && <span className="text-[8px] font-black text-rose-500">+{completedRaces - 10}</span>}
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="font-title text-xl text-rose-700 dark:text-rose-300 leading-none">{completedRaces}</p>
                <p className="font-title text-[8px] tracking-wide text-slate-500 mt-0.5">Gare</p>
            </div>
        </div>
    )
}

const TrophiesStatCard = ({ concluded }) => (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-100 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/8 px-4 py-3" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
        <div className="flex flex-wrap gap-1 flex-1">
            {concluded > 0
                ? Array.from({ length: Math.min(concluded, 8) }).map((_, i) => (
                    <Trophy key={i} size={15} className="text-amber-500 dark:text-amber-400" />
                ))
                : <span className="text-xs text-amber-300">—</span>
            }
            {concluded > 8 && <span className="text-[9px] font-black text-amber-500">+{concluded - 8}</span>}
        </div>
        <div className="text-right shrink-0">
            <p className="font-title text-xl text-amber-700 dark:text-amber-300 leading-none">{concluded}</p>
            <p className="font-title text-[8px] tracking-wide text-slate-500 mt-0.5">Trofei</p>
        </div>
    </div>
)

// ── Tournament Timeline Widget ───────────────────────────────────
const TournamentTimeline = ({ tournament }) => {
    if (!tournament) return (
        <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-5 h-full">
            <p className="text-xs text-slate-400 dark:text-muted-foreground">Nessun torneo attivo</p>
        </div>
    )
    const STEPS = [
        { key: 'da_svolgere', label: 'Programmato', Icon: Clock },
        { key: 'in_corso',    label: 'In corso',    Icon: Play },
        { key: 'finito',      label: 'Gare finite', Icon: Flag },
        { key: 'concluso',    label: 'Concluso',    Icon: Trophy },
    ]
    const currentIdx = STEPS.findIndex(s => s.key === tournament.status)
    return (
        <div className="flex flex-col rounded-2xl border-2 border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-card p-4 h-full" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <p className="font-title text-[8px] tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Torneo recente</p>
            <p className="text-sm font-black text-slate-900 dark:text-foreground truncate mb-4">{tournament.name}</p>
            <div className="relative flex-1 pl-6">
                <div className="absolute left-[11px] top-1 bottom-1 w-px border-l-2 border-dashed border-slate-200 dark:border-white/10" />
                <div className="space-y-3">
                    {STEPS.map(({ key, label, Icon }, i) => {
                        const isDone = i < currentIdx
                        const isCurrent = i === currentIdx
                        return (
                            <div key={key} className="flex items-center gap-2.5 relative">
                                <div className={`absolute -left-6 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                    isCurrent ? 'bg-emerald-400 border-emerald-400 shadow shadow-emerald-400/40'
                                    : isDone   ? 'bg-emerald-400 border-emerald-400'
                                               : 'bg-white dark:bg-card border-slate-200 dark:border-white/15'
                                }`}>
                                    <Icon size={8} className={isDone || isCurrent ? 'text-white' : 'text-slate-300 dark:text-slate-600'} />
                                </div>
                                <span className={`text-xs leading-none ${
                                    isCurrent ? 'font-black text-emerald-700 dark:text-emerald-300'
                                    : isDone   ? 'font-bold text-slate-700 dark:text-foreground'
                                               : 'font-medium text-slate-400 dark:text-slate-600'
                                }`}>
                                    {label}
                                    {isCurrent && <span className="ml-1.5 text-[8px] font-black text-emerald-500">← ora</span>}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
            <Link to={`/tournaments/${tournament.id}`}
                className="mt-4 w-full rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 py-1.5 text-center font-title text-[9px] tracking-wide text-emerald-700 dark:text-emerald-300 transition active:translate-y-px hover:bg-emerald-100 dark:hover:bg-emerald-500/20">
                Apri Torneo
            </Link>
        </div>
    )
}

// ── tabs ─────────────────────────────────────────────────────────

const PanoramicaTab = ({ stats, tournaments, activeTournament, players, charactersById, user, homeMetrics }) => (
    <div className="space-y-6">

        {/* HERO GRID: Profilo | Metriche | Stat Cards */}
        <div className="grid gap-4 xl:grid-cols-[200px_1fr_280px]">

            {/* Profilo Admin */}
            <AdminProfileCard user={user} players={players} charactersById={charactersById} />

            {/* Metriche mini 2×2 */}
            <div className="grid grid-cols-2 gap-3 auto-rows-fr">
                <MetricMini icon={Trophy} label="Tornei Totali" value={stats.total}
                    sub={`${stats.active} in corso · ${stats.scheduled} in attesa`} color="amber" />
                <MetricMini icon={Users} label="Giocatori" value={stats.totalPlayers}
                    sub={`${stats.totalUsers} account`} color="blue" />
                <MetricMini icon={Award} label="Trofei Vinti" value={stats.concluded}
                    sub="tornei conclusi" color="violet" />
                <MetricMini icon={Activity} label="In corso" value={stats.active}
                    sub={stats.active === 1 ? '1 torneo attivo' : `${stats.active} tornei attivi`} color="emerald" />
            </div>

            {/* 3 Stat card orizzontali impilate */}
            <div className="flex flex-col gap-3">
                <PlayersStatCard players={players} tournaments={tournaments} />
                <RacesStatCard
                    completedRaces={homeMetrics?.completedRaces ?? 0}
                    totalRaces={Math.max(homeMetrics?.completedRaces ?? 0, stats.total * 4)}
                />
                <TrophiesStatCard concluded={stats.concluded} />
            </div>
        </div>

        {/* AZIONI RAPIDE + TIMELINE */}
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="grid gap-3 sm:grid-cols-3">
                {(() => {
                    const thirdAction = activeTournament
                        ? { to: `/tournaments/${activeTournament.id}`, label: 'Gestisci gare', desc: `${activeTournament.name} · in corso`, color: 'bg-linear-to-br from-emerald-500 to-green-600', icon: Flag }
                        : { to: '/history', label: 'Storico tornei', desc: 'Classifiche e archivio completo', color: 'bg-linear-to-br from-emerald-500 to-green-600', icon: BarChart3 }
                    return [
                        { to: '/tournaments/new', label: 'Nuovo torneo', desc: 'Crea torneo con partecipanti e gare', color: 'bg-linear-to-br from-emerald-500 to-green-600', icon: Plus },
                        { to: '/admin/players', label: 'Gestisci giocatori', desc: 'Aggiungi, modifica o rimuovi piloti', color: 'bg-linear-to-br from-blue-500 to-indigo-600', icon: Users },
                        thirdAction,
                    ]
                })().map(({ to, label, desc, color, icon: Icon }) => (
                    <Link key={to} to={to} className="group flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-4 transition hover:border-emerald-300 dark:hover:border-emerald-700" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                            <Icon size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-foreground">{label}</p>
                            <p className="text-[10px] text-slate-500 dark:text-muted-foreground leading-snug">{desc}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Timeline widget */}
            <TournamentTimeline tournament={activeTournament ?? tournaments[0] ?? null} />
        </div>

        {/* Ultimi tornei */}
        <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
            <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-border">
                <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground">Ultimi tornei</p>
                <Link to="/history" className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline">Vedi tutti</Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
                {tournaments.slice(0, 6).map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-foreground truncate">{t.name}</p>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                {t.date ? new Date(t.date).toLocaleDateString('it-IT') : '—'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 text-[9px] font-black text-slate-600 dark:text-slate-300">
                                👥 {t.participant_ids?.length ?? 0}
                            </span>
                            {(t.n_races ?? 0) > 0 && (
                                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 text-[9px] font-black text-slate-600 dark:text-slate-300">
                                    🏁 {t.n_races}
                                </span>
                            )}
                            <span className={`rounded-full px-2.5 py-0.5 font-title text-[9px] tracking-wide ${STATUS_COLOR[t.status] ?? STATUS_COLOR.da_svolgere}`}>
                                {STATUS_LABEL[t.status] ?? t.status}
                            </span>
                            <Link to={`/tournaments/${t.id}`}
                                className="flex items-center gap-1 rounded-lg border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-2 py-1 font-title text-[9px] tracking-wide text-slate-600 dark:text-slate-300 transition active:translate-y-px hover:text-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-700">
                                <ExternalLink size={10} /> Apri
                            </Link>
                        </div>
                    </div>
                ))}
                {tournaments.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">Nessun torneo ancora creato.</p>}
            </div>
        </div>
    </div>
)

const TorneiTab = ({ tournaments }) => {
    const [filter, setFilter] = useState('all')
    const filtered = useMemo(() => {
        const sorted = [...tournaments].sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0))
        if (filter === 'all') return sorted
        return sorted.filter(t => t.status === filter)
    }, [tournaments, filter])

    return (
        <div className="space-y-4">
            {/* Create + filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 overflow-x-auto">
                    {FILTERS.map(f => (
                        <button key={f} type="button" onClick={() => setFilter(f)}
                            className={`shrink-0 rounded-xl px-3 py-1.5 font-title text-[10px] tracking-wide transition active:translate-y-px ${filter === f ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200 dark:border-border bg-white dark:bg-card text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground'}`}>
                            {FILTER_LABELS[f]}
                        </button>
                    ))}
                </div>
                <Link to="/tournaments/new"
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-400">
                    <Plus size={12} /> Nuovo torneo
                </Link>
            </div>

            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                {filtered.map((t, i) => (
                    <div key={t.id} className={`flex items-center justify-between gap-4 px-5 py-4 ${i > 0 ? 'border-t border-slate-100 dark:border-white/5' : ''}`}>
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-foreground truncate">{t.name}</p>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                {t.date ? new Date(t.date).toLocaleDateString('it-IT') : '—'}
                                {(t.participant_ids?.length ?? 0) > 0 && ` · ${t.participant_ids.length} piloti`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className={`rounded-full px-2.5 py-0.5 font-title text-[9px] tracking-wide ${STATUS_COLOR[t.status] ?? STATUS_COLOR.da_svolgere}`}>
                                {STATUS_LABEL[t.status] ?? t.status}
                            </span>
                            <Link to={`/tournaments/${t.id}`}
                                className="flex items-center gap-1 rounded-lg border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-2 py-1 font-title text-[9px] tracking-wide text-slate-600 dark:text-slate-300 transition active:translate-y-px hover:text-emerald-500 hover:border-emerald-300">
                                <ExternalLink size={10} /> Apri
                            </Link>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <p className="px-5 py-8 text-center text-sm text-slate-400">
                        {filter === 'all' ? 'Nessun torneo creato.' : `Nessun torneo con stato "${FILTER_LABELS[filter]}".`}
                    </p>
                )}
            </div>
        </div>
    )
}

const GiocatoriTab = ({ players }) => {
    const [search, setSearch] = useState('')
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        if (!q) return players
        return players.filter(p =>
            (p.nickname ?? '').toLowerCase().includes(q) ||
            (p.first_name ?? '').toLowerCase().includes(q) ||
            (p.last_name ?? '').toLowerCase().includes(q)
        )
    }, [players, search])

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cerca giocatore..."
                        className="w-full rounded-xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 outline-none focus:border-emerald-500 transition"
                    />
                </div>
                <Link to="/admin/players"
                    className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-2.5 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-blue-400">
                    <Plus size={12} /> Aggiungi
                </Link>
            </div>

            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <div className="grid gap-px">
                    {filtered.map((p, i) => (
                        <div key={p.id} className={`flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-white/3 ${i > 0 ? 'border-t border-slate-100 dark:border-white/5' : ''}`}>
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-muted">
                                {p.img_url
                                    ? <img src={p.img_url} alt={p.nickname} className="h-full w-full object-cover" />
                                    : <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400">
                                        {(p.nickname ?? '?').charAt(0).toUpperCase()}
                                      </div>
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-900 dark:text-foreground truncate capitalize">{p.nickname}</p>
                                <p className="text-xs text-slate-500 dark:text-muted-foreground truncate">{p.first_name} {p.last_name}</p>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <p className="px-5 py-8 text-center text-sm text-slate-400">Nessun giocatore trovato.</p>
                    )}
                </div>
            </div>

            <Link to="/admin/players"
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-3 font-title text-xs tracking-wide text-slate-600 dark:text-slate-400 transition active:translate-y-px hover:text-slate-900 dark:hover:text-foreground hover:border-emerald-300">
                <Users size={14} /> Gestione completa giocatori
                <ArrowRight size={13} className="ml-auto" />
            </Link>
        </div>
    )
}

// ── main component ───────────────────────────────────────────────
export default function AdminDashboard() {
    const { tournaments, players, loading, homeMetrics, charactersById } = useAppData()
    const { user, isSuperadmin } = useAuth()
    const [activeTab, setActiveTab] = useState('panoramica')
    const [users, setUsers] = useState([])

    useEffect(() => {
        // GET /auth/users richiede il ruolo superadmin: un account admin (non
        // superadmin) che visita questa pagina otterrebbe un 403 silenzioso
        // (vedi commento in hooks/useCommunityUserNav.js per lo stesso bug
        // pattern già risolto altrove).
        if (isSuperadmin) {
            authApi.listUsers().then(res => setUsers(res.data ?? [])).catch(() => {})
        }
    }, [isSuperadmin])

    const stats = useMemo(() => ({
        total:        tournaments.length,
        active:       tournaments.filter(t => t.status === 'in_corso').length,
        concluded:    tournaments.filter(t => t.status === 'concluso').length,
        scheduled:    tournaments.filter(t => t.status === 'da_svolgere').length,
        totalPlayers: players.length,
        totalUsers:   users.length,
    }), [tournaments, players, users])

    const activeTournament = useMemo(
        () => tournaments.find(t => t.status === 'in_corso') ?? null,
        [tournaments]
    )

    if (loading) {
        return (
            <AppLayout>
                <section className="mx-auto max-w-7xl px-4 py-12">
                    <div className="h-24 animate-shimmer rounded-[2rem] bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 mb-4" />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="h-24 animate-shimmer rounded-2xl bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
                        ))}
                    </div>
            </section>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 md:p-8 space-y-6">

                {/* Header + tab bar */}
                <div className="rounded-[2rem] border-2 border-slate-900/20 dark:border-white/15 bg-white dark:bg-card overflow-hidden" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                    <div className="p-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-emerald-700/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Shield size={22} />
                            </div>
                            <div>
                                <p className="font-title text-[10px] tracking-wide text-emerald-600 dark:text-emerald-400">Pannello di controllo</p>
                                <h1 className="mt-0.5 text-2xl font-black text-slate-900 dark:text-foreground">Pannello Admin</h1>
                                <p className="text-sm text-slate-500 dark:text-muted-foreground">
                                    {user?.username} · <span className="capitalize">{user?.role}</span>
                                </p>
                            </div>
                        </div>
                        <Link to="/tournaments/new"
                            className="hidden sm:flex items-center gap-2 rounded-2xl border-2 border-circuit-ink bg-emerald-500 px-4 py-2 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-400" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                            <Plus size={14} /> Nuovo torneo
                        </Link>
                    </div>

                    {/* Tab bar */}
                    <div className="border-t border-slate-100 dark:border-border px-6">
                        <div className="flex gap-0.5 overflow-x-auto">
                            {TABS.map(({ key, label, icon: Icon }) => (
                                <button key={key} type="button" onClick={() => setActiveTab(key)}
                                    className={`flex shrink-0 items-center gap-2 px-4 py-3 font-title text-[10px] tracking-wide border-b-2 transition active:translate-y-px ${activeTab === key ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground'}`}>
                                    <Icon size={13} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {activeTab === 'panoramica' && (
                    <PanoramicaTab
                        stats={stats}
                        tournaments={tournaments}
                        activeTournament={activeTournament}
                        players={players}
                        charactersById={charactersById}
                        user={user}
                        homeMetrics={homeMetrics}
                    />
                )}
                {activeTab === 'tornei' && (
                    <TorneiTab tournaments={tournaments} />
                )}
                {activeTab === 'giocatori' && (
                    <GiocatoriTab players={players} />
                )}
                </div>
            </section>
        </AppLayout>
    )
}
