import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const CelebrationContext = createContext(null)

export function CelebrationProvider({ children }) {
    const [winnerData, setWinnerData] = useState(null)

    // I tornei amichevoli (is_friendly) non hanno un vincitore ufficiale da
    // festeggiare — l'overlay/notifica non deve mai partire per loro. Il
    // backend già non crea notifiche né broadcast per questi tornei
    // (update_tournament/set_tournament_playoff_winner), ma i punti di
    // innesco lato client (WinnerFinalizeCard, il replay in
    // TournamentDetail, il fallback SocketContext al login) non
    // controllavano is_friendly ciascuno per conto proprio — centralizzato
    // qui, unico punto di verità per tutti i chiamanti.
    const triggerCelebration = useCallback((leader, standings, tournament) => {
        if (tournament?.is_friendly) return
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
