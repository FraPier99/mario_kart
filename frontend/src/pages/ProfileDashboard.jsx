import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Image as ImageIcon, PenLine, Search, Upload, X, Clock, AlertTriangle, Zap, Shield, ArrowRight, Trophy, Flag, BarChart3, Star, Crown } from 'lucide-react'
import PowerCard from '@/components/cards/PowerCard'
import { toast } from 'sonner'
import { playMkdsCharacterVoice, preloadMkdsCharacterVoiceByName } from '@/lib/mkdsSounds'
import { playMk8dCharacterVoice, preloadCharacterVoice as preloadMk8dCharacterVoice } from '@/lib/mk8dSounds'
import AppLayout from '@/components/layout/AppLayout'
import ConfirmModal from '@/components/common/ConfirmModal'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { authApi, schedineApi, inventoryApi, getApiErrorMessage } from '@/services/apiClient'
import { compressImage } from '@/lib/imageCompression'

const FavoriteCharacterPicker = ({ value, onChange, characters }) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const triggerRef = useRef(null)
    const menuRef = useRef(null)
    const inputRef = useRef(null)
    const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 340, maxHeight: 288 })

    const selectedCharacter = characters.find((character) => String(character.id) === String(value)) ?? null

    const filteredCharacters = useMemo(() => {
        if (!query.trim()) return characters
        const needle = query.trim().toLowerCase()
        return characters.filter((character) => character.name?.toLowerCase().includes(needle))
    }, [characters, query])

    // Precarica i versi di tutti i personaggi appena si apre il menu, invece
    // di fare fetch+decode dell'audio solo al click: prima il primo verso di
    // ogni personaggio partiva con un ritardo percepibile (a volte il menu
    // si chiudeva prima ancora che il suono iniziasse).
    useEffect(() => {
        if (!open) return
        characters.forEach((character) => {
            if (character.game_id === 2) preloadMk8dCharacterVoice(character.name)
            else preloadMkdsCharacterVoiceByName(character.name)
        })
    }, [open, characters])

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) {
                return
            }

            setOpen(false)
            setQuery('')
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [])

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus()
        }
    }, [open])

    useEffect(() => {
        if (!open || !triggerRef.current) return

        const rect = triggerRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        const spaceBelow = viewportHeight - rect.bottom - 24
        const spaceAbove = rect.top - 24
        const openUp = spaceBelow < 320 && spaceAbove > spaceBelow
        const preferredHeight = Math.max(240, Math.min(360, openUp ? spaceAbove : spaceBelow))
        const left = Math.max(12, Math.min(rect.left, viewportWidth - Math.max(rect.width, 340) - 12))

        setMenuStyle({
            top: openUp ? Math.max(12, rect.top - preferredHeight - 8) : rect.bottom + 8,
            left,
            width: Math.max(rect.width, 340),
            maxHeight: preferredHeight,
        })
    }, [open, query, characters.length])

    return (
        <div ref={triggerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 outline-none transition hover:border-emerald-400 dark:border-border dark:bg-muted dark:text-foreground"
            >
                <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
                        {selectedCharacter?.img_url ? (
                            <img src={selectedCharacter.img_url} alt={selectedCharacter.name} className="h-full w-full object-cover" />
                        ) : (
                            <ImageIcon size={18} className="text-slate-400" />
                        )}
                    </span>
                    <span className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Personaggio preferito</span>
                        <span className="block truncate text-sm font-bold text-slate-900 dark:text-foreground">
                            {selectedCharacter?.name ?? 'Nessuno selezionato'}
                        </span>
                    </span>
                </span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-9999 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card"
                    style={menuStyle}
                >
                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-white/10">
                        <Search size={14} className="text-slate-400" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Cerca un personaggio"
                            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-foreground"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} className="text-slate-400 transition hover:text-slate-700 dark:hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto p-3" style={{ maxHeight: `${menuStyle.maxHeight}px` }}>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {filteredCharacters.map((character) => {
                                const isSelected = String(character.id) === String(value)

                                return (
                                    <button
                                        key={character.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(String(character.id))
                                            if (character.game_id === 2) {
                                                playMk8dCharacterVoice(character.name)
                                            } else {
                                                playMkdsCharacterVoice(character.name)
                                            }
                                            setOpen(false)
                                            setQuery('')
                                        }}
                                        className={`relative flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-center transition ${isSelected ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'}`}
                                    >
                                        <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                                            {character.img_url ? (
                                                <img src={character.img_url} alt={character.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-black text-slate-400">{character.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                                            )}
                                        </span>
                                        <span className="w-full truncate text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-foreground">{character.name}</span>
                                        {isSelected && (
                                            <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                                                <Check size={12} />
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                            {filteredCharacters.length === 0 && (
                                <p className="col-span-full py-6 text-center text-sm text-slate-500 dark:text-muted-foreground">Nessun personaggio trovato</p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    )
}

const SchedinaBadge = () => {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let active = true
        schedineApi.pendingNotifications()
            .then((res) => {
                if (active) setNotifications(res.data ?? [])
            })
            .catch(() => {})
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => { active = false }
    }, [])

    if (loading || !notifications.length) return null

    return (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-xl dark:border-amber-500/30 dark:bg-amber-500/5">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
                    <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Schedine da compilare</p>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Hai {notifications.length} torneo{notifications.length > 1 ? 'i' : ''} in attesa della tua schedina</p>
                </div>
            </div>
            <div className="mt-4 space-y-2">
                {notifications.map((n) => {
                    // La deadline è legacy e non blocca nulla: la schedina è
                    // compilabile finché le schedine non vengono chiuse a
                    // evento (bottone "Chiudi Schedine" / avanzamento). Se il
                    // torneo è andato avanti senza compilazione, si mostra
                    // semplicemente "Non compilata".
                    const locked = Boolean(n.schedine_locked)
                    return (
                        <Link
                            key={n.tournament_id}
                            to={locked ? '#' : `/schedina/${n.tournament_id}`}
                            onClick={(e) => { if (locked) e.preventDefault() }}
                            className={`flex items-center justify-between gap-3 rounded-2xl p-3 transition ${locked ? 'bg-slate-100 opacity-60 dark:bg-slate-800' : 'bg-white shadow-sm hover:shadow-md dark:bg-card'}`}
                        >
                            <div className="flex items-center gap-3">
                                    <Clock size={16} className={`shrink-0 ${locked ? 'text-slate-400' : 'text-amber-500'}`} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-foreground truncate">{n.tournament_name}</p>
                                        <p className="text-xs text-slate-500 dark:text-muted-foreground">{n.message}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {locked ? (
                                        <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                            Non compilata
                                        </span>
                                    ) : (
                                        <Link
                                            to={n.tournament_format === 'group_stage' ? `/schedina/${n.tournament_id}/group-stage` : `/schedina/${n.tournament_id}/compila`}
                                            className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-500"
                                        >
                                            <PenLine size={12} />
                                            Compila Ora
                                        </Link>
                                    )}
                                </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

const Dashboard = () => {
    const { user, isAdmin, isSuperadmin, refreshMe, logout, isAuthenticated } = useAuth()
    const { charactersById, statsByPlayerId, refresh, getTournamentById, games, getLeaderboardByGame } = useAppData()
    const characters = useMemo(() => [...charactersById.values()], [charactersById])
    const player = user?.player ?? null
    const playerStats = player ? (statsByPlayerId.get(player.id) ?? null) : null
    const favoriteCharacter = player?.favorite_character_id ? charactersById.get(player.favorite_character_id) : null
    const isChampion = (playerStats?.tournamentWins ?? 0) > 0
    const [selectedGameId, setSelectedGameId] = useState('')
    const gameStats = useMemo(() => {
        if (!selectedGameId || !player) return null
        const leaderboard = getLeaderboardByGame(selectedGameId)
        const entry = leaderboard.find((entry) => entry.playerId === player.id) ?? null
        if (!entry) return null
        const rank = leaderboard.indexOf(entry) + 1
        return { ...entry, rank, totalPlayers: leaderboard.length }
    }, [selectedGameId, player, getLeaderboardByGame])

    const goldBorder = (isChampion || isSuperadmin)
        ? 'border-amber-400/50 dark:border-amber-500/30 shadow-amber-300/20 dark:shadow-amber-950/40 ring-1 ring-amber-400/30 dark:ring-amber-500/20'
        : 'border-slate-200 dark:border-border'
    const goldBg = (isChampion || isSuperadmin)
        ? 'bg-linear-to-br from-amber-100/90 via-amber-50/60 to-amber-100/80 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60'
        : 'bg-white dark:bg-card'

    const [profileTab, setProfileTab] = useState('profilo')
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ first_name: '', last_name: '', nickname: '', favorite_character_id: '', img_url: '', bio: '' })
    const [imageFileName, setImageFileName] = useState('')
    const [inventory, setInventory] = useState([])
    const [inventoryLoading, setInventoryLoading] = useState(false)
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmText: '', onConfirm: null })
    // Cambio password self-service
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
    const [pwSaving, setPwSaving] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
            first_name: player?.first_name ?? '',
            last_name: player?.last_name ?? '',
            nickname: player?.nickname ?? user?.username ?? '',
            favorite_character_id: player?.favorite_character_id ? String(player.favorite_character_id) : '',
            img_url: player?.img_url ?? '',
            bio: player?.bio ?? '',
        })
        setImageFileName('')
        if (player && !isSuperadmin) setProfileTab('panoramica')
    }, [player, user, isSuperadmin])

    const handleFormChange = (event) => {
        const { name, value } = event.target
        setForm((current) => ({ ...current, [name]: value }))
    }

    const handleImageChange = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Carica un file immagine valido')
            return
        }

        try {
            const dataUrl = await compressImage(file, { maxDimension: 400, quality: 0.85 })
            setImageFileName(file.name)
            setForm((current) => ({ ...current, img_url: dataUrl }))
        }
        catch (error) {
            toast.error('Immagine non caricata', {
                description: getApiErrorMessage(error, 'Impossibile leggere il file selezionato'),
            })
        }
    }

    const clearProfileImage = () => {
        setImageFileName('')
        setForm((current) => ({ ...current, img_url: '' }))
    }

    const handleSaveProfile = async (event) => {
        event.preventDefault()
        if (!player && !isSuperadmin) return

        setSaving(true)
        try {
            await authApi.updateMyProfile({
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                nickname: form.nickname.trim(),
                favorite_character_id: form.favorite_character_id ? Number(form.favorite_character_id) : null,
                img_url: form.img_url.trim() || null,
                bio: form.bio.trim() || null,
            })
            toast.success('Profilo aggiornato')
            await refresh()
            await refreshMe()
        }
        catch (error) {
            toast.error('Aggiornamento fallito', {
                description: getApiErrorMessage(error, 'Impossibile aggiornare il profilo'),
            })
        }
        finally {
            setSaving(false)
        }
    }

    const loadInventory = async () => {
        setInventoryLoading(true)
        try {
            const res = await inventoryApi.me()
            setInventory(res.data ?? [])
        } catch {
            setInventory([])
        } finally {
            setInventoryLoading(false)
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (isAuthenticated) loadInventory()
    }, [isAuthenticated])

    const handleUsePower = (item) => {
        setConfirmModal({
            open: true,
            title: `Usare "${item.card_name}"?`,
            message: `Stai per consumare il potere "${item.card_name}" dall'inventario. Questa azione non può essere annullata.`,
            confirmText: 'Usa Potere',
            confirmVariant: 'warning',
            onConfirm: async () => {
                try {
                    await inventoryApi.use(item.id)
                    toast.success(`Potere "${item.card_name}" utilizzato!`)
                    await loadInventory()
                } catch (error) {
                    toast.error('Impossibile usare il potere', {
                        description: getApiErrorMessage(error, 'Errore sconosciuto'),
                    })
                }
                setConfirmModal((prev) => ({ ...prev, open: false }))
            },
        })
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (pwForm.new_password.length < 6) { toast.error('La nuova password deve essere di almeno 6 caratteri'); return }
        if (pwForm.new_password !== pwForm.confirm_password) { toast.error('Le password non coincidono'); return }
        setPwSaving(true)
        try {
            await authApi.changePassword({
                current_password: pwForm.current_password,
                new_password: pwForm.new_password,
            })
            toast.success('Password aggiornata con successo')
            setPwForm({ current_password: '', new_password: '', confirm_password: '' })
            await refreshMe()
        } catch (error) {
            toast.error('Cambio password fallito', { description: getApiErrorMessage(error, 'Password corrente non valida o errore del server') })
        } finally {
            setPwSaving(false)
        }
    }

    const PROFILE_TABS = [
        ...(!isSuperadmin && player ? [{ key: 'panoramica', label: 'Panoramica' }] : []),
        { key: 'profilo', label: 'Profilo' },
        { key: 'sicurezza', label: 'Sicurezza' },
        ...(!isSuperadmin ? [
            { key: 'statistiche', label: 'Statistiche' },
            { key: 'carte', label: 'Carte & Schedine' },
        ] : []),
    ]

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in space-y-6">

                {/* ── HEADER PROFILO ───────────────────────────── */}
                <div className={`rounded-[2rem] border shadow-xl overflow-hidden ${goldBorder} ${goldBg}`}>
                    <div className="p-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div className={`h-20 w-20 overflow-hidden rounded-2xl border-2 bg-slate-100 dark:bg-muted shadow-md ${isChampion ? 'border-amber-400 shadow-amber-400/20' : 'border-slate-200 dark:border-border'}`}>
                                        {form.img_url || player?.img_url ? (
                                            <img src={form.img_url || player?.img_url} alt={form.nickname || player?.nickname} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-3xl font-black text-slate-400 dark:text-slate-500">
                                                {(player?.nickname ?? user?.username ?? '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    {isChampion && (
                                        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow-md">
                                            <Crown size={10} className="text-white" />
                                        </div>
                                    )}
                                    {!isChampion && favoriteCharacter?.img_url && (
                                        <div className="absolute -bottom-2 -right-2 h-8 w-8 overflow-hidden rounded-xl border-2 border-white dark:border-slate-900 shadow-md">
                                            <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-full w-full object-cover" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="font-title text-[10px] tracking-wide text-emerald-600 dark:text-emerald-400">
                                        {isAdmin ? 'Admin' : 'Profilo'}
                                    </p>
                                    <h1 className="mt-0.5 text-2xl font-black text-slate-900 dark:text-foreground">
                                        {player?.nickname ?? user?.username ?? '—'}
                                    </h1>
                                    <p className="text-sm text-slate-500 dark:text-muted-foreground">
                                        {isSuperadmin ? 'Superadmin' : (player ? `${player.first_name} ${player.last_name}` : 'Nessun player collegato')}
                                        {favoriteCharacter && <span className="ml-2 text-slate-400">· {favoriteCharacter.name}</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAdmin && !isSuperadmin && (
                                    <Link to="/tournaments/new" className="rounded-2xl bg-emerald-600 px-3 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-emerald-500">
                                        Nuovo torneo
                                    </Link>
                                )}
                                <button onClick={logout} type="button" className="rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-foreground transition hover:bg-slate-100">
                                    Esci
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="border-t border-slate-100 dark:border-border px-6 pb-0">
                        <div className="flex gap-1 overflow-x-auto">
                            {PROFILE_TABS.map((tab) => (
                                <button key={tab.key} type="button"
                                    onClick={() => setProfileTab(tab.key)}
                                    className={`shrink-0 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition ${profileTab === tab.key ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── TAB: PANORAMICA ─────────────────────────────── */}
                {profileTab === 'panoramica' && player && (() => {
                    const isChampion = (playerStats?.tournamentWins ?? 0) > 0
                    return (
                    <div className={`relative rounded-[2rem] border p-6 shadow-xl gold-card-shimmer ${goldBorder} ${goldBg}`}>
                        {(isChampion || isSuperadmin) && (
                            <div className="absolute right-4 top-4 rounded-full bg-amber-400 p-1.5 shadow-lg z-10">
                                <Crown size={16} className="text-amber-950" />
                            </div>
                        )}
                        <div className="space-y-6">
                        {/* Champion banner */}
                        {isChampion && (
                            <div className="flex items-center gap-4 rounded-[2rem] border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/8 px-5 py-4 shadow-sm">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-300">
                                    <Trophy size={22} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Hall of Fame</p>
                                    <p className="mt-0.5 text-base font-black text-amber-800 dark:text-amber-200">
                                        {playerStats.tournamentWins} {playerStats.tournamentWins === 1 ? 'torneo vinto' : 'tornei vinti'} · Campione della lega
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Personal stats mini grid */}
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                {
                                    label: 'Tornei vinti', value: playerStats?.tournamentWins ?? 0,
                                    sub: `di ${playerStats?.tournamentsPlayed ?? 0} giocati`,
                                    iconCls: isChampion ? 'bg-amber-400/25 text-amber-600 dark:text-amber-300' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                                    cardCls: isChampion ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-900/15 shadow-amber-200/50 dark:shadow-amber-900/30 shadow-md' : 'border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm',
                                    Icon: Trophy,
                                },
                                { label: 'Vittorie gara', value: playerStats?.raceWins ?? 0, sub: `Win Rate ${playerStats?.winRate ?? 0}%`, iconCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', cardCls: 'border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm', Icon: Flag },
                                { label: 'Podi totali', value: playerStats?.podiums ?? 0, sub: `Podium Rate ${playerStats?.podiumRate ?? 0}%`, iconCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', cardCls: 'border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm', Icon: Star },
                                { label: 'Punti totali', value: playerStats?.points ?? 0, sub: `Efficienza ${playerStats?.avgEfficiency ?? 0}%`, iconCls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', cardCls: 'border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm', Icon: BarChart3 },
                            ].map(({ label, value, sub, iconCls, cardCls, Icon }) => (
                                <div key={label} className={`flex items-start gap-3 rounded-2xl border p-4 ${cardCls}`}>
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
                                        <p className="mt-1 text-2xl font-black leading-none text-slate-900 dark:text-foreground">{value}</p>
                                        <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-muted-foreground">{sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bio */}
                        {player?.bio && (
                            <div className="rounded-[2rem] border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Bio</p>
                                <p className="text-sm text-slate-700 dark:text-foreground leading-relaxed whitespace-pre-wrap">{player.bio}</p>
                            </div>
                        )}

                        {/* Quick links */}
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Link to="/stats" className="group flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 transition hover:border-emerald-300 hover:shadow-sm">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Trophy size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-900 dark:text-foreground">Classifica</p>
                                    <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Vedi la classifica generale</p>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition" />
                            </Link>
                            <Link to="/history" className="group flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 transition hover:border-emerald-300 hover:shadow-sm">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <BarChart3 size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-900 dark:text-foreground">Storico tornei</p>
                                    <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Tutti i tornei passati</p>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition" />
                            </Link>
                            <Link to="/schedina" className="group flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 transition hover:border-emerald-300 hover:shadow-sm">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <PenLine size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-900 dark:text-foreground">Schedina</p>
                                    <p className="text-[10px] text-slate-500 dark:text-muted-foreground">Compila i pronostici</p>
                                </div>
                                <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition" />
                            </Link>
                            </div>
                        </div>
                    </div>
                    )
                })()}

                {/* ── TAB: PROFILO ─────────────────────────────── */}
                {profileTab === 'profilo' && (
                    <div className={`relative rounded-[2rem] border p-6 shadow-xl gold-card-shimmer ${goldBorder} ${goldBg}`}>
                        {(isChampion || isSuperadmin) && (
                            <div className="absolute right-4 top-4 rounded-full bg-amber-400 p-1.5 shadow-lg z-10">
                                <Crown size={16} className="text-amber-950" />
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-400">Modifica profilo</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Aggiorna nome, nickname, immagine e personaggio preferito.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                            <div className={`grid gap-4 ${isSuperadmin ? '' : 'md:grid-cols-2'}`}>
                                {!isSuperadmin && (
                                    <>
                                        <label className="space-y-2">
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Nome</span>
                                            <input name="first_name" value={form.first_name} onChange={handleFormChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 dark:border-border dark:bg-muted dark:text-foreground" />
                                        </label>
                                        <label className="space-y-2">
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Cognome</span>
                                            <input name="last_name" value={form.last_name} onChange={handleFormChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 dark:border-border dark:bg-muted dark:text-foreground" />
                                        </label>
                                    </>
                                )}
                                <label className="space-y-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Nickname</span>
                                    <input name="nickname" value={form.nickname} onChange={handleFormChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 dark:border-border dark:bg-muted dark:text-foreground" />
                                    <p className="text-[10px] text-slate-400 dark:text-muted-foreground">
                                        Verrà salvato in minuscolo e senza spazi o caratteri speciali (es. "{form.nickname.toLowerCase().replace(/[^a-z0-9]/g, '') || 'fra'}") — usalo per accedere insieme alla password.
                                    </p>
                                </label>
                                <div className="space-y-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Immagine profilo</span>
                                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-slate-600 transition hover:border-emerald-400 hover:text-slate-900 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:text-foreground">
                                        <span className="flex items-center gap-2 truncate">
                                            <Upload size={16} />
                                            <span className="truncate">{imageFileName || 'Scegli un file JPEG, PNG, WEBP o GIF'}</span>
                                        </span>
                                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                                    </label>
                                    {(form.img_url || imageFileName) && (
                                        <div className="flex items-center gap-3">
                                            <button type="button" onClick={clearProfileImage} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 transition hover:border-rose-300 hover:text-rose-600 dark:border-border dark:text-muted-foreground">
                                                Rimuovi immagine
                                            </button>
                                            <span className="text-xs text-slate-500 dark:text-muted-foreground">L'immagine verrà salvata con il profilo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="space-y-1.5">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Bio</span>
                                    <textarea name="bio" value={form.bio} onChange={handleFormChange} rows={3} maxLength={500}
                                        placeholder="Parla di te, del tuo rapporto con Mario Kart..."
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 resize-none dark:border-border dark:bg-muted dark:text-foreground" />
                                    <p className="text-[10px] text-slate-400 dark:text-muted-foreground">{form.bio.length}/500 caratteri</p>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <FavoriteCharacterPicker
                                    value={form.favorite_character_id}
                                    onChange={(nextValue) => setForm((current) => ({ ...current, favorite_character_id: nextValue }))}
                                    characters={characters}
                                />
                            </div>

                            <button type="submit" disabled={(!player && !isSuperadmin) || saving} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                                {saving ? 'Salvataggio...' : 'Salva profilo'}
                            </button>
                        </form>

                        {!player && !isSuperadmin && (
                            <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4">
                                <p className="text-xs font-black text-amber-700 dark:text-amber-300">Nessun giocatore collegato a questo account. Chiedi a un admin di associarlo.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: SICUREZZA ─────────────────────────────── */}
                {profileTab === 'sicurezza' && (
                    <div className={`rounded-[2rem] border p-6 shadow-xl gold-card-shimmer ${goldBorder} ${goldBg}`}>
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500 dark:text-muted-foreground">Sicurezza</p>
                        <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Cambia password</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Inserisci la password attuale per confermare la tua identità, poi la nuova password.</p>
                        <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                            <label className="block space-y-1.5">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Password attuale</span>
                                <input
                                    type="password"
                                    value={pwForm.current_password}
                                    onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
                                    required
                                    autoComplete="current-password"
                                    className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                                />
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Nuova password</span>
                                    <input
                                        type="password"
                                        value={pwForm.new_password}
                                        onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                                    />
                                </label>
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Conferma nuova password</span>
                                    <input
                                        type="password"
                                        value={pwForm.confirm_password}
                                        onChange={(e) => setPwForm((p) => ({ ...p, confirm_password: e.target.value }))}
                                        required
                                        autoComplete="new-password"
                                        className={`w-full rounded-2xl border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500 ${pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-border'}`}
                                    />
                                </label>
                            </div>
                            {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                                <p className="text-xs text-rose-500 font-black">Le password non coincidono</p>
                            )}
                            <button
                                type="submit"
                                disabled={pwSaving || !pwForm.current_password || !pwForm.new_password || pwForm.new_password !== pwForm.confirm_password}
                                className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-700 dark:hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {pwSaving ? 'Aggiornamento...' : 'Cambia password'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── TAB: STATISTICHE ─────────────────────────────── */}
                {profileTab === 'statistiche' && (
                    <div className={`rounded-[2rem] border p-6 shadow-xl gold-card-shimmer ${goldBorder} ${goldBg}`}>
                        <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: 'Tornei vinti', value: playerStats?.tournamentWins ?? 0, sub: `di ${playerStats?.tournamentsPlayed ?? 0} giocati`, Icon: Trophy, iconCls: isChampion ? 'bg-amber-400/25 text-amber-600 dark:text-amber-300' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400', cardCls: isChampion ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-900/15' : 'border-slate-200 dark:border-border bg-white dark:bg-card' },
                                { label: 'Vittorie gara', value: playerStats?.raceWins ?? 0, sub: `di ${playerStats?.racesPlayed ?? 0} gare`, Icon: Flag, iconCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', cardCls: 'border-slate-200 dark:border-border bg-white dark:bg-card' },
                                { label: 'Podi totali', value: playerStats?.podiums ?? 0, sub: `Podium Rate ${playerStats?.podiumRate ?? 0}%`, Icon: Star, iconCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', cardCls: 'border-slate-200 dark:border-border bg-white dark:bg-card' },
                                { label: 'Punti totali', value: playerStats?.points ?? 0, sub: `Efficienza ${playerStats?.avgEfficiency ?? 0}%`, Icon: BarChart3, iconCls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', cardCls: 'border-slate-200 dark:border-border bg-white dark:bg-card' },
                            ].map(({ label, value, sub, Icon, iconCls, cardCls }) => (
                                <div key={label} className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${cardCls}`}>
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
                                        <p className="mt-1 text-2xl font-black leading-none text-slate-900 dark:text-foreground">{value}</p>
                                        <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-muted-foreground">{sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Statistiche per gioco */}
                        <div className="rounded-[2rem] border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Statistiche per gioco</p>
                                <select value={selectedGameId} onChange={e => setSelectedGameId(e.target.value)}
                                    className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-foreground outline-none focus:border-emerald-400">
                                    <option value="">Seleziona un gioco</option>
                                    {games.map((g) => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                            {gameStats ? (
                                <div className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        {[
                                            { label: 'Posizione', value: `#${gameStats.rank}`, sub: `di ${gameStats.totalPlayers}`, iconCls: gameStats.rank === 1 ? 'bg-amber-400/25 text-amber-600' : 'bg-slate-500/10 text-slate-600', Icon: Trophy },
                                            { label: 'Tornei vinti', value: gameStats.tournamentWins, sub: `di ${gameStats.tournamentsPlayed} giocati`, iconCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', Icon: Crown },
                                            { label: 'Podi totali', value: gameStats.podiums, sub: `Podium Rate ${gameStats.podiumRate}%`, iconCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', Icon: Star },
                                            { label: 'Vittorie gara', value: gameStats.raceWins, sub: `Win Rate ${gameStats.winRate}%`, iconCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', Icon: Flag },
                                        ].map(({ label, value, sub, iconCls, Icon }) => (
                                            <div key={label} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-4 shadow-sm">
                                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                                                    <Icon size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
                                                    <p className="mt-1 text-2xl font-black leading-none text-slate-900 dark:text-foreground">{value}</p>
                                                    <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-muted-foreground">{sub}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-muted-foreground">
                                        <span className="rounded-lg bg-slate-100 dark:bg-muted px-2.5 py-1">Punti totali: {gameStats.points}</span>
                                        <span className="rounded-lg bg-slate-100 dark:bg-muted px-2.5 py-1">Gare giocate: {gameStats.racesPlayed}</span>
                                        <span className="rounded-lg bg-slate-100 dark:bg-muted px-2.5 py-1">Placement Index: {gameStats.placementIndex?.toFixed(2) ?? '—'}</span>
                                        <span className="rounded-lg bg-slate-100 dark:bg-muted px-2.5 py-1">Efficienza: {gameStats.avgEfficiency}%</span>
                                    </div>
                                </div>
                            ) : selectedGameId ? (
                                <p className="text-xs text-slate-400">Nessuna statistica per questo gioco.</p>
                            ) : (
                                <p className="text-xs text-slate-400">Seleziona un gioco per vedere le statistiche.</p>
                            )}
                        </div>

                        {!playerStats && (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-border p-5 text-center text-sm text-slate-500 dark:text-muted-foreground">
                                Nessuna statistica disponibile. Chiedi a un admin di collegarti a un giocatore.
                            </div>
                        )}
                        </div>
                    </div>
                )}

                {/* ── TAB: CARTE & SCHEDINE ─────────────────────────────── */}
                {profileTab === 'carte' && (
                    <div className="space-y-4">
                        <SchedinaBadge />

                        <div className={`rounded-[2rem] border p-6 shadow-xl gold-card-shimmer ${goldBorder} ${goldBg}`}>
                            <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-400">Inventario</p>
                            <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">I Miei Poteri</h2>
                            {inventoryLoading ? (
                                <p className="mt-4 text-sm text-slate-500 dark:text-muted-foreground">Caricamento poteri...</p>
                            ) : inventory.length === 0 ? (
                                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-4 text-center">
                                    <Zap size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                                    <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">Nessun potere nell'inventario</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {inventory.filter((item) => !item.is_consumed).length > 0 && (
                                        <>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disponibili ({inventory.filter((item) => !item.is_consumed).length})</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {inventory.filter((item) => !item.is_consumed).map((item) => (
                                                    <PowerCard
                                                        key={item.id}
                                                        type={item.card_type}
                                                        mode="card"
                                                        customTitle={item.card_name}
                                                        sourceTournamentId={item.source_tournament_id && getTournamentById(item.source_tournament_id) ? item.source_tournament_id : undefined}
                                                        sourceTournamentName={item.source_tournament_name}
                                                        sourceGameName={item.source_game_name}
                                                        onUse={item.is_consumed ? undefined : () => handleUsePower(item)}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {inventory.filter((item) => item.is_consumed).length > 0 && (
                                        <details className="mt-2 rounded-2xl border border-slate-200 dark:border-border bg-white/60 dark:bg-card/60 p-3">
                                            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 select-none">
                                                Consumate ({inventory.filter((item) => item.is_consumed).length})
                                            </summary>
                                            <div className="mt-3 space-y-2">
                                                {inventory.filter((item) => item.is_consumed).map((item) => (
                                                    <PowerCard
                                                        key={item.id}
                                                        type={item.card_type}
                                                        mode="mini"
                                                        consumed
                                                        customTitle={item.card_name}
                                                        sourceTournamentName={item.source_tournament_name}
                                                        sourceGameName={item.source_game_name}
                                                        consumedAt={item.consumed_at}
                                                        consumedInRaceId={item.consumed_in_race_id}
                                                        consumedEffect={item.consumed_effect}
                                                    />
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                )}

                {/* ── BANNER SUPERADMIN → redirect to /superadmin ── */}
                {isSuperadmin && (
                    <div className="rounded-[2rem] border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-6 shadow-xl">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-400/30">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Accesso completo</p>
                                    <h2 className="mt-0.5 text-lg font-black text-slate-900 dark:text-foreground">Pannello SuperAdmin</h2>
                                    <p className="text-sm text-slate-500 dark:text-muted-foreground">Gestisci utenti, tornei, carte e audit log da un unico pannello.</p>
                                </div>
                            </div>
                            <Link to="/superadmin"
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-amber-400 shadow-lg shadow-amber-400/30">
                                <Shield size={16} /> Apri Pannello
                            </Link>
                        </div>
                    </div>
                )}


            </section>
            <ConfirmModal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmVariant={confirmModal.confirmVariant || 'danger'}
            />
        </AppLayout>
    )
}

export default Dashboard