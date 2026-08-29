/**
 * OwnershipReminderBanner — checklist di primo accesso: possiedi (giochi/
 * console), avatar, personaggio preferito. Il superadmin ha un quadro
 * completo di chi possiede cosa solo se questi dati sono compilati (vedi
 * il pannello Possessi in SuperAdminPanel.jsx, che senza "Possiedi"
 * compilato non distingue "possiede 0" da "non ha mai compilato nulla").
 *
 * Sparisce da sola quando tutti e 3 i passi sono completi — altrimenti,
 * il dismiss dura 24h (localStorage, sopravvive al riavvio del browser):
 * chiudendola ricompare da sola il giorno dopo se il profilo non è ancora
 * completo — un dismiss permanente/di sessione vanificherebbe lo scopo del
 * promemoria per chi tiene il browser aperto per giorni.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ownershipApi } from '@/services/apiClient'

const DISMISSED_UNTIL_KEY_PREFIX = 'kart_ownership_reminder_dismissed_until_'
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000

const OnboardingStep = ({ done, label, to }) => (
    <Link
        to={to}
        className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 transition ${
            done
                ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/50'
                : 'border-slate-200 dark:border-border bg-white dark:bg-card hover:border-blue-300 dark:hover:border-blue-500/40'
        }`}
    >
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600'}`}>
            {done && <Check size={11} />}
        </span>
        <span className={`text-xs font-bold ${done ? 'text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-400/60' : 'text-slate-700 dark:text-foreground'}`}>
            {label}
        </span>
    </Link>
)

const OwnershipReminderBanner = () => {
    const { user, isSuperadmin } = useAuth()
    const [hasDeclared, setHasDeclared] = useState(true)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        if (!user?.id || isSuperadmin) return
        const storedUntil = localStorage.getItem(`${DISMISSED_UNTIL_KEY_PREFIX}${user.id}`)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDismissed(Boolean(storedUntil) && Date.now() < Number(storedUntil))
        ownershipApi.me()
            .then((res) => setHasDeclared(Boolean(res.data?.has_declared)))
            .catch(() => {})
    }, [user?.id, isSuperadmin])

    const player = user?.player ?? null
    const steps = [
        { key: 'possiedi', label: 'Indica quali giochi/console possiedi', done: hasDeclared, to: '/dashboard?tab=possiedi' },
        { key: 'avatar', label: 'Carica un avatar', done: Boolean(player?.img_url), to: '/dashboard' },
        { key: 'personaggio', label: 'Scegli il tuo personaggio preferito', done: Boolean(player?.favorite_character_id), to: '/dashboard' },
    ]
    const completedCount = steps.filter((s) => s.done).length
    const allDone = completedCount === steps.length

    if (!user?.id || isSuperadmin || !player || allDone || dismissed) return null

    const handleDismiss = () => {
        localStorage.setItem(`${DISMISSED_UNTIL_KEY_PREFIX}${user.id}`, String(Date.now() + DISMISS_DURATION_MS))
        setDismissed(true)
    }

    return (
        <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/25 bg-blue-50/95 dark:bg-blue-950/70 backdrop-blur-sm p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Completa il tuo profilo gaming</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-muted-foreground">{completedCount}/{steps.length} passi completati</p>
                </div>
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                    title="Nascondi per 24 ore"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white dark:bg-slate-800">
                <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${(completedCount / steps.length) * 100}%` }}
                />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {steps.map((step) => (
                    <OnboardingStep key={step.key} done={step.done} label={step.label} to={step.to} />
                ))}
            </div>
        </div>
    )
}

export default OwnershipReminderBanner
