import { useNavigate } from 'react-router-dom'
import { useAppData } from '@/context/AppDataContext'

// La lista community users (playerId → user.id, per navigare al profilo
// pubblico) è caricata una sola volta in AppDataContext, non più qui — un
// fetch indipendente per ogni componente che monta questo hook diventava N
// richieste duplicate non appena più punti della stessa pagina linkavano a
// un profilo giocatore. Vedi anche PlayerLink.jsx, che usa questo stesso hook.
export const useCommunityUserNav = () => {
    const navigate = useNavigate()
    const { communityUsers } = useAppData()

    const goToPlayerProfile = (playerId) => {
        const user = communityUsers.find(u => u.player_id === playerId)
        if (user) navigate(`/community/user/${user.id}`)
    }

    return { users: communityUsers, goToPlayerProfile }
}
