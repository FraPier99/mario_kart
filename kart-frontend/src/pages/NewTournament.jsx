import { useNavigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import TournamentForm from '@/components/tournaments/TournamentForm'
import { useAppData } from '@/context/AppDataContext'
import { tournamentsApi } from '@/services/apiClient'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/services/apiClient'
import ApiBanner from '@/components/common/ApiBanner'

const NewTournament = () => {
    const navigate = useNavigate()
    const { players, games, loading, refresh, errorMessage } = useAppData()

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

            toast.success('Torneo creato con successo')
            await refresh()
            navigate(`/tournaments/${response.data.id}`)
        }
        catch (error) {
            const message = getApiErrorMessage(error, 'Creazione torneo fallita')
            console.error('[NewTournament] create failed', error, payload)
            toast.error('Impossibile creare il torneo', {
                description: message,
            })
        }
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-12">
                <div className="mb-8 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Nuovo torneo</p>
                    <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Crea un torneo usando i giocatori del DB</h1>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground">
                        Seleziona i partecipanti presenti nel database, assegna il gioco e poi passa alla pagina dedicata per creare gare, inserire risultati e chiudere il torneo con il vincitore finale.
                    </p>
                </div>

                <ApiBanner title="Errore caricamento dati" message={errorMessage} />

                <TournamentForm
                    players={players}
                    games={games}
                    onSubmit={handleCreateTournament}
                    submitLabel={loading ? 'Caricamento...' : 'Crea torneo'}
                    loading={loading}
                />
            </section>
        </AppLayout>
    )
}

export default NewTournament
