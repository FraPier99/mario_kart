const BANNER_TEXT = '🚧 SITO IN FASE DI AGGIORNAMENTO E IN VARI TEST — SE NOTI BUG O COMPORTAMENTI STRANI SCRIVI NEL GRUPPO O IN PRIVATO. BUON GIOCO! 🚧'

// Striscia "in lavorazione" stile nastro da cantiere — testo che scorre in loop
// continuo (due copie affiancate, traslazione del 50% = esattamente una copia).
const MaintenanceBanner = () => (
    <div
        className="relative z-50 overflow-hidden border-b-2 border-black/30 py-1.5 text-white shadow-md"
        style={{ background: 'repeating-linear-gradient(135deg, #dc2626 0px, #dc2626 28px, #18181b 28px, #18181b 56px)' }}
    >
        <div className="flex w-max animate-marquee whitespace-nowrap">
            <span className="px-4 text-xs font-black uppercase tracking-widest [text-shadow:1px_1px_0_rgba(0,0,0,0.6)]">{BANNER_TEXT}</span>
            <span className="px-4 text-xs font-black uppercase tracking-widest [text-shadow:1px_1px_0_rgba(0,0,0,0.6)]">{BANNER_TEXT}</span>
        </div>
    </div>
)

export default MaintenanceBanner
