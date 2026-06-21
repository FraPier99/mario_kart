/**
 * ConsolationPodiumDuelCard — Spareggi podio della Consolazione/"Finalina"
 * nei tornei a gironi. DISTINTO da FinalsPodiumDuelCard: usa group_name
 * dedicati (finals_duello_consolazione_*) per non condividere lo stato con
 * gli eventuali pareggi della Finale — prima di questa card, un pareggio in
 * Consolazione non aveva alcun modo di essere risolto: l'unica UI esistente
 * (FinalsPodiumDuelCard) calcola i pareggi solo sulla Finale ("top"), e
 * riusare i suoi stessi group_name per la Consolazione faceva apparire un
 * duello come "già risolto" (in realtà era quello della Finale).
 */
import { tournamentsApi } from '@/services/apiClient'
import PodiumDuelCard from '@/components/tournaments/PodiumDuelCard'

const FINALS_DUELLO_CONSOLAZIONE_1_2 = 'finals_duello_consolazione_1_2'
const FINALS_DUELLO_CONSOLAZIONE_3_4 = 'finals_duello_consolazione_3_4'

const ConsolationPodiumDuelCard = (props) => (
    <PodiumDuelCard
        {...props}
        fetchTies={(id) => tournamentsApi.consolationTies(id)}
        phase="finals"
        groupName1_2={FINALS_DUELLO_CONSOLAZIONE_1_2}
        groupName3_4={FINALS_DUELLO_CONSOLAZIONE_3_4}
        useClientFallback={false}
        headerLabel="Spareggi Consolazione"
        headerTitle="Pareggio in Consolazione (Finalina)"
        positionOffset={4}
    />
)

export default ConsolationPodiumDuelCard
