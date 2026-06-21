/**
 * GroupPlancia — Plancia live dei gironi N-flessibili
 *
 * Mostra le classifiche in tempo reale per:
 *   Fase 1 (phase="group"):  Girone 1 | Girone 2 | ... | Girone N
 *   Fase 2 (phase="finals"): Finale   | Consolazione
 *
 * Le chiavi dei gironi di Fase 1 sono lette da tournament.format_data.groups
 * (oggetto {"1": [playerId,...], "2": [...], ...}), così la plancia scala
 * automaticamente con qualunque numero di gironi.
 *
 * Le classifiche sono calcolate client-side dai risultati delle gare
 * filtrati per phase e group_name — zero chiamate API extra.
 *
 * Props:
 *   tournament  {object}  — torneo completo (races, standings, format_data)
 *   players     {array}   — tutti i player [{id, nickname, img_url}]
 *   results     {array}   — tutti i risultati [{race_id, player_id, position, points}]
 */
import { useEffect, useMemo, useState } from 'react'
import { Crown, Medal, Shield, Trophy } from 'lucide-react'
import { groupColor, groupKeysFromFormatData, groupLabel, semifinalKeysFromFormatData } from '@/lib/groupStage'
import OverallClassificaCard from '@/components/tournaments/OverallClassificaCard'
import { tournamentsApi } from '@/services/apiClient'

const GROUP_ICON = { top: Trophy, bottom: Medal }

