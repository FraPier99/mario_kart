import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import PlayerCard from '@/components/PlayerCard'
import { useAppData } from '@/context/AppDataContext'
import ApiBanner from '@/components/common/ApiBanner'
import { SkeletonCardGrid } from '@/components/common/Skeleton'
import { authApi, statsApi } from '@/services/apiClient'

const Players = () => {
    const { players, loading, errorMessage, refresh } = useAppData()
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const [users, setUsers] = useState([])
    const [bestBadgeByPlayerId, setBestBadgeByPlayerId] = useState(new Map())

    // /auth/community/users (a differenza di /auth/users, riservato al
    // superadmin) è raggiungibile da qualsiasi utente autenticato — serve
    // solo a risalire da player_id a user.id per il link al profilo dedicato.
    useEffect(() => {
        authApi.listCommunityUsers().then((res) => setUsers(res.data ?? [])).catch(() => {})
    }, [])

    // Un'unica chiamata bulk (non un fetch per giocatore) per lo stesso
    // stile "carta speciale" usato in dashboard/profilo pubblico/Home.
    useEffect(() => {
        statsApi.bestBadgesByPlayer()
            .then((res) => setBestBadgeByPlayerId(new Map((res.data ?? []).map((b) => [b.player_id, b]))))
            .catch(() => setBestBadgeByPlayerId(new Map()))
    }, [])

    const userIdByPlayerId = useMemo(() => {
        const map = new Map()
        users.forEach((u) => { if (u.player_id) map.set(u.player_id, u.id) })
        return map
    }, [users])

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
        const userId = userIdByPlayerId.get(player.id)
        if (userId) navigate(`/community/user/${userId}`)
    }

    return (
        <AppLayout>
            <div className="mx-auto max-w-7xl px-4 py-10">
                <div
                    className="rounded-3xl border border-slate-200 dark:border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 md:p-8"
                    style={{
                        // Motivo a scacchi diagonale, trasparente — pura decorazione
                        // CSS (nessun asset), richiama il tema "bandiera a scacchi"
                        // senza competere col contenuto (si somma al bg-white/80
                        // esistente, non lo sostituisce).
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(15,23,42,0.05) 0 12px, transparent 12px 24px), repeating-linear-gradient(-45deg, rgba(15,23,42,0.05) 0 12px, transparent 12px 24px)',
                        backgroundSize: '48px 48px',
                    }}
                >
                    <div className="flex flex-col items-center text-center">
                        <h1 className="mb-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">
                            ROSTER GIOCATORI
                        </h1>
                        <p className="max-w-md text-sm font-medium leading-relaxed text-slate-500 dark:text-muted-foreground">
                            Ecco i piloti ufficiali attivi e pronti a sfidarsi nella <span className="font-bold text-emerald-600 dark:text-emerald-400">Lega Kart</span>!
                        </p>
                        <div className="mt-4 h-0.5 w-16 rounded-full bg-linear-to-r from-emerald-500 to-teal-500" />

                        <div className="relative mt-4 w-full max-w-sm">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cerca giocatore..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted py-2.5 pe-4 ps-10 text-sm outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
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
                        <SkeletonCardGrid count={8} className="mt-4 pb-4" />
                    ) : (
                        <div className="mt-4 grid grid-cols-2 gap-3 pb-4 md:grid-cols-3 lg:grid-cols-4">
                            {filteredPlayers.length === 0 ? (
                                <div className="col-span-full rounded-3xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card px-8 py-12 text-center text-slate-500 dark:text-muted-foreground">
                                    Nessun giocatore presente nel database.
                                </div>
                            ) : (
                                <PlayerCard players={filteredPlayers} bestBadgeByPlayerId={bestBadgeByPlayerId} handlePlayerClick={handlePlayerClick} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    )
}

export default Players
