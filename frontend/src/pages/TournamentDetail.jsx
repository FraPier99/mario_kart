import { useMemo, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Crown, Trophy, Trash2, Shield, Ban, Zap, CheckCircle2, AlertCircle, Settings, Users, Flag, Swords, History, Clock, ChevronDown, LayoutDashboard, BarChart3, ListChecks, RefreshCw } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PortalSelect from '@/components/common/PortalSelect'
import LeaderboardTable from '@/components/stats/LeaderboardTable'
import ModalPlayer from '@/components/ModalPlayer'
import { useCelebration } from '@/context/CelebrationContext'
import RaceList from '@/components/tournaments/RaceList'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import ApiBanner from '@/components/common/ApiBanner'
import RaceCreator from '@/components/tournaments/RaceCreator'
import TournamentParticipantsManager from '@/components/tournaments/TournamentParticipantsManager'
import WithdrawalManager from '@/components/tournaments/WithdrawalManager'
import ResultEntryForm from '@/components/tournaments/ResultEntryForm'
import WinnerFinalizeCard from '@/components/tournaments/WinnerFinalizeCard'
import TournamentStatusManager from '@/components/tournaments/TournamentStatusManager'
import GroupManagementSection from '@/components/tournaments/GroupManagementSection'
import ClassicPodiumDuelCard from '@/components/tournaments/ClassicPodiumDuelCard'
import CollapsibleSection from '@/components/tournaments/CollapsibleSection'
import TournamentResolutionNotes from '@/components/tournaments/TournamentResolutionNotes'
import TournamentInfoPanel from '@/components/tournaments/TournamentInfoPanel'
import GroupPlancia, { GroupCard } from '@/components/tournaments/GroupPlancia'
import PhaseCircuitsCard from '@/components/tournaments/PhaseCircuitsCard'
import OverallClassificaCard from '@/components/tournaments/OverallClassificaCard'
import { findPlayerGroup, groupLabel, isPodiumDuelKey } from '@/lib/groupStage'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { getApiErrorMessage, tournamentsApi, inventoryApi, authApi, schedineApi, cardLog as cardLogUtil } from '@/services/apiClient'
import { toast } from 'sonner'

const getTournamentStatusLabel = (status) => {
    if (status === 'da_svolgere') return 'Da svolgere'
    if (status === 'concluso') return 'Concluso'
    if (status === 'finito') return 'Finito'
    return 'In corso'
}

const getTournamentStatusBadge = (status) => {
    if (status === 'da_svolgere') return 'bg-slate-500 text-white'
    if (status === 'concluso') return 'bg-slate-900 text-white'
    if (status === 'finito') return 'bg-amber-500 text-white'
    return 'bg-emerald-500 text-white'
}

