import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { useCelebration } from './CelebrationContext'
import { authStorage, tournamentsApi } from '@/services/apiClient'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// Finestra di "freschezza" per il recupero di celebrazioni mancate: prima
// che i socket funzionassero davvero (CORS), questo fallback non era mai
// realmente partito, quindi al primo login dopo il fix riemergeva il
// torneo concluso più vecchio non ancora "visto" — anche di settimane fa.
// Oltre questa finestra si marca come vista senza mostrare l'overlay,
// invece di festeggiare un torneo concluso da troppo tempo.
const CELEBRATION_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000

// Intervallo del polling di fallback quando il socket non è connesso. Prima
// girava ogni 15-30s per TUTTA la sessione di OGNI utente loggato,
// indipendentemente dal fatto che i socket funzionassero — col CORS dei
// socket ora fixato è quasi sempre del tutto ridondante (la push live basta),
// quindi qui parte solo se il socket non si è connesso entro qualche secondo,
// e con un intervallo molto più rilassato.
const FALLBACK_POLL_DELAY_MS = 60000
const FALLBACK_START_DELAY_MS = 5000

export function SocketProvider({ children }) {
    const { user, isAuthenticated } = useAuth()
    const { triggerCelebration } = useCelebration()
    const [isConnected, setIsConnected] = useState(false)
    const socketRef = useRef(null)
    const triggerRef = useRef(triggerCelebration)
    useEffect(() => { triggerRef.current = triggerCelebration }, [triggerCelebration])

    useEffect(() => {
        if (!isAuthenticated || !user) return undefined

        let active = true
        let connected = false
        let pollInterval = null

        const triggerConcluded = async () => {
            try {
                const res = await tournamentsApi.list()
                const concluded = (res.data ?? [])
                    .filter((t) => t.status === 'concluso' && t.winner_id)
                    .sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0))

                const latest = concluded[0]
                if (!latest) return false

                const seenKey = `kart_celebration_seen_${latest.id}_${user.id}`
                if (localStorage.getItem(seenKey) === '1') return false
                localStorage.setItem(seenKey, '1')

                const concludedAt = new Date(latest.last_phase_change_at ?? latest.date ?? 0).getTime()
                if (Date.now() - concludedAt > CELEBRATION_MAX_AGE_MS) return false

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
                if (active) triggerRef.current(leader, standings, { id: latest.id, name: latest.name })
                return true
            } catch { /* no concluded tournaments */ }
            return false
        }

        // Controllo immediato una sola volta al login, indipendente dal
        // socket: copre il caso "primo accesso dopo la fine del torneo".
        triggerConcluded()

        const startPolling = () => {
            if (pollInterval || !active) return
            pollInterval = setInterval(() => {
                if (!active || connected) return
                triggerConcluded()
            }, FALLBACK_POLL_DELAY_MS)
        }
        const stopPolling = () => {
            if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
        }
        // Dà al socket un attimo per connettersi prima di accendere il
        // polling — se si connette in tempo, il polling non parte mai.
        const fallbackTimer = setTimeout(() => { if (!connected) startPolling() }, FALLBACK_START_DELAY_MS)

        const token = authStorage.getToken()
        let socket = null
        if (token) {
            socket = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 2000,
            })

            socket.on('connect', () => {
                connected = true
                setIsConnected(true)
                stopPolling()
            })
            socket.on('disconnect', () => {
                connected = false
                setIsConnected(false)
                startPolling()
            })
            socket.on('connect_error', () => {
                connected = false
                setIsConnected(false)
            })

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
        }

        return () => {
            active = false
            clearTimeout(fallbackTimer)
            stopPolling()
            socket?.close()
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
