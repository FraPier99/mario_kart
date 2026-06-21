/**
 * ClassicPodiumDuelCard — Spareggi podio per tornei in formato classic (classifica unica).
 * Wrapper di PodiumDuelCard configurato sugli endpoint/group_name classic.
 */
import { tournamentsApi } from '@/services/apiClient'
import PodiumDuelCard from '@/components/tournaments/PodiumDuelCard'

const DUELLO_PODIO_1_2 = 'duello_podio_1_2'
const DUELLO_PODIO_3_4 = 'duello_podio_3_4'

const ClassicPodiumDuelCard = (props) => (
    <PodiumDuelCard
        {...props}
        fetchTies={(id) => tournamentsApi.classicTies(id)}
        phase={null}
        groupName1_2={DUELLO_PODIO_1_2}
        groupName3_4={DUELLO_PODIO_3_4}
    />
)

export default ClassicPodiumDuelCard
