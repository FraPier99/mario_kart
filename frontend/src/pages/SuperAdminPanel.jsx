import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Activity, Award, BarChart3, Check, Clock, Database,
    ExternalLink, Key, LayoutDashboard, Play, Plus, RefreshCw,
    Search, Shield, Trophy, Users, X, Zap, Trash2, Square, Flag, AlertTriangle, Copy, PartyPopper
} from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import ConfirmModal from '@/components/common/ConfirmModal'
import DatabaseTab from '@/components/superadmin/DatabaseTab'
import TournamentStatusBadge from '@/components/common/TournamentStatusBadge'
import { SkeletonRows } from '@/components/common/Skeleton'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { authApi, auditApi, schedineApi, tournamentsApi, getApiErrorMessage } from '@/services/apiClient'

// ── helpers ─────────────────────────────────────────────────────────
const STATUS_LABEL = { da_svolgere: 'In attesa', in_corso: 'In corso', finito: 'Finito', concluso: 'Concluso' }
const ACTION_COLOR = {
    login: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    user_created: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    user_deleted: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
    user_role_changed: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    password_reset: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
}


const TABS = [
    { key: 'panoramica', label: 'Panoramica', icon: LayoutDashboard },
    { key: 'utenti',     label: 'Utenti',     icon: Users },
    { key: 'tornei',     label: 'Tornei',     icon: Trophy },
    { key: 'database',   label: 'Database',   icon: Database },
    { key: 'log',        label: 'Audit Log',  icon: Activity },
]

// ── Sparkline SVG ────────────────────────────────────────────────
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

// ── Profilo SuperAdmin ────────────────────────────────────────────
const AdminProfileCard = ({ user, players, charactersById }) => {
    const pid = user?.player_id ?? user?.player?.id
    const playerData = pid ? players.find(p => p.id === pid) : null
    const favChar = playerData?.favorite_character_id
        ? (charactersById?.get(playerData.favorite_character_id) ?? null)
        : null
    const avatarSrc = favChar?.img_url ?? playerData?.img_url ?? null

    return (
        <div className="flex h-full flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            {/* Anello luminoso */}
            <div className="relative mt-1">
                <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl scale-150 pointer-events-none" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-[2.5px] border-amber-400 overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/20">
                    {avatarSrc
                        ? <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
                        : <Shield size={30} className="text-white" />}
                </div>
                <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-white dark:border-card bg-emerald-400" />
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 text-center">
                <p className="text-sm font-black text-slate-900 dark:text-foreground">{playerData?.nickname ?? user?.username}</p>
                <p className="font-title text-[9px] tracking-wide text-amber-600 dark:text-amber-400">SuperAdmin</p>
                {favChar && (
                    <div className="mt-1 flex items-center gap-1">
                        {favChar.img_url && <img src={favChar.img_url} alt={favChar.name} className="h-4 w-4 rounded-full object-cover" />}
                        <span className="text-[10px] text-slate-400 dark:text-muted-foreground">{favChar.name}</span>
                    </div>
                )}
            </div>
            <Link to="/dashboard"
                className="w-full rounded-xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 py-2 text-center font-title text-[9px] tracking-wide text-amber-700 dark:text-amber-300 transition active:translate-y-px hover:bg-amber-100 dark:hover:bg-amber-500/15">
                Modifica Profilo
            </Link>
        </div>
    )
}

// ── Metric micro-card ─────────────────────────────────────────────
const MetricMini = ({ label, value, icon: Icon, color = 'amber', sub }) => {
    const C = {
        amber:   'border-amber-100 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/8 text-amber-700 dark:text-amber-300 [&>div>svg]:text-amber-400',
        blue:    'border-blue-100 dark:border-blue-500/20 bg-blue-50/70 dark:bg-blue-500/8 text-blue-700 dark:text-blue-300 [&>div>svg]:text-blue-400',
        violet:  'border-violet-100 dark:border-violet-500/20 bg-violet-50/70 dark:bg-violet-500/8 text-violet-700 dark:text-violet-300 [&>div>svg]:text-violet-400',
        emerald: 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/8 text-emerald-700 dark:text-emerald-300 [&>div>svg]:text-emerald-400',
    }
    return (
        <div className={`rounded-2xl border-2 p-4 flex flex-col gap-1 ${C[color] ?? C.amber}`} style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <div className="flex items-center justify-between mb-0.5">
                <p className="font-title text-[8px] tracking-wide text-slate-500 dark:text-muted-foreground leading-none">{label}</p>
                <Icon size={12} />
            </div>
            <p className="font-title text-2xl leading-none">{value}</p>
            {sub && <p className="text-[9px] text-slate-400 dark:text-muted-foreground">{sub}</p>}
        </div>
    )
}

