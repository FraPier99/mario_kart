import { useEffect, useState } from 'react'

const formatRemaining = (ms) => {
    if (ms <= 0) return null
    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (days > 0) return `${days}g ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
}

/**
 * Conto alla rovescia live verso una deadline ISO. Aggiorna ogni secondo
 * finché la deadline non è passata, poi smette di ticchettare.
 */
export const useCountdown = (deadline) => {
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        if (!deadline) return undefined
        const target = new Date(deadline).getTime()
        if (Date.now() >= target) return undefined

        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [deadline])

    if (!deadline) {
        return { remainingMs: null, label: null, isPassed: false }
    }

    const remainingMs = new Date(deadline).getTime() - now
    return {
        remainingMs,
        label: formatRemaining(remainingMs),
        isPassed: remainingMs <= 0,
    }
}
