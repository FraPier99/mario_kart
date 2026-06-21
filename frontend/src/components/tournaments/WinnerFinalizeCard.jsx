import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { getApiErrorMessage, tournamentsApi } from '@/services/apiClient'

const getStatusLabel = (status) => {
    if (status === 'da_svolgere') return 'da svolgere'
    if (status === 'concluso') return 'concluso'
    if (status === 'finito') return 'finito'
    return 'in corso'
}

const WinnerFinalizeCard = ({ tournament, leader, onFinalized, onReplayCelebration }) => {
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [ties, setTies] = useState(null)

    const totalRaces = Number(tournament?.n_races ?? 0)
    const playedRaces = Number(tournament?.raceCount ?? tournament?.races?.length ?? 0)
    const missingRaces = Math.max(0, totalRaces - playedRaces)

    useEffect(() => {
        if (!tournament?.id) return undefined
        let active = true
        if (tournament.tournament_format === 'classic') {
            tournamentsApi.classicTies(tournament.id)
                .then((res) => { if (active) setTies(res.data) })
                .catch(() => { if (active) setTies(null) })
        } else if (tournament.tournament_format === 'group_stage') {
            // Finale e Consolazione hanno sistemi di spareggio podio
            // indipendenti (group_name distinti) — li combiniamo qui in
            // un'unica struttura {top2, top4, others}: top2/top4 sono quelli
            // della Finale (decidono il vincitore), quelli della
            // Consolazione finiscono in "others" con la posizione generale
            // reale (5°/6°, 7°/8°) invece delle posizioni 1°/2° interne al
            // bracket, che sarebbero confuse fuori contesto.
            Promise.all([
                tournamentsApi.finalsTies(tournament.id),
                tournamentsApi.consolationTies(tournament.id),
            ])
                .then(([finalsRes, consRes]) => {
                    if (!active) return
                    const finals = finalsRes.data ?? {}
                    const cons = consRes.data ?? {}
                    // Tutti i pareggi della Consolazione (top2/top4 E quelli su
                    // posizioni più basse, restituiti in "others" dal backend)
                    // finiscono qui con la posizione generale reale (5°/6°,
                    // 7°/8°, ecc. invece delle posizioni 1°/2° interne al
                    // bracket) — group_name resta quello del backend, serve
                    // solo a generare la gara di spareggio corretta.
                    const others = []
                    if (cons.top2) {
                        others.push({ ...cons.top2, start_position: 5, end_position: 4 + cons.top2.tied.length })
                    }
                    if (cons.top4) {
                        others.push({ ...cons.top4, start_position: 7, end_position: 7 + cons.top4.tied.length - 1 })
                    }
                    ;(cons.others ?? []).forEach((tie) => {
                        others.push({ ...tie, start_position: tie.start_position + 4, end_position: tie.end_position + 4 })
                    })
                    ;(finals.others ?? []).forEach((tie) => others.push(tie))
                    setTies({ top2: finals.top2 ?? null, top4: finals.top4 ?? null, others })
                })
                .catch(() => { if (active) setTies(null) })
        }
        return () => { active = false }
    }, [tournament?.id, tournament?.tournament_format, tournament?.races, tournament?.winner_id])

    const standingsById = useMemo(
        () => new Map((tournament?.standings ?? []).map((s) => [s.playerId, s.nickname])),
        [tournament?.standings]
    )

    // Rilevamento pareggi lato client dalle standings (funziona anche con gare
    // mancanti) — SOLO per i tornei classic: tournament.standings per i
    // tornei a gironi è un aggregato cross-fase (gironi+finale insieme) e
    // userebbe per calcolare pareggi inesistenti o fuorvianti rispetto al
    // vero stato di Finale/Consolazione (vedi fetch ties sopra).
    const clientSideTies = useMemo(() => {
        if (tournament?.tournament_format !== 'classic' || !tournament?.standings?.length) return { top2: null, top4: null, others: [] }
        const groups = new Map()
        tournament.standings.forEach((s, idx) => {
            const key = `${s.points}`
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
            top2: top2 ? { tied: top2.tied, order: null } : null,
            top4: top4 ? { tied: top4.tied, order: null } : null,
            others: others.map(b => ({ tied: b.tied, order: null, group_name: `duello_podio_${b.start_position}_${b.end_position}`, start_position: b.start_position, end_position: b.end_position })),
        }
    }, [tournament])

    // Unisce API ties (se presenti) con detection client-side:
    // - Se l'API riporta un pareggio NON risolto (order == null), lo mostra
    // - Se l'API non riporta pareggi ma il client ne vede (standings), li mostra
    // - Se l'API riporta pareggi risolti (order != null), li ignora
    const effectiveTies = useMemo(() => {
        const api = ties
        const client = clientSideTies

        const unresolved = (t) => t && t.order == null

        const top2 = api?.top2 != null
            ? (api.top2.order == null ? api.top2 : null)
            : (client?.top2?.order == null ? client.top2 : null)
        const top4 = api?.top4 != null
            ? (api.top4.order == null ? api.top4 : null)
            : (client?.top4?.order == null ? client.top4 : null)

        const apiOthers = (api?.others ?? []).filter(unresolved)
        const clientOthers = (client?.others ?? []).filter(unresolved)
        const apiKeys = new Set(apiOthers.map(t => `${t.start_position}-${t.end_position}`))
        const mergedOthers = [
            ...apiOthers,
            ...clientOthers.filter(t => !apiKeys.has(`${t.start_position}-${t.end_position}`)),
        ]

        return { top2, top4, others: mergedOthers }
    }, [ties, clientSideTies])

    const tiedTop2 = effectiveTies?.top2
    const tiedTop4 = effectiveTies?.top4
    const tiedOthers = effectiveTies?.others ?? []
    const hasUnresolvedTie = Boolean(tiedTop2 || tiedTop4 || tiedOthers.length > 0)

    const tiedBlocks = useMemo(() => {
        const blocks = []
        if (tiedTop2) blocks.push({ key: 'top2', label: tiedTop2.tied.length === 2 ? '1°/2° posto' : '1° posto', tied: tiedTop2.tied, start_position: 1, end_position: tiedTop2.tied.length })
        if (tiedTop4) blocks.push({ key: 'top4', label: '3°/4° posto', tied: tiedTop4.tied, start_position: 3, end_position: 3 + tiedTop4.tied.length - 1 })
        tiedOthers.forEach(t => blocks.push({ key: t.group_name, label: `${t.start_position}°/${t.end_position}° posto`, tied: t.tied, ...t }))
        return blocks
    }, [tiedTop2, tiedTop4, tiedOthers])

    const handleFinalize = async () => {
        if (!leader) {
            toast.error('Nessun leader disponibile da impostare come vincitore')
            return
        }

        try {
            await tournamentsApi.update(tournament.id, { winner_id: leader.playerId, status: 'concluso' })
            await onFinalized()
        }
        catch (error) {
            const message = getApiErrorMessage(error, 'Chiusura torneo fallita')
            console.error('[WinnerFinalizeCard] finalize failed', error, { tournamentId: tournament.id, leader })
            toast.error('Impossibile impostare il vincitore finale', { description: message })
        }
    }

    const handleFinalizeClick = () => {
        if (isConcluded) {
            onReplayCelebration?.()
            return
        }

        if (missingRaces > 0 || hasUnresolvedTie) {
            setShowConfirmModal(true)
            return
        }
        handleFinalize()
    }

    const leaderImg = leader?.img_url || buildAvatarPlaceholder(leader?.nickname ?? '?')
    const isConcluded = tournament?.status === 'concluso'
    const officialWinner = tournament?.winner ?? (isConcluded ? leader : null)

    return (
        <div className="relative overflow-hidden rounded-3xl border border-amber-200 dark:border-amber-800 bg-linear-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/60 dark:to-amber-900/30 p-6 shadow-lg shadow-amber-100/60 dark:shadow-amber-950/30 transition-all duration-700">

            {/* Content */}
            <div className="relative z-0 transition-all duration-500">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">
                            <Sparkles size={16} />
                            Decreta vincitore
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={handleFinalizeClick}
                        disabled={isConcluded || !leader}
                        className="relative rounded-2xl bg-linear-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-all duration-300 hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/40 disabled:cursor-not-allowed disabled:opacity-60 animate-pulse-glow"
                    >
                        <span className="relative z-0">{isConcluded ? 'Vincitore già decretato' : 'Decreta vincitore'}</span>
                    </button>
                    {isConcluded && (
                        <button
                            type="button"
                            onClick={() => onReplayCelebration?.()}
                            className="rounded-2xl border border-amber-300/50 bg-white/70 px-5 py-3 text-sm font-black uppercase tracking-widest text-amber-700 transition hover:bg-white"
                        >
                            Rivedi overlay
                        </button>
                    )}
                </div>

                <div className="mt-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 p-4 text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-3">
                        <img
                            src={leaderImg}
                            alt={leader?.nickname}
                            className="h-10 w-10 rounded-xl object-cover shrink-0"
                        />
                        <div>
                            <div className="font-black uppercase text-slate-900 dark:text-foreground">
                                {isConcluded ? 'Vincitore torneo' : 'Leader attuale'}: {officialWinner?.nickname ?? leader?.nickname ?? 'Nessun dato'}
                            </div>
                            <div className="mt-0.5 uppercase text-[10px] font-black tracking-[0.3em] text-slate-500 dark:text-slate-400">
                                Stato: {getStatusLabel(tournament?.status ?? 'in_corso')}
                            </div>
                            <div className="mt-0.5">Punti: {(officialWinner ?? leader)?.points ?? 0} | Gare vinte: {(officialWinner ?? leader)?.raceWins ?? 0} | Podi: {(officialWinner ?? leader)?.podiums ?? 0}</div>
                        </div>
                    </div>
                </div>
            </div>

            {showConfirmModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
                    onClick={() => setShowConfirmModal(false)}
                >
                    <div
                        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-slate-900/95 p-5 text-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <p className="text-lg font-black uppercase tracking-wide">Vuoi decretare il vincitore?</p>
                        <div className="mt-2 space-y-1.5 text-sm text-slate-200">
                            {missingRaces > 0 && (
                                <p>
                                    Mancano ancora <span className="font-black text-amber-300">{missingRaces}</span> {missingRaces === 1 ? 'gara' : 'gare'}.
                                </p>
                            )}
                            {tiedBlocks.map((block) => (
                                <p key={block.key}>
                                    Pareggio per il <span className="font-black text-amber-300">{block.label}</span> tra{' '}
                                    <span className="font-black text-amber-300">
                                        {block.tied.map((id) => standingsById.get(id) ?? '—').join(', ')}
                                    </span>.
                                </p>
                            ))}
                        </div>
                        {hasUnresolvedTie && (
                            <p className="mt-3 text-sm text-amber-300">
                                Ci sono pareggi in classifica. Risolvili nella sezione "Duelli spareggio" qui sotto oppure decreta comunque il vincitore.
                            </p>
                        )}
                        <div className="mt-5 flex gap-3">
                            {hasUnresolvedTie ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmModal(false)}
                                        className="flex-1 rounded-xl border border-amber-500/40 bg-amber-500/20 px-4 py-2 text-sm font-bold text-amber-300 transition hover:bg-amber-500/30"
                                    >
                                        Risolvi duelli spareggio
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowConfirmModal(false)
                                            handleFinalize()
                                        }}
                                        className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black uppercase tracking-wide text-slate-900 transition hover:bg-amber-400"
                                    >
                                        Decreta comunque il vincitore
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmModal(false)}
                                        className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowConfirmModal(false)
                                            handleFinalize()
                                        }}
                                        className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black uppercase tracking-wide text-slate-900 transition hover:bg-amber-400"
                                    >
                                        Conferma
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default WinnerFinalizeCard