// ── Stat card orizzontale — Giocatori ─────────────────────────────
const PlayersStatCard = ({ players, tournaments }) => {
    const faces = players.slice(0, 5)
    const sparkData = tournaments.slice(-8).map(t => t.participant_ids?.length ?? 0)
    return (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/8 px-3 py-3 overflow-hidden min-w-0" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <div className="flex -space-x-2 shrink-0">
                {faces.map((p, i) => (
                    <div key={p.id} style={{ zIndex: 10 - i }}
                        className="relative h-6 w-6 rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-emerald-300 dark:bg-emerald-700 shrink-0">
                        {p.img_url
                            ? <img src={p.img_url} alt={p.nickname} className="h-full w-full object-cover" />
                            : <span className="flex h-full w-full items-center justify-center text-[7px] font-black text-white">{(p.nickname ?? '?')[0]}</span>
                        }
                    </div>
                ))}
                {players.length > 5 && (
                    <div className="relative z-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-[6px] font-black text-slate-500 dark:text-slate-300 shrink-0">
                        +{players.length - 5}
                    </div>
                )}
            </div>
            <Sparkline data={sparkData} color="#10b981" height={24} width={56} />
            <div className="ml-auto text-right shrink-0">
                <p className="font-title text-lg text-emerald-700 dark:text-emerald-300 leading-none">{players.length}</p>
                <p className="font-title text-[7px] tracking-wide text-slate-500 mt-0.5">Giocatori</p>
            </div>
        </div>
    )
}

// ── Stat card orizzontale — Gare ──────────────────────────────────
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

// ── Stat card orizzontale — Trofei ────────────────────────────────
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

