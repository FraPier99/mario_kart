import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'kart_theme_preference'

function getInitialMode() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return true
    if (stored === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useDarkMode() {
    const [dark, setDark] = useState(getInitialMode)

    useEffect(() => {
        const root = document.documentElement
        if (dark) {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
    }, [dark])

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = (e) => {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored) {
                setDark(e.matches)
            }
        }
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    const toggle = useCallback(() => {
        setDark((prev) => {
            const next = !prev
            localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
            return next
        })
    }, [])

    return { dark, toggle }
}
