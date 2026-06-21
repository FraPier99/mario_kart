/**
 * FinalsPodiumDuelCard — Spareggi podio della Finale (Final 4) nei tornei a gironi.
 * Wrapper di PodiumDuelCard configurato sugli endpoint/group_name della Finale.
 */
import { tournamentsApi } from '@/services/apiClient'
import PodiumDuelCard from '@/components/tournaments/PodiumDuelCard'

const FINALS_DUELLO_PODIO_1_2 = 'finals_duello_podio_1_2'
const FINALS_DUELLO_PODIO_3_4 = 'finals_duello_podio_3_4'

const FinalsPodiumDuelCard = (props) => (
    <PodiumDuelCard
        {...props}
        fetchTies={(id) => tournamentsApi.finalsTies(id)}
        phase="finals"
        groupName1_2={FINALS_DUELLO_PODIO_1_2}
        groupName3_4={FINALS_DUELLO_PODIO_3_4}
        // tournament.standings somma i punti di TUTTE le gare del torneo
        // (gironi + semifinali + finale insieme): per la Finale userebbe un
        // pareggio/aggregato sbagliato. Qui si usano solo i dati dell'API
        // (get_finals_podium_ties), che calcola correttamente sulla sola
        // Finale (Final 4).
        useClientFallback={false}
    />
)

export default FinalsPodiumDuelCard
