import { Link } from 'react-router-dom'
import { useAppData } from '@/context/AppDataContext'

// Nome giocatore cliccabile verso il profilo pubblico (/community/user/:id),
// riusabile ovunque compaia un nickname. I dati (playerId → user.id) sono
// già in cache in AppDataContext (vedi useCommunityUserNav) — nessun fetch
// per istanza, quindi è sicuro usarlo anche dentro liste/tabelle lunghe.
// Se il giocatore non ha un account collegato, rende children come testo
// semplice invece di un link verso il nulla.
//
// Accetta `playerId` (il caso più comune: classifiche/risultati indicizzati
// per player) oppure `userId` quando il dato di partenza è già uno User.id
// (es. righe schedina, indicizzate per user_id) — in quel caso non serve
// alcuna ricerca inversa, si linka direttamente.
const PlayerLink = ({ playerId, userId, children, className = '', onClick }) => {
    const { communityUsers } = useAppData()
    const user = userId != null
        ? communityUsers.find((u) => u.id === userId)
        : communityUsers.find((u) => u.player_id === playerId)

    if (!user) {
        return <span className={className}>{children}</span>
    }

    return (
        <Link
            to={`/community/user/${user.id}`}
            className={className}
            onClick={(e) => {
                e.stopPropagation()
                onClick?.(e)
            }}
        >
            {children}
        </Link>
    )
}

export default PlayerLink
