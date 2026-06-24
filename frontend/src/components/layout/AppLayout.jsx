import Navbar from "./Navbar";
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useCelebration } from '@/context/CelebrationContext'
import { useProfileTheme } from '@/hooks/useProfileTheme'
import { useTheme } from '@/context/ThemeContext'
import GlobalCelebrationOverlay from '@/components/common/GlobalCelebrationOverlay'
import MaintenanceBanner from '@/components/common/MaintenanceBanner'


const AppLayout  =({children})=>{
    const { user } = useAuth()
    const { charactersById } = useAppData()
    const { dark } = useTheme()
    const { winnerData, closeCelebration } = useCelebration()
    useProfileTheme(user, charactersById, dark)

    return (
        <div
            className="relative min-h-screen flex flex-col overflow-hidden"
            style={{ backgroundImage: 'var(--mk-page-bg)' }}
        >
            <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'var(--mk-page-overlay)' }} />
            <div className="relative z-10 flex min-h-screen flex-col">
                <MaintenanceBanner />
                <Navbar />
                <main className="grow animate-fade-in">
                    {children}
                </main>
            </div>

            {winnerData && (
                <GlobalCelebrationOverlay
                    leader={winnerData.leader}
                    standings={winnerData.standings}
                    tournament={winnerData.tournament}
                    onClose={closeCelebration}
                />
            )}
        </div>
    )
}

export default AppLayout
