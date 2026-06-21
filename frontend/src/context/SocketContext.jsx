import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { useCelebration } from './CelebrationContext'
import { authStorage, tournamentsApi } from '@/services/apiClient'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function SocketProvider({ children }) {
    const { user, isAuthenticated } = useAuth()
    const { triggerCelebration } = useCelebration()
    const [isConnected, setIsConnected] = useState(false)
    const socketRef = useRef(null)
    const triggerRef = useRef(triggerCelebration)
    useEffect(() => { triggerRef.current = triggerCelebration }, [triggerCelebration])

    useEffect(() => {
        if (!isAuthenticated || !user) return undefined

        const token = authStorage.getToken()
        if (!token) return undefined

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        })

        let pollInterval = null

        const triggerConcluded = async () => {
            try {
                const res = await tournamentsApi.list()
                const concluded = (res.data ?? [])
                    .filter((t) => t.status === 'concluso' && t.winner_id)
                    .sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0))

                // Trova il più recente torneo non ancora visto
                const latest = concluded[0]
                if (!latest) return false

                const seenKey = `kart_celebration_seen_${latest.id}_${user.id}`
                if (localStorage.getItem(seenKey) === '1') {
                    // Tutti i tornei conclusi sono già stati visti → ferma il polling
                    if (pollInterval) clearInterval(pollInterval)
                    return false
                }
                localStorage.setItem(seenKey, '1')

                let leader = { playerId: latest.winner_id, nickname: 'Campione' }
                let standings = [leader]
                try {
                    const lb = await tournamentsApi.leaderboard(latest.id)
                    const lbData = lb.data ?? []
                    if (lbData.length) {
                        const w = lbData.find((p) => p.id === latest.winner_id) ?? lbData[0]
                        leader.nickname = w.nickname
                        standings = lbData.map((p) => ({
                            playerId: p.id, nickname: p.nickname, points: p.total_point ?? 0,
                        }))
                    }
                } catch { /* leaderboard not available */ }
                triggerRef.current(leader, standings, { id: latest.id, name: latest.name })
                return true
            } catch { /* no concluded tournaments */ }
            return false
        }

        socket.on('connect', async () => {
            setIsConnected(true)
            const found = await triggerConcluded()
            // Se c'è un torneo da mostrare, aspetta che l'utente lo chiuda
            // prima di ricontrollare. Altrimenti controlla una volta in ritardo
            // per sicurezza, poi ferma il polling.
            const delay = found ? 30000 : 5000
            pollInterval = setInterval(async () => {
                const done = await triggerConcluded()
                if (done) return
                clearInterval(pollInterval)
                pollInterval = null
            }, delay)
        })

        socket.on('disconnect', () => setIsConnected(false))
        socket.on('connect_error', () => setIsConnected(false))

        socket.on('tournament:winner', async (data) => {
            const seenKey = `kart_celebration_seen_${data.tournament_id}_${user.id}`
            if (localStorage.getItem(seenKey) === '1') return
            localStorage.setItem(seenKey, '1')

            const leader = {
                playerId: data.winner_id,
                nickname: data.winner_nickname,
                img_url: data.winner_img_url ?? null,
            }

            try {
                const [tournRes, lbRes] = await Promise.allSettled([
                    tournamentsApi.get(data.tournament_id),
                    tournamentsApi.leaderboard(data.tournament_id),
                ])
                const t = tournRes.status === 'fulfilled' ? tournRes.value.data ?? {} : {}
                const standings = t.standings?.length ? t.standings
                    : lbRes.status === 'fulfilled' && Array.isArray(lbRes.value.data) && lbRes.value.data.length
                        ? lbRes.value.data.map((p) => ({
                            playerId: p.id, nickname: p.nickname,
                            points: p.total_point ?? 0,
                        }))
                        : [leader]
                triggerRef.current(leader, standings, {
                    id: data.tournament_id, name: data.tournament_name, ...t,
                })
            } catch {
                triggerRef.current(leader, [leader], {
                    id: data.tournament_id, name: data.tournament_name,
                })
            }
        })

        socketRef.current = socket

        return () => {
            if (pollInterval) clearInterval(pollInterval)
            socket.close()
            socketRef.current = null
            setIsConnected(false)
        }
    }, [isAuthenticated, user])

    const value = useMemo(() => ({ isConnected }), [isConnected])

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => {
    const ctx = useContext(SocketContext)
    if (!ctx) throw new Error('useSocket must be used inside SocketProvider')
    return ctx
}
