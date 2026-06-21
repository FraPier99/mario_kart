import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const CelebrationContext = createContext(null)

export function CelebrationProvider({ children }) {
    const [winnerData, setWinnerData] = useState(null)

    const triggerCelebration = useCallback((leader, standings, tournament) => {
        setWinnerData({ leader, standings, tournament })
    }, [])

    const closeCelebration = useCallback(() => {
        setWinnerData(null)
    }, [])

    const value = useMemo(() => ({
        winnerData,
        triggerCelebration,
        closeCelebration,
    }), [winnerData, triggerCelebration, closeCelebration])

    return (
        <CelebrationContext.Provider value={value}>
            {children}
        </CelebrationContext.Provider>
    )
}

export const useCelebration = () => {
    const ctx = useContext(CelebrationContext)
    if (!ctx) throw new Error('useCelebration must be used inside CelebrationProvider')
    return ctx
}
