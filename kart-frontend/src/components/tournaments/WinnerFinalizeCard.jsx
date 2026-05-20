import { useState } from 'react'
import { toast } from 'sonner'
import { Crown, Sparkles } from 'lucide-react'
import { getApiErrorMessage, tournamentsApi } from '@/services/apiClient'

const PARTICLE_COUNT = 12

const WinnerFinalizeCard = ({ tournament, leader, onFinalized }) => {
    const [celebrating, setCelebrating] = useState(false)

    const handleFinalize = async () => {
        if (!leader) {
            toast.error('Nessun leader disponibile da impostare come vincitore')
            return
        }

        setCelebrating(true)
        setTimeout(() => setCelebrating(false), 1200)

        try {
            await tournamentsApi.update(tournament.id, { winner_id: leader.playerId })
            toast.success('Vincitore finale impostato', {
                description: `${leader.nickname} ha vinto il torneo!`,
                icon: <Crown className="text-amber-500" />,
            })
            await onFinalized()
        }
        catch (error) {
            setCelebrating(false)
            const message = getApiErrorMessage(error, 'Chiusura torneo fallita')
            console.error('[WinnerFinalizeCard] finalize failed', error, { tournamentId: tournament.id, leader })
            toast.error('Impossibile impostare il vincitore finale', { description: message })
        }
    }

    return (
        <div className={`relative overflow-hidden rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 p-6 shadow-lg shadow-amber-100/60 dark:shadow-amber-950/30 transition-all duration-500 ${celebrating ? 'scale-[1.02] shadow-xl shadow-amber-400/40' : ''}`}>
            {celebrating && Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
                <div
                    key={i}
                    className="absolute bottom-0 left-1/2 h-2 w-2 rounded-full"
                    style={{
                        background: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'][i % 5],
                        left: `${20 + (i * 60) / PARTICLE_COUNT}%`,
                        animation: `celebration-particle 1s ease-out both`,
                        animationDelay: `${i * 0.08}s`,
                    }}
                />
            ))}
            {celebrating && (
                <div className="absolute inset-0 flex items-center justify-center bg-amber-500/10 backdrop-blur-xs z-10 animate-fade-in">
                    <div className="flex flex-col items-center gap-2">
                        <Crown size={48} className="text-amber-500 animate-bounce-in" />
                        <p className="text-lg font-black uppercase tracking-widest text-amber-700 dark:text-amber-200">Campione!</p>
                    </div>
                </div>
            )}
            <div className={`relative z-0 ${celebrating ? 'opacity-20 blur-xs' : ''} transition-all duration-300`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">
                            <Sparkles size={16} />
                            Chiusura torneo
                        </h3>
                        <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/70">
                            Quando hai terminato l'ultima gara, imposta il leader attuale come vincitore finale.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleFinalize}
                        disabled={!leader || celebrating}
                        className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Imposta vincitore finale
                    </button>
                </div>

                <div className="mt-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 p-4 text-sm text-slate-700 dark:text-slate-300">
                    <div className="font-black text-slate-900 dark:text-foreground">Leader attuale: {leader?.nickname ?? 'Nessun dato'}</div>
                    <div className="mt-1">Punti: {leader?.points ?? 0} | Gare vinte: {leader?.raceWins ?? 0} | Podi: {leader?.podiums ?? 0}</div>
                </div>
            </div>
        </div>
    )
}

export default WinnerFinalizeCard
