/**
 * PodiumDuelCard — Spareggi podio (1°/2°, 3°/4° e posizioni più basse),
 * generico per tornei classic (classifica unica) e per la Finale (Final 4)
 * dei tornei a gironi.
 *
 * Mostra duelli di spareggio per tutti i pareggi rilevati dalla classifica
 * (per soli punti). Usa l'API backend quando disponibile, altrimenti calcola
 * i pareggi lato client dalle standings.
 */
import { useState, useEffect, useMemo } from 'react'
import { Swords, Dices, Trophy, ChevronDown } from 'lucide-react'
import CircuitThumbnail from '@/components/common/CircuitThumbnail'
import GroupRaceForm from '@/components/tournaments/GroupRaceForm'

const DuelBlock = ({ title, tie, groupName, phase, playerMap, races, isOpen, onToggle, bestOfThree, children, circuits, characters }) => {
    const tiedPlayers = tie.tied.map((id) => playerMap.get(id)).filter(Boolean)
    const duelRaces = (races ?? []).filter((r) => r.is_duello && r.phase === phase && r.group_name === groupName)

    const wins = new Map()
    tie.tied.forEach((id) => wins.set(id, 0))
    duelRaces.forEach((race) => {
        const winnerResult = race.results?.find((r) => r.position === 1)
        if (winnerResult && wins.has(winnerResult.player_id)) {
            wins.set(winnerResult.player_id, (wins.get(winnerResult.player_id) ?? 0) + 1)
        }
    })

    const resolved = tie.winner_id != null
    const winnerPlayer = resolved ? playerMap.get(tie.winner_id) : null

    const circuitsMap = useMemo(() => {
        const m = new Map()
        ;(circuits ?? []).forEach((c) => m.set(c.id, c))
        return m
    }, [circuits])

    const charactersMap = useMemo(() => {
        const m = new Map()
        ;(characters ?? []).forEach((c) => m.set(c.id, c))
        return m
    }, [characters])

    const duelPoints = useMemo(() => {
        const pts = new Map()
        tie.tied.forEach((id) => pts.set(id, 0))
        duelRaces.forEach((race) => {
            race.results?.forEach((r) => {
                if (pts.has(r.player_id)) {
                    pts.set(r.player_id, (pts.get(r.player_id) ?? 0) + (r.points ?? 0))
                }
            })
        })
        return pts
    }, [duelRaces, tie.tied])

    const [showHistory, setShowHistory] = useState(false)

    return (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-card p-4 space-y-3">
            <p className="text-sm text-slate-600 dark:text-muted-foreground">
                <span className="font-black text-slate-900 dark:text-foreground">{title}</span>:
                {' '}pareggio su punti tra{' '}
                <span className="font-black text-amber-600 dark:text-amber-400">
                    {tiedPlayers.map((p) => p.nickname).join(', ')}
                </span>.
            </p>

            {duelRaces.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                    {tiedPlayers.map((p) => (
                        <span key={p.id} className="font-black text-slate-700 dark:text-slate-300">
                            {p.nickname}: {wins.get(p.id) ?? 0} vittorie
                        </span>
                    ))}
                </div>
            )}

            {resolved ? (
                <>
                    <p className="flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-400">
                        <Trophy size={14} /> {winnerPlayer?.nickname ?? '—'} vince lo spareggio
                    </p>
                    {duelRaces.length > 0 && (
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => setShowHistory(!showHistory)}
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600 hover:text-amber-500 transition"
                            >
                                <ChevronDown size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                                {showHistory ? 'Nascondi storico' : 'Mostra storico gare spareggio'}
                            </button>
                            {showHistory && (
                                <div className="space-y-3 pl-2 border-l-2 border-amber-200 dark:border-amber-500/30">
                                    {[...duelRaces].sort((a, b) => (a.race_order ?? 0) - (b.race_order ?? 0)).map((race) => {
                                        const circuit = circuitsMap.get(race.circuit_id)
                                        return (
                                            <div key={race.id} className="rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card p-3 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Gara {race.race_order}</span>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-muted px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-muted-foreground">
                                                        <CircuitThumbnail circuit={circuit} size="xs" />
                                                        {circuit?.name ?? `Circuito #${race.circuit_id}`}
                                                    </span>
                                                </div>
                                                {[...(race.results ?? [])].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).map((result) => {
                                                    const character = charactersMap.get(result.character_id)
                                                    const player = playerMap.get(result.player_id)
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
                                    {/* Riepilogo punti totali */}
                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                        {tiedPlayers.map((p) => (
                                            <span key={p.id} className="font-black text-slate-600 dark:text-slate-400">
                                                {p.nickname}: {duelPoints.get(p.id) ?? 0} pt totali
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition active:scale-95"
                    >
                        <Dices size={14} />
                        {isOpen ? 'Annulla' : `Genera gara di spareggio (pista random)${bestOfThree && duelRaces.length > 0 ? ` — gara ${duelRaces.length + 1}` : ''}`}
                    </button>
                    {isOpen && (
                        <div className="rounded-2xl border border-slate-200 dark:border-border bg-slate-50/60 dark:bg-muted/30 p-4">
                            {children}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

const PodiumDuelCard = ({
    tournament, players, circuits, characters, onRefresh,
    fetchTies, phase, groupName1_2, groupName3_4, useClientFallback = true,
    headerLabel = 'Spareggi Podio', headerTitle = 'Pareggio in classifica', positionOffset = 0,
}) => {
    const [ties, setTies] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeKey, setActiveKey] = useState(null)

    const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

    // Rilevamento pareggi lato client dalle standings (per punti, vittorie e podi
    // — come il backend). Valido SOLO per i tornei classic: tournament.standings
    // somma i punti su TUTTE le gare del torneo senza distinguere fase/girone, e
    // per la Finale dei tornei a gironi (group_stage) questo aggregherebbe
    // erroneamente i punti dei gironi con quelli della Finale, calcolando
    // pareggi/duelli inesistenti — vedi useClientFallback=false in FinalsPodiumDuelCard.
    const clientTies = useMemo(() => {
        if (!useClientFallback || !tournament?.standings?.length) return { top2: null, top4: null, others: [] }
        const groups = new Map()
        tournament.standings.forEach((s, idx) => {
            const key = `${s.points}|${s.raceWins ?? 0}|${s.podiums ?? 0}`
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push({ playerId: s.playerId, index: idx })
        })
        const blocks = []
        for (const [, players] of groups) {
            if (players.length > 1) {
                blocks.push({
                    tied: players.map(p => p.playerId),
                    start_position: players[0].index + 1,
                    end_position: players[players.length - 1].index + 1,
                })
            }
        }
        const top2 = blocks.find(b => b.start_position === 1) ?? null
        const top4 = blocks.find(b => b.start_position === 3) ?? null
        const others = blocks.filter(b => b !== top2 && b !== top4)
        return {
            top2: top2 ? { tied: top2.tied, winner_id: null, order: null, start_position: 1, end_position: top2.end_position } : null,
            top4: top4 ? { tied: top4.tied, winner_id: null, order: null, start_position: 3, end_position: top4.end_position } : null,
            others: others.map(b => ({
                tied: b.tied, winner_id: null, order: null,
                group_name: `duello_podio_${b.start_position}_${b.end_position}`,
                start_position: b.start_position, end_position: b.end_position,
            })),
        }
    }, [tournament?.standings, useClientFallback])

    useEffect(() => {
        let active = true
        setLoading(true)
        fetchTies(tournament.id)
            .then((res) => { if (active) setTies(res.data) })
            .catch(() => { if (active) setTies(null) })
            .finally(() => { if (active) setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournament.id, tournament.races, tournament.winner_id])

    // Unisce API ties (se presenti) con detection client-side:
    // l'API ha precedenza (può indicare duelli risolti con winner_id).
    // Arricchisce i tie API con start_position/end_position dal client quando mancano.
    const mergedTies = useMemo(() => {
        const api = ties
        const client = clientTies

        const enrich = (tie, defaultPos) => {
            if (!tie) return null
            if (tie.start_position != null) return tie
            return { ...tie, start_position: defaultPos, end_position: defaultPos + (tie.tied?.length ?? 1) - 1 }
        }

        const top2 = enrich(api?.top2 ?? client?.top2, 1)
        const top4 = enrich(api?.top4 ?? client?.top4, 3)

        const apiOthers = api?.others ?? []
        const clientOthers = client?.others ?? []
        const apiKeys = new Set(
            apiOthers.map(t => `${t.start_position ?? '?'}-${t.end_position ?? '?'}`)
        )
        const mergedOthers = [
            ...apiOthers.map(t => enrich(t, t.start_position ?? 5)),
            ...clientOthers.filter(t => {
                const key = `${t.start_position}-${t.end_position}`
                return !apiKeys.has(key)
            }),
        ]

        return { top2, top4, others: mergedOthers }
    }, [ties, clientTies])

    // Anche dopo la conclusione del torneo (vincitore decretato in automatico
    // non appena l'ultimo spareggio si risolve), la card resta visibile per
    // mostrare l'esito — altrimenti l'admin non vede mai la conferma "vince
    // lo spareggio" perché la sezione scompare nello stesso refresh in cui
    // il torneo si conclude.
    if (tournament.status === 'da_svolgere') return null

    const mergedOthers = mergedTies?.others ?? []
    if (!mergedTies?.top2 && !mergedTies?.top4 && mergedOthers.length === 0) return null

    return (
        <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-900/10 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
                <Swords size={16} className="text-amber-500 shrink-0" />
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">{headerLabel}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-foreground">{headerTitle}</h3>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-muted-foreground leading-relaxed">
                        I duelli risolvono le posizioni occupate da due o più giocatori a pari merito, indipendentemente dal podio. Le gare di spareggio <strong>non assegnano punti</strong> in classifica.
                    </p>
                </div>
            </div>

            {[mergedTies.top2, mergedTies.top4, ...mergedOthers].filter(Boolean).map((tie) => {
                // pos/endPos (SENZA positionOffset) identificano il blocco
                // all'interno del proprio bracket (Finale o Consolazione) e
                // decidono il group_name — devono restare quelli "reali",
                // altrimenti (es. Consolazione con offset 4) il confronto con
                // "pos === 1" fallirebbe e si genererebbe un group_name
                // diverso da quello che il backend si aspetta, e il duello
                // non si risolverebbe mai. positionOffset si applica SOLO al
                // testo mostrato (displayPos), per indicare la posizione
                // generale di torneo (es. 5°/6° invece di 1°/2° interni alla
                // Consolazione).
                const pos = tie.start_position ?? 1
                const endPos = tie.end_position ?? pos
                const displayPos = pos + positionOffset
                const displayEndPos = endPos + positionOffset
                const title = displayPos === displayEndPos
                    ? `${displayPos}° posto — primo a 3 vittorie`
                    : `${displayPos}° / ${displayEndPos}° posto — primo a 3 vittorie`
                // Usa SEMPRE il group_name esatto della tie (pos===1 → 1°/2°,
                // pos===3 → 3°/4°, altrimenti il nome dinamico): un confronto
                // "pos <= 2" / "pos <= 4" classificherebbe erroneamente una
                // tie che parte, es., dalla 2ª posizione come "1°/2°",
                // creando le gare con un group_name diverso da quello che il
                // backend si aspetta — il duello non si sarebbe mai risolto.
                const effectiveGroupName = tie.group_name || (pos === 1 ? groupName1_2 : pos === 3 ? groupName3_4 : `duello_podio_${pos}_${endPos}`)
                const isBestOfThree = pos === 1 && tie.tied?.length === 2

                return (
                    <DuelBlock
                        key={effectiveGroupName}
                        title={title}
                        tie={tie}
                        groupName={effectiveGroupName}
                        phase={phase}
                        playerMap={playerMap}
                        races={tournament.races}
                        circuits={circuits}
                        characters={characters}
                        bestOfThree={isBestOfThree}
                        isOpen={activeKey === effectiveGroupName}
                        onToggle={() => setActiveKey((k) => (k === effectiveGroupName ? null : effectiveGroupName))}
                    >
                        <GroupRaceForm
                            tournament={tournament}
                            activeGroupPlayers={tie.tied.map((id) => playerMap.get(id)).filter(Boolean)}
                            circuits={circuits}
                            characters={characters}
                            phase={phase}
                            groupName={effectiveGroupName}
                            randomizeCircuit
                            onCreated={() => { setActiveKey(null); onRefresh() }}
                        />
                    </DuelBlock>
                )
            })}
        </div>
    )
}

export default PodiumDuelCard
