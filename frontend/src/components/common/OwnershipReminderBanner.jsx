/**
 * OwnershipReminderBanner — ricorda a chi non ha ancora compilato la scheda
 * "Possiedi" (giochi/console) di farlo, così il superadmin ha un quadro
 * completo di chi possiede cosa (vedi il pannello Possessi in
 * SuperAdminPanel.jsx, che senza questo dato non distingue "possiede 0" da
 * "non ha mai compilato nulla").
 *
 * A differenza di PenaltyRulesAnnouncement (dismiss permanente in
 * localStorage), qui il dismiss è di SESSIONE (sessionStorage): chiudendolo
 * sparisce solo fino alla prossima apertura del browser, per continuare a
 * ricordarlo finché l'utente non compila davvero la scheda — un dismiss per
 * sempre vanificherebbe lo scopo del promemoria.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ownershipApi } from '@/services/apiClient'
import ApiBanner from '@/components/common/ApiBanner'

const DISMISSED_KEY_PREFIX = 'kart_ownership_reminder_dismissed_'

const OwnershipReminderBanner = () => {
    const { user, isSuperadmin } = useAuth()
    const [hasDeclared, setHasDeclared] = useState(true)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        if (!user?.id || isSuperadmin) return
        setDismissed(sessionStorage.getItem(`${DISMISSED_KEY_PREFIX}${user.id}`) === '1')
        ownershipApi.me()
            .then((res) => setHasDeclared(Boolean(res.data?.has_declared)))
            .catch(() => {})
    }, [user?.id, isSuperadmin])

    if (!user?.id || isSuperadmin || hasDeclared || dismissed) return null

    const handleDismiss = () => {
        sessionStorage.setItem(`${DISMISSED_KEY_PREFIX}${user.id}`, '1')
        setDismissed(true)
    }

    return (
        <ApiBanner
            tone="info"
            title="Completa il tuo profilo gaming"
            message="Non hai ancora indicato quali giochi o console possiedi. Aiuta a organizzare tornei e serate in base a chi ha cosa."
            action={(
                <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                        to="/dashboard?tab=possiedi"
                        className="font-title rounded-lg border-2 border-slate-300 dark:border-border bg-white dark:bg-transparent px-3 py-1.5 text-[10px] tracking-wide text-slate-700 dark:text-foreground transition hover:bg-slate-100 dark:hover:bg-muted"
                    >
                        Vai a Possiedi
                    </Link>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="font-title rounded-lg bg-slate-900 dark:bg-slate-700 px-3 py-1.5 text-[10px] tracking-wide text-white transition hover:bg-slate-700 dark:hover:bg-slate-600"
                    >
                        Ho capito
                    </button>
                </div>
            )}
        />
    )
}

export default OwnershipReminderBanner
