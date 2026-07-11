/**
 * OverallClassificaCard — Classifica generale combinata di un torneo a
 * gironi: Finale (1°-4°) seguita dalla Consolazione/"Finalina" (5°-N), in
 * un'unica lista ordinata. L'ordine arriva già risolto dal backend
 * (vedi GET /tournaments/{id}/group-stage/overall-classifica).
 */
import { useEffect, useRef, useState } from 'react'
import { Crown, Medal, Trophy } from 'lucide-react'
import { tournamentsApi } from '@/services/apiClient'
import RefreshButton from '@/components/common/RefreshButton'
import PodiumSteps from '@/components/stats/PodiumSteps'

const POSITION_ICON = ['🥇', '🥈', '🥉']
const FINALS_SLOTS = 4

const OverallClassificaCard = ({ tournament, playerMap, highlightPlayerId = null }) => {
    const [order, setOrder] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const mountedRef = useRef(true)
    useEffect(() => () => { mountedRef.current = false }, [])

    useEffect(() => {
        tournamentsApi.overallClassifica(tournament.id)
            .then((res) => { if (mountedRef.current) setOrder(res.data?.order ?? []) })
            .catch(() => { if (mountedRef.current) setOrder([]) })
            .finally(() => { if (mountedRef.current) setLoading(false) })
    }, [tournament.id, tournament.races, tournament.winner_id])

    const handleRefresh = () => {
        setRefreshing(true)
        tournamentsApi.overallClassifica(tournament.id)
            .then((res) => { if (mountedRef.current) setOrder(res.data?.order ?? []) })
            .catch(() => { if (mountedRef.current) setOrder([]) })
            .finally(() => { if (mountedRef.current) setRefreshing(false) })
    }

    if (loading || order.length === 0) return null

    // Il podio mostra già i primi 3 — la lista sotto parte dal 4° posto
    // per non ripeterli (nessun dato statistico extra disponibile qui,
    // solo posizione/nickname/avatar, quindi niente stats sul podio).
    const showPodium = tournament.status === 'concluso' && order.length >= 3
    const listOrder = showPodium ? order.slice(3) : order
    const listStartIndex = showPodium ? 3 : 0

    return (
        <div className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-amber-200/50 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-900/10 px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-amber-600 shrink-0" />
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">Classifica Generale</p>
                </div>
                <RefreshButton onClick={handleRefresh} loading={refreshing} />
            </div>
            {showPodium && (
                <div className="p-5 pb-0">
                    <PodiumSteps
                        players={order.slice(0, 3).map((playerId) => {
                            const player = playerMap.get(playerId)
                            return player ? { playerId, nickname: player.nickname, img_url: player.img_url } : null
                        }).filter(Boolean)}
                    />
                </div>
            )}
            <div className="divide-y divide-slate-100 dark:divide-border">
                {listOrder.map((playerId, idx) => {
                    const player = playerMap.get(playerId)
                    if (!player) return null
                    const position = listStartIndex + idx + 1
                    const isFirst = position === 1
                    const isMe = highlightPlayerId != null && playerId === highlightPlayerId
                    const isConsolation = position > FINALS_SLOTS
                    return (
                        <div
                            key={playerId}
                            className={`flex items-center gap-3 px-5 py-3 transition ${isFirst ? 'font-black' : ''} ${isMe ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-inset ring-amber-300/60 dark:ring-amber-500/30' : ''}`}
                        >
                            <span className="w-5 shrink-0 text-center text-sm">
                                {position <= 3 ? POSITION_ICON[position - 1] : <span className="text-xs font-black text-slate-400">{position}</span>}
                            </span>
                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border">
                                {player.img_url
                                    ? <img src={player.img_url} alt={player.nickname} className="h-full w-full object-cover" />
                                    : <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-500">{player.nickname?.charAt(0)?.toUpperCase()}</div>
                                }
                            </div>
                            <span className={`flex-1 min-w-0 truncate text-xs ${isFirst ? 'text-slate-900 dark:text-foreground' : 'text-slate-700 dark:text-slate-300'}`}>
                                {player.nickname}
                                {isFirst && <Crown size={10} className="inline ml-1 text-amber-500" />}
                                {isMe && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">Tu</span>}
                            </span>
                            <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider ${isConsolation ? 'text-slate-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {isConsolation ? 'Consolazione' : 'Finale'}
                            </span>
                            {position === FINALS_SLOTS + 1 && (
                                <Medal size={12} className="text-slate-300 shrink-0" />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default OverallClassificaCard
