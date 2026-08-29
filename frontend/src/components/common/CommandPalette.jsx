import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Search, Home, Trophy, BarChart3, Users, Gamepad2, Zap, HelpCircle,
    User, ShieldCheck, Crown, Award, GitCompare, MapPin, X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useAppData } from '@/context/AppDataContext'
import { useCommunityUserNav } from '@/hooks/useCommunityUserNav'
import { buildAvatarPlaceholder } from '@/lib/placeholders'

const normalize = (value) => (value ?? '').toString().toLowerCase()

const formatEventDate = (value) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Palette globale (Ctrl/Cmd+K) — non sostituisce la navbar, la affianca
// per chi naviga spesso le stesse pagine/tornei/giocatori. Apribile anche
// via un trigger cliccabile in Navbar.jsx, che spara questo evento custom
// invece di passare per un Context dedicato solo per questo.
const OPEN_EVENT = 'kart:open-command-palette'

const CommandPalette = () => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef(null)
    const navigate = useNavigate()
    const { isAuthenticated, isAdmin, isSuperadmin } = useAuth()
    const { players, detailedTournaments } = useAppData()
    const { goToPlayerProfile } = useCommunityUserNav()

    const close = () => { setOpen(false); setQuery('') }

    useEffect(() => {
        const onKeyDown = (e) => {
            const isShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'
            if (isShortcut) {
                e.preventDefault()
                setActiveIndex(0)
                setOpen((v) => !v)
                return
            }
            if (e.key === 'Escape' && open) close()
        }
        const onOpenRequest = () => { setActiveIndex(0); setOpen(true) }
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener(OPEN_EVENT, onOpenRequest)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener(OPEN_EVENT, onOpenRequest)
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const t = setTimeout(() => inputRef.current?.focus(), 30)
        return () => clearTimeout(t)
    }, [open])

    const pages = useMemo(() => {
        if (!isAuthenticated) return []
        const list = [
            { label: 'Home', path: '/', icon: Home },
            { label: 'Tornei', path: '/history', icon: Trophy },
            { label: 'Classifiche', path: '/stats', icon: BarChart3 },
            { label: 'Confronto giocatori', path: '/compare', icon: GitCompare },
            { label: 'Circuiti', path: '/circuits', icon: MapPin },
            { label: 'Giocatori', path: '/players', icon: Users },
            { label: 'Hall of Fame', path: '/hall-of-fame', icon: Award },
            { label: 'Carte', path: '/carte', icon: Zap },
            { label: 'FAQ / Regolamento', path: '/faq', icon: HelpCircle },
            { label: 'Il mio profilo', path: '/dashboard', icon: User },
        ]
        if (isAdmin || isSuperadmin) {
            list.push({ label: 'Dashboard Admin', path: '/admin', icon: ShieldCheck })
            list.push({ label: 'Nuovo torneo', path: '/tournaments/new', icon: Trophy })
        }
        if (isSuperadmin) {
            list.push({ label: 'Pannello SuperAdmin', path: '/superadmin', icon: Crown })
        }
        return list
    }, [isAuthenticated, isAdmin, isSuperadmin])

    const results = useMemo(() => {
        const q = normalize(query)
        const items = []

        pages
            .filter((p) => !q || normalize(p.label).includes(q))
            .forEach((p) => items.push({
                id: `page-${p.path}`,
                group: 'Pagine',
                label: p.label,
                Icon: p.icon,
                onSelect: () => navigate(p.path),
            }))

        if (q) {
            detailedTournaments
                .filter((t) => normalize(t.name).includes(q))
                .slice(0, 6)
                .forEach((t) => items.push({
                    id: `tournament-${t.id}`,
                    group: 'Tornei',
                    label: t.name,
                    sublabel: formatEventDate(t.date),
                    Icon: Gamepad2,
                    onSelect: () => navigate(`/tournaments/${t.id}`),
                }))

            players
                .filter((p) => normalize(p.nickname).includes(q) || normalize(`${p.first_name} ${p.last_name}`).includes(q))
                .slice(0, 6)
                .forEach((p) => items.push({
                    id: `player-${p.id}`,
                    group: 'Giocatori',
                    label: p.nickname,
                    sublabel: `${p.first_name} ${p.last_name}`,
                    avatar: p.img_url || buildAvatarPlaceholder(p.nickname),
                    onSelect: () => goToPlayerProfile(p.id),
                }))
        }

        return items
    }, [query, pages, detailedTournaments, players, navigate, goToPlayerProfile])

    // Derivato al volo invece che sincronizzato via effect: activeIndex può
    // restare temporaneamente fuori range mentre si digita (i risultati si
    // restringono), safeActiveIndex lo riporta sempre in range per il render
    // e per Invio, senza bisogno di un setState reattivo ai risultati.
    const safeActiveIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1)

    const handleSelect = (item) => {
        item.onSelect()
        close()
    }

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(Math.min(safeActiveIndex + 1, Math.max(results.length - 1, 0)))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(Math.max(safeActiveIndex - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const item = results[safeActiveIndex]
            if (item) handleSelect(item)
        }
    }

    if (!open) return null

    let lastGroup = null

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm p-4 pt-[12vh] animate-fade-in" onClick={close}>
            <div
                className="mx-auto w-full max-w-lg rounded-2xl border-2 border-slate-900 dark:border-white/20 bg-white dark:bg-slate-900 animate-scale-in overflow-hidden"
                style={{ boxShadow: 'var(--circuit-shadow-lg)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 border-b-2 border-slate-100 dark:border-white/10 px-4 py-3">
                    <Search size={16} className="shrink-0 text-slate-400" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Cerca pagine, tornei, giocatori..."
                        className="w-full bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
                    />
                    <button type="button" onClick={close} className="shrink-0 text-slate-400 transition hover:text-slate-700 dark:hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <div className="max-h-[50vh] overflow-y-auto p-2">
                    {results.length === 0 && (
                        <p className="px-3 py-6 text-center text-xs text-slate-400">
                            {query ? 'Nessun risultato.' : 'Digita per cercare tornei e giocatori.'}
                        </p>
                    )}
                    {results.map((item, idx) => {
                        const showGroupLabel = item.group !== lastGroup
                        lastGroup = item.group
                        return (
                            <div key={item.id}>
                                {showGroupLabel && (
                                    <p className="mt-2 px-3 pb-1 font-title text-[9px] tracking-[0.3em] text-slate-400 first:mt-0">{item.group}</p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${idx === safeActiveIndex ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}
                                >
                                    {item.avatar ? (
                                        <img src={item.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                                    ) : item.Icon ? (
                                        <item.Icon size={15} className="shrink-0 opacity-70" />
                                    ) : null}
                                    <span className="min-w-0 flex-1 truncate capitalize font-bold">{item.label}</span>
                                    {item.sublabel && (
                                        <span className="shrink-0 truncate text-[10px] capitalize text-slate-400">{item.sublabel}</span>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>

                <div className="flex items-center justify-between border-t-2 border-slate-100 dark:border-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>↑↓ naviga · Enter apri · Esc chiudi</span>
                    <span>Ctrl/Cmd + K</span>
                </div>
            </div>
        </div>
    )
}

export default CommandPalette