const COLOR_CLASSES = {
    blue:     { header: 'bg-blue-500/10 border-blue-400/40 text-blue-700 dark:text-blue-300',         badge: 'bg-blue-500 text-white',     row: 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20' },
    violet:   { header: 'bg-violet-500/10 border-violet-400/40 text-violet-700 dark:text-violet-300', badge: 'bg-violet-500 text-white',   row: 'hover:bg-violet-50/50 dark:hover:bg-violet-900/20' },
    emerald:  { header: 'bg-emerald-500/10 border-emerald-400/40 text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-500 text-white', row: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20' },
    rose:     { header: 'bg-rose-500/10 border-rose-400/40 text-rose-700 dark:text-rose-300',         badge: 'bg-rose-500 text-white',     row: 'hover:bg-rose-50/50 dark:hover:bg-rose-900/20' },
    cyan:     { header: 'bg-cyan-500/10 border-cyan-400/40 text-cyan-700 dark:text-cyan-300',         badge: 'bg-cyan-500 text-white',     row: 'hover:bg-cyan-50/50 dark:hover:bg-cyan-900/20' },
    fuchsia:  { header: 'bg-fuchsia-500/10 border-fuchsia-400/40 text-fuchsia-700 dark:text-fuchsia-300', badge: 'bg-fuchsia-500 text-white', row: 'hover:bg-fuchsia-50/50 dark:hover:bg-fuchsia-900/20' },
    lime:     { header: 'bg-lime-500/10 border-lime-400/40 text-lime-700 dark:text-lime-300',         badge: 'bg-lime-500 text-white',     row: 'hover:bg-lime-50/50 dark:hover:bg-lime-900/20' },
    orange:   { header: 'bg-orange-500/10 border-orange-400/40 text-orange-700 dark:text-orange-300', badge: 'bg-orange-500 text-white',   row: 'hover:bg-orange-50/50 dark:hover:bg-orange-900/20' },
    amber:    { header: 'bg-amber-500/10 border-amber-400/40 text-amber-700 dark:text-amber-300',     badge: 'bg-amber-500 text-white',    row: 'hover:bg-amber-50/50 dark:hover:bg-amber-900/20' },
    slate:    { header: 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300', badge: 'bg-slate-500 text-white', row: 'hover:bg-slate-50 dark:hover:bg-slate-800/30' },
}

const POSITION_ICON = ['🥇', '🥈', '🥉']

// Calcola la classifica di un gruppo dalle gare filtrate usando placementIndex
function computeGroupStandings(racesByGroup, results, playerMap) {
    const raceIdSet = new Set(racesByGroup.map((r) => r.id))
    const raceNPlayers = {}
    for (const r of racesByGroup) {
        raceNPlayers[r.id] = (r.results ?? []).length
    }
    // Fallback: conta dai risultati flat
    for (const res of results) {
        if (raceIdSet.has(res.race_id)) {
            raceNPlayers[res.race_id] = (raceNPlayers[res.race_id] ?? 0) + 1
        }
    }

    const data = {}
    for (const res of results) {
        if (!raceIdSet.has(res.race_id)) continue
        const pid = res.player_id
        if (!data[pid]) {
            data[pid] = {
                player: playerMap.get(Number(pid)),
                playerId: Number(pid),
                punti: 0, vittorie: 0, podi: 0, gare: 0,
                positionSum: 0,
            }
        }
        const d = data[pid]
        d.punti += res.points ?? 0
        d.gare += 1
        d.positionSum += res.position ?? 0
        if (res.position === 1) d.vittorie += 1
        if (res.position >= 1 && res.position <= 3) d.podi += 1

    }

    return Object.values(data)
        .map((d) => {
            const rp = d.gare || 1
            d.avgPosition = Number((d.positionSum / rp).toFixed(2))
            return d
        })
        .sort((a, b) => b.punti - a.punti || a.avgPosition - b.avgPosition || b.vittorie - a.vittorie)
}

// Singola card di classifica per un gruppo (esportata per riuso, es. sezione "Classifica Finale")
export const GroupCard = ({ groupKey, races, results, playerMap, seedPlayerIds = [], highlightPlayerId = null, resolvedOrder = null }) => {
    const label = groupLabel(groupKey)
    const color = groupColor(groupKey)
    const col = COLOR_CLASSES[color] ?? COLOR_CLASSES.slate
    const Icon = GROUP_ICON[groupKey] ?? Shield

    const standings = useMemo(() => {
        const computed = computeGroupStandings(races, results, playerMap)
        // resolvedOrder arriva dal backend (get_group_stage_classifiche) e
        // riflette già l'esito di un eventuale spareggio di qualificazione:
        // computeGroupStandings (solo punti/vittorie/podi) non lo sa e
        // altrimenti mostrerebbe i pareggiati nell'ordine "di default",
        // invariato anche dopo che lo spareggio è stato giocato e risolto.
        if (!resolvedOrder || resolvedOrder.length === 0) return computed
        const byId = new Map(computed.map((row) => [row.playerId, row]))
        const reordered = resolvedOrder.map((pid) => byId.get(pid)).filter(Boolean)
        const reorderedIds = new Set(reordered.map((row) => row.playerId))
        const remaining = computed.filter((row) => !reorderedIds.has(row.playerId))
        return [...reordered, ...remaining]
    }, [races, results, playerMap, resolvedOrder])

    // Se non ci sono gare ancora, mostra i giocatori dal seeding
    const showSeeded = standings.length === 0 && seedPlayerIds.length > 0

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
            {/* Header */}
            <div className={`flex items-center justify-between border-b px-5 py-3.5 ${col.header} border-opacity-50`}>
                <div className="flex items-center gap-2">
                    <Icon size={14} className="shrink-0" />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">{label}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${col.badge}`}>
                        {races.length} gare
                    </span>
                </div>
            </div>

            {/* Classifica */}
            <div className="divide-y divide-slate-100 dark:divide-border">
                {showSeeded
                    ? seedPlayerIds.map((pid, idx) => {
                        const p = playerMap.get(pid)
                        const isMe = highlightPlayerId != null && pid === highlightPlayerId
                        return (
                            <div key={pid} className={`flex items-center gap-3 px-5 py-3 text-slate-400 dark:text-muted-foreground ${isMe ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-inset ring-amber-300/60 dark:ring-amber-500/30' : ''}`}>
                                <span className="w-5 text-center text-xs font-black">{idx + 1}</span>
                                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-muted">
                                    {p?.img_url
                                        ? <img src={p.img_url} alt={p.nickname} className="h-full w-full object-cover" />
                                        : <div className="flex h-full w-full items-center justify-center text-[10px] font-black">{p?.nickname?.charAt(0)?.toUpperCase() ?? '?'}</div>
                                    }
                                </div>
                                <span className="flex-1 text-xs font-black">{p?.nickname ?? `#${pid}`}</span>
                                <span className="text-[10px] italic opacity-60">in attesa</span>
                            </div>
                        )
                    })
                    : standings.length === 0
                        ? (
                            <div className="px-5 py-6 text-center text-xs text-slate-400 dark:text-muted-foreground">
                                Nessuna gara ancora
                            </div>
                        )
                        : standings.map((row, idx) => {
                            if (!row.player) return null
                            const isFirst = idx === 0
                            const isMe = highlightPlayerId != null && row.playerId === highlightPlayerId
                            return (
                                <div
                                    key={row.playerId}
                                    className={`flex items-center gap-3 px-5 py-3 transition ${col.row} ${isFirst ? 'font-black' : ''} ${isMe ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-inset ring-amber-300/60 dark:ring-amber-500/30' : ''}`}
                                >
                                    {/* Posizione */}
                                    <span className="w-5 shrink-0 text-center text-sm">
                                        {idx < 3 ? POSITION_ICON[idx] : <span className="text-xs font-black text-slate-400">{idx + 1}</span>}
                                    </span>

                                    {/* Avatar */}
                                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border">
                                        {row.player.img_url
                                            ? <img src={row.player.img_url} alt={row.player.nickname} className="h-full w-full object-cover" />
                                            : <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-500">{row.player.nickname?.charAt(0)?.toUpperCase()}</div>
                                        }
                                    </div>

                                    {/* Nome */}
                                    <span className={`flex-1 min-w-0 truncate text-xs ${isFirst ? 'text-slate-900 dark:text-foreground' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {row.player.nickname}
                                        {isFirst && <Crown size={10} className="inline ml-1 text-amber-500" />}
                                        {isMe && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">Tu</span>}
                                    </span>

                                    {/* Stats */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <p className={`text-sm font-black ${isFirst ? 'text-slate-900 dark:text-foreground' : 'text-slate-700 dark:text-slate-300'}`}>{row.punti ?? 0} pt</p>
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">punti</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-amber-500">{row.vittorie}</p>
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">vit</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-blue-500">{row.podi}</p>
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wider">podi</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                }
            </div>
        </div>
    )
}


const GroupPlancia = ({ tournament, players, results, highlightPlayerId = null }) => {
    const playerMap = useMemo(
        () => new Map((players ?? []).map((p) => [p.id, p])),
        [players]
    )

    // Classifica già risolta rispetto agli eventuali spareggi di
    // qualificazione (vedi GroupCard) — senza questa, un girone/batteria con
    // un pareggio risolto via spareggio resterebbe visivamente invariato.
    const [resolvedClassifiche, setResolvedClassifiche] = useState({ group: {}, semifinal: {} })
    useEffect(() => {
        if (!tournament?.id) return undefined
        let active = true
        tournamentsApi.groupStageClassifiche(tournament.id)
            .then((res) => { if (active) setResolvedClassifiche(res.data ?? { group: {}, semifinal: {} }) })
            .catch(() => { if (active) setResolvedClassifiche({ group: {}, semifinal: {} }) })
        return () => { active = false }
    }, [tournament?.id, tournament?.races, tournament?.format_data])

    const groupKeys = useMemo(() => groupKeysFromFormatData(tournament?.format_data), [tournament?.format_data])
    const semiKeys = useMemo(() => semifinalKeysFromFormatData(tournament?.format_data), [tournament?.format_data])
    const seededGroups = tournament?.format_data?.groups ?? {}
    const seededSemis = tournament?.format_data?.semifinals ?? {}

    // Suddivide le gare ufficiali per fase e gruppo/batteria. Esclude le gare
    // di spareggio (is_duello): non assegnano punti e non vanno conteggiate
    // nella classifica né nel numero di gare del girone/batteria.
    const racesByPhaseGroup = useMemo(() => {
        const races = (tournament?.races ?? []).filter((r) => !r.is_duello)
        const map = { group: {}, semifinal: {}, finals: { top: [], bottom: [] } }
        for (const key of groupKeys) map.group[key] = []
        for (const key of semiKeys) map.semifinal[key] = []
        for (const r of races) {
            if (r.phase && r.group_name && map[r.phase]?.[r.group_name] !== undefined) {
                map[r.phase][r.group_name].push(r)
            }
        }
        return map
    }, [tournament?.races, groupKeys, semiKeys])

    const seededFinals = tournament?.format_data?.finals ?? {}
    const finalsComposed = (seededFinals.top ?? []).length > 0 || (seededFinals.bottom ?? []).length > 0
    const hasFinals = racesByPhaseGroup.finals.top.length > 0 || racesByPhaseGroup.finals.bottom.length > 0 || finalsComposed
    const hasGroup  = groupKeys.some((key) => (racesByPhaseGroup.group[key] ?? []).length > 0)
    const hasSemis  = semiKeys.length > 0

    // Tab per fase: una sola fase visibile alla volta invece di Gironi,
    // Semifinali e Finali tutte impilate — troppo lunga e confusa da leggere,
    // specie per il giocatore che vuole solo controllare la propria posizione.
    const phaseTabs = useMemo(() => {
        const tabs = [{ key: 'group', label: 'Gironi' }]
        if (hasSemis) tabs.push({ key: 'semifinal', label: 'Semifinali' })
        if (hasFinals) tabs.push({ key: 'finals', label: 'Finali' })
        return tabs
    }, [hasSemis, hasFinals])

    const [activePhaseTab, setActivePhaseTab] = useState(() => {
        if (hasFinals) return 'finals'
        if (hasSemis) return 'semifinal'
        return 'group'
    })

    return (
        <div className="space-y-6">
            {phaseTabs.length > 1 && (
                <div className="inline-flex flex-wrap rounded-xl bg-slate-100 dark:bg-muted p-1 gap-0.5">
                    {phaseTabs.map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setActivePhaseTab(key)}
                            className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap transition ${activePhaseTab === key ? 'bg-emerald-500 text-white shadow' : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Fase 1: Gironi ──────────────────────────────────────────── */}
            {activePhaseTab === 'group' && (
            <div>
                <p className="mb-3 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-muted-foreground">
                    Fase 1 — Gironi {!hasGroup && '· in attesa delle gare'}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {groupKeys.map((key) => (
                        <GroupCard
                            key={key}
                            groupKey={key}
                            races={racesByPhaseGroup.group[key] ?? []}
                            results={results}
                            playerMap={playerMap}
                            seedPlayerIds={seededGroups[key] ?? []}
                            highlightPlayerId={highlightPlayerId}
                            resolvedOrder={resolvedClassifiche.group?.[key]}
                        />
                    ))}
                </div>
            </div>
            )}

            {/* ── Fase 2: Semifinali ──────────────────────────────────────── */}
            {activePhaseTab === 'semifinal' && hasSemis && (
                <div>
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-muted-foreground">
                        Fase 2 — Semifinali
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {semiKeys.map((key) => (
                            <GroupCard
                                key={key}
                                groupKey={key}
                                races={racesByPhaseGroup.semifinal[key] ?? []}
                                results={results}
                                playerMap={playerMap}
                                seedPlayerIds={seededSemis[key] ?? []}
                                highlightPlayerId={highlightPlayerId}
                                resolvedOrder={resolvedClassifiche.semifinal?.[key]}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Fase finale: Finale + Consolazione ──────────────────────── */}
            {activePhaseTab === 'finals' && hasFinals && (
                <div>
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-muted-foreground">
                        {hasSemis ? 'Fase 3 — Finali' : 'Fase 2 — Finali'}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <GroupCard
                            groupKey="top"
                            races={racesByPhaseGroup.finals.top}
                            results={results}
                            playerMap={playerMap}
                            seedPlayerIds={seededFinals.top ?? []}
                            highlightPlayerId={highlightPlayerId}
                        />
                        <GroupCard
                            groupKey="bottom"
                            races={racesByPhaseGroup.finals.bottom}
                            results={results}
                            playerMap={playerMap}
                            seedPlayerIds={seededFinals.bottom ?? []}
                            highlightPlayerId={highlightPlayerId}
                        />
                    </div>
                </div>
            )}

            {/* ── Classifica generale combinata: Finale + Consolazione ──────── */}
            {finalsComposed && (
                <OverallClassificaCard tournament={tournament} playerMap={playerMap} highlightPlayerId={highlightPlayerId} />
            )}
        </div>
    )
}

export default GroupPlancia
