import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { notificationsApi, schedineApi } from '@/services/apiClient'
import { useAuth } from './AuthContext'

const NotificationsContext = createContext(null)

// Stato/fetch centralizzato: NotificationBell viene montato due volte in
// Navbar.jsx (versione desktop + versione mobile, entrambe sempre presenti
// nel DOM, solo una nascosta via CSS in base alla larghezza schermo) — prima
// ciascuna istanza aveva il proprio useEffect di polling, raddoppiando ogni
// chiamata (mount, ogni 45s, ad ogni ritorno sul tab). Centralizzando qui il
// fetch, le due campane condividono lo stesso stato e la stessa singola
// richiesta periodica.
export function NotificationsProvider({ children }) {
    const { isAuthenticated } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [pendingSchedine, setPendingSchedine] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)

    const reload = useCallback(async () => {
        setLoading(true)
        try {
            const [nr, sr] = await Promise.allSettled([
                notificationsApi.list(),
                schedineApi.pendingNotifications(),
            ])
            const notifData = nr.status === 'fulfilled' ? nr.value.data : null
            const pending = sr.status === 'fulfilled' ? (sr.value.data ?? []) : []

            const rawNotifs = Array.isArray(notifData?.notifications)
                ? notifData.notifications
                : Array.isArray(notifData) ? notifData : []
            // "schedina_pending" persistente duplica il promemoria live
            // (pendingSchedine, sotto): quest'ultimo è sempre aggiornato e
            // scompare da solo a schedina compilata, quindi è l'unica fonte
            // da mostrare per questo tipo di promemoria.
            const notifs = rawNotifs.filter((n) => n.type !== 'schedina_pending')
            const unread = notifs.filter((n) => !n.is_read).length

            setNotifications(notifs)
            setPendingSchedine(Array.isArray(pending) ? pending : [])
            setUnreadCount(unread + (Array.isArray(pending) ? pending.length : 0))
        } catch { /* notifiche non disponibili */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => {
        if (!isAuthenticated) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setNotifications([])
            setPendingSchedine([])
            setUnreadCount(0)
            return undefined
        }
        reload()
        const interval = setInterval(() => reload(), 45000)
        const onVisible = () => { if (document.visibilityState === 'visible') reload() }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [isAuthenticated, reload])

    const value = useMemo(() => ({
        notifications, setNotifications,
        pendingSchedine, setPendingSchedine,
        unreadCount, setUnreadCount,
        loading, reload,
    }), [notifications, pendingSchedine, unreadCount, loading, reload])

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    )
}

export const useNotifications = () => {
    const ctx = useContext(NotificationsContext)
    if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
    return ctx
}