// ── Widget timeline torneo ────────────────────────────────────────
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
        <div className="flex flex-col rounded-2xl border-2 border-amber-100 dark:border-amber-500/20 bg-white dark:bg-card p-4 h-full" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <p className="font-title text-[8px] tracking-wide text-amber-600 dark:text-amber-400 mb-1">Torneo recente</p>
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
                                    isCurrent ? 'bg-amber-400 border-amber-400 shadow shadow-amber-400/40'
                                    : isDone   ? 'bg-emerald-400 border-emerald-400'
                                               : 'bg-white dark:bg-card border-slate-200 dark:border-white/15'
                                }`}>
                                    <Icon size={8} className={isDone || isCurrent ? 'text-white' : 'text-slate-300 dark:text-slate-600'} />
                                </div>
                                <span className={`text-xs leading-none ${
                                    isCurrent ? 'font-black text-amber-700 dark:text-amber-300'
                                    : isDone   ? 'font-bold text-slate-700 dark:text-foreground'
                                               : 'font-medium text-slate-400 dark:text-slate-600'
                                }`}>
                                    {label}
                                    {isCurrent && <span className="ml-1.5 text-[8px] font-black text-amber-500">← ora</span>}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
            <Link to={`/tournaments/${tournament.id}`}
                className="mt-4 w-full rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 py-1.5 text-center font-title text-[9px] tracking-wide text-amber-700 dark:text-amber-300 transition active:translate-y-px hover:bg-amber-100 dark:hover:bg-amber-500/20">
                Apri Torneo
            </Link>
        </div>
    )
}

// ── component ────────────────────────────────────────────────────────
export default function SuperAdminPanel() {
    const { user } = useAuth()
    const { tournaments, players, refresh, homeMetrics, charactersById } = useAppData()
    const [activeTab, setActiveTab] = useState('panoramica')

    // Users
    const [users, setUsers] = useState([])
    const [usersLoading, setUsersLoading] = useState(false)
    const [userSearch, setUserSearch] = useState('')
    const [userForm, setUserForm] = useState({ username: '', role: 'user', player_id: '' })
    const [userSaving, setUserSaving] = useState(false)
    const [resettingPasswords, setResettingPasswords] = useState({})
    const [lastResetInfo, setLastResetInfo] = useState(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [tempPwModal, setTempPwModal] = useState({ open: false, userId: null, username: '', passwords: [], loading: false })

    // Audit Log
    const [auditLogs, setAuditLogs] = useState([])
    const [auditLogsLoading, setAuditLogsLoading] = useState(false)

    // Tournaments
    const [statusUpdating, setStatusUpdating] = useState({})
    const [settlingSchedine, setSettlingSchedine] = useState({})
    const [tournamentFilter, setTournamentFilter] = useState('all')

    // Confirm modal
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmText: '', confirmVariant: 'danger', onConfirm: null })

    // ── loaders ─────────────────────────────────────
    const loadUsers = async () => {
        setUsersLoading(true)
        try { const res = await authApi.listUsers(); setUsers(res.data ?? []) }
        catch { toast.error('Impossibile caricare gli utenti') }
        finally { setUsersLoading(false) }
    }

    const loadAuditLogs = async () => {
        setAuditLogsLoading(true)
        try { const res = await auditApi.list(); setAuditLogs(res.data ?? []) }
        catch { /* audit log non disponibile */ }
        finally { setAuditLogsLoading(false) }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadUsers()
        loadAuditLogs()
    }, [])

    // ── derived ─────────────────────────────────────
    const stats = useMemo(() => ({
        totalTournaments: tournaments.length,
        activeTournaments: tournaments.filter(t => t.status === 'in_corso').length,
        concludedTournaments: tournaments.filter(t => t.status === 'concluso').length,
        pendingTournaments: tournaments.filter(t => t.status === 'da_svolgere').length,
        totalPlayers: players.length,
        totalUsers: users.length,
        activeUsers: users.filter(u => u.is_active).length,
    }), [tournaments, players, users])

    const filteredUsers = useMemo(() => {
        if (!userSearch.trim()) return users
        const q = userSearch.toLowerCase()
        return users.filter(u =>
            u.username.toLowerCase().includes(q) ||
            (u.player?.nickname ?? '').toLowerCase().includes(q)
        )
    }, [users, userSearch])

    const filteredTournaments = useMemo(() => {
        const sorted = [...tournaments].sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0) || b.id - a.id)
        if (tournamentFilter === 'all') return sorted
        return sorted.filter(t => t.status === tournamentFilter)
    }, [tournaments, tournamentFilter])

    // ── user handlers ────────────────────────────────
    const buildUsernameSuggestion = (p) => {
        if (!p) return ''
        return (p.nickname || `${p.first_name}.${p.last_name}`).trim().toLowerCase()
            .replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    }

    const handleUserFormChange = (e) => {
        const { name, value } = e.target
        if (name === 'player_id') {
            const sel = players.find(p => p.id === Number(value))
            setUserForm(f => ({ ...f, player_id: value, username: buildUsernameSuggestion(sel) || f.username }))
        } else {
            setUserForm(f => ({ ...f, [name]: value }))
        }
    }

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
        let pwd = ''
        for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
        return pwd
    }

    const handleCreateUser = async (e) => {
        e.preventDefault()
        if (userForm.role !== 'superadmin' && !userForm.player_id) { toast.error('Seleziona un giocatore'); return }
        const generatedPw = generatePassword()
        setUserSaving(true)
        try {
            await authApi.createUser({
                username: userForm.username.trim() || null,
                password: generatedPw,
                role: userForm.role,
                player_id: userForm.role === 'superadmin' ? null : Number(userForm.player_id),
                is_active: true,
                must_change_password: true,
            })
            setLastResetInfo({ username: userForm.username.trim() || userForm.role, temp_password: generatedPw })
            toast.success('Account creato')
            setUserForm({ username: '', role: 'user', player_id: '' })
            setShowCreateModal(false)
            await loadUsers()
        } catch (err) { toast.error('Creazione fallita', { description: getApiErrorMessage(err) }) }
        finally { setUserSaving(false) }
    }

    const updateUserRow = async (userId, patch) => {
        try { await authApi.updateUser(userId, patch); await loadUsers() }
        catch (err) { toast.error('Aggiornamento fallito', { description: getApiErrorMessage(err) }) }
    }

    const deleteUser = async (userId, username) => {
        try { await authApi.deleteUser(userId); toast.success(`Utente ${username} eliminato`); await loadUsers() }
        catch (err) { toast.error('Eliminazione fallita', { description: getApiErrorMessage(err) }) }
    }

    const handleResetPassword = async (account) => {
        if (resettingPasswords[account.id]) return
        setResettingPasswords(p => ({ ...p, [account.id]: true }))
        try {
            const res = await auditApi.resetPassword(account.id)
            const { temp_password, username } = res.data
            setLastResetInfo({ username, temp_password })
            toast.success(`Password reimpostata per ${username}`)
            await loadUsers()
        } catch { toast.error(`Reset fallito per ${account.username}`) }
        finally { setResettingPasswords(p => ({ ...p, [account.id]: false })) }
    }

    const handleShowTempPasswords = async (account) => {
        setTempPwModal({ open: true, userId: account.id, username: account.username, passwords: [], loading: true })
        try {
            const res = await auditApi.tempPasswords(account.id)
            setTempPwModal(p => ({ ...p, passwords: res.data ?? [], loading: false }))
        } catch {
            toast.error('Impossibile caricare lo storico password temporanee')
            setTempPwModal(p => ({ ...p, loading: false }))
        }
    }

    // ── tournament handlers ──────────────────────────
    const updateTournamentStatus = async (id, newStatus) => {
        setStatusUpdating(s => ({ ...s, [id]: true }))
        try {
            await tournamentsApi.update(id, { status: newStatus })
            toast.success(`Torneo impostato a "${STATUS_LABEL[newStatus]}"`)
            await refresh()
        } catch (err) { toast.error('Impossibile aggiornare lo stato', { description: getApiErrorMessage(err) }) }
        finally { setStatusUpdating(s => ({ ...s, [id]: false })) }
    }

    const activateLive = async (id) => {
        setStatusUpdating(s => ({ ...s, [id]: true }))
        try {
            await tournamentsApi.activateLive(id)
            toast.success('Torneo attivato in diretta')
            await refresh()
        } catch (err) { toast.error('Impossibile attivare', { description: getApiErrorMessage(err) }) }
        finally { setStatusUpdating(s => ({ ...s, [id]: false })) }
    }

    const settleSchedine = async (id, name) => {
        setSettlingSchedine(s => ({ ...s, [id]: true }))
        try {
            await schedineApi.settleTournament(id)
            toast.success(`Schedine del torneo "${name}" liquidate`)
            await refresh()
        } catch (err) { toast.error('Impossibile liquidare schedine', { description: getApiErrorMessage(err) }) }
        finally { setSettlingSchedine(s => ({ ...s, [id]: false })) }
    }

    const deleteTournament = async (id, name) => {
        try {
            await tournamentsApi.remove(id)
            toast.success(`Torneo "${name}" eliminato`)
            await refresh()
        } catch (err) { toast.error('Impossibile eliminare', { description: getApiErrorMessage(err) }) }
    }

    // ── render ───────────────────────────────────────
    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
                {/* Bordo ambra persistente su tutto il pannello (non solo l'header)
                — un superadmin può anche usare /admin "normale": questo bordo
                resta visibile scrollando qualunque tab, a differenza
                dell'header dorato che scorre via, così si sa sempre in quale
                pannello (elevato) ci si trova. */}
                <div className="rounded-3xl border-2 border-amber-200 dark:border-amber-500/20 bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 md:p-8 space-y-6">

                {/* Header */}
                <div className="mb-6 rounded-[2rem] border-2 border-circuit-ink bg-linear-to-br from-amber-100/90 via-amber-50/60 to-amber-100/80 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60 overflow-hidden" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-circuit-ink bg-gradient-to-br from-amber-400 to-orange-500" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                <Shield size={26} className="text-white" />
                            </div>
                            <div>
                                <p className="font-title text-[10px] tracking-wide text-amber-600 dark:text-amber-400">Pannello di controllo</p>
                                <h1 className="mt-0.5 text-2xl font-black text-slate-900 dark:text-foreground">SuperAdmin</h1>
                                <p className="text-sm text-slate-500 dark:text-muted-foreground">Accesso completo · {user?.username}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="border-t border-slate-100 dark:border-border px-6">
                        <div className="flex gap-0.5 overflow-x-auto">
                            {TABS.map(({ key, label, icon: Icon }) => (
                                <button key={key} type="button" onClick={() => setActiveTab(key)}
                                    className={`flex shrink-0 items-center gap-2 px-4 py-3 font-title text-[10px] tracking-wide border-b-2 transition active:translate-y-px ${activeTab === key ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground'}`}>
                                    <Icon size={13} />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── TAB: PANORAMICA ── */}
                {activeTab === 'panoramica' && (
                    <div className="space-y-6">

                        {/* HERO GRID: Profilo | Metriche | Stat Cards */}
                        <div className="grid gap-4 xl:grid-cols-[200px_1fr_280px]">

                            {/* Profilo SuperAdmin */}
                            <AdminProfileCard user={user} players={players} charactersById={charactersById} />

                            {/* Metriche mini 2×2 */}
                            <div className="grid grid-cols-2 gap-3 auto-rows-fr">
                                <MetricMini label="Tornei Totali" value={stats.totalTournaments} icon={Trophy} color="amber"
                                    sub={`${stats.activeTournaments} live · ${stats.pendingTournaments} in attesa`} />
                                <MetricMini label="Giocatori" value={stats.totalPlayers} icon={Users} color="blue"
                                    sub={`${stats.totalUsers} account`} />
                                <MetricMini label="Trofei Vinti" value={stats.concludedTournaments} icon={Award} color="violet"
                                    sub="tornei conclusi" />
                                <MetricMini label="Account Attivi" value={stats.activeUsers} icon={Activity} color="emerald"
                                    sub={`di ${stats.totalUsers} totali`} />
                            </div>

                            {/* 3 Stat card orizzontali impilate */}
                            <div className="flex flex-col gap-3">
                                <PlayersStatCard players={players} tournaments={tournaments} />
                                <RacesStatCard
                                    completedRaces={homeMetrics?.completedRaces ?? 0}
                                    totalRaces={Math.max(homeMetrics?.completedRaces ?? 0, stats.totalTournaments * 4)}
                                />
                                <TrophiesStatCard concluded={stats.concludedTournaments} />
                            </div>
                        </div>

                        {/* AZIONI RAPIDE + TIMELINE */}
                        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                            {/* Quick Actions */}
                            <div className="grid gap-3 sm:grid-cols-3">
                                {(() => {
                                    const activeTournament = tournaments.find(t => t.status === 'in_corso' && !t.is_friendly)
                                    const thirdAction = activeTournament
                                        ? { to: `/tournaments/${activeTournament.id}`, label: 'Gestisci gare', desc: `${activeTournament.name} · in corso`, color: 'bg-linear-to-br from-amber-500 to-orange-500', icon: Flag }
                                        : { to: '/history', label: 'Storico tornei', desc: 'Classifiche e archivio completo', color: 'bg-linear-to-br from-amber-500 to-orange-600', icon: BarChart3 }
                                    return [
                                        { to: '/tournaments/new', label: 'Nuovo torneo', desc: 'Crea torneo con partecipanti e gare', color: 'bg-linear-to-br from-emerald-500 to-green-600', icon: Plus },
                                        { to: '/admin', label: 'Gestisci giocatori', desc: 'Aggiungi, modifica o rimuovi piloti', color: 'bg-linear-to-br from-blue-500 to-indigo-600', icon: Users },
                                        thirdAction,
                                    ]
                                })().map(({ to, label, desc, color, icon: Icon }) => (
                                    <Link key={to} to={to} className="group flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-4 transition hover:border-amber-300 dark:hover:border-amber-700" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
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
                            <TournamentTimeline
                                tournament={tournaments.find(t => t.status === 'in_corso' && !t.is_friendly) ?? tournaments[0] ?? null}
                            />
                        </div>

                        {/* Ultimi tornei */}
                        <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                            <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-border">
                                <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground">Ultimi tornei</p>
                                <Link to="/history" className="text-xs font-black text-amber-600 dark:text-amber-400 hover:underline">Vedi tutti</Link>
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
                                            {/* micro-metriche */}
                                            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 text-[9px] font-black text-slate-600 dark:text-slate-300">
                                                👥 {t.participant_ids?.length ?? 0}
                                            </span>
                                            {(t.n_races ?? 0) > 0 && (
                                                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 text-[9px] font-black text-slate-600 dark:text-slate-300">
                                                    🏁 {t.n_races}
                                                </span>
                                            )}
                                            {t.is_friendly && (
                                                <span className="hidden sm:inline-flex items-center gap-1 rounded-lg border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 font-title text-[9px] tracking-wide text-amber-700 dark:text-amber-300">
                                                    <PartyPopper size={10} /> Amichevole
                                                </span>
                                            )}
                                            <TournamentStatusBadge status={t.status} />
                                            <Link to={`/tournaments/${t.id}`}
                                                className="flex items-center gap-1 rounded-lg border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-2 py-1 font-title text-[9px] tracking-wide text-slate-600 dark:text-slate-300 transition active:translate-y-px hover:text-amber-500 hover:border-amber-300 dark:hover:border-amber-700">
                                                <ExternalLink size={10} /> Apri
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                                {tournaments.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">Nessun torneo ancora creato.</p>}
                            </div>
                        </div>

                        {/* Ultimi log */}
                        {auditLogs.length > 0 && (
                            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                                <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-border">
                                    <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground">Attività recente</p>
                                    <button type="button" onClick={() => setActiveTab('log')} className="text-xs font-black text-amber-600 dark:text-amber-400 hover:underline">Vedi tutto</button>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {auditLogs.slice(0, 5).map(log => {
                                        const ts = new Date(log.created_at)
                                        const tsStr = ts.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' + ts.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                                        return (
                                            <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                                                <span className={`shrink-0 rounded-lg px-2 py-0.5 font-title text-[9px] tracking-wide ${ACTION_COLOR[log.action] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                                <p className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate">{log.description}</p>
                                                <span className="shrink-0 text-[9px] text-slate-400 tabular-nums">{tsStr}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── OPERAZIONI UTILI ── */}
                        <div className="rounded-[2rem] border-2 border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow">
                                    <Zap size={16} />
                                </div>
                                <div>
                                    <p className="font-title text-xs tracking-wide text-emerald-600 dark:text-emerald-400">Manutenzione</p>
                                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Operazioni Utili</h2>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-muted-foreground mb-4">Strumenti rapidi per operazioni comuni senza passare dal database.</p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <button type="button" onClick={refresh}
                                    className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-4 text-left transition hover:border-emerald-300 dark:hover:border-emerald-700 group" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500">
                                        <RefreshCw size={15} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-900 dark:text-foreground">Forza Refresh Dati</p>
                                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Ricarica tutti i dati del backend</p>
                                    </div>
                                </button>
                                <button type="button" onClick={() => { try { localStorage.clear(); toast.success('Cache locale pulita') } catch { toast.error('Errore pulizia') } }}
                                    className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-4 text-left transition hover:border-emerald-300 dark:hover:border-emerald-700 group" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500">
                                        <Trash2 size={15} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-900 dark:text-foreground">Pulisci Cache Locale</p>
                                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Svuota localStorage e riparti da zero</p>
                                    </div>
                                </button>
                                <button type="button" onClick={() => { navigator.clipboard.writeText(JSON.stringify({ stats, players: players.length, tournaments: tournaments.length, users: users.length }, null, 2)); toast.success('Riepilogo copiato!') }}
                                    className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-4 text-left transition hover:border-emerald-300 dark:hover:border-emerald-700 group" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500">
                                        <Copy size={15} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-900 dark:text-foreground">Copia Riepilogo</p>
                                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Copia stats rapide del sistema negli appunti</p>
                                    </div>
                                </button>
                                <button type="button" onClick={() => setConfirmModal({ open: true, title: 'Attenzione', message: 'Resettare i punteggi di tutte le schedine aperte? I tornei e i risultati non saranno modificati.', confirmText: 'Resetta', confirmVariant: 'danger',
                                    onConfirm: () => { toast.success('Funzione non ancora implementata — azione simulata'); setConfirmModal(p => ({ ...p, open: false })) }
                                })}
                                    className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-4 text-left transition hover:border-emerald-300 dark:hover:border-emerald-700 group" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500">
                                        <AlertTriangle size={15} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-900 dark:text-foreground">Resetta Schedine</p>
                                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Azzera tutte le schedine aperte (in sviluppo)</p>
                                    </div>
                                </button>
                                <Link to="/hall-of-fame"
                                    className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-4 text-left transition hover:border-emerald-300 dark:hover:border-emerald-700 group" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500">
                                        <Trophy size={15} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-900 dark:text-foreground">Hall of Fame</p>
                                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Vedi l'albo d'oro dei vincitori</p>
                                    </div>
                                </Link>
                                <button type="button" onClick={() => { window.open(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/docs', '_blank') }}
                                    className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-4 text-left transition hover:border-emerald-300 dark:hover:border-emerald-700 group" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-700">
                                        <ExternalLink size={15} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-900 dark:text-foreground">API Docs (Swagger)</p>
                                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Apri la documentazione interattiva delle API</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB: UTENTI ── */}
                {activeTab === 'utenti' && (
                    <div className="space-y-6">

                        {/* Password temporanea */}
                        {lastResetInfo && (
                            <div className="rounded-[2rem] border-2 border-rose-400 bg-rose-50 dark:bg-rose-500/10 p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-title text-xs tracking-wide text-rose-600 dark:text-rose-400">Password temporanea generata</p>
                                        <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">Copia e consegna a <strong>{lastResetInfo.username}</strong> — non verrà mostrata di nuovo.</p>
                                    </div>
                                    <button type="button" onClick={() => setLastResetInfo(null)} className="shrink-0 rounded-full p-1 text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="mt-3 flex items-center gap-3">
                                    <code className="flex-1 rounded-xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 px-4 py-3 text-lg font-mono font-black tracking-widest text-rose-700 dark:text-rose-300 select-all">
                                        {lastResetInfo.temp_password}
                                    </code>
                                    <button type="button" onClick={() => { navigator.clipboard.writeText(lastResetInfo.temp_password); toast.success('Copiata!') }}
                                        className="shrink-0 rounded-xl bg-rose-600 px-3 py-2.5 font-title text-[10px] tracking-wide text-white hover:bg-rose-500 transition active:translate-y-px">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Gestione utenti — full width */}
                        <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <p className="font-title text-xs tracking-wide text-emerald-600 dark:text-emerald-400">Account registrati</p>
                                    <h2 className="mt-0.5 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Gestione utenti</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setShowCreateModal(true)}
                                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500">
                                        <Plus size={12} /> Crea account
                                    </button>
                                    <button type="button" onClick={loadUsers}
                                        className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 font-title text-[10px] tracking-wide text-slate-700 dark:text-slate-100 transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <RefreshCw size={12} /> Aggiorna
                                    </button>
                                </div>
                            </div>
                            <div className="relative mb-3">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Cerca username o nickname..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                    className="w-full rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 pl-8 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />
                            </div>
                            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                                {usersLoading ? (
                                    <SkeletonRows count={4} />
                                ) : filteredUsers.map(account => (
                                    <div key={account.id} className="rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-slate-900 dark:text-foreground">{account.username}</p>
                                                <p className="truncate text-[10px] text-slate-500 dark:text-muted-foreground">
                                                    {account.player?.nickname ?? 'Nessun giocatore collegato'} · <span className="capitalize">{account.role}</span>
                                                </p>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 font-title text-[9px] tracking-wide ${account.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                {account.is_active ? 'Attivo' : 'Bloccato'}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <select value={account.role} onChange={e => {
                                                const newRole = e.target.value
                                                if (account.role === newRole) return
                                                setConfirmModal({ open: true, title: 'Cambia ruolo', message: `Cambiare il ruolo di "${account.username}" a "${newRole}"?`, confirmText: 'Cambia', confirmVariant: 'warning',
                                                    onConfirm: () => { updateUserRow(account.id, { role: newRole }); setConfirmModal(p => ({ ...p, open: false })) }
                                                })
                                            }} className="rounded-lg border-2 border-slate-200 dark:border-border bg-white dark:bg-card px-2 py-1 font-title text-[10px] tracking-wide text-slate-700 dark:text-foreground">
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                                <option value="superadmin">Superadmin</option>
                                            </select>
                                            <button type="button" onClick={() => updateUserRow(account.id, { is_active: !account.is_active })}
                                                className="rounded-lg bg-slate-700 dark:bg-slate-600 px-2 py-1 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-slate-600">
                                                {account.is_active ? 'Disattiva' : 'Riattiva'}
                                            </button>
                                            <button type="button" onClick={() => handleResetPassword(account)} disabled={resettingPasswords[account.id]}
                                                className="rounded-lg bg-amber-500 px-2 py-1 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-amber-400 disabled:opacity-60">
                                                {resettingPasswords[account.id] ? '...' : <Key size={11} />}
                                                <span className="ml-1">{resettingPasswords[account.id] ? 'Reset...' : 'Reset pw'}</span>
                                            </button>
                                            <button type="button" onClick={() => handleShowTempPasswords(account)}
                                                className="rounded-lg bg-indigo-500 px-2 py-1 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-indigo-400">
                                                <Clock size={11} />
                                                <span className="ml-1">Storico pw</span>
                                            </button>
                                            <button type="button" onClick={() => setConfirmModal({ open: true, title: 'Elimina utente', message: `Eliminare "${account.username}"?`, confirmText: 'Elimina', confirmVariant: 'danger',
                                                onConfirm: () => { deleteUser(account.id, account.username); setConfirmModal(p => ({ ...p, open: false })) }
                                            })} className="rounded-lg bg-rose-600 px-2 py-1 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-rose-500">
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!usersLoading && filteredUsers.length === 0 && (
                                    <p className="py-6 text-center text-sm text-slate-500 dark:text-muted-foreground">{userSearch ? 'Nessun risultato' : 'Nessun account'}</p>
                                )}
                            </div>
                        </div>

                        {/* ── Modale Crea account ── */}
                        {showCreateModal && (
                            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
                                onClick={() => setShowCreateModal(false)}>
                                <div className="flex min-h-full items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}>
                                <div className="w-full max-w-md rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 animate-scale-in" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                                    <div className="flex items-start justify-between gap-4 mb-5">
                                        <div>
                                            <p className="font-title text-xs tracking-wide text-emerald-600 dark:text-emerald-400">Nuovo accesso</p>
                                            <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Crea account</h2>
                                        </div>
                                        <button type="button" onClick={() => setShowCreateModal(false)}
                                            className="rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <form onSubmit={handleCreateUser} className="space-y-4">
                                        <label className="block space-y-1.5">
                                            <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-slate-400">Ruolo</span>
                                            <select name="role" value={userForm.role} onChange={handleUserFormChange}
                                                className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition">
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                                <option value="superadmin">Superadmin</option>
                                            </select>
                                        </label>
                                        {userForm.role !== 'superadmin' ? (
                                            <label className="block space-y-1.5">
                                                <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-slate-400">Giocatore</span>
                                                <select name="player_id" value={userForm.player_id} onChange={handleUserFormChange} required
                                                    className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition">
                                                    <option value="">Seleziona giocatore…</option>
                                                    {players.map(p => {
                                                        const linked = users.some(u => u.player_id === p.id)
                                                        return <option key={p.id} value={p.id} disabled={linked}>{p.nickname}{linked ? ' (già collegato)' : ''}</option>
                                                    })}
                                                </select>
                                            </label>
                                        ) : (
                                            <label className="block space-y-1.5">
                                                <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-slate-400">Username</span>
                                                <input name="username" value={userForm.username} onChange={handleUserFormChange} required
                                                    className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />
                                            </label>
                                        )}
                                        <div className="flex gap-3 pt-1">
                                            <button type="button" onClick={() => setShowCreateModal(false)}
                                                className="flex-1 rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-white/10">
                                                Annulla
                                            </button>
                                            <button type="submit" disabled={userSaving}
                                                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2.5 font-title text-[11px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed">
                                                {userSaving ? 'Creazione...' : 'Crea account'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                                </div>
                            </div>
                        )}

                        {/* ── Modale Storico Password Temporanee ── */}
                        {tempPwModal.open && (
                            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
                                onClick={() => setTempPwModal(p => ({ ...p, open: false }))}>
                                <div className="flex min-h-full items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}>
                                <div className="w-full max-w-lg rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 animate-scale-in max-h-[80vh] flex flex-col" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                                    <div className="flex items-start justify-between gap-4 mb-5 shrink-0">
                                        <div>
                                            <p className="font-title text-xs tracking-wide text-indigo-600 dark:text-indigo-400">Storico password</p>
                                            <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{tempPwModal.username}</h2>
                                        </div>
                                        <button type="button" onClick={() => setTempPwModal(p => ({ ...p, open: false }))}
                                            className="rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                        {tempPwModal.loading ? (
                                            <SkeletonRows count={3} />
                                        ) : tempPwModal.passwords.length === 0 ? (
                                            <p className="py-8 text-center text-sm text-slate-400">Nessuna password temporanea attiva (scadute dopo 48h).</p>
                                        ) : (
                                            tempPwModal.passwords.map(pw => {
                                                const created = new Date(pw.created_at)
                                                const expires = new Date(pw.expires_at)
                                                const isExpired = expires < new Date()
                                                return (
                                                    <div key={pw.id} className={`rounded-xl border-2 px-3 py-2.5 ${isExpired ? 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50' : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10'}`}>
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <code className="text-sm font-mono font-black tracking-widest text-slate-800 dark:text-slate-100 select-all">{pw.temp_password}</code>
                                                            <button type="button" onClick={() => { navigator.clipboard.writeText(pw.temp_password); toast.success('Copiata!') }}
                                                                className="shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 p-1.5 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                                                            <span>Creato: {created.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span>Scade: {expires.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                            {isExpired && <span className="text-rose-500 font-black">Scaduta</span>}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* ── TAB: TORNEI ── */}
                {activeTab === 'tornei' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-title text-[10px] tracking-wide text-slate-500 dark:text-muted-foreground mr-2">Filtra:</p>
                            {[['all', 'Tutti'], ['da_svolgere', 'In attesa'], ['in_corso', 'In corso'], ['finito', 'Finito'], ['concluso', 'Concluso']].map(([val, label]) => (
                                <button key={val} type="button" onClick={() => setTournamentFilter(val)}
                                    className={`rounded-xl px-3 py-1.5 font-title text-[10px] tracking-wide transition active:translate-y-px ${tournamentFilter === val ? 'bg-amber-500 text-white' : 'border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-foreground'}`}>
                                    {label}
                                </button>
                            ))}
                            <button type="button" onClick={() => { refresh(); toast.success('Aggiornato') }}
                                className="ml-auto flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-1.5 font-title text-[10px] tracking-wide text-slate-600 dark:text-slate-400 transition active:translate-y-px hover:text-slate-900 dark:hover:text-foreground">
                                <RefreshCw size={11} /> Aggiorna
                            </button>
                        </div>

                        <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                            {filteredTournaments.length === 0 ? (
                                <p className="py-10 text-center text-sm text-slate-400">Nessun torneo trovato per questo filtro.</p>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filteredTournaments.map(t => {
                                        const isUpdating = statusUpdating[t.id]
                                        const isSettling = settlingSchedine[t.id]
                                        return (
                                            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black text-slate-900 dark:text-foreground truncate">{t.name}</p>
                                                        {t.is_friendly && (
                                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-lg border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 font-title text-[9px] tracking-wide text-amber-700 dark:text-amber-300">
                                                                <PartyPopper size={10} /> Amichevole
                                                            </span>
                                                        )}
                                                        <TournamentStatusBadge status={t.status} />
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                                                        {t.date ? new Date(t.date).toLocaleDateString('it-IT') : '—'} · {t.participant_ids?.length ?? 0} giocatori · {t.n_races ?? 0} gare
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                    <Link to={`/tournaments/${t.id}`}
                                                        className="flex items-center gap-1 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-2.5 py-1.5 font-title text-[10px] tracking-wide text-slate-600 dark:text-slate-400 transition active:translate-y-px hover:text-slate-900 dark:hover:text-foreground">
                                                        <ExternalLink size={11} /> Apri
                                                    </Link>
                                                    {t.status === 'da_svolgere' && (
                                                        <button type="button" disabled={isUpdating} onClick={() => activateLive(t.id)}
                                                            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500 disabled:opacity-60">
                                                            <Play size={11} /> Attiva Live
                                                        </button>
                                                    )}
                                                    {t.status === 'in_corso' && (
                                                        <button type="button" disabled={isUpdating} onClick={() => setConfirmModal({ open: true, title: 'Chiudi torneo', message: `Impostare "${t.name}" come Finito?`, confirmText: 'Chiudi', confirmVariant: 'warning',
                                                            onConfirm: () => { updateTournamentStatus(t.id, 'finito'); setConfirmModal(p => ({ ...p, open: false })) }
                                                        })} className="flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-blue-500 disabled:opacity-60">
                                                            <Square size={11} /> Chiudi
                                                        </button>
                                                    )}
                                                    {(t.status === 'in_corso' || t.status === 'finito') && (
                                                        <button type="button" disabled={isSettling} onClick={() => setConfirmModal({ open: true, title: 'Liquida schedine', message: `Liquidare le schedine per "${t.name}"? Questa azione assegnerà i premi.`, confirmText: 'Liquida', confirmVariant: 'warning',
                                                            onConfirm: () => { settleSchedine(t.id, t.name); setConfirmModal(p => ({ ...p, open: false })) }
                                                        })} className="flex items-center gap-1 rounded-xl bg-purple-600 px-2.5 py-1.5 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-purple-500 disabled:opacity-60">
                                                            <Check size={11} /> Schedine
                                                        </button>
                                                    )}
                                                    {t.status === 'finito' && (
                                                        <button type="button" disabled={isUpdating} onClick={() => setConfirmModal({ open: true, title: 'Concludi torneo', message: `Impostare "${t.name}" come Concluso?`, confirmText: 'Concludi', confirmVariant: 'warning',
                                                            onConfirm: () => { updateTournamentStatus(t.id, 'concluso'); setConfirmModal(p => ({ ...p, open: false })) }
                                                        })} className="flex items-center gap-1 rounded-xl bg-slate-700 px-2.5 py-1.5 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-slate-600 disabled:opacity-60">
                                                            <Flag size={11} /> Concludi
                                                        </button>
                                                    )}
                                                    {t.status === 'concluso' && (
                                                        <button type="button" onClick={() => setConfirmModal({ open: true, title: 'Elimina torneo', message: `Eliminare permanentemente "${t.name}"? I dati collegati potrebbero essere persi.`, confirmText: 'Elimina', confirmVariant: 'danger',
                                                            onConfirm: () => { deleteTournament(t.id, t.name); setConfirmModal(p => ({ ...p, open: false })) }
                                                        })} className="flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-rose-500">
                                                            <Trash2 size={11} /> Elimina
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB: DATABASE ── */}
                {activeTab === 'database' && (
                    <DatabaseTab
                        players={players}
                        tournaments={tournaments}
                        onRefresh={refresh}
                        setConfirmModal={setConfirmModal}
                    />
                )}

                {/* ── TAB: AUDIT LOG ── */}
                {activeTab === 'log' && (
                    <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <p className="font-title text-xs tracking-wide text-slate-500 dark:text-muted-foreground">Tracciamento azioni</p>
                                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Audit Log</h2>
                            </div>
                            <button type="button" onClick={loadAuditLogs}
                                className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2 font-title text-[10px] tracking-wide text-slate-700 dark:text-foreground transition active:translate-y-px">
                                <RefreshCw size={12} /> Aggiorna
                            </button>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {Object.entries(ACTION_COLOR).map(([action, cls]) => (
                                <span key={action} className={`rounded-lg px-2 py-0.5 font-title text-[9px] tracking-wide ${cls}`}>
                                    {action.replace(/_/g, ' ')}
                                </span>
                            ))}
                        </div>

                        {auditLogsLoading ? (
                            <SkeletonRows count={5} />
                        ) : auditLogs.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500 dark:text-muted-foreground">Nessun evento registrato</p>
                        ) : (
                            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                                {auditLogs.map(log => {
                                    const ts = new Date(log.created_at)
                                    const tsStr = ts.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + ts.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                                    return (
                                        <div key={log.id} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5">
                                            <span className={`mt-0.5 shrink-0 rounded-lg px-2 py-0.5 font-title text-[9px] tracking-wide ${ACTION_COLOR[log.action] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{log.description}</p>
                                                {log.actor_username && (
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">da {log.actor_username}</p>
                                                )}
                                            </div>
                                            <span className="shrink-0 text-[9px] text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">{tsStr}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
                </div>
            </section>

            <ConfirmModal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal(p => ({ ...p, open: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmVariant={confirmModal.confirmVariant || 'danger'}
            />
        </AppLayout>
    )
}
