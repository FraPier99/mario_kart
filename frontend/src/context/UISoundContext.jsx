import { createContext, useContext, useCallback, useEffect, useRef } from 'react'
import {
    preloadMkdsUISounds,
    isMkdsUiLoaded,
    playMkdsConfirm,
    playMkdsDenied,
    playMkdsSelect,
    playMkdsNextButton,
    playMkdsBack,
    playMkdsToggleOn,
    playMkdsToggleOff,
    playMkdsStartRace,
    playMkdsWfcError,
    playMkdsCourseDetermined,
    playMkdsCupUnlocked,
    playMkdsBalloonPop,
    playMkdsBalloonGet,
    playMkdsShineGet,
    playMkdsCharacterVoice,
} from '@/lib/mkdsSounds'

const UISoundContext = createContext(null)

export const UISoundProvider = ({ children }) => {
    const preloaded = useRef(false)

    useEffect(() => {
        if (!preloaded.current && !isMkdsUiLoaded()) {
            preloaded.current = true
            preloadMkdsUISounds()
        }
    }, [])

    const playConfirm = useCallback(() => playMkdsConfirm(), [])
    const playDenied = useCallback(() => playMkdsDenied(), [])
    const playSelect = useCallback(() => playMkdsSelect(), [])
    const playNextButton = useCallback(() => playMkdsNextButton(), [])
    const playBack = useCallback(() => playMkdsBack(), [])
    const playToggleOn = useCallback(() => playMkdsToggleOn(), [])
    const playToggleOff = useCallback(() => playMkdsToggleOff(), [])
    const playStartRace = useCallback(() => playMkdsStartRace(), [])
    const playError = useCallback(() => playMkdsWfcError(), [])
    const playCourseDetermined = useCallback(() => playMkdsCourseDetermined(), [])
    const playUnlock = useCallback(() => playMkdsCupUnlocked(), [])
    const playNotification = useCallback(() => playMkdsBalloonPop(), [])
    const playNotificationPositive = useCallback(() => playMkdsBalloonGet(), [])
    const playNotificationSpecial = useCallback(() => playMkdsShineGet(), [])
    const playCharacterVoice = useCallback((name) => playMkdsCharacterVoice(name), [])

    const withSound = useCallback((soundFn, handler) => {
        return (...args) => {
            soundFn()
            handler?.(...args)
        }
    }, [])

    const value = {
        playConfirm,
        playDenied,
        playSelect,
        playNextButton,
        playBack,
        playToggleOn,
        playToggleOff,
        playStartRace,
        playError,
        playCourseDetermined,
        playUnlock,
        playNotification,
        playNotificationPositive,
        playNotificationSpecial,
        playCharacterVoice,
        withSound,
    }

    return (
        <UISoundContext.Provider value={value}>
            {children}
        </UISoundContext.Provider>
    )
}

export const useUISound = () => {
    const ctx = useContext(UISoundContext)
    if (!ctx) {
        throw new Error('useUISound must be used within a UISoundProvider')
    }
    return ctx
}
