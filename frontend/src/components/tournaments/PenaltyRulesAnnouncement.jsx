/**
 * PenaltyRulesAnnouncement — annuncio del regolamento Penalità e Bonus,
 * mostrato a chiunque entri in una pagina torneo (admin o player) finché
 * non lo chiude esplicitamente. Una volta chiuso, resta chiuso per sempre
 * per quell'utente (localStorage, stesso pattern di
 * `kart_celebration_seen_...` in SocketContext.jsx) — non ricompare più su
 * nessun altro torneo.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import ApiBanner from '@/components/common/ApiBanner'

const SEEN_KEY_PREFIX = 'kart_penalty_rules_seen_v1_'

const PenaltyRulesAnnouncement = () => {
    const { user } = useAuth()
    const [dismissed, setDismissed] = useState(() => {
        if (!user?.id) return true
        return localStorage.getItem(`${SEEN_KEY_PREFIX}${user.id}`) === '1'
    })

    if (dismissed || !user?.id) return null

    const handleDismiss = () => {
        localStorage.setItem(`${SEEN_KEY_PREFIX}${user.id}`, '1')
        setDismissed(true)
    }

    return (
        <ApiBanner
            tone="warning"
            title="Nuovo regolamento"
            message="È entrato in vigore il regolamento Penalità e Bonus (ritardi, assenze, abbandoni, comportamenti scorretti, fair play e aiuto organizzativo)."
            action={(
                <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                        to="/faq?section=penalita"
                        className="font-title rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-transparent px-3 py-1.5 text-[10px] tracking-wide text-amber-900 dark:text-amber-200 transition hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    >
                        Leggi il regolamento
                    </Link>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="font-title rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] tracking-wide text-white transition hover:bg-amber-400"
                    >
                        Ho capito
                    </button>
                </div>
            )}
        />
    )
}

export default PenaltyRulesAnnouncement
