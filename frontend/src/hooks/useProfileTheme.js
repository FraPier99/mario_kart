import { useEffect, useMemo } from 'react'
import { getProfileTheme } from '@/lib/profileTheme'

export function useProfileTheme(user, charactersById, dark = false) {
    const theme = useMemo(() => getProfileTheme(user, charactersById, dark), [user, charactersById, dark])

    useEffect(() => {
        const root = document.documentElement

        root.style.setProperty('--mk-primary', theme.accent)
        root.style.setProperty('--mk-primary-soft', theme.accentSoft)
        root.style.setProperty('--mk-primary-strong', theme.accentStrong)
        root.style.setProperty('--mk-primary-glow', theme.accentGlow)
        root.style.setProperty('--mk-page-bg', theme.pageBackground)
        root.style.setProperty('--mk-page-overlay', theme.pageOverlay)
        root.style.setProperty('--mk-card-bg', theme.cardBackground)
        root.style.setProperty('--mk-navbar-bg', theme.navbarBackground)
        root.style.setProperty('--mk-border', theme.border)
        root.style.setProperty('--mk-text-soft', theme.textSoft)
        root.style.setProperty('--mk-text-strong', theme.textStrong)

        root.dataset.mkTheme = theme.name

        return () => {
            root.style.removeProperty('--mk-primary')
            root.style.removeProperty('--mk-primary-soft')
            root.style.removeProperty('--mk-primary-strong')
            root.style.removeProperty('--mk-primary-glow')
            root.style.removeProperty('--mk-page-bg')
            root.style.removeProperty('--mk-page-overlay')
            root.style.removeProperty('--mk-card-bg')
            root.style.removeProperty('--mk-navbar-bg')
            root.style.removeProperty('--mk-border')
            root.style.removeProperty('--mk-text-soft')
            root.style.removeProperty('--mk-text-strong')
            if (root.dataset.mkTheme === theme.name) {
                delete root.dataset.mkTheme
            }
        }
    }, [theme])

    return theme
}
