import { useAuth } from '@/context/AuthContext'
import EditableContentImage from '@/components/common/EditableContentImage'

// Card statistica "vetrina" per l'header del profilo (Tornei vinti/Vittorie
// gara/Podi/Punti) — isola scura a tema fisso (indipendente da light/dark,
// come le altre card con immagine dell'app). Composizione a 3 livelli:
//   1. immagine full-bleed (bordo a bordo, object-cover, leggermente
//      scurita/sfocata via filtro CSS diretto sull'<img>, non ritagliata
//      in una colonna e non un elemento separato nel flusso — è un livello
//      assoluto, non occupa spazio proprio);
//   2. overlay a gradiente scuro sopra l'immagine, più opaco a sinistra
//      (dove vive il testo) e trasparente verso destra, che lascia
//      l'immagine visibile senza diventare un pannello opaco;
//   3. contenuto (icona/badge, label, valore, sottotitolo) sempre sopra,
//      mai spostato o ristretto dall'immagine.
// `contentKey` è globale (stessa immagine per tutti i profili) — vedi
// StatShowcaseCard nei punti d'uso per l'elenco delle 4 chiavi fisse.
const ACCENT = {
    amber: { border: 'border-amber-500/40', iconBg: 'bg-amber-500/15 text-amber-400' },
    emerald: { border: 'border-emerald-500/40', iconBg: 'bg-emerald-500/15 text-emerald-400' },
    blue: { border: 'border-blue-500/40', iconBg: 'bg-blue-500/15 text-blue-400' },
    violet: { border: 'border-violet-500/40', iconBg: 'bg-violet-500/15 text-violet-400' },
}

const StatShowcaseCard = ({ label, value, sub, Icon, accent = 'amber', contentKey, imageUrl, onUploaded }) => {
    const { isSuperadmin } = useAuth()
    const { border, iconBg } = ACCENT[accent] ?? ACCENT.amber

    return (
        <div className={`relative flex min-h-26 items-center overflow-hidden rounded-2xl border-2 bg-slate-900 ${border}`} style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            {(imageUrl || isSuperadmin) && (
                <>
                    {/* Layer 1 — immagine full-bleed */}
                    <EditableContentImage
                        contentKey={contentKey}
                        imageUrl={imageUrl}
                        onUploaded={onUploaded}
                        alt=""
                        fit="cover"
                        imageClassName="blur-[1px] brightness-75"
                        className="absolute inset-0 h-full w-full bg-transparent"
                    />
                    {/* Layer 2 — overlay a gradiente, più scuro dove sta il testo */}
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-slate-900/85 via-slate-900/55 to-slate-900/15" />
                </>
            )}
            {/* Layer 3 — contenuto */}
            <div className="relative z-10 flex min-w-0 flex-1 items-start gap-3 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon size={16} />
                </div>
                <div className="min-w-0">
                    <p className="font-title text-[9px] tracking-wide text-slate-300">{label}</p>
                    <p className="mt-1 font-title text-2xl leading-none text-white">{value}</p>
                    <p className="mt-1 text-[10px] leading-snug text-slate-300">{sub}</p>
                </div>
            </div>
        </div>
    )
}

export default StatShowcaseCard
