import Navbar from "./Navbar";
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useCelebration } from '@/context/CelebrationContext'
import { useProfileTheme } from '@/hooks/useProfileTheme'
import { useTheme } from '@/context/ThemeContext'
import GlobalCelebrationOverlay from '@/components/common/GlobalCelebrationOverlay'
import PenaltyRulesAnnouncement from '@/components/tournaments/PenaltyRulesAnnouncement'
import sfondo from '@/assets/sfondo.jpg'


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
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <img src={sfondo} alt="" className="h-full w-full object-cover opacity-35 blur-[2px] dark:opacity-20" />
            </div>
            <div className="pointer-events-none fixed inset-0" style={{ backgroundImage: 'var(--mk-page-overlay)' }} />
            <div className="relative z-10 flex min-h-screen flex-col">
                <Navbar />
                <div className="mx-auto w-full max-w-7xl px-4 pt-4">
                    <PenaltyRulesAnnouncement />
                </div>
                <main className="grow animate-fade-in">
                    {children}
                </main>
                <footer className="py-6 text-center text-xs text-slate-400 dark:text-muted-foreground">
                    © Francesco Pierucci — Tutti i diritti riservati.
                </footer>
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
