import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import TournamentForm from '@/components/tournaments/TournamentForm'
import { useAppData } from '@/context/AppDataContext'
import { authApi, tournamentsApi, getApiErrorMessage } from '@/services/apiClient'
import { toast } from 'sonner'
import ApiBanner from '@/components/common/ApiBanner'

const NewTournament = () => {
    const navigate = useNavigate()
    const { players, games, tournaments, loading, refresh, errorMessage } = useAppData()

    const [users, setUsers] = useState([])
    const [usersLoading, setUsersLoading] = useState(true)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUsersLoading(true)
        authApi.listUsers()
            .then((res) => setUsers(res.data ?? []))
            .catch(() => {})
            .finally(() => setUsersLoading(false))
    }, [])

    // Player IDs linked to superadmin accounts — must be excluded from participant selection
    const superadminPlayerIds = useMemo(
        () => users.filter((u) => u.role === 'superadmin' && u.player_id != null).map((u) => u.player_id),
        [users]
    )

    // Existing tournament names (lowercase) for client-side uniqueness check
    const existingTournamentNames = useMemo(
        () => tournaments.map((t) => t.name?.toLowerCase() ?? ''),
        [tournaments]
    )

    const handleCreateTournament = async (payload) => {
        try {
            if (!payload.name || !payload.date || !payload.game_id) {
                toast.error('Compila tutti i campi obbligatori')
                return
            }

            const response = await tournamentsApi.create(payload)

            if (!response?.data?.id) {
                throw new Error("Il backend non ha restituito l'id del torneo creato")
            }

            // I gironi vengono generati automaticamente e bilanciati dal backend
            // alla creazione del torneo: nessun passaggio di seeding manuale.
            toast.success('Torneo creato con successo')
            await refresh()
            navigate(`/tournaments/${response.data.id}`)
        } catch (error) {
            const message = getApiErrorMessage(error, 'Creazione torneo fallita')
            toast.error('Impossibile creare il torneo', { description: message })
        }
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-5xl px-4 py-12">
                <div className="mb-8 text-center">
                    <p className="font-title text-[10px] tracking-wide text-emerald-600">Nuovo torneo</p>
                    <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Crea un torneo</h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
                        Seleziona i partecipanti, assegna il gioco e poi gestisci gare e risultati dalla pagina dedicata.
                    </p>
                </div>

                <ApiBanner title="Errore caricamento dati" message={errorMessage} />

                <TournamentForm
                    players={players}
                    games={games}
                    onSubmit={handleCreateTournament}
                    submitLabel={(loading || usersLoading) ? 'Caricamento...' : 'Crea torneo'}
                    loading={loading || usersLoading}
                    existingTournamentNames={existingTournamentNames}
                    excludePlayerIds={superadminPlayerIds}
                />
            </section>
        </AppLayout>
    )
}

export default NewTournament
