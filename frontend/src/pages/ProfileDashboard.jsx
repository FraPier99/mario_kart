import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Image as ImageIcon, PenLine, Search, Upload, X, Clock, AlertTriangle, Zap, Trophy, Flag, BarChart3, Star, Crown } from 'lucide-react'
import PowerCard from '@/components/cards/PowerCard'
import { toast } from 'sonner'
import { toast as soundToast } from '@/lib/soundToast'
import { isUiSoundEnabled, setUiSoundEnabled } from '@/lib/uiSoundPrefs'
import { playMkdsCharacterVoice, preloadMkdsCharacterVoiceByName } from '@/lib/mkdsSounds'
import { playMk8dCharacterVoice, preloadCharacterVoice as preloadMk8dCharacterVoice } from '@/lib/mk8dSounds'
import AppLayout from '@/components/layout/AppLayout'
import ConfirmModal from '@/components/common/ConfirmModal'
import ApiBanner from '@/components/common/ApiBanner'
import { SkeletonRows } from '@/components/common/Skeleton'
import PlayerTournamentHistory from '@/components/community/PlayerTournamentHistory'
import PlayerBadge from '@/components/community/PlayerBadge'
import ProfileHeader from '@/components/community/ProfileHeader'
import { pickBestBadge, getProfileCardStyle } from '@/lib/playerBadges'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { authApi, schedineApi, inventoryApi, ownershipApi, statsApi, getApiErrorMessage } from '@/services/apiClient'
import { compressImage } from '@/lib/imageCompression'
import OwnershipForm from '@/components/common/OwnershipForm'

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

    // Precaricare TUTTI i personaggi in blocco all'apertura del menu (~40+
    // fetch+decodeAudioData in parallelo) saturava la decodifica audio: il
    // verso del personaggio cliccato restava in coda dietro gli altri, con
    // un ritardo percepibile e, se si cliccava più volte durante l'attesa,
    // versi diversi che partivano tutti insieme non appena le decodifiche
    // in coda finivano. Si precarica invece un solo personaggio alla volta,
    // al passaggio del mouse/focus sulla sua card — per come si usa il
    // picker (si passa sopra prima di cliccare) il verso è quasi sempre
    // già pronto al click, senza saturare nulla.
    const preloadVoiceFor = (character) => {
        if (character.game_id === 2) preloadMk8dCharacterVoice(character.name)
        else preloadMkdsCharacterVoiceByName(character.name)
    }

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

        // Ancorato al trigger: si apre verso l'alto SOLO se sotto non c'è
        // nemmeno lo spazio minimo E sopra ce n'è di più — non appena
        // "sotto è un po' stretto" (soglia troppo larga prima, 320px,
        // quasi sempre vera su mobile), altrimenti il menu finiva quasi
        // sempre spinto in cima allo schermo invece di restare vicino al
        // bottone. L'altezza disponibile è sempre quella REALE nella
        // direzione scelta (mai un valore fisso che sfora fuori viewport).
        const rect = triggerRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        const margin = 12
        const MIN_HEIGHT = 200
        const MAX_HEIGHT = 360
        const spaceBelow = viewportHeight - rect.bottom - margin
        const spaceAbove = rect.top - margin
        const openUp = spaceBelow < MIN_HEIGHT && spaceAbove > spaceBelow
        const availableSpace = openUp ? spaceAbove : spaceBelow
        const preferredHeight = Math.max(Math.min(MIN_HEIGHT, availableSpace), Math.min(MAX_HEIGHT, availableSpace))
        const left = Math.max(margin, Math.min(rect.left, viewportWidth - Math.max(rect.width, 340) - margin))

        setMenuStyle({
            top: openUp ? Math.max(margin, rect.top - preferredHeight - 8) : rect.bottom + 8,
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
                className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 outline-none transition hover:border-emerald-400 dark:border-border dark:bg-muted dark:text-foreground"
            >
                <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
                        {selectedCharacter?.img_url ? (
                            <img src={selectedCharacter.img_url} alt={selectedCharacter.name} className="h-full w-full object-cover" />
                        ) : (
                            <ImageIcon size={18} className="text-slate-400" />
                        )}
                    </span>
                    <span className="min-w-0">
                        <span className="block font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Personaggio preferito</span>
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
                    className="fixed z-9999 overflow-hidden rounded-3xl border-2 border-slate-200 bg-white dark:border-border dark:bg-card"
                    style={{ ...menuStyle, boxShadow: 'var(--circuit-shadow-md)' }}
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
                                        onMouseEnter={() => preloadVoiceFor(character)}
                                        onFocus={() => preloadVoiceFor(character)}
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
                                        className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-3 text-center transition ${isSelected ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'}`}
                                    >
                                        <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
                                            {character.img_url ? (
                                                <img src={character.img_url} alt={character.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-black text-slate-400">{character.name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                                            )}
                                        </span>
                                        <span className="w-full truncate font-title text-[9px] tracking-wide text-slate-900 dark:text-foreground">{character.name}</span>
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
        <div className="rounded-[2rem] border-2 border-amber-200 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/15" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
                    <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <p className="font-title text-[9px] tracking-wide text-amber-600 dark:text-amber-400">Schedine da compilare</p>
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
                            className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3 transition ${locked ? 'border-transparent bg-slate-100 opacity-60 dark:bg-slate-800' : 'border-slate-200 dark:border-border bg-white dark:bg-card'}`}
                            style={locked ? undefined : { boxShadow: 'var(--circuit-shadow-sm)' }}
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
                                        <span className="rounded-full bg-slate-200 px-3 py-1 font-title text-[8px] tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                            Non compilata
                                        </span>
                                    ) : (
                                        <Link
                                            to={n.tournament_format === 'group_stage' ? `/schedina/${n.tournament_id}/group-stage` : `/schedina/${n.tournament_id}/compila`}
                                            className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-emerald-600 bg-emerald-600 px-4 py-2 font-title text-[8px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500"
                                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
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

// Palette fissa (non un color-picker libero): mantiene ogni accent
// leggibile su sfondo chiaro/scuro e coerente con lo stile "pillola"
// del resto dell'app, invece di lasciare scegliere un hex arbitrario.
const ACCENT_PRESETS = [
    { value: '#ef4444', label: 'Rosso' },
    { value: '#f43f5e', label: 'Rosa' },
    { value: '#d946ef', label: 'Magenta' },
    { value: '#f97316', label: 'Arancione' },
    { value: '#eab308', label: 'Giallo' },
    { value: '#84cc16', label: 'Lime' },
    { value: '#22c55e', label: 'Verde' },
    { value: '#14b8a6', label: 'Teal' },
    { value: '#06b6d4', label: 'Ciano' },
    { value: '#3b82f6', label: 'Blu' },
    { value: '#6366f1', label: 'Indaco' },
    { value: '#8b5cf6', label: 'Viola' },
    { value: '#92400e', label: 'Marrone' },
    { value: '#64748b', label: 'Grigio' },
]

const AccentColorPicker = ({ value, onChange }) => (
    <div className="space-y-2">
        <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Colore accento</span>
        <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((preset) => (
                <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    onClick={() => onChange(preset.value)}
                    className={`h-8 w-8 rounded-full border-2 transition ${value === preset.value ? 'border-slate-900 dark:border-white scale-110' : 'border-white/60 dark:border-black/30 hover:scale-105'}`}
                    style={{ backgroundColor: preset.value, boxShadow: value === preset.value ? '0 0 0 2px ' + preset.value + '55' : undefined }}
                />
            ))}
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="rounded-full border-2 border-dashed border-slate-300 dark:border-border px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground transition hover:text-slate-600 dark:hover:text-foreground"
                >
                    Nessuno
                </button>
            )}
        </div>
    </div>
)

const Dashboard = () => {
    const { user, isAdmin, isSuperadmin, refreshMe, isAuthenticated } = useAuth()
    const { charactersById, statsByPlayerId, patchPlayer, getTournamentById, games, consoles, getLeaderboardByGame } = useAppData()
    const characters = useMemo(() => [...charactersById.values()], [charactersById])
    const player = user?.player ?? null
    const playerStats = player ? (statsByPlayerId.get(player.id) ?? null) : null
    const favoriteCharacter = player?.favorite_character_id ? charactersById.get(player.favorite_character_id) : null
    const [badges, setBadges] = useState([])
    useEffect(() => {
        if (!player) return
        let active = true
        statsApi.playerBadges(player.id)
            .then((res) => { if (active) setBadges(res.data) })
            .catch(() => { if (active) setBadges([]) })
        return () => { active = false }
    }, [player])
    const bestBadge = useMemo(() => pickBestBadge(badges), [badges])
    // Stile "carta speciale" guidato dal tier reale del badge migliore
    // (leggenda/campione/veterano) — un superadmin non ha badge per
    // game_id (non gioca), quindi niente trattamento dorato automatico:
    // stessa regola già applicata in CommunityUserPage.jsx.
    // Il superadmin non ha Player/badge (non gioca mai), ma ha comunque
    // diritto al trattamento "carta speciale" oro — non derivato dal
    // sistema badge/tier (che senza dati reali cadrebbe sul tier più basso,
    // "sfidante"), ma come effetto del ruolo stesso: stessa leggenda usata
    // per il tier più esclusivo dei giocatori, riusata qui come override.
    const cardStyle = isSuperadmin ? getProfileCardStyle('leggenda') : getProfileCardStyle(bestBadge?.tier)
    const effectiveCardStyle = cardStyle
    const [selectedGameId, setSelectedGameId] = useState('')
    const activeBadge = useMemo(() => {
        if (!selectedGameId) return bestBadge
        return badges.find((b) => b.game_id === Number(selectedGameId)) ?? bestBadge
    }, [badges, selectedGameId, bestBadge])
    const gameStats = useMemo(() => {
        if (!selectedGameId || !player) return null
        const leaderboard = getLeaderboardByGame(selectedGameId)
        const entry = leaderboard.find((entry) => entry.playerId === player.id) ?? null
        if (!entry) return null
        const rank = leaderboard.indexOf(entry) + 1
        return { ...entry, rank, totalPlayers: leaderboard.length }
    }, [selectedGameId, player, getLeaderboardByGame])

    const goldBorder = effectiveCardStyle?.cardBorder ?? 'border-slate-200 dark:border-border'
    const goldBg = effectiveCardStyle?.cardBg ?? 'bg-white dark:bg-card'

    const [searchParams] = useSearchParams()
    const requestedProfileTab = searchParams.get('tab')
    const validProfileTabKeys = new Set(['profilo', 'sicurezza', ...(!isSuperadmin ? ['statistiche', 'carte', 'possiedi'] : [])])
    const [profileTab, setProfileTab] = useState(() => (
        validProfileTabKeys.has(requestedProfileTab) ? requestedProfileTab : 'profilo'
    ))
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ first_name: '', last_name: '', nickname: '', favorite_character_id: '', img_url: '', bio: '', accent_color: '' })
    const [imageFileName, setImageFileName] = useState('')
    const [inventory, setInventory] = useState([])
    const [inventoryLoading, setInventoryLoading] = useState(false)
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmText: '', onConfirm: null })
    // Cambio password self-service
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
    const [pwSaving, setPwSaving] = useState(false)
    const [uiSoundEnabled, setUiSoundEnabledState] = useState(() => isUiSoundEnabled())

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
            first_name: player?.first_name ?? '',
            last_name: player?.last_name ?? '',
            nickname: player?.nickname ?? user?.username ?? '',
            favorite_character_id: player?.favorite_character_id ? String(player.favorite_character_id) : '',
            img_url: player?.img_url ?? '',
            bio: player?.bio ?? '',
            accent_color: player?.accent_color ?? '',
        })
        setImageFileName('')
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
            const payload = {
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                nickname: form.nickname.trim(),
                favorite_character_id: form.favorite_character_id ? Number(form.favorite_character_id) : null,
                img_url: form.img_url.trim() || null,
                bio: form.bio.trim() || null,
                accent_color: form.accent_color || null,
            }
            await authApi.updateMyProfile(payload)
            toast.success('Profilo aggiornato')
            // Patch locale invece di refresh(): GET /players ha una cache
            // HTTP di 60s (vedi commento su patchPlayer in
            // AppDataContext.jsx) — un refresh() qui avrebbe rischiato di
            // ricevere dal browser la risposta cache-ata pre-modifica,
            // sovrascrivendo la patch appena applicata e mostrando altrove
            // nell'app (es. /players) il colore accento/nickname/avatar
            // "vecchio" finché la cache non scadeva. Stesso principio già
            // usato per patchTournament/patchCircuit altrove nell'app.
            if (player) patchPlayer(player.id, payload)
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

    // Le carte disponibili si raggruppano per tipo (Master/Guscio Blu) e per
    // gioco: prima erano mostrate tutte insieme in un'unica griglia, difficile
    // da distinguere quando un utente ne ha diverse di tipi/giochi diversi.
    const groupedAvailableCards = useMemo(() => {
        const groups = new Map()
        for (const item of inventory) {
            if (item.is_consumed) continue
            const key = `${item.card_type}__${item.game_id ?? 'none'}`
            if (!groups.has(key)) {
                groups.set(key, { cardType: item.card_type, gameName: item.source_game_name, items: [] })
            }
            groups.get(key).items.push(item)
        }
        return [...groups.values()].sort((a, b) => {
            if (a.cardType !== b.cardType) return a.cardType === 'master' ? -1 : 1
            return (a.gameName ?? '').localeCompare(b.gameName ?? '')
        })
    }, [inventory])

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

    const [ownership, setOwnership] = useState({ games: [], consoles: [], r4_devices: [], has_declared: false })
    const [ownershipLoading, setOwnershipLoading] = useState(false)
    const [ownershipSaving, setOwnershipSaving] = useState(false)

    const loadOwnership = async () => {
        setOwnershipLoading(true)
        try {
            const res = await ownershipApi.me()
            setOwnership(res.data ?? { games: [], consoles: [], r4_devices: [], has_declared: false })
        } catch {
            // lascia i valori di default
        } finally {
            setOwnershipLoading(false)
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (isAuthenticated && !isSuperadmin) loadOwnership()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, isSuperadmin])

    const handleSaveOwnership = async (payload) => {
        setOwnershipSaving(true)
        try {
            const res = await ownershipApi.updateMe(payload)
            setOwnership(res.data ?? { games: [], consoles: [], r4_devices: [], has_declared: false })
            toast.success('Possessi aggiornati')
        } catch (error) {
            toast.error('Aggiornamento fallito', {
                description: getApiErrorMessage(error, 'Impossibile salvare i possessi'),
            })
        } finally {
            setOwnershipSaving(false)
        }
    }

    const shouldNudgeOwnership = !ownershipLoading && !ownership.has_declared

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
                    soundToast.success(`Potere "${item.card_name}" utilizzato!`)
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
        { key: 'profilo', label: 'Profilo' },
        { key: 'sicurezza', label: 'Sicurezza' },
        ...(!isSuperadmin ? [
            { key: 'statistiche', label: 'Statistiche' },
            { key: 'carte', label: 'Carte & Schedine' },
            { key: 'possiedi', label: 'Possiedi' },
        ] : []),
    ]

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in space-y-6">

                {/* ── HEADER PROFILO ───────────────────────────── */}
                {/* max-w-5xl qui (non max-w-7xl come il resto della pagina):
                    il contenuto è intrinsecamente stretto, una card larga
                    quanto tutta la pagina lascia una zona colorata vuota
                    invece di sembrare una card compatta. Il logout resta
                    disponibile dal menu profilo in Navbar — niente più
                    bottone "Esci" duplicato qui. */}
                <div className={`mx-auto max-w-5xl rounded-[2rem] border-2 p-6 ${goldBorder} ${goldBg}`} style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                    <ProfileHeader
                        avatarSrc={form.img_url || player?.img_url}
                        nickname={player?.nickname ?? user?.username ?? '—'}
                        fallbackInitial={(player?.nickname ?? user?.username ?? '?').charAt(0).toUpperCase()}
                        subtitle={isSuperadmin ? 'Superadmin' : (player ? `${player.first_name} ${player.last_name}` : 'Nessun player collegato')}
                        accentColor={player?.accent_color}
                        role={isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'user'}
                        cardStyle={cardStyle}
                        // Il superadmin non gioca mai — nessun badge di gioco anche se per
                        // qualche motivo risultasse un player collegato.
                        badges={isSuperadmin ? [] : badges}
                        favoriteCharacter={favoriteCharacter}
                        bio={player?.bio}
                    />
                </div>

                {!isSuperadmin && shouldNudgeOwnership && (
                    <ApiBanner
                        tone="info"
                        title="Completa il tuo profilo gaming"
                        message="Non hai ancora indicato quali giochi o console possiedi. Vai alla scheda “Possiedi” per aggiungerli."
                        action={
                            <button type="button" onClick={() => setProfileTab('possiedi')}
                                className="rounded-2xl border-2 border-slate-900 dark:border-slate-600 bg-slate-900 dark:bg-slate-700 px-4 py-2 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-slate-700 dark:hover:bg-slate-600">
                                Vai a Possiedi
                            </button>
                        }
                    />
                )}

                {/* Tab bar attaccata alla card sotto (stessa cornice/sfondo,
                    nessuno spazio/bordo fra le due): è la sua barra di
                    navigazione, deve leggersi come parte della stessa card,
                    non come un elemento a sé stante scollegato in mezzo alla
                    pagina (segnalato dall'utente). */}
                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm overflow-hidden">
                    <div className="border-b border-slate-200 dark:border-border px-6 pt-2">
                        <div className="flex gap-1 overflow-x-auto">
                            {PROFILE_TABS.map((tab) => (
                                <button key={tab.key} type="button"
                                    onClick={() => setProfileTab(tab.key)}
                                    className={`shrink-0 px-4 py-3 font-title text-[10px] tracking-wide border-b-2 transition ${profileTab === tab.key ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 md:p-8">

                {/* ── TAB: PROFILO ─────────────────────────────── */}
                {profileTab === 'profilo' && (
                    <div className={`relative rounded-[2rem] border-2 p-6 ${effectiveCardStyle?.shimmer ? 'gold-card-shimmer' : ''} ${goldBorder} ${goldBg}`} style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        {effectiveCardStyle && (
                            <div className={`absolute right-4 top-4 rounded-full p-1.5 shadow-lg z-10 ${effectiveCardStyle.badgeBg}`}>
                                <effectiveCardStyle.Icon size={16} className={effectiveCardStyle.badgeIconColor} />
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <div>
                                <p className="font-title text-[9px] tracking-wide text-emerald-600 dark:text-emerald-400">Modifica profilo</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Aggiorna nome, nickname, immagine e personaggio preferito.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                            {/* min-w-0 su ogni figlio: senza, l'input dentro (larghezza
                                intrinseca minima del browser per un <input> testo) forza la
                                colonna grid a crescere oltre lo spazio disponibile invece di
                                rispettare w-full — su mobile (una sola colonna) gli input
                                uscivano visibilmente dalla card. */}
                            <div className={`grid gap-4 ${isSuperadmin ? '' : 'md:grid-cols-2'}`}>
                                {!isSuperadmin && (
                                    <>
                                        <label className="min-w-0 space-y-2">
                                            <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Nome</span>
                                            <input name="first_name" value={form.first_name} onChange={handleFormChange} className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 dark:border-border dark:bg-muted dark:text-foreground" />
                                        </label>
                                        <label className="min-w-0 space-y-2">
                                            <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Cognome</span>
                                            <input name="last_name" value={form.last_name} onChange={handleFormChange} className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 dark:border-border dark:bg-muted dark:text-foreground" />
                                        </label>
                                    </>
                                )}
                                <label className="min-w-0 space-y-2">
                                    <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Nickname</span>
                                    <input name="nickname" value={form.nickname} onChange={handleFormChange} className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 dark:border-border dark:bg-muted dark:text-foreground" />
                                    <p className="text-[10px] text-slate-400 dark:text-muted-foreground">
                                        Verrà salvato in minuscolo e senza spazi o caratteri speciali (es. "{form.nickname.toLowerCase().replace(/[^a-z0-9]/g, '') || 'fra'}") — usalo per accedere insieme alla password.
                                    </p>
                                </label>
                                <div className="min-w-0 space-y-2">
                                    <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Immagine profilo</span>
                                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-slate-600 transition hover:border-emerald-400 hover:text-slate-900 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:text-foreground">
                                        <span className="flex items-center gap-2 truncate">
                                            <Upload size={16} />
                                            <span className="truncate">{imageFileName || 'Scegli un file JPEG, PNG, WEBP o GIF'}</span>
                                        </span>
                                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                                    </label>
                                    {(form.img_url || imageFileName) && (
                                        <div className="flex items-center gap-3">
                                            <button type="button" onClick={clearProfileImage} className="rounded-xl border-2 border-slate-200 px-3 py-2 font-title text-[9px] tracking-wide text-slate-600 transition active:translate-y-px hover:border-rose-300 hover:text-rose-600 dark:border-border dark:text-muted-foreground">
                                                Rimuovi immagine
                                            </button>
                                            <span className="text-xs text-slate-500 dark:text-muted-foreground">L'immagine verrà salvata con il profilo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="space-y-1.5">
                                    <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Bio</span>
                                    <textarea name="bio" value={form.bio} onChange={handleFormChange} rows={3} maxLength={500}
                                        placeholder="Parla di te, del tuo rapporto con Mario Kart..."
                                        className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 resize-none dark:border-border dark:bg-muted dark:text-foreground" />
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

                            <AccentColorPicker
                                value={form.accent_color}
                                onChange={(nextValue) => setForm((current) => ({ ...current, accent_color: nextValue }))}
                            />

                            <button type="submit" disabled={(!player && !isSuperadmin) || saving} className="rounded-2xl border-2 border-emerald-600 bg-emerald-600 px-5 py-3 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                {saving ? 'Salvataggio...' : 'Salva profilo'}
                            </button>
                        </form>

                        {!player && !isSuperadmin && (
                            <div className="mt-4 rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4">
                                <p className="text-xs font-black text-amber-700 dark:text-amber-300">Nessun giocatore collegato a questo account. Chiedi a un admin di associarlo.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: SICUREZZA ─────────────────────────────── */}
                {profileTab === 'sicurezza' && (
                    <div className={`rounded-[2rem] border-2 p-6 ${effectiveCardStyle?.shimmer ? 'gold-card-shimmer' : ''} ${goldBorder} ${goldBg}`} style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <p className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Sicurezza</p>
                        <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Cambia password</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Inserisci la password attuale per confermare la tua identità, poi la nuova password.</p>
                        <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
                            <label className="block space-y-1.5">
                                <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Password attuale</span>
                                <input
                                    type="password"
                                    value={pwForm.current_password}
                                    onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
                                    required
                                    autoComplete="current-password"
                                    className="w-full rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                                />
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="block space-y-1.5">
                                    <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Nuova password</span>
                                    <input
                                        type="password"
                                        value={pwForm.new_password}
                                        onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                        className="w-full rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500"
                                    />
                                </label>
                                <label className="block space-y-1.5">
                                    <span className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Conferma nuova password</span>
                                    <input
                                        type="password"
                                        value={pwForm.confirm_password}
                                        onChange={(e) => setPwForm((p) => ({ ...p, confirm_password: e.target.value }))}
                                        required
                                        autoComplete="new-password"
                                        className={`w-full rounded-2xl border-2 bg-slate-50 dark:bg-muted px-4 py-3 text-slate-900 dark:text-foreground outline-none focus:border-emerald-500 ${pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-border'}`}
                                    />
                                </label>
                            </div>
                            {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                                <p className="text-xs text-rose-500 font-black">Le password non coincidono</p>
                            )}
                            <button
                                type="submit"
                                disabled={pwSaving || !pwForm.current_password || !pwForm.new_password || pwForm.new_password !== pwForm.confirm_password}
                                className="rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-slate-900 dark:bg-slate-700 px-5 py-3 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-slate-700 dark:hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                                style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                            >
                                {pwSaving ? 'Aggiornamento...' : 'Cambia password'}
                            </button>
                        </form>

                        <div className="mt-6 border-t border-slate-100 dark:border-border pt-6">
                            <p className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground">Preferenze</p>
                            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Suoni interfaccia</h2>
                            <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Micro-suoni per momenti come l'uso di una carta o la salita di livello badge — spenti di default.</p>
                            <button
                                type="button"
                                onClick={() => { const next = !uiSoundEnabled; setUiSoundEnabled(next); setUiSoundEnabledState(next) }}
                                className={`mt-4 flex items-center gap-3 rounded-2xl border-2 px-4 py-3 font-title text-[10px] tracking-wide transition ${uiSoundEnabled ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-muted text-slate-600 dark:text-muted-foreground'}`}
                            >
                                <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${uiSoundEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'}`}>
                                    <span className="h-4 w-4 rounded-full bg-white shadow" />
                                </span>
                                {uiSoundEnabled ? 'Suoni attivi' : 'Suoni disattivati'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── TAB: STATISTICHE ─────────────────────────────── */}
                {profileTab === 'statistiche' && (
                    <div className={`rounded-[2rem] border-2 p-6 ${effectiveCardStyle?.shimmer ? 'gold-card-shimmer' : ''} ${goldBorder} ${goldBg}`} style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: 'Tornei vinti', value: playerStats?.tournamentWins ?? 0, sub: `di ${playerStats?.tournamentsPlayed ?? 0} giocati`, Icon: Trophy, iconCls: cardStyle ? 'bg-amber-400/25 text-amber-600 dark:text-amber-300' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400', cardCls: cardStyle ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-900/15' : 'border-slate-200 dark:border-border bg-white dark:bg-card' },
                                { label: 'Vittorie gara', value: playerStats?.raceWins ?? 0, sub: `di ${playerStats?.racesPlayed ?? 0} gare`, Icon: Flag, iconCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', cardCls: 'border-slate-200 dark:border-border bg-white dark:bg-card' },
                                { label: 'Podi totali', value: playerStats?.podiums ?? 0, sub: `Podium Rate ${playerStats?.podiumRate ?? 0}%`, Icon: Star, iconCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', cardCls: 'border-slate-200 dark:border-border bg-white dark:bg-card' },
                                { label: 'Punti totali', value: playerStats?.points ?? 0, sub: `Efficienza ${playerStats?.avgEfficiency ?? 0}%`, Icon: BarChart3, iconCls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', cardCls: 'border-slate-200 dark:border-border bg-white dark:bg-card' },
                            ].map(({ label, value, sub, Icon, iconCls, cardCls }) => (
                                <div key={label} className={`flex items-start gap-3 rounded-2xl border-2 p-4 ${cardCls}`} style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-title text-[9px] tracking-wide text-slate-400">{label}</p>
                                        <p className="mt-1 font-title text-2xl leading-none text-slate-900 dark:text-foreground">{value}</p>
                                        <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-muted-foreground">{sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Statistiche per gioco */}
                        <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <p className="font-title text-[9px] tracking-wide text-slate-400">Statistiche per gioco</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {activeBadge && <PlayerBadge badge={activeBadge} size="sm" />}
                                    <select value={selectedGameId} onChange={e => setSelectedGameId(e.target.value)}
                                        className="rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2 font-title text-[9px] tracking-wide text-slate-700 dark:text-foreground outline-none focus:border-emerald-400">
                                        <option value="">Seleziona un gioco</option>
                                        {games.map((g) => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {gameStats ? (
                                <div className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        {[
                                            { label: 'Posizione', value: `#${gameStats.rank}`, sub: `di ${gameStats.totalPlayers}`, iconCls: gameStats.rank === 1 ? 'bg-amber-400/25 text-amber-600' : 'bg-slate-500/10 text-slate-600', Icon: Trophy },
                                            { label: 'Tornei vinti', value: gameStats.tournamentWins, sub: `di ${gameStats.tournamentsPlayed} giocati`, iconCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', Icon: getProfileCardStyle(activeBadge?.tier)?.Icon ?? Crown },
                                            { label: 'Podi totali', value: gameStats.podiums, sub: `Podium Rate ${gameStats.podiumRate}%`, iconCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', Icon: Star },
                                            { label: 'Vittorie gara', value: gameStats.raceWins, sub: `Win Rate ${gameStats.winRate}%`, iconCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', Icon: Flag },
                                        ].map(({ label, value, sub, iconCls, Icon }) => (
                                            <div key={label} className="flex items-start gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted p-4" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                                                    <Icon size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-title text-[9px] tracking-wide text-slate-400">{label}</p>
                                                    <p className="mt-1 font-title text-2xl leading-none text-slate-900 dark:text-foreground">{value}</p>
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

                        {player && <PlayerTournamentHistory playerId={player.id} />}

                        {!playerStats && (
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-border p-5 text-center text-sm text-slate-500 dark:text-muted-foreground">
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

                        <div className={`rounded-[2rem] border-2 p-6 ${effectiveCardStyle?.shimmer ? 'gold-card-shimmer' : ''} ${goldBorder} ${goldBg}`} style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                            <p className="font-title text-[9px] tracking-wide text-emerald-600 dark:text-emerald-400">Inventario</p>
                            <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">I Miei Poteri</h2>
                            {inventoryLoading ? (
                                <SkeletonRows count={2} className="mt-4" />
                            ) : inventory.length === 0 ? (
                                <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 p-4 text-center">
                                    <Zap size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                                    <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">Nessun potere nell'inventario</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {groupedAvailableCards.length > 0 && (
                                        <>
                                            <p className="font-title text-[9px] tracking-wide text-slate-400">Disponibili ({groupedAvailableCards.reduce((sum, g) => sum + g.items.length, 0)})</p>
                                            <div className="space-y-4">
                                                {groupedAvailableCards.map((group) => (
                                                    <div key={`${group.cardType}-${group.gameName ?? 'none'}`}>
                                                        <p className={`font-title text-[9px] tracking-wide mb-2 ${group.cardType === 'master' ? 'text-amber-500' : 'text-cyan-500'}`}>
                                                            {group.cardType === 'master' ? 'Master' : 'Guscio Blu'} · {group.gameName ?? 'Gioco non specificato'} ({group.items.length})
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {group.items.map((item) => (
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
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {inventory.filter((item) => item.is_consumed).length > 0 && (
                                        <details className="mt-2 rounded-2xl border-2 border-slate-200 dark:border-border bg-white/60 dark:bg-card/60 p-3">
                                            <summary className="cursor-pointer font-title text-[9px] tracking-wide text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 select-none">
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

                {/* ── TAB: POSSIEDI ─────────────────────────────── */}
                {profileTab === 'possiedi' && (
                    <div className={`rounded-[2rem] border-2 p-6 ${effectiveCardStyle?.shimmer ? 'gold-card-shimmer' : ''} ${goldBorder} ${goldBg}`} style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <p className="font-title text-[9px] tracking-wide text-emerald-600 dark:text-emerald-400">Possiedi</p>
                        <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Giochi, console e R4</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Indica quali giochi e console possiedi: aiuta a organizzare tornei e serate in base a chi ha cosa.</p>

                        {ownershipLoading ? (
                            <SkeletonRows count={3} className="mt-4" />
                        ) : (
                            <div className="mt-6">
                                <OwnershipForm
                                    ownership={ownership}
                                    games={ownership.games}
                                    consoles={consoles}
                                    onSave={handleSaveOwnership}
                                    saving={ownershipSaving}
                                />
                            </div>
                        )}
                    </div>
                )}

                    </div>
                </div>

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