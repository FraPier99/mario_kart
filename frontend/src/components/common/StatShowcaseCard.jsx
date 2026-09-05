import { useAuth } from '@/context/AuthContext'
import EditableContentImage from '@/components/common/EditableContentImage'

// Card statistica "vetrina" per l'header del profilo (Tornei vinti/Vittorie
// gara/Podi/Punti). Segue un principio unico condiviso con le altre card a
// immagine dell'app (tile "Tornei disputati", pannelli Home): SOLO quando
// c'è un'immagine di sfondo la card diventa un'isola scura a tema fisso con
// testo chiaro (leggibilità sopra una foto qualsiasi); senza immagine resta
// una card normale che segue il tema del sito — prima era sempre scura
// anche vuota, risultando "sporca" in light mode e troppo cupa in dark mode.
//
// Composizione a 3 livelli quando c'è un'immagine:
//   1. immagine full-bleed (bordo a bordo, object-cover, leggermente
//      scurita/sfocata via filtro CSS diretto sull'<img>, livello assoluto
//      che non occupa spazio proprio nel layout);
//   2. overlay a gradiente scuro sopra l'immagine, più opaco a sinistra
//      (dove vive il testo) e trasparente verso destra;
//   3. contenuto (icona/badge, label, valore, sottotitolo) sempre sopra.
//
// `contentKey` è globale (stessa immagine per tutti i profili); il chiamante
// (ProfileDashboard.jsx/CommunityUserPage.jsx) può risolvere una variante
// "-dark" separata in base al tema del sito prima di passare `imageUrl`/
// `contentKey` qui — questo componente resta ignaro della doppia versione,
// mostra semplicemente quello che riceve.
const ACCENT = {
    amber: { border: 'border-amber-500/40', iconBg: 'bg-amber-500/15 text-amber-400' },
    emerald: { border: 'border-emerald-500/40', iconBg: 'bg-emerald-500/15 text-emerald-400' },
    blue: { border: 'border-blue-500/40', iconBg: 'bg-blue-500/15 text-blue-400' },
    violet: { border: 'border-violet-500/40', iconBg: 'bg-violet-500/15 text-violet-400' },
}
const ACCENT_FLAT = {
    amber: { iconBg: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    emerald: { iconBg: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    blue: { iconBg: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    violet: { iconBg: 'bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' },
}

const StatShowcaseCard = ({ label, value, sub, Icon, accent = 'amber', contentKey, imageUrl, onUploaded }) => {
    const { isSuperadmin } = useAuth()
    const hasImage = Boolean(imageUrl)
    const { border, iconBg } = hasImage ? (ACCENT[accent] ?? ACCENT.amber) : (ACCENT_FLAT[accent] ?? ACCENT_FLAT.amber)

    return (
        <div
            className={
                hasImage
                    ? `relative flex min-h-26 items-center overflow-hidden rounded-2xl border-2 bg-slate-900 ${border}`
                    : 'relative flex min-h-26 items-center overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card'
            }
            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
        >
            {hasImage ? (
                <>
                    {/* Layer 1 — immagine full-bleed */}
                    <EditableContentImage
                        contentKey={contentKey}
                        imageUrl={imageUrl}
                        onUploaded={onUploaded}
                        alt=""
                        fit="cover"
                        imageClassName="blur-[1px] brightness-90"
                        className="absolute inset-0 h-full w-full bg-transparent"
                    />
                    {/* Layer 2 — overlay a gradiente, più scuro dove sta il testo */}
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-slate-900/75 via-slate-900/45 to-slate-900/10" />
                </>
            ) : isSuperadmin ? (
                // Nessuna immagine: niente placeholder a piena card (era il grigio
                // "sporco" segnalato) — solo un piccolo pulsante d'angolo per
                // caricarne una, sopra la card normale a tema.
                <EditableContentImage
                    contentKey={contentKey}
                    imageUrl={null}
                    onUploaded={onUploaded}
                    alt=""
                    fit="cover"
                    className="absolute right-2 top-2 h-8 w-8 rounded-lg"
                />
            ) : null}
            {/* Layer 3 — contenuto */}
            <div className="relative z-10 flex min-w-0 flex-1 items-start gap-3 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon size={16} />
                </div>
                <div className="min-w-0">
                    <p className={`font-title text-[9px] tracking-wide ${hasImage ? 'text-slate-300' : 'text-slate-400'}`}>{label}</p>
                    <p className={`mt-1 font-title text-2xl leading-none ${hasImage ? 'text-white' : 'text-slate-900 dark:text-foreground'}`}>{value}</p>
                    <p className={`mt-1 text-[10px] leading-snug ${hasImage ? 'text-slate-300' : 'text-slate-500 dark:text-muted-foreground'}`}>{sub}</p>
                </div>
            </div>
        </div>
    )
}

export default StatShowcaseCard
