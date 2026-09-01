import { AlertTriangle } from 'lucide-react'

// Banner di servizio in cima al sito — testo che scorre in loop da destra
// a sinistra (animate-marquee, già definito in index.css ma non ancora
// usato altrove). Il contenuto è duplicato in due metà identiche affinché
// il loop translateX(-50%) sia perfettamente continuo, senza scatti.
const MESSAGE = 'Sito in aggiornamento'
const REPEAT = 6

const MaintenanceBanner = () => {
    const items = Array.from({ length: REPEAT })
    return (
        <div className="relative z-50 overflow-hidden border-b-2 border-amber-600 bg-amber-400 dark:bg-amber-600">
            {/* animate-marquee scorre di suo da destra a sinistra —
                animation-direction:reverse la fa scorrere da sinistra a
                destra come richiesto, riusando lo stesso keyframe. */}
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
    )
}

export default MaintenanceBanner