// Esiti spareggi (vista giocatore, read-only) — riusata sia per i tornei
// classic (tab "Classifica", tutti i duelli) sia per quelli a gironi (tab
// "Finale"/"Finalina", solo i duelli del proprio bracket).
const SpareggioEsitiList = ({ duelloGroups, playerMapById, circuitsById, charactersById, expandedDuelGroups, setExpandedDuelGroups }) => {
    if (duelloGroups.length === 0) return null
    return (
        <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">Esiti spareggi</p>
            {duelloGroups.map((group) => {
                const players = group.playerIds.map((id) => playerMapById.get(id)).filter(Boolean)
                const isExpanded = expandedDuelGroups.has(group.groupName)
                const toggle = () => {
                    setExpandedDuelGroups((prev) => {
                        const next = new Set(prev)
                        next.has(group.groupName) ? next.delete(group.groupName) : next.add(group.groupName)
                        return next
                    })
                }
                return (
                    <div key={group.groupName} className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-900/10 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Swords size={16} className="text-amber-500 shrink-0" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">Spareggio</p>
                                <h4 className="text-lg font-black text-slate-900 dark:text-foreground">{group.label}</h4>
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-muted-foreground leading-relaxed">
                                    Le gare di spareggio <strong>non assegnano punti</strong> in classifica.
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-muted-foreground">
                            Pareggio su punti tra{' '}
                            <span className="font-black text-amber-600 dark:text-amber-400">
                                {players.map((p) => p.nickname).join(', ')}
                            </span>.
                        </p>

                        {group.races.length > 0 && (
                            <div className="flex items-center gap-3 text-xs">
                                {players.map((p) => (
                                    <span key={p.id} className="font-black text-slate-700 dark:text-slate-300">
                                        {p.nickname}: {group.wins.get(p.id) ?? 0} vittorie
                                    </span>
                                ))}
                            </div>
                        )}

                        {group.resolved ? (
                            <p className="flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-400">
                                <Trophy size={14} /> {playerMapById.get(group.winnerId)?.nickname ?? '—'} vince lo spareggio
                            </p>
                        ) : (
                            <div className="flex items-center gap-2 rounded-2xl bg-amber-100 dark:bg-amber-500/20 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 w-fit">
                                <Clock size={14} /> In attesa di completamento
                            </div>
                        )}

                        {group.races.length > 0 && (
                            <div className="space-y-2">
                                <button type="button" onClick={toggle}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600 hover:text-amber-500 transition"
                                >
                                    <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    {isExpanded ? 'Nascondi storico' : 'Mostra storico gare spareggio'}
                                </button>
                                {isExpanded && (
                                    <div className="space-y-3 pl-2 border-l-2 border-amber-200 dark:border-amber-500/30">
                                        {group.races.map((race) => {
                                            const circuit = circuitsById?.get(race.circuit_id)
                                            return (
                                                <div key={race.id} className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Gara {race.race_order}</span>
                                                        <span className="rounded-full bg-slate-100 dark:bg-muted px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-muted-foreground">
                                                            {circuit?.name ?? `Circuito #${race.circuit_id}`}
                                                        </span>
                                                    </div>
                                                    {[...(race.results ?? [])].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).map((result) => {
                                                        const character = charactersById?.get(result.character_id)
                                                        const player = playerMapById.get(result.player_id)
                                                        return (
                                                            <div key={result.id} className="flex items-center justify-between text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-slate-700 dark:text-slate-300">#{result.position}</span>
                                                                    <span>{player?.nickname ?? `#${result.player_id}`}</span>
                                                                    {character && <span className="text-slate-400">· {character.name}</span>}
                                                                </div>
                                                                <span className="font-black text-emerald-600 dark:text-emerald-400">{result.points} pt</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })}
                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            {players.map((p) => (
                                                <span key={p.id} className="font-black text-slate-600 dark:text-slate-400">
                                                    {p.nickname}: {[...group.races].reduce((sum, r) => sum + ((r.results?.find((res) => res.player_id === p.id)?.points) ?? 0), 0)} pt totali
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// Overlay di celebrazione fine torneo — estratto in un componente a parte
// così può essere mostrato sia nella vista admin sia in quella giocatore
// (prima era presente solo nel ramo di rendering admin: un giocatore non
// admin non vedeva MAI l'overlay, nemmeno restando sulla pagina in tempo
// reale alla conclusione del torneo).
const TournamentDetail = () => {
    const { tournamentId } = useParams()
    const navigate = useNavigate()
    const { getTournamentById, players, games, refresh, loading, errorMessage, circuitsById, circuitsByGameId, charactersById, charactersByGameId, results, statsByPlayerId } = useAppData()
    const { user, isAdmin, isSuperadmin } = useAuth()
    const { triggerCelebration } = useCelebration()

    const tournament = getTournamentById(tournamentId)

    const tournamentCircuits = circuitsByGameId.get(tournament?.game_id ?? 0) ?? []
    const myPlayerId = user?.player_id ?? user?.player?.id ?? null

    // Per i tornei a gironi, tournament.standings è un aggregato cross-fase
    // (gironi+semifinali+finale insieme) e standings[0] NON è il vincitore
    // reale — il vincitore è il 1° della Finale, riordinato secondo gli
    // eventuali spareggi podio (vedi /group-stage/overall-classifica).
    const [groupStageOrder, setGroupStageOrder] = useState([])
    useEffect(() => {
        if (tournament?.tournament_format !== 'group_stage' || !tournament?.id) return undefined
        let active = true
        tournamentsApi.overallClassifica(tournament.id)
            .then((res) => { if (active) setGroupStageOrder(res.data?.order ?? []) })
            .catch(() => { if (active) setGroupStageOrder([]) })
        return () => { active = false }
    }, [tournament?.id, tournament?.tournament_format, tournament?.races])

    const groupStageStandingsOrdered = useMemo(() => {
        if (!groupStageOrder.length) return null
        const byId = new Map((tournament?.standings ?? []).map((s) => [s.playerId, s]))
        return groupStageOrder.map((pid) => byId.get(pid)).filter(Boolean)
    }, [groupStageOrder, tournament?.standings])

    const currentLeader = tournament?.tournament_format === 'group_stage'
        ? (groupStageStandingsOrdered?.[0] ?? null)
        : (tournament?.standings?.[0] ?? null)

    // Classifica di girone/semifinale già risolta rispetto agli eventuali
    // spareggi di qualificazione — vedi stesso fetch in GroupPlancia.jsx.
    // Serve alla vista giocatore per mostrare la classifica del proprio
    // girone aggiornata anche dopo che uno spareggio si è risolto.
    const [resolvedClassifiche, setResolvedClassifiche] = useState({ group: {}, semifinal: {} })
    useEffect(() => {
        if (tournament?.tournament_format !== 'group_stage' || !tournament?.id) return undefined
        let active = true
        tournamentsApi.groupStageClassifiche(tournament.id)
            .then((res) => { if (active) setResolvedClassifiche(res.data ?? { group: {}, semifinal: {} }) })
            .catch(() => { if (active) setResolvedClassifiche({ group: {}, semifinal: {} }) })
        return () => { active = false }
    }, [tournament?.id, tournament?.tournament_format, tournament?.races, tournament?.format_data])

    // Circuiti disponibili/utilizzati per la vista giocatore: in modalità a
    // gironi mostra solo il proprio girone, in modalità classic l'intero torneo.
    const myCircuitsView = useMemo(() => {
        if (!tournament) return null
        if (tournament.tournament_format === 'group_stage') {
            const myGroup = findPlayerGroup(tournament.format_data, myPlayerId)
            if (!myGroup) return null
            return {
                title: `Circuiti · ${groupLabel(myGroup.groupName)}`,
                races: (tournament.races ?? []).filter((r) => r.phase === myGroup.phase && r.group_name === myGroup.groupName),
            }
        }
        return {
            title: 'Circuiti',
            races: (tournament.races ?? []).filter((r) => !r.is_duello),
        }
    }, [tournament, myPlayerId])

    const playerMapById = useMemo(
        () => new Map((players ?? []).map((p) => [p.id, p])),
        [players]
    )

    // Raggruppa le gare duello per group_name (es. duello_podio_1_2)
    const duelloGroups = useMemo(() => {
        const races = tournament?.races ?? []
        const duelloRaces = races.filter((r) => r.is_duello)
        if (!duelloRaces.length) return []
        const groups = new Map()
        duelloRaces.forEach((race) => {
            const key = race.group_name || 'unknown'
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push(race)
        })
        return Array.from(groups.entries()).map(([groupName, groupRaces]) => {
            const sortedRaces = [...groupRaces].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))
            const playerIds = [...new Set(sortedRaces.flatMap((r) => (r.results ?? []).map((res) => res.player_id)))]
            const wins = new Map()
            playerIds.forEach((id) => wins.set(id, 0))
            sortedRaces.forEach((race) => {
                const winnerResult = race.results?.find((r) => r.position === 1)
                if (winnerResult && wins.has(winnerResult.player_id)) {
                    wins.set(winnerResult.player_id, (wins.get(winnerResult.player_id) ?? 0) + 1)
                }
            })
            // I duelli podio (1°/2°, 3°/4°, posizioni più basse) si risolvono al
            // meglio (primo a 3 vittorie); gli spareggi di qualificazione gironi/
            // semifinali (group_name = chiave del girone/batteria, non "duello_podio_*")
            // si risolvono al primo a 2 vittorie — usare sempre 3 qui marcava questi
            // ultimi come "in attesa" anche quando erano già stati risolti.
            const winThreshold = isPodiumDuelKey(groupName) ? 3 : 2
            let winnerId = null
            for (const [id, count] of wins) {
                if (count >= winThreshold) { winnerId = id; break }
            }
            const label = groupLabel(groupName)
            return { groupName, label, races: sortedRaces, playerIds, wins, winnerId, resolved: winnerId != null }
        }).sort((a, b) => {
            const order = ['duello_podio_1_2', 'duello_podio_3_4']
            const ai = order.indexOf(a.groupName)
            const bi = order.indexOf(b.groupName)
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
    }, [tournament?.races])

    // Classifica per la vista giocatore: nei tornei a gironi mostra solo il
    // girone/fase in cui si trova attualmente il giocatore, non la classifica
    // globale. Nei tornei classic resta la classifica generale (tournament.standings).
    const myStandingsView = useMemo(() => {
        if (!tournament || tournament.tournament_format !== 'group_stage') return null
        const myGroup = findPlayerGroup(tournament.format_data, myPlayerId)
        if (!myGroup) return null
        const { phase, groupName } = myGroup
        const fd = tournament.format_data ?? {}
        const seedPlayerIds = phase === 'group'
            ? (fd.groups?.[groupName] ?? [])
            : phase === 'semifinal'
                ? (fd.semifinals?.[groupName] ?? [])
                : (fd.finals?.[groupName] ?? [])
        return {
            groupKey: groupName,
            races: (tournament.races ?? []).filter((r) => r.phase === phase && r.group_name === groupName && !r.is_duello),
            seedPlayerIds,
        }
    }, [tournament, myPlayerId])

    const tournamentParticipants = useMemo(() => {
        if (!tournament?.participant_ids?.length) return []
        return players.filter((p) => tournament.participant_ids.includes(p.id))
    }, [tournament, players])

    // Esclude i giocatori "Ritirati" dal pool selezionabile per le gare successive:
    // i loro risultati già registrati restano comunque validi in classifica.
    const activeTournamentParticipants = useMemo(() => {
        const withdrawnIds = new Set(tournament?.withdrawn_player_ids ?? [])
        return tournamentParticipants.filter((p) => !withdrawnIds.has(p.id))
    }, [tournamentParticipants, tournament?.withdrawn_player_ids])
    const tournamentStatus = tournament?.status ?? (tournament?.winner_id ? 'concluso' : 'in_corso')
    const isTournamentLocked = tournamentStatus !== 'in_corso'

    // Un Admin che è anche partecipante al torneo vede di default la vista
    // giocatore (schedina/classifica/proprio girone) e può passare alla vista
    // gestionale con il toggle "Modalità Admin". Il SuperAdmin non partecipa
    // mai e vede sempre e solo la vista gestionale, senza toggle.
    const isParticipantAdmin = isAdmin && !isSuperadmin && myPlayerId != null && (tournament?.participant_ids ?? []).includes(myPlayerId)

    // adminModeOn può essere attivato da navigation state (es. da Schedina)
    const location = useLocation()
    const [adminModeOn, setAdminModeOn] = useState(location.state?.adminMode === true)

    const [confirmDeleteTournament, setConfirmDeleteTournament] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [activeSection, setActiveSection] = useState('management')
    const [participantsStatus, setParticipantsStatus] = useState([])
    const [userHasPredicted, setUserHasPredicted] = useState(null)
    const [userTab, setUserTab] = useState('riepilogo')
    const [expandedDuelGroups, setExpandedDuelGroups] = useState(new Set())
    const [algoTab, setAlgoTab] = useState('overview')
    const [statsTab, setStatsTab] = useState('podium')
    const [selectedPlayer, setSelectedPlayer] = useState(null)
    // ── Carte Potere ─────────────────────────────────────────────────────────
    const [inventory, setInventory] = useState([])
    const [localCardLog, setLocalCardLog] = useState([])
    const [showCardModal, setShowCardModal] = useState(false)
    const [selectedCard, setSelectedCard] = useState(null)
    const [cardEffectOption, setCardEffectOption] = useState('')
    const [cardEffectCustom, setCardEffectCustom] = useState('')
    const [cardTargetId, setCardTargetId] = useState('')
    const [cardEffectOwner, setCardEffectOwner] = useState('')
    const [cardRaceId, setCardRaceId] = useState('')
    const [usingCard, setUsingCard] = useState(false)
    const [availableCards, setAvailableCards] = useState({ master: 0, blue_shell: 0 })
    const [cardHolders, setCardHolders] = useState([])
    const [cardHistory, setCardHistory] = useState([])
    const [superadminPlayerIds, setSuperadminPlayerIds] = useState([])

    // Carica superadmin player IDs per escluderli dalla lista partecipanti
    useEffect(() => {
        if (!isAdmin && !isSuperadmin) return
        authApi.listUsers().then((res) => {
            const superadminIds = (res.data ?? [])
                .filter((u) => u.role === 'superadmin' && u.player_id != null)
                .map((u) => u.player_id)
            setSuperadminPlayerIds(superadminIds)
        }).catch(() => {})
    }, [isAdmin, isSuperadmin])

    // Carica inventario, carte disponibili, holders e log al mount
    useEffect(() => {
        inventoryApi.me().then((res) => setInventory(res.data ?? [])).catch(() => {})
        if (tournamentId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocalCardLog(cardLogUtil.get(tournamentId))
            inventoryApi.tournamentAvailable(tournamentId).then((res) => {
                setAvailableCards(res.data ?? { master: 0, blue_shell: 0 })
            }).catch(() => {})
            inventoryApi.tournamentHolders(tournamentId).then((res) => {
                setCardHolders(res.data ?? [])
            }).catch(() => {})
            inventoryApi.tournamentHistory(tournamentId).then((res) => {
                setCardHistory(res.data ?? [])
            }).catch(() => {})
        }
    }, [tournamentId])

    useEffect(() => {
        if (!isAdmin || !tournamentId || activeSection !== 'schedina') return
        schedineApi.participantsStatus(tournamentId)
            .then((res) => setParticipantsStatus(res.data ?? []))
            .catch(() => setParticipantsStatus([]))
    }, [isAdmin, tournamentId, activeSection])

    useEffect(() => {
        if (!tournamentId) return
        schedineApi.tournamentDetail(tournamentId)
            .then((res) => setUserHasPredicted(res.data?.user_has_predicted ?? false))
            .catch(() => setUserHasPredicted(false))
    }, [tournamentId])

    // Torneo live (gironi/semifinali/finale possono avanzare di fase senza che
    // chi sta guardando la pagina lo sappia, es. l'admin compone la Finale da
    // un altro browser): senza un refresh periodico, format_data/races
    // restano fermi allo stato caricato all'apertura della pagina finché non
    // si ricarica manualmente. Aggiorna in background ogni 20s e quando la
    // tab torna in foreground, solo mentre il torneo è effettivamente in corso.
    useEffect(() => {
        if (tournamentStatus !== 'in_corso' && tournamentStatus !== 'concluso') return undefined
        const interval = setInterval(() => { refresh() }, 20000)
        const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [tournamentStatus, refresh])

    const MASTER_EFFECTS = [
        { value: 'annulla_ritiro', label: 'Annulla ritiro' },
        { value: 'annulla_ammonizione', label: 'Annulla ammonizione' },
        { value: 'proteggi_posizione', label: 'Proteggi posizione in classifica' },
        { value: 'ripristina_risultato', label: 'Ripristina risultato gara' },
        { value: 'custom', label: 'Effetto personalizzato…' },
    ]
    const SHELL_EFFECTS = [
        { value: 'penalizzazione_pos', label: 'Penalizzazione −1 posizione' },
        { value: 'penalizzazione_partenza', label: 'Penalizzazione partenza arretrata' },
        { value: 'giro_extra', label: 'Giro extra di penalità' },
        { value: 'custom', label: 'Effetto personalizzato…' },
    ]

    const openCardModal = (cardType) => {
        if (tournamentStatus !== 'in_corso') {
            toast.error('Le carte si possono usare solo quando il torneo è IN CORSO')
            return
        }
        setSelectedCard({ card_type: cardType, card_name: cardType === 'master' ? 'Carta Master' : 'Guscio Blu' })
        setCardEffectOption('')
        setCardEffectCustom('')
        setCardTargetId('')
        setCardEffectOwner('')
        setCardRaceId('')
        setShowCardModal(true)
    }

    // Players who own the currently selected card type
    const cardTypeHolders = selectedCard
        ? cardHolders.filter((h) =>
              selectedCard.card_type === 'master' ? h.master_count > 0 : h.blue_shell_count > 0
          )
        : []

    const handleUseCard = async () => {
        if (!selectedCard) return
        const isMaster = selectedCard.card_type === 'master'
        const effectLabel = cardEffectOption === 'custom'
            ? cardEffectCustom.trim()
            : (isMaster ? MASTER_EFFECTS : SHELL_EFFECTS).find((e) => e.value === cardEffectOption)?.label ?? cardEffectOption
        if (!effectLabel) { toast.error('Specifica l\'effetto della carta'); return }
        if (!cardEffectOwner) { toast.error('Seleziona il portatore della carta'); return }

        const targetPlayer = tournamentParticipants.find((p) => String(p.id) === String(cardTargetId))
        const targetNickname = targetPlayer?.nickname ?? null
        const ownerPlayer = tournamentParticipants.find((p) => String(p.id) === String(cardEffectOwner))
        const ownerNickname = ownerPlayer?.nickname ?? `#${cardEffectOwner}`

        const ownerGroup = tournament.tournament_format === 'group_stage'
            ? findPlayerGroup(tournament.format_data, Number(cardEffectOwner))
            : null

        setUsingCard(true)
        try {
            const logEntry = {
                card_type: selectedCard.card_type,
                card_name: selectedCard.card_name,
                effect: effectLabel,
                target_nickname: targetNickname,
                used_by_nickname: ownerNickname,
                registered_by: user?.player?.nickname ?? user?.username ?? 'Admin',
                race_id: cardRaceId ? Number(cardRaceId) : null,
                group_name: ownerGroup?.groupName ?? null,
                phase: ownerGroup?.phase ?? null,
            }
            cardLogUtil.add(tournamentId, logEntry)
            setLocalCardLog(cardLogUtil.get(tournamentId))

            await inventoryApi.adminUse({
                player_id: Number(cardEffectOwner),
                card_type: selectedCard.card_type,
                effect: effectLabel,
                race_id: cardRaceId ? Number(cardRaceId) : null,
                phase: ownerGroup?.phase ?? null,
                group_name: ownerGroup?.groupName ?? null,
            })

            const fresh = await inventoryApi.tournamentAvailable(tournamentId)
            setAvailableCards(fresh.data ?? { master: 0, blue_shell: 0 })

            const history = await inventoryApi.tournamentHistory(tournamentId)
            setCardHistory(history.data ?? [])

            toast.success(`${selectedCard.card_name} consumata!`, {
                description: `${ownerNickname} → "${effectLabel}"${targetNickname ? ` contro ${targetNickname}` : ''}`,
            })
            setShowCardModal(false)
            setSelectedCard(null)
            setCardEffectOwner('')
            setCardRaceId('')
        } catch (err) {
            toast.error('Impossibile registrare l\'uso', { description: getApiErrorMessage(err) })
        } finally {
            setUsingCard(false)
        }
    }


    const handlePlayerClick = (row) => {
        const player = tournamentParticipants.find((p) => p.id === row.playerId) ?? players.find((p) => p.id === row.playerId)
        if (player) setSelectedPlayer(player)
    }



    const handleFinalized = useCallback(async () => {
        const standingsSnap = groupStageStandingsOrdered ?? tournament?.standings ?? []
        await refresh()
        const leader = standingsSnap[0] ?? currentLeader
        if (leader) {
            triggerCelebration(leader, standingsSnap, tournament)
        }
    }, [refresh, currentLeader, triggerCelebration, tournament, groupStageStandingsOrdered])

    const handleReplayCelebration = useCallback(() => {
        const standingsSnap = groupStageStandingsOrdered ?? tournament?.standings ?? []
        const winner = tournament?.winner ?? standingsSnap[0] ?? currentLeader
        if (winner) {
            triggerCelebration(winner, standingsSnap, tournament)
        }
    }, [currentLeader, tournament, triggerCelebration, groupStageStandingsOrdered])



    const handleDeleteTournament = async () => {
        setConfirmDeleteTournament(false)
        setDeleting(true)
        try {
            await tournamentsApi.remove(tournament.id)
            toast.success('Torneo eliminato')
            await refresh()
            navigate('/history')
        } catch (error) {
            const message = getApiErrorMessage(error, 'Eliminazione torneo fallita')
            toast.error('Impossibile eliminare il torneo', { description: message })
        } finally {
            setDeleting(false)
        }
    }

    const leaderboardAnalytics = useMemo(() => {
        const standings = tournament?.standings ?? []
        const sortedRaces = [...(tournament?.races ?? [])].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))

        const computeTournamentScores = (playersCount) => {
            const staticMap = {
                4: [5, 3, 2, 1],
                5: [6, 4, 3, 2, 1],
                6: [7, 5, 4, 3, 2, 1],
                7: [8, 6, 5, 4, 3, 2, 1],
                8: [9, 7, 6, 5, 4, 3, 2, 1],
            }

            const n = Number(playersCount) || 0
            if (staticMap[n]) return staticMap[n]
            if (n < 4) return Array.from({ length: n }, (_, index) => n + 1 - index)
            const first = n + 1
            const rest = Array.from({ length: Math.max(n - 1, 0) }, (_, index) => n - 1 - index)
            return [first, ...rest]
        }

        const scoreTable = computeTournamentScores(tournament?.n_players ?? standings.length)
        const maxPointsPerRace = scoreTable[0] ?? 0

        if (!standings.length) {
            return {
                remainingRaces: 0,
                maxPointsPerRace,
                pointsToSecure: 0,
                lockStatus: 'ok',
                requiredLead: 0,
                currentLead: 0,
                hottestPlayer: null,
                mostConsistent: null,
                predictions: [],
                momentumRanking: [],
                consistencyRanking: [],
                streakRows: [],
                podiumRates: [],
                headToHead: null,
                bestWorst: [],
                scoreTable: [],
                tieBreakRules: [],
            }
        }

        const getCurrentStreak = (playerId, predicate) => {
            let streak = 0
            for (let index = sortedRaces.length - 1; index >= 0; index -= 1) {
                const race = sortedRaces[index]
                const playerResult = race.results?.find((result) => result.player_id === playerId)
                if (!playerResult) break
                if (predicate(playerResult)) streak += 1
                else break
            }
            return streak
        }

        const streakRows = standings.map((row) => {
            const winStreak = getCurrentStreak(row.playerId, (result) => (result.position ?? 0) === 1)
            const podiumStreak = getCurrentStreak(row.playerId, (result) => (result.position ?? 99) <= 3)

            const resultsByPlayer = sortedRaces
                .map((race) => race.results?.find((result) => result.player_id === row.playerId) ?? null)
                .filter(Boolean)

            const recent = resultsByPlayer.slice(-3)
            const recentAvgPoints = recent.length
                ? recent.reduce((sum, result) => sum + (result.points ?? 0), 0) / recent.length
                : 0

            const seasonAvgPoints = resultsByPlayer.length
                ? resultsByPlayer.reduce((sum, result) => sum + (result.points ?? 0), 0) / resultsByPlayer.length
                : 0

            const avgPosition = resultsByPlayer.length
                ? resultsByPlayer.reduce((sum, result) => sum + (result.position ?? 0), 0) / resultsByPlayer.length
                : 99

            const positionVariance = resultsByPlayer.length
                ? resultsByPlayer.reduce((sum, result) => {
                    const delta = (result.position ?? 0) - avgPosition
                    return sum + delta * delta
                }, 0) / resultsByPlayer.length
                : 0

            const positionStdDev = Math.sqrt(positionVariance)

            const consistency = avgPosition > 0 ? Number((1 / avgPosition).toFixed(3)) : 0

            return {
                playerId: row.playerId,
                nickname: row.nickname,
                winStreak,
                podiumStreak,
                recentAvgPoints,
                seasonAvgPoints,
                formDelta: Number((recentAvgPoints - seasonAvgPoints).toFixed(2)),
                avgPosition,
                positionStdDev,
                consistency,
                racesPlayed: resultsByPlayer.length,
            }
        })

        const remainingRaces = Math.max((tournament?.n_races ?? 0) - (tournament?.raceCount ?? 0), 0)

        const predictionBase = standings.map((row) => {
            const playerStreak = streakRows.find((entry) => entry.playerId === row.playerId)
            const momentum = playerStreak?.podiumStreak ?? 0
            const formBoost = (playerStreak?.recentAvgPoints ?? 0) * 2
            const consistencyBoost = (playerStreak?.consistency ?? 0) * 20
            const score = Math.max(1, (row.points ?? 0) + (row.raceWins ?? 0) * 8 + (row.podiums ?? 0) * 3 + momentum * 4 + formBoost + consistencyBoost)
            return {
                playerId: row.playerId,
                nickname: row.nickname,
                score,
            }
        })

        const scoreSum = predictionBase.reduce((sum, row) => sum + row.score, 0)
        const predictions = predictionBase
            .map((row) => ({
                ...row,
                probability: Number(((row.score / scoreSum) * 100).toFixed(1)),
            }))
            .sort((left, right) => right.probability - left.probability)
            .slice(0, 4)

        const leader = standings[0]
        const second = standings[1]
        const currentLead = second ? Math.max((leader.points ?? 0) - (second.points ?? 0), 0) : 0
        const requiredLead = remainingRaces * maxPointsPerRace + 1
        const pointsToSecure = Math.max(requiredLead - currentLead, 0)
        const maxAdditionalLeaderPoints = remainingRaces * maxPointsPerRace
        const lockStatus = pointsToSecure > maxAdditionalLeaderPoints ? 'unreachable' : 'ok'

        const hottestPlayer = streakRows
            .slice()
            .sort((left, right) => right.recentAvgPoints - left.recentAvgPoints || right.podiumStreak - left.podiumStreak || right.winStreak - left.winStreak)[0] ?? null

        const mostConsistent = streakRows
            .slice()
            .sort((left, right) => right.consistency - left.consistency)[0] ?? null

        const momentumRanking = streakRows
            .slice()
            .sort((left, right) => right.formDelta - left.formDelta || right.recentAvgPoints - left.recentAvgPoints || right.podiumStreak - left.podiumStreak)
            .slice(0, 5)

        const consistencyRanking = streakRows
            .slice()
            .sort((left, right) => right.consistency - left.consistency || left.positionStdDev - right.positionStdDev)
            .slice(0, 5)

        const podiumRates = streakRows.map((row) => ({
            playerId: row.playerId,
            nickname: row.nickname,
            podiumRate: row.racesPlayed > 0 ? Number(((standings.find((s) => s.playerId === row.playerId)?.podiums ?? 0) / row.racesPlayed * 100).toFixed(0)) : 0,
            winRate: row.racesPlayed > 0 ? Number(((standings.find((s) => s.playerId === row.playerId)?.raceWins ?? 0) / row.racesPlayed * 100).toFixed(0)) : 0,
            racesPlayed: row.racesPlayed,
            avgPos: row.avgPosition,
        })).sort((a, b) => b.podiumRate - a.podiumRate)

        const headToHead = (() => {
            if (standings.length < 2) return null
            const top2 = standings.slice(0, 2)
            let wins1 = 0, wins2 = 0, ties = 0
            sortedRaces.forEach((race) => {
                const r1 = race.results?.find((r) => r.player_id === top2[0].playerId)
                const r2 = race.results?.find((r) => r.player_id === top2[1].playerId)
                if (!r1 || !r2) return
                if (r1.position < r2.position) wins1++
                else if (r2.position < r1.position) wins2++
                else ties++
            })
            return { p1: top2[0].nickname, p2: top2[1].nickname, wins1, wins2, ties }
        })()

        const bestWorst = streakRows.map((row) => {
            const results = sortedRaces
                .map((race) => race.results?.find((r) => r.player_id === row.playerId))
                .filter(Boolean)
            return {
                playerId: row.playerId,
                nickname: row.nickname,
                best: results.length ? Math.min(...results.map((r) => r.position ?? 99)) : null,
                worst: results.length ? Math.max(...results.map((r) => r.position ?? 0)) : null,
                avgPos: row.avgPosition,
            }
        }).sort((a, b) => (a.avgPos || 99) - (b.avgPos || 99))

        const tieBreakRules = [
            'Punti totali',
            'Vittorie di gara',
            'Podi',
            'Scontro diretto tra pari punti se disponibile',
        ]

        return {
            remainingRaces,
            maxPointsPerRace,
            pointsToSecure,
            lockStatus,
            requiredLead,
            currentLead,
            hottestPlayer,
            mostConsistent,
            predictions,
            momentumRanking,
            consistencyRanking,
            streakRows,
            podiumRates,
            headToHead,
            bestWorst,
            scoreTable,
            tieBreakRules,
            topTieOnPoints: standings.length > 1 && (standings[0].points ?? 0) === (standings[1].points ?? 0),
        }
    }, [tournament])

    if (loading && !tournament) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-7xl px-4 py-12 text-center text-slate-500 dark:text-muted-foreground">Caricamento torneo...</div>
            </AppLayout>
        )
    }

    if (!tournament) {
        return (
            <AppLayout>
                <div className="mx-auto max-w-7xl px-4 py-12 text-center">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-foreground">Torneo non trovato</h1>
                    <button
                        type="button"
                        onClick={() => navigate('/history')}
                        className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white"
                    >
                        Torna allo storico
                    </button>
                </div>
            </AppLayout>
        )
    }

    // ── READ-ONLY VIEW (regular users) ──────────────────────────────────────
    if ((!isAdmin && !isSuperadmin) || (isParticipantAdmin && !adminModeOn)) {
        const raceProgress = tournament.n_races > 0
            ? Math.round(((tournament.raceCount ?? 0) / tournament.n_races) * 100)
            : 0

        const hasCardHistory = cardHistory.length > 0 || localCardLog.length > 0

        const myGroup = findPlayerGroup(tournament.format_data, myPlayerId)
        const isTournamentFinished = Boolean(tournament.winner_id)
        const filteredCardHistory = isTournamentFinished || !myGroup
            ? cardHistory
            : cardHistory.filter((e) => e.group_name === myGroup.groupName)
        const filteredCardLog = isTournamentFinished || !myGroup
            ? localCardLog
            : localCardLog.filter((e) => e.group_name === myGroup.groupName)

        const isGroupStageView = tournament.tournament_format === 'group_stage'
        // Nei tornei a gironi le vecchie tab "Classifica"/"Gare" (tutto
        // mischiato) sono sostituite da una tab dedicata alla fase in cui si
        // trova il giocatore (Girone/Semifinale, poi Finale/Consolazione) e
        // da una classifica generale combinata — niente più da scorrere
        // tutto insieme per trovare la propria posizione.
        const myPhaseTabKey = myGroup?.phase === 'finals' ? 'finale' : 'fase'
        const USER_TABS = isGroupStageView
            ? [
                { key: 'riepilogo', label: 'Riepilogo', icon: LayoutDashboard },
                ...(myGroup ? [{ key: myPhaseTabKey, label: groupLabel(myGroup.groupName), icon: myGroup.phase === 'finals' ? Trophy : Users }] : []),
                { key: 'generale', label: 'Classifica Generale', icon: BarChart3 },
                ...(hasCardHistory ? [{ key: 'carte', label: 'Carte', icon: Zap }] : []),
            ]
            : [
                { key: 'riepilogo', label: 'Riepilogo', icon: LayoutDashboard },
                { key: 'classifica', label: 'Classifica', icon: BarChart3 },
                { key: 'gare', label: 'Gare', icon: ListChecks },
                ...(hasCardHistory ? [{ key: 'carte', label: 'Carte', icon: Zap }] : []),
            ]

        return (
            <AppLayout>
                <section className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-fade-in">
                    {/* Header */}
                    <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-400">Torneo #{tournament.id}</p>
                                <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">{tournament.name}</h1>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-muted-foreground">
                                    <span>{tournament.date}</span>
                                    <span>·</span>
                                    <span>{tournament.raceCount}/{tournament.n_races} gare</span>
                                    {tournament.winner && (
                                        <><span>·</span><span className="font-black text-amber-600 dark:text-amber-400">🏆 {tournament.winner.nickname}</span></>
                                    )}
                                </div>
                                {/* Progress bar gare */}
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="h-2 w-32 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-emerald-400 dark:bg-emerald-500 transition-all duration-500"
                                            style={{ width: `${Math.min(raceProgress, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400">{raceProgress}%</span>
                                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${getTournamentStatusBadge(tournamentStatus)}`}>
                                        {getTournamentStatusLabel(tournamentStatus)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button type="button" onClick={() => navigate('/history')}
                                    className="rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground transition hover:border-slate-300 dark:hover:border-slate-500">
                                    ← Storico
                                </button>
                                <button type="button" onClick={() => navigate(`/tournaments/${tournamentId}/stats`)}
                                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:bg-emerald-500">
                                    Stats
                                </button>
                                <button type="button" onClick={() => navigate(`/schedina/${tournamentId}`, { state: { fromAdmin: adminModeOn } })}
                                    className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-100">
                                    Schedina
                                </button>
                                {userHasPredicted !== null && (
                                    <span className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-wider ${userHasPredicted ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'}`}>
                                        {userHasPredicted ? '✓ Hai compilato la schedina — esito a fine torneo' : '○ Non hai compilato la schedina'}
                                    </span>
                                )}
                                {isParticipantAdmin && (
                                    <button type="button" onClick={() => setAdminModeOn(true)}
                                        className="flex items-center gap-1.5 rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-violet-700 dark:text-violet-300 transition hover:bg-violet-100">
                                        <Settings size={13} /> Modalità Admin
                                    </button>
                                )}
                            </div>
                        </div>

                        {tournamentParticipants.length > 0 && (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Partecipanti</span>
                                <div className="flex -space-x-2">
                                    {tournamentParticipants.slice(0, 8).map((p) => (
                                        <div key={p.id} title={p.nickname} className="h-7 w-7 overflow-hidden rounded-full border-2 border-white dark:border-card bg-slate-100 dark:bg-slate-800 shadow-sm">
                                            {p.img_url ? <img src={p.img_url} alt={p.nickname} className="h-full w-full object-cover" />
                                                : <div className="flex h-full w-full items-center justify-center text-[9px] font-black text-slate-500">{(p.nickname ?? '?').charAt(0).toUpperCase()}</div>}
                                        </div>
                                    ))}
                                </div>
                                {tournamentParticipants.length > 8 && <span className="text-xs text-slate-400">+{tournamentParticipants.length - 8}</span>}
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 rounded-2xl bg-slate-100 dark:bg-muted p-1">
                        {USER_TABS.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setUserTab(key)}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all flex-1 justify-center ${
                                    userTab === key
                                        ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-sm'
                                        : 'text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground'
                                }`}
                            >
                                <Icon size={14} />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* ── TAB: Riepilogo ── */}
                    {userTab === 'riepilogo' && (
                        <div className="space-y-6">
                            <TournamentInfoPanel tournament={tournament} isAdmin={isAdmin} isSuperadmin={isSuperadmin} />

                            {tournamentStatus === 'in_corso' && (
                                <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-5 flex items-center gap-3 shadow-sm">
                                    <Clock size={20} className="shrink-0 text-amber-500 dark:text-amber-400" />
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Torneo in corso</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400">I risultati completi saranno visibili a torneo concluso.</p>
                                    </div>
                                </div>
                            )}

                            {/* Circuiti — solo classic: nei gironi sono nella tab della fase, non nel Riepilogo */}
                            {!isGroupStageView && myCircuitsView && (
                                <PhaseCircuitsCard circuits={tournamentCircuits} races={myCircuitsView.races} title={myCircuitsView.title} />
                            )}

                            {/* Se non ci sono classifiche/gare, mostra lo stesso placeholder */}
                            {!myStandingsView && (tournament.standings?.length ?? 0) === 0 && (tournament.races?.length ?? 0) === 0 && (
                                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center shadow-sm">
                                    <p className="text-sm text-slate-500 dark:text-muted-foreground">Nessuna gara ancora disponibile per questo torneo.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: Classifica ── */}
                    {userTab === 'classifica' && (
                        <div className="space-y-6">
                            {tournamentStatus === 'in_corso' && (
                                <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-5 flex items-center gap-3 shadow-sm">
                                    <Clock size={20} className="shrink-0 text-amber-500 dark:text-amber-400" />
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Torneo in corso</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400">La classifica è provvisoria fino al termine del torneo.</p>
                                    </div>
                                </div>
                            )}

                            {(tournament.standings?.length ?? 0) > 0 && (
                                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm">
                                    <div className="px-5 py-4 border-b border-slate-100 dark:border-border flex items-center justify-between">
                                        <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Classifica</p>
                                        <button
                                            onClick={refresh}
                                            disabled={loading}
                                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                                        >
                                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                            Aggiorna
                                        </button>
                                    </div>
                                    <LeaderboardTable
                                        rows={tournament.standings}
                                        showTournamentWins={false}
                                        charactersById={charactersById}
                                        highlightPlayerId={user?.player?.id ?? null}
                                        isSuperadmin={false}
                                        onPlayerClick={handlePlayerClick}
                                    />
                                </div>
                            )}

                            <TournamentResolutionNotes tournament={tournament} />

                            <SpareggioEsitiList
                                duelloGroups={duelloGroups}
                                playerMapById={playerMapById}
                                circuitsById={circuitsById}
                                charactersById={charactersById}
                                expandedDuelGroups={expandedDuelGroups}
                                setExpandedDuelGroups={setExpandedDuelGroups}
                            />
                        </div>
                    )}

                    {/* ── TAB: Fase corrente (Girone/Semifinale) — solo gironi ── */}
                    {userTab === 'fase' && myGroup && myGroup.phase !== 'finals' && (
                        <div className="space-y-6">
                            <GroupCard
                                groupKey={myGroup.groupName}
                                races={(tournament.races ?? []).filter((r) => r.phase === myGroup.phase && r.group_name === myGroup.groupName && !r.is_duello)}
                                results={results}
                                playerMap={playerMapById}
                                seedPlayerIds={(myGroup.phase === 'group' ? tournament.format_data?.groups?.[myGroup.groupName] : tournament.format_data?.semifinals?.[myGroup.groupName]) ?? []}
                                highlightPlayerId={myPlayerId}
                                resolvedOrder={(myGroup.phase === 'group' ? resolvedClassifiche.group?.[myGroup.groupName] : resolvedClassifiche.semifinal?.[myGroup.groupName])}
                            />
                            <TournamentResolutionNotes tournament={tournament} phaseFilter={myGroup.phase} />
                            {myCircuitsView && (
                                <PhaseCircuitsCard circuits={tournamentCircuits} races={myCircuitsView.races} title={myCircuitsView.title} />
                            )}
                        </div>
                    )}

                    {/* ── TAB: Finale/Consolazione — solo gironi, una volta composta la Finale ── */}
                    {userTab === 'finale' && myGroup && myGroup.phase === 'finals' && (() => {
                        const bracketRaces = (tournament.races ?? []).filter((r) => r.phase === 'finals' && r.group_name === myGroup.groupName && !r.is_duello)
                        const bracketDuelloGroups = duelloGroups.filter((g) => (
                            myGroup.groupName === 'top'
                                ? g.groupName.startsWith('finals_duello_podio_')
                                : g.groupName.startsWith('finals_duello_consolazione_')
                        ))
                        return (
                            <div className="space-y-6">
                                {bracketRaces.length > 0 ? (
                                    <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm">
                                        <div className="px-5 py-4 border-b border-slate-100 dark:border-border">
                                            <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Gare e risultati</p>
                                        </div>
                                        <div className="p-4">
                                            <RaceList races={bracketRaces} circuitsById={circuitsById} charactersById={charactersById} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center shadow-sm">
                                        <p className="text-sm text-slate-500 dark:text-muted-foreground">Nessuna gara ancora disputata.</p>
                                    </div>
                                )}
                                <GroupCard
                                    groupKey={myGroup.groupName}
                                    races={bracketRaces}
                                    results={results}
                                    playerMap={playerMapById}
                                    seedPlayerIds={tournament.format_data?.finals?.[myGroup.groupName] ?? []}
                                    highlightPlayerId={myPlayerId}
                                />
                                {myCircuitsView && (
                                    <PhaseCircuitsCard circuits={tournamentCircuits} races={myCircuitsView.races} title={myCircuitsView.title} />
                                )}
                                <SpareggioEsitiList
                                    duelloGroups={bracketDuelloGroups}
                                    playerMapById={playerMapById}
                                    circuitsById={circuitsById}
                                    charactersById={charactersById}
                                    expandedDuelGroups={expandedDuelGroups}
                                    setExpandedDuelGroups={setExpandedDuelGroups}
                                />
                            </div>
                        )
                    })()}

                    {/* ── TAB: Classifica Generale — solo gironi, combina Finale + Consolazione ── */}
                    {userTab === 'generale' && (
                        <div className="space-y-6">
                            <OverallClassificaCard tournament={tournament} playerMap={playerMapById} highlightPlayerId={myPlayerId} />
                        </div>
                    )}

                    {/* ── TAB: Gare ── */}
                    {userTab === 'gare' && (
                        <div className="space-y-6">
                            {(tournament.races?.length ?? 0) === 0 && (
                                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-8 text-center shadow-sm">
                                    <p className="text-sm text-slate-500 dark:text-muted-foreground">Nessuna gara ancora disputata.</p>
                                </div>
                            )}

                            {(tournament.races?.length ?? 0) > 0 && (
                                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card overflow-hidden shadow-sm">
                                    <div className="px-5 py-4 border-b border-slate-100 dark:border-border">
                                        <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Gare e risultati</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{tournament.raceCount}/{tournament.n_races} gare giocate</p>
                                    </div>
                                    <div className="p-4">
                                        <RaceList races={tournament.races} circuitsById={circuitsById} charactersById={charactersById} />
                                    </div>
                                </div>
                            )}

                            {myCircuitsView && (
                                <PhaseCircuitsCard circuits={tournamentCircuits} races={myCircuitsView.races} title={myCircuitsView.title} />
                            )}
                        </div>
                    )}

                    {/* ── TAB: Carte ── */}
                    {userTab === 'carte' && (
                        <div className="space-y-6">
                            {!isTournamentFinished && myGroup && (
                                <div className="rounded-3xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/5 p-5 flex items-center gap-3 shadow-sm">
                                    <Zap size={20} className="shrink-0 text-sky-500 dark:text-sky-400" />
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">Carte nella tua fase</p>
                                        <p className="text-xs text-sky-600 dark:text-sky-400">
                                            Mostrate solo le carte usate in {groupLabel(myGroup.groupName)}. A torneo concluso vedrai lo storico completo.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Registro ufficiale */}
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Registro ufficiale</p>
                                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Carte usate in questo torneo</h3>
                                </div>
                                {filteredCardLog.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center">
                                        <Zap size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                                        <p className="mt-2 text-sm text-slate-400 dark:text-muted-foreground">
                                            {isTournamentFinished ? 'Nessuna carta registrata in questo torneo.' : 'Nessuna carta usata nella tua fase finora.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredCardLog.map((entry, idx) => {
                                            const isMaster = entry.card_type === 'master'
                                            return (
                                                <div key={idx} className={`flex items-start gap-3 rounded-2xl border p-4 ${isMaster ? 'border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5' : 'border-sky-200/60 dark:border-sky-500/20 bg-sky-50/30 dark:bg-sky-500/5'}`}>
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${isMaster ? 'from-amber-400 to-orange-500' : 'from-cyan-400 to-blue-600'}`}>
                                                        {isMaster ? <Shield size={16} /> : <Ban size={16} />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-baseline gap-1.5">
                                                            <span className="text-sm font-black text-slate-900 dark:text-foreground">{entry.used_by_nickname}</span>
                                                            <span className="text-xs text-slate-400">usò</span>
                                                            <span className={`text-xs font-black ${isMaster ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>{entry.card_name}</span>
                                                            {entry.target_nickname && (
                                                                <><span className="text-xs text-slate-400">contro</span>
                                                                <span className="text-xs font-black text-rose-600 dark:text-rose-400">{entry.target_nickname}</span></>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                                            <span className="font-black">Effetto:</span> {entry.effect}
                                                        </p>
                                                        <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                                                            <span>{new Date(entry.used_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                            {entry.registered_by && <span>Registrata da: {entry.registered_by}</span>}
                                                        </div>
                                                    </div>
                                                    <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isMaster ? 'text-amber-400' : 'text-sky-400'}`} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Registro di sistema */}
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-3">
                                <div className="flex items-center gap-2">
                                    <History size={14} className="text-slate-400 dark:text-slate-500" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Registro di sistema</p>
                                        <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Storico carte</h3>
                                    </div>
                                </div>
                                {filteredCardHistory.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center">
                                        <History size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                                        <p className="mt-2 text-sm text-slate-400 dark:text-muted-foreground">
                                            {isTournamentFinished ? 'Nessun utilizzo di carte in questo torneo.' : 'Nessuna carta usata nella tua fase finora.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredCardHistory.map((entry, idx) => {
                                            const isMaster = entry.card_type === 'master'
                                            return (
                                                <div key={idx} className={`flex items-start gap-3 rounded-2xl border p-4 ${isMaster ? 'border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5' : 'border-sky-200/60 dark:border-sky-500/20 bg-sky-50/30 dark:bg-sky-500/5'}`}>
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${isMaster ? 'from-amber-400 to-orange-500' : 'from-cyan-400 to-blue-600'}`}>
                                                        {isMaster ? <Shield size={16} /> : <Ban size={16} />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-baseline gap-1.5">
                                                            <span className="text-sm font-black text-slate-900 dark:text-foreground">{entry.player_nickname ?? '—'}</span>
                                                            <span className="text-xs text-slate-400">usò</span>
                                                            <span className={`text-xs font-black ${isMaster ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>{entry.card_name}</span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                                            <span className="font-black">Effetto:</span> {entry.effect ?? '—'}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                                                            {entry.consumed_at && (
                                                                <span>{new Date(entry.consumed_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                            )}
                                                            {entry.group_name && <span>{groupLabel(entry.group_name)}</span>}
                                                            {entry.race_name && <span>{entry.race_name}</span>}
                                                        </div>
                                                    </div>
                                                    <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isMaster ? 'text-amber-400' : 'text-sky-400'}`} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            {selectedPlayer && (
                <ModalPlayer player={selectedPlayer} stats={statsByPlayerId.get(selectedPlayer.id)} onClose={() => setSelectedPlayer(null)} />
            )}
            </AppLayout>
        )
    }

    return (
        <>
        {confirmDeleteTournament && (() => {
            const hasRaces = (tournament?.raceCount ?? 0) > 0
            const hasWinner = Boolean(tournament?.winner_id)
            return (
                <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setConfirmDeleteTournament(false)}>
                    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20">
                                <Trash2 size={18} className="text-rose-400" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-400">Azione irreversibile</p>
                                <h4 className="text-lg font-black text-white">Eliminare il torneo?</h4>
                            </div>
                        </div>

                        <div className="space-y-2 mb-5">
                            <div className="flex items-start gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/8 p-3">
                                <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                                <p className="text-[11px] text-slate-300">Verranno eliminate a cascata tutte le gare, i risultati e le schedine associate. Non è possibile annullare.</p>
                            </div>
                            {hasRaces && (
                                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2">
                                    <span className="text-amber-400">🏁</span>
                                    <p className="text-[11px] text-amber-300">{tournament.raceCount} gare con risultati verranno perse.</p>
                                </div>
                            )}
                            {hasWinner && (
                                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2">
                                    <span className="text-amber-400">🏆</span>
                                    <p className="text-[11px] text-amber-300">Il torneo ha un vincitore ufficiale — verrà rimosso dallo storico.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDeleteTournament(false)}
                                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
                                Annulla
                            </button>
                            <button onClick={handleDeleteTournament} disabled={deleting}
                                className="flex-1 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-500 disabled:opacity-60">
                                {deleting ? 'Eliminazione...' : 'Elimina definitivamente'}
                            </button>
                        </div>
                    </div>
                </div>
            )
        })()}

        {/* ══ MODAL REGISTRA USO CARTA — adaptive light/dark ══ */}
        {showCardModal && selectedCard && (
            <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => { setShowCardModal(false); setCardEffectOwner('') }}>
                <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-scale-in"
                    onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${selectedCard.card_type === 'master' ? 'from-amber-400 to-orange-500' : 'from-cyan-400 to-blue-600'}`}>
                            {selectedCard.card_type === 'master' ? <Shield size={22} /> : <Ban size={22} />}
                        </div>
                        <div>
                            <p className={`text-xs font-black uppercase tracking-[0.3em] ${selectedCard.card_type === 'master' ? 'text-amber-500 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                                Registra uso carta
                            </p>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">{selectedCard.card_name}</h4>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Portatore della carta */}
                        <label className="block space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Chi usa la carta</span>
                            <PortalSelect
                                value={cardEffectOwner}
                                onChange={setCardEffectOwner}
                                placeholder="Seleziona portatore…"
                                options={
                                    cardTypeHolders.length === 0
                                        ? [{ value: '', label: 'Nessun giocatore ha questa carta', disabled: true }]
                                        : cardTypeHolders.map((h) => ({
                                            value: h.player_id,
                                            label: `${h.player_nickname}${selectedCard?.card_type === 'master' ? ` (★ ×${h.master_count})` : ` (⚡ ×${h.blue_shell_count})`}`,
                                          }))
                                }
                            />
                        </label>

                        {/* Effetto */}
                        <label className="block space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Effetto applicato</span>
                            <PortalSelect
                                value={cardEffectOption}
                                onChange={(v) => { setCardEffectOption(v); setCardEffectCustom('') }}
                                placeholder="Seleziona effetto…"
                                options={(selectedCard.card_type === 'master' ? MASTER_EFFECTS : SHELL_EFFECTS).map((e) => ({
                                    value: e.value,
                                    label: e.label,
                                }))}
                            />
                        </label>

                        {cardEffectOption === 'custom' && (
                            <label className="block space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Descrivi l'effetto</span>
                                <input
                                    type="text"
                                    value={cardEffectCustom}
                                    onChange={(e) => setCardEffectCustom(e.target.value)}
                                    placeholder="Es. Annulla la penalizzazione della gara 3"
                                    className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-400 placeholder:text-slate-400"
                                />
                            </label>
                        )}

                        {/* Bersaglio */}
                        <label className="block space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                {selectedCard.card_type === 'master' ? 'Beneficiario / contesto (opzionale)' : 'Giocatore bersaglio'}
                            </span>
                            <PortalSelect
                                value={cardTargetId}
                                onChange={setCardTargetId}
                                placeholder="Nessun bersaglio specifico"
                                options={[
                                    { value: '', label: 'Nessun bersaglio specifico' },
                                    ...tournamentParticipants
                                        .filter((p) => String(p.id) !== String(cardEffectOwner))
                                        .map((p) => ({ value: p.id, label: p.nickname })),
                                ]}
                            />
                        </label>

                        {/* Gara — collega l'uso allo storico carte per fase/gara */}
                        <label className="block space-y-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Gara (opzionale)</span>
                            <PortalSelect
                                value={cardRaceId}
                                onChange={setCardRaceId}
                                placeholder="Nessuna gara specifica"
                                options={[
                                    { value: '', label: 'Nessuna gara specifica' },
                                    ...(tournament.races ?? [])
                                        .slice()
                                        .sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0))
                                        .map((r) => ({
                                            value: r.id,
                                            label: `Gara ${r.race_order ?? r.id}${r.group_name ? ` · ${groupLabel(r.group_name)}` : ''}${r.name ? ` — ${r.name}` : ''}`,
                                        })),
                                ]}
                            />
                        </label>
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button type="button" onClick={() => { setShowCardModal(false); setCardEffectOwner('') }}
                            className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white transition hover:bg-slate-100 dark:hover:bg-white/10">
                            Annulla
                        </button>
                        <button type="button" onClick={handleUseCard}
                            disabled={usingCard || !cardEffectOption || !cardEffectOwner || (cardEffectOption === 'custom' && !cardEffectCustom.trim())}
                            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white transition bg-gradient-to-r disabled:opacity-50 disabled:cursor-not-allowed ${selectedCard.card_type === 'master' ? 'from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400' : 'from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400'}`}>
                            {usingCard ? 'Registrazione…' : 'Registra uso'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-12 space-y-10">
                <ApiBanner title="Errore caricamento torneo" message={errorMessage} />
                <div className="rounded-3xl border border-slate-200 dark:border-emerald-900/40 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/20">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                            <Trophy size={16} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400 mt-1">
                            {tournamentStatus === 'concluso' ? 'Torneo concluso' : 'Gestione torneo'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{tournament.name}</h1>
                            <div className="mt-4 flex flex-wrap gap-2 text-sm">
                                <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5">Data: {tournament.date}</span>
                                <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5">Gioco: {games.find((game) => game.id === tournament.game_id)?.name ?? `#${tournament.game_id}`}</span>
                                <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5">Gare: {tournament.raceCount}/{tournament.n_races}</span>
                                <span className={`rounded-full px-3 py-1 font-black uppercase tracking-widest border ${getTournamentStatusBadge(tournamentStatus)}`}>
                                    Stato: {getTournamentStatusLabel(tournamentStatus)}
                                </span>
                                <span className="rounded-full bg-amber-50 dark:bg-amber-400/20 px-3 py-1 font-black text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                                    <Crown size={14} className="-mt-0.5 me-1 inline" />
                                    Vincitore: {tournament.winner?.nickname ?? '—'}
                                </span>
                            </div>
                            {/* Partecipanti con avatar */}
                            {tournamentParticipants.length > 0 && (
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mr-1">Partecipanti</span>
                                    <div className="flex -space-x-2">
                                        {tournamentParticipants.slice(0, 8).map((p) => {
                                            const isWithdrawn = (tournament.withdrawn_player_ids ?? []).includes(p.id)
                                            return (
                                                <div key={p.id} className={`relative h-8 w-8 overflow-hidden rounded-full border-2 bg-slate-100 dark:bg-slate-800 shadow-md ${isWithdrawn ? 'border-rose-400 grayscale opacity-60' : 'border-slate-200 dark:border-slate-700'}`} title={isWithdrawn ? `${p.nickname} · Ritirato` : p.nickname}>
                                                    {p.img_url ? (
                                                        <img src={p.img_url} alt={p.nickname} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-400">
                                                            {(p.nickname ?? '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    {isWithdrawn && (
                                                        <span className="absolute inset-x-0 bottom-0 bg-rose-500 text-white text-[6px] font-black uppercase text-center leading-tight">Ritirato</span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-500/20">
                                        {tournamentParticipants.length}
                                    </span>
                                    {tournamentParticipants.length > 8 && (
                                        <span className="text-[10px] text-slate-400">+{tournamentParticipants.length - 8}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {isParticipantAdmin && (
                                <button
                                    onClick={() => setAdminModeOn(false)}
                                    className="rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-violet-700 dark:text-violet-300 transition hover:bg-violet-100"
                                >
                                    <Settings size={13} className="inline -mt-0.5 me-1" />
                                    Esci da Modalità Admin
                                </button>
                            )}
                            <button
                                onClick={() => setConfirmDeleteTournament(true)}
                                disabled={deleting}
                                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-rose-500 disabled:opacity-60 shadow-lg shadow-rose-600/30"
                            >
                                <Trash2 size={14} className="inline -mt-0.5 me-1" />
                                Elimina
                            </button>
                        </div>
                    </div>
                </div>

                <TournamentInfoPanel tournament={tournament} isAdmin={isAdmin} isSuperadmin={isSuperadmin} />

                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <span className="px-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Sezione</span>
                        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-muted p-1 overflow-x-auto max-w-full gap-0.5">
                            <button type="button" onClick={() => setActiveSection('management')}
                                className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap transition ${activeSection === 'management' ? 'bg-emerald-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200'}`}>
                                Gestione
                            </button>
                            <button type="button" onClick={() => setActiveSection('leaderboard')}
                                className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap transition ${activeSection === 'leaderboard' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200'}`}>
                                Classifica
                            </button>
                            <button type="button" onClick={() => setActiveSection('races')}
                                className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap transition ${activeSection === 'races' ? 'bg-blue-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200'}`}>
                                Gare
                            </button>
                            <button type="button" onClick={() => setActiveSection('carte')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap transition ${activeSection === 'carte' ? 'bg-amber-400 text-amber-950 shadow' : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200'}`}>
                                <Zap size={12} />
                                Carte
                                {inventory.filter((c) => !c.is_consumed).length > 0 && (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white">
                                        {inventory.filter((c) => !c.is_consumed).length}
                                    </span>
                                )}
                            </button>
                            {isAdmin && (
                                <button type="button" onClick={() => setActiveSection('schedina')}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap transition ${activeSection === 'schedina' ? 'bg-sky-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200'}`}>
                                    <ListChecks size={12} />
                                    Schedine
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {isAdmin && activeSection === 'management' && (
                    <div className="space-y-4">
                        <CollapsibleSection title="Informazioni torneo" icon={<Settings size={16} />} defaultOpen>
                            <TournamentStatusManager tournament={tournament} disabled={!isAdmin} onUpdated={refresh} />
                        </CollapsibleSection>

                        <CollapsibleSection
                            title="Partecipanti"
                            icon={<Users size={16} />}
                            badge={(
                                <span className="rounded-full bg-slate-100 dark:bg-muted px-2.5 py-0.5 text-[10px] font-black text-slate-500 dark:text-muted-foreground">
                                    {tournament.participant_ids?.length ?? 0}
                                </span>
                            )}
                        >
                            <TournamentParticipantsManager tournament={tournament} players={players} initialParticipantIds={tournament.participant_ids ?? []} disabled={Boolean(tournament.winner_id) || tournament.status === 'in_corso'} onUpdated={refresh} excludePlayerIds={superadminPlayerIds} />

                            {(tournament.status === 'in_corso' || tournament.status === 'da_svolgere') && (
                                <WithdrawalManager tournament={tournament} players={players} disabled={!isAdmin} onUpdated={refresh} />
                            )}
                        </CollapsibleSection>

                        {tournament.tournament_format === 'group_stage' ? (
                            /* ── Modalità MK8 Deluxe: gironi, spareggi, semifinali e finale ──
                               GroupManagementSection rende già le proprie CollapsibleSection
                               per fase (Generale/Gironi/Semifinali/Finali/Classifica Finale) */
                            <GroupManagementSection
                                tournament={tournament}
                                players={players}
                                circuits={tournamentCircuits}
                                characters={charactersByGameId.get(tournament?.game_id ?? 0) ?? []}
                                results={results}
                                isAdmin={isAdmin}
                                onRefresh={refresh}
                                leader={currentLeader}
                                onFinalized={handleFinalized}
                                onReplayCelebration={handleReplayCelebration}
                            />
                        ) : (
                            /* ── Modalità Classic: flusso standard ── */
                            <>
                                <CollapsibleSection title="Gare" icon={<Flag size={16} />} defaultOpen>
                                    <PhaseCircuitsCard circuits={tournamentCircuits} races={(tournament.races ?? []).filter((r) => !r.is_duello)} title="Circuiti" />
                                    <ResultEntryForm tournament={tournament} races={tournament.races} tournamentParticipants={activeTournamentParticipants} onCreated={refresh} disabled={isTournamentLocked} />
                                    <RaceCreator tournament={tournament} circuits={tournamentCircuits} loading={loading} onCreated={refresh} disabled={isTournamentLocked} results={results} tournamentParticipants={activeTournamentParticipants} />
                                </CollapsibleSection>

                                <CollapsibleSection title="Duelli spareggio" subtitle="Spareggi automatici per pareggi in classifica — risolvono le posizioni a pari merito indipendentemente dal podio. Non assegnano punti in classifica." icon={<Swords size={16} />}>
                                    <ClassicPodiumDuelCard
                                        tournament={tournament}
                                        players={players}
                                        circuits={tournamentCircuits}
                                        characters={charactersByGameId.get(tournament?.game_id ?? 0) ?? []}
                                        onRefresh={refresh}
                                    />
                                </CollapsibleSection>

                                <CollapsibleSection title="Classifica finale" icon={<Crown size={16} />}>
                                    <div className="space-y-4">
                                        <WinnerFinalizeCard tournament={tournament} leader={currentLeader} onFinalized={handleFinalized} onReplayCelebration={handleReplayCelebration} />
                                        <TournamentResolutionNotes tournament={tournament} />
                                    </div>
                                </CollapsibleSection>
                            </>
                        )}
                    </div>
                )}

                {isAdmin && activeSection === 'schedina' && (
                    <div className="space-y-4">
                        <CollapsibleSection title="Stato compilazione schedine" subtitle="Chi ha compilato la schedina e chi no" icon={<ListChecks size={16} />}>
                            {participantsStatus.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-muted-foreground">Nessun partecipante trovato.</p>
                            ) : (
                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="rounded-full bg-sky-100 dark:bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-black text-sky-600 dark:text-sky-400">
                                            {participantsStatus.filter((p) => p.has_compiled).length}/{participantsStatus.length} compilate
                                        </span>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {participantsStatus.map((p) => {
                                            const player = players.find((pl) => pl.id === p.player_id)
                                            return (
                                                <div key={p.user_id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-muted/50 px-3 py-2.5">
                                                    {player?.img_url
                                                        ? <img src={player.img_url} alt={p.nickname} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                                                        : <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-500">{(p.nickname ?? '?').charAt(0).toUpperCase()}</div>
                                                    }
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{p.nickname || p.username}</p>
                                                        {p.compiled_at && (
                                                            <p className="text-[9px] text-slate-400">{new Date(p.compiled_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                        )}
                                                    </div>
                                                    <span className={`shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${p.has_compiled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                                        {p.has_compiled ? '✓ Compilata' : '○ Da compilare'}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </CollapsibleSection>
                    </div>
                )}

                {activeSection === 'leaderboard' && (
                    <div className="space-y-4">
                        {tournament.tournament_format === 'group_stage' ? (
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                                <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-muted-foreground">Classifiche · per fase</p>
                                <GroupPlancia tournament={tournament} players={players} results={results} highlightPlayerId={myPlayerId} />
                            </div>
                        ) : (
                        <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr] items-stretch max-h-160 min-h-0">
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-1 shadow-sm h-full min-h-0 overflow-hidden">
                                <LeaderboardTable
                                    rows={tournament.standings}
                                    showTournamentWins={false}
                                    charactersById={charactersById}
                                    highlightPlayerId={user?.player_id ?? user?.player?.id ?? null}
                                    isSuperadmin={isSuperadmin}
                                    onPlayerClick={handlePlayerClick}
                                />
                            </div>

                            <div className="h-full min-h-0 flex flex-col">
                                <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-4 shadow-sm h-full min-h-0 flex flex-col overflow-hidden">
                                    <p className="text-xs font-black uppercase tracking-widest text-amber-600">Algoritmo (live)</p>
                                    <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-foreground">Analisi torneo (live)</h3>

                                    <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 dark:bg-muted p-1 shrink-0">
                                        <button type="button" onClick={() => setAlgoTab('overview')} className={`rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${algoTab === 'overview' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Classifica</button>
                                        <button type="button" onClick={() => setAlgoTab('dynamics')} className={`rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${algoTab === 'dynamics' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Dinamica</button>
                                        <button type="button" onClick={() => setAlgoTab('projection')} className={`rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${algoTab === 'projection' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Previsioni</button>
                                        <button type="button" onClick={() => setAlgoTab('stats')} className={`rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${algoTab === 'stats' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Stats</button>
                                    </div>

                                    <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 text-sm">
                                        {algoTab === 'overview' && (
                                            <>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 will-change-transform" style={{ animation: 'slide-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) both', animationDelay: '0.03s' }}>
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Gare rimanenti</p>
                                                        <p className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">{leaderboardAnalytics.remainingRaces}</p>
                                                    </div>
                                                    <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 will-change-transform" style={{ animation: 'slide-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) both', animationDelay: '0.06s' }}>
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Max pt per gara</p>
                                                        <p className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">{leaderboardAnalytics.maxPointsPerRace}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 will-change-transform" style={{ animation: 'slide-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) both', animationDelay: '0.09s' }}>
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Vantaggio</p>
                                                        <p className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-300">{leaderboardAnalytics.currentLead}</p>
                                                    </div>
                                                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Da blindare</p>
                                                        <p className="mt-1 text-lg font-black text-amber-700 dark:text-amber-300">{leaderboardAnalytics.lockStatus === 'unreachable' ? 'N/A' : leaderboardAnalytics.pointsToSecure}</p>
                                                    </div>
                                                </div>
                                                <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-0.5">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Gap classifica</p>
                                                    {tournament.standings.slice(0, 5).map((s, i) => (
                                                        <div key={s.playerId} className="flex items-center justify-between text-xs">
                                                            <span className="capitalize text-slate-600 dark:text-slate-400">#{i + 1} {s.nickname}</span>
                                                            <span className={`font-black ${i === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{i === 0 ? `${s.points} pt` : `-${tournament.standings[0].points - s.points} pt`}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-0.5">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Lettura rapida</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Leader: <span className="font-black text-slate-900 dark:text-foreground capitalize">{tournament.standings?.[0]?.nickname ?? '-'}</span></p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Blindaggio: <span className="font-black text-emerald-600 dark:text-emerald-400">{leaderboardAnalytics.lockStatus === 'unreachable' ? 'non chiudibile' : 'chiudibile'}</span></p>
                                                </div>
                                            </>
                                        )}

                                        {algoTab === 'dynamics' && (
                                            <>
                                                <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Confronto diretto tra i primi due</p>
                                                    {leaderboardAnalytics.headToHead ? (
                                                        <div className="mt-1 space-y-1 text-xs">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="font-black capitalize text-slate-900 dark:text-foreground">{leaderboardAnalytics.headToHead.p1}</span>
                                                                <span className="font-black text-amber-600 dark:text-amber-400">{leaderboardAnalytics.headToHead.wins1} vittorie</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="font-black capitalize text-slate-900 dark:text-foreground">{leaderboardAnalytics.headToHead.p2}</span>
                                                                <span className="font-black text-amber-600 dark:text-amber-400">{leaderboardAnalytics.headToHead.wins2} vittorie</span>
                                                            </div>
                                                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Pareggi nello scontro diretto: {leaderboardAnalytics.headToHead.ties}</p>
                                                        </div>
                                                    ) : <p className="text-xs text-slate-400">Non disponibile</p>}
                                                </div>
                                                <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Streak attivi</p>
                                                    {(() => {
                                                        const active = leaderboardAnalytics.streakRows.filter((e) => e.winStreak > 0 || e.podiumStreak > 0).sort((a, b) => b.winStreak - a.winStreak || b.podiumStreak - a.podiumStreak).slice(0, 5)
                                                        if (!active.length) return <p className="text-xs text-slate-400">Nessuno streak attivo</p>
                                                        return active.map((e) => (
                                                            <div key={e.playerId} className="flex items-center justify-between text-xs">
                                                                <span className="capitalize text-slate-600 dark:text-slate-400">{e.nickname}</span>
                                                                <span className="font-black">
                                                                    {e.winStreak > 0 && <span className="text-emerald-600 dark:text-emerald-400">{e.winStreak}W</span>}
                                                                    {e.winStreak > 0 && e.podiumStreak > 0 && <span className="text-slate-400 mx-1">·</span>}
                                                                    {e.podiumStreak > e.winStreak && <span className="text-sky-600 dark:text-sky-400">{e.podiumStreak}P</span>}
                                                                </span>
                                                            </div>
                                                        ))
                                                    })()}
                                                </div>
                                                <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Forma recente</p>
                                                    {leaderboardAnalytics.momentumRanking.slice(0, 4).map((e, i) => (
                                                        <div key={e.playerId} className="flex items-center justify-between text-xs">
                                                            <span className="capitalize text-slate-600 dark:text-slate-400">#{i + 1} {e.nickname}</span>
                                                            <span className={`font-black ${e.formDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{e.formDelta >= 0 ? '+' : ''}{e.formDelta}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {algoTab === 'projection' && (
                                            <>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Previsione vittoria (%)</p>
                                                {leaderboardAnalytics.predictions.map((entry) => (
                                                    <div key={entry.playerId} className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2">
                                                        <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            <span className="capitalize">{entry.nickname}</span>
                                                            <span>{entry.probability}%</span>
                                                        </div>
                                                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(entry.probability, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 space-y-0.5">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Sintesi</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Favorito: <span className="font-black text-emerald-600 dark:text-emerald-400 capitalize">{leaderboardAnalytics.predictions?.[0]?.nickname ?? '-'}</span></p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Gare residue: <span className="font-black text-slate-900 dark:text-foreground">{leaderboardAnalytics.remainingRaces}</span></p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Blindaggio: <span className="font-black text-amber-600 dark:text-amber-400">{leaderboardAnalytics.lockStatus === 'unreachable' ? 'non chiudibile' : `${leaderboardAnalytics.pointsToSecure} pt`}</span></p>
                                                </div>
                                            </>
                                        )}

                                        {algoTab === 'stats' && (
                                            <>
                                                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-muted p-1 shrink-0">
                                                    <button type="button" onClick={() => setStatsTab('podium')} className={`rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${statsTab === 'podium' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Tasso podio</button>
                                                    <button type="button" onClick={() => setStatsTab('bestworst')} className={`rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${statsTab === 'bestworst' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground'}`}>Best/Worst</button>
                                                </div>

                                                {statsTab === 'podium' && leaderboardAnalytics.podiumRates.slice(0, 5).map((entry, index) => (
                                                    <div key={entry.playerId} className="rounded-xl bg-slate-50 dark:bg-muted px-3 py-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-black text-slate-900 dark:text-foreground">#{index + 1} <span className="capitalize">{entry.nickname}</span></span>
                                                            <span className="font-black text-amber-600 dark:text-amber-400">{entry.podiumRate}%</span>
                                                        </div>
                                                        <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${entry.podiumRate}%` }} />
                                                        </div>
                                                        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">Pos media: {(entry.avgPos ?? 0).toFixed(1)} · {entry.racesPlayed} gare</p>
                                                    </div>
                                                ))}

                                                {statsTab === 'bestworst' && leaderboardAnalytics.bestWorst.slice(0, 5).map((entry, index) => (
                                                    <div key={entry.playerId} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-muted px-3 py-2 text-xs">
                                                        <span className="font-black text-slate-900 dark:text-foreground">#{index + 1} <span className="capitalize">{entry.nickname}</span></span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-black">Best: #{entry.best ?? '-'}</span>
                                                            <span className="text-rose-500 dark:text-rose-400 font-black">Worst: #{entry.worst ?? '-'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}


                    </div>
                )}

                {activeSection === 'races' && (
                    <div className="space-y-4">
                        <RaceList races={tournament.races} circuits={tournamentCircuits} circuitsById={circuitsById} charactersById={charactersById} tournamentId={tournament.id} onChanged={refresh} canEdit={isAdmin} />
                        {/* Log azioni carte nella timeline */}
                        {localCardLog.length > 0 && (
                            <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4 space-y-2">
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                    <Zap size={12} /> Azioni Carte Potere
                                </p>
                                {localCardLog.map((entry, idx) => {
                                    const isMaster = entry.card_type === 'master'
                                    const raceLabel = entry.race_id
                                        ? `alla gara #${tournament.races?.find(r => r.id === entry.race_id)?.race_order ?? entry.race_id}`
                                        : 'durante il torneo'
                                    return (
                                        <div key={idx} className={`flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-xs ${isMaster ? 'border-amber-200/60 dark:border-amber-500/20 bg-white dark:bg-amber-500/5' : 'border-sky-200/60 dark:border-sky-500/20 bg-white dark:bg-sky-500/5'}`}>
                                            <span className={`font-black shrink-0 ${isMaster ? 'text-amber-500' : 'text-sky-500'}`}>{isMaster ? '★' : '⚡'}</span>
                                            <p className="text-slate-700 dark:text-slate-300">
                                                <span className="font-black">{raceLabel}</span>, <span className="font-black">{entry.used_by_nickname}</span> ha usato la <span className={`font-black ${isMaster ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>{entry.card_name}</span> per <span className="italic">{entry.effect}</span>
                                                {entry.target_nickname && <> contro <span className="font-black text-rose-600 dark:text-rose-400">{entry.target_nickname}</span></>}.
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ══ CARTE POTERE (Admin tool) ══ */}
                {activeSection === 'carte' && (
                    <div className="space-y-6">
                        {/* Spiegazione flusso */}
                        <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
                                    <Zap size={18} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">Strumento Admin</p>
                                    <h3 className="mt-1 text-lg font-black text-amber-900 dark:text-amber-200">Gestione Carte Potere</h3>
                                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                                        L'admin registra l'uso delle carte durante il torneo. Il portatore della carta dichiara l'intenzione prima della gara; l'admin sceglie effetto e bersaglio e lo registra qui.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                                        <span className="rounded-full border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">1. Portatore dichiara</span>
                                        <span className="text-amber-400">→</span>
                                        <span className="rounded-full border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">2. Admin registra qui</span>
                                        <span className="text-amber-400">→</span>
                                        <span className="rounded-full border border-amber-300 dark:border-amber-500/40 bg-white dark:bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">3. Effetto applicato</span>
                                    </div>
                                    <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">
                                        Le carte vinte in un torneo si possono usare solo in tornei dello stesso gioco.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Registra uso carta */}
                        {isAdmin && (
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Registra uso</p>
                                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Carta usata in gara</h3>
                                </div>
                                {tournamentStatus === 'concluso' && (
                                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3">
                                        <span className="text-[11px] text-slate-500 dark:text-muted-foreground font-black uppercase tracking-wider">Torneo concluso — utilizzo carte disabilitato.</span>
                                    </div>
                                )}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => openCardModal('master')}
                                        disabled={availableCards.master === 0 || tournamentStatus === 'concluso'}
                                        className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 p-4 text-left transition hover:border-amber-400 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-amber-200 dark:disabled:hover:border-amber-500/30"
                                    >
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
                                            <Shield size={22} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500">★ Leggendaria</p>
                                            <p className="font-black text-amber-700 dark:text-amber-300">Carta Master</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Annulla penalizzazione</p>
                                        </div>
                                        {availableCards.master === 0 ? (
                                            <span className="shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Non disp.</span>
                                        ) : (
                                            <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">{availableCards.master} disp.</span>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openCardModal('blue_shell')}
                                        disabled={availableCards.blue_shell === 0 || tournamentStatus === 'concluso'}
                                        className="flex items-center gap-3 rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/5 p-4 text-left transition hover:border-sky-400 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-sky-200 dark:disabled:hover:border-sky-500/30"
                                    >
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow">
                                            <Ban size={22} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-500">⚡ Rara</p>
                                            <p className="font-black text-sky-700 dark:text-sky-300">Guscio Blu</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Penalizza avversario</p>
                                        </div>
                                        {availableCards.blue_shell === 0 ? (
                                            <span className="shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Non disp.</span>
                                        ) : (
                                            <span className="shrink-0 rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">{availableCards.blue_shell} disp.</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Chi ha carte - pannello live */}
                        {isAdmin && (
                            <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Inventario live</p>
                                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Chi ha carte disponibili</h3>
                                </div>
                                {cardHolders.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-5 text-center">
                                        <p className="text-sm text-slate-400 dark:text-muted-foreground">Nessun partecipante possiede carte attualmente.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {cardHolders.map((h) => (
                                            <div key={h.player_id} className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5">
                                                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-border bg-slate-200 dark:bg-slate-700">
                                                    {h.player_img_url
                                                        ? <img src={h.player_img_url} alt={h.player_nickname} className="h-full w-full object-cover" />
                                                        : <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-500">{(h.player_nickname ?? '?').charAt(0).toUpperCase()}</div>}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-black text-slate-900 dark:text-foreground truncate">{h.player_nickname}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {h.master_count > 0 && (
                                                        <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:text-amber-300">
                                                            <Shield size={9} /> ×{h.master_count}
                                                        </span>
                                                    )}
                                                    {h.blue_shell_count > 0 && (
                                                        <span className="flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 py-0.5 text-[9px] font-black text-sky-700 dark:text-sky-300">
                                                            <Ban size={9} /> ×{h.blue_shell_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Storico usi carte */}
                        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Registro ufficiale</p>
                                <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Carte usate in questo torneo</h3>
                            </div>
                            {localCardLog.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center">
                                    <Zap size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                                    <p className="mt-2 text-sm text-slate-400 dark:text-muted-foreground">Nessuna carta ancora registrata in questo torneo.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {localCardLog.map((entry, idx) => {
                                        const isMaster = entry.card_type === 'master'
                                        return (
                                            <div key={idx} className={`flex items-start gap-3 rounded-2xl border p-4 ${isMaster ? 'border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5' : 'border-sky-200/60 dark:border-sky-500/20 bg-sky-50/30 dark:bg-sky-500/5'}`}>
                                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${isMaster ? 'from-amber-400 to-orange-500' : 'from-cyan-400 to-blue-600'}`}>
                                                    {isMaster ? <Shield size={16} /> : <Ban size={16} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-baseline gap-1.5">
                                                        <span className="text-sm font-black text-slate-900 dark:text-foreground">{entry.used_by_nickname}</span>
                                                        <span className="text-xs text-slate-400">usò</span>
                                                        <span className={`text-xs font-black ${isMaster ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>{entry.card_name}</span>
                                                        {entry.target_nickname && (
                                                            <><span className="text-xs text-slate-400">contro</span>
                                                            <span className="text-xs font-black text-rose-600 dark:text-rose-400">{entry.target_nickname}</span></>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                                        <span className="font-black">Effetto:</span> {entry.effect}
                                                    </p>
                                                    <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                                                        <span>{new Date(entry.used_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                        {entry.registered_by && <span>Registrata da: {entry.registered_by}</span>}
                                                    </div>
                                                </div>
                                                <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isMaster ? 'text-amber-400' : 'text-sky-400'}`} />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Storico carte — registro di sistema (giocatore, fase, gara, effetto, data/ora) */}
                        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-2">
                                <History size={14} className="text-slate-400 dark:text-slate-500" />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Registro di sistema</p>
                                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">Storico carte</h3>
                                </div>
                            </div>
                            {cardHistory.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center">
                                    <History size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                                    <p className="mt-2 text-sm text-slate-400 dark:text-muted-foreground">Nessun utilizzo di carte collegato a una gara per ora.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {cardHistory.map((entry, idx) => {
                                        const isMaster = entry.card_type === 'master'
                                        return (
                                            <div key={idx} className={`flex items-start gap-3 rounded-2xl border p-4 ${isMaster ? 'border-amber-200/60 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5' : 'border-sky-200/60 dark:border-sky-500/20 bg-sky-50/30 dark:bg-sky-500/5'}`}>
                                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${isMaster ? 'from-amber-400 to-orange-500' : 'from-cyan-400 to-blue-600'}`}>
                                                    {isMaster ? <Shield size={16} /> : <Ban size={16} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-baseline gap-1.5">
                                                        <span className="text-sm font-black text-slate-900 dark:text-foreground">{entry.player_nickname ?? '—'}</span>
                                                        <span className="text-xs text-slate-400">usò</span>
                                                        <span className={`text-xs font-black ${isMaster ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>{entry.card_name}</span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                                        <span className="font-black">Effetto:</span> {entry.effect ?? '—'}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                                                        {entry.consumed_at && (
                                                            <span>{new Date(entry.consumed_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                        )}
                                                        {entry.group_name && <span>{groupLabel(entry.group_name)}</span>}
                                                        {entry.race_name && <span>{entry.race_name}</span>}
                                                    </div>
                                                </div>
                                                <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isMaster ? 'text-amber-400' : 'text-sky-400'}`} />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </section>
            {selectedPlayer && (
                <ModalPlayer player={selectedPlayer} stats={statsByPlayerId.get(selectedPlayer.id)} onClose={() => setSelectedPlayer(null)} />
            )}
        </AppLayout>
        </>
    )
}

export default TournamentDetail
