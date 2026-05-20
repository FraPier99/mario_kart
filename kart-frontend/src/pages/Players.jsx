import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PlayerCard from '@/components/PlayerCard'
import ModalPlayer from '@/components/ModalPlayer'
import { useAppData } from '@/context/AppDataContext'
import ApiBanner from '@/components/common/ApiBanner'

const Players = () => {
    const { players, statsByPlayerId, loading, errorMessage, refresh } = useAppData()
    const [selectedPlayer, setSelectedPlayer] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const filteredPlayers = useMemo(() => {
        if (!searchTerm.trim()) return players
        const term = searchTerm.toLowerCase()
        return players.filter((p) =>
            p.nickname.toLowerCase().includes(term) ||
            p.first_name.toLowerCase().includes(term) ||
            p.last_name.toLowerCase().includes(term)
        )
    }, [players, searchTerm])

    const handlePlayerClick = (player) => {
        setSelectedPlayer(player)
        setIsModalOpen(true)
    }

    return (
        <AppLayout>
            <div className="mx-auto flex max-w-7xl flex-col items-center px-4 pb-8 pt-12 text-center">
                <h1 className="mb-3 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-5xl">
                    Roster Giocatori
                </h1>
                <p className="max-w-md text-base font-medium leading-relaxed text-slate-500 dark:text-muted-foreground">
                    Ecco i piloti ufficiali attivi e pronti a sfidarsi nella <span className="font-bold text-emerald-600">Lega Kart</span>!
                </p>
                <div className="mt-6 h-1 w-24 rounded-full bg-linear-to-r from-emerald-500 to-teal-500"></div>

                <div className="relative mt-6 w-full max-w-sm">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cerca giocatore..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted py-3 pe-4 ps-10 outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            <div className="mx-auto mt-8 w-full max-w-7xl px-4">
                <ApiBanner
                    title="Errore caricamento roster"
                    message={errorMessage}
                    action={errorMessage ? (
                        <button
                            type="button"
                            onClick={refresh}
                            className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
                        >
                            Riprova
                        </button>
                    ) : null}
                />
            </div>

            {loading ? (
                <div className="mx-auto mt-8 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card px-8 py-10 text-slate-500 dark:text-muted-foreground shadow-lg">
                    Caricamento giocatori...
                </div>
            ) : (
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 pb-12 md:grid-cols-3 lg:grid-cols-4">
                    <PlayerCard player={filteredPlayers} statsByPlayerId={statsByPlayerId} handlePlayerClick={handlePlayerClick} />

                    {isModalOpen && selectedPlayer && (
                        <ModalPlayer player={selectedPlayer} stats={statsByPlayerId.get(selectedPlayer.id)} onClose={() => setIsModalOpen(false)} />
                    )}
                </div>
            )}
        </AppLayout>
    )
}

export default Players