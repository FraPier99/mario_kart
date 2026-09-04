import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

// Banner di servizio in cima al sito — testo che scorre in loop da destra
// a sinistra (animate-marquee, già definito in index.css ma non ancora
// usato altrove). Il contenuto è duplicato in due metà identiche affinché
// il loop translateX(-50%) sia perfettamente continuo, senza scatti.
//
// Dismissibile: se l'avviso deve restare attivo a lungo, occupare spazio
// fisso su ogni pagina/viewport per giorni è invasivo — la chiusura si
// ricorda in localStorage per 24h invece di ripresentarsi a ogni refresh.
const MESSAGE = 'Sito in aggiornamento'
const REPEAT = 6
const STORAGE_KEY = 'maintenanceBannerDismissedUntil'
const SNOOZE_MS = 24 * 60 * 60 * 1000

const isDismissed = () => {
    try {
        const until = localStorage.getItem(STORAGE_KEY)
        return until != null && Date.now() < Number(until)
    } catch {
        return false
    }
}

const MaintenanceBanner = () => {
    const [dismissed, setDismissed] = useState(isDismissed)

    if (dismissed) return null

    const handleDismiss = () => {
        try { localStorage.setItem(STORAGE_KEY, String(Date.now() + SNOOZE_MS)) } catch { /* storage non disponibile: si richiuderà comunque a fine sessione */ }
        setDismissed(true)
    }

    const items = Array.from({ length: REPEAT })
    return (
        <div className="relative z-50 flex items-stretch border-b-2 border-amber-600 bg-amber-400 dark:bg-amber-600">
            {/* animate-marquee scorre di suo da destra a sinistra —
                animation-direction:reverse la fa scorrere da sinistra a
                destra come richiesto, riusando lo stesso keyframe. */}
            <div className="flex-1 overflow-hidden">
                <div className="flex w-max animate-marquee" style={{ animationDirection: 'reverse' }}>
                    {[0, 1].map((half) => (
                        <div key={half} className="flex shrink-0 items-center py-1.5">
                            {items.map((_, i) => (
                                <span key={i} className="mx-6 flex items-center gap-1.5 whitespace-nowrap font-title text-[10px] tracking-widest text-amber-950 uppercase">
                                    <AlertTriangle size={11} /> {MESSAGE}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <button
                type="button"
                onClick={handleDismiss}
                aria-label="Chiudi avviso"
                className="shrink-0 flex items-center px-2.5 text-amber-950 transition hover:bg-black/10"
            >
                <X size={13} />
            </button>
        </div>
    )
}

export default MaintenanceBanner
