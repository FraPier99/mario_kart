import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/services/apiClient'

// listUsers() (/auth/users) è riservato al superadmin: un utente normale
// riceveva un 403 silenzioso (.catch vuoto), restava con users=[] per
// sempre e il click sul nickname in classifica non trovava mai lo user_id
// a cui navigare — sembrava "non fare nulla". listCommunityUsers()
// (/auth/community/users) è pubblico (solo autenticazione) e basta per
// questa mappatura playerId → user.id.
export const useCommunityUserNav = () => {
    const navigate = useNavigate()
    const [users, setUsers] = useState([])

    useEffect(() => {
        authApi.listCommunityUsers().then(res => setUsers(res.data ?? [])).catch(() => {})
    }, [])

    const goToPlayerProfile = (playerId) => {
        const user = users.find(u => u.player_id === playerId)
        if (user) navigate(`/community/user/${user.id}`)
    }

    return { users, goToPlayerProfile }
}
