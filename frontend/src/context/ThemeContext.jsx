import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'kart_theme_preference'

function getInitialMode() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return true
    if (stored === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }) {
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

    const value = useMemo(() => ({ dark, toggle }), [dark, toggle])
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
    return ctx
}
