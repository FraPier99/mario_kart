import { useAuth } from '@/context/AuthContext'
import EditableContentImage from '@/components/common/EditableContentImage'

// Card statistica "vetrina" per l'header del profilo (Tornei vinti/Vittorie
// gara/Podi/Punti) — isola scura a tema fisso (indipendente da light/dark,
// come le altre card con immagine dell'app), con un'immagine decorativa
// caricabile dal superadmin a piena card (sfondo, come CircuitBackdrop),
// scurita da un overlay a gradiente per restare leggibile sotto testo e
// numero. `contentKey` è globale (stessa immagine per tutti i profili) —
// vedi StatShowcaseCard nei punti d'uso per l'elenco delle 4 chiavi fisse.
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
                    <EditableContentImage
                        contentKey={contentKey}
                        imageUrl={imageUrl}
                        onUploaded={onUploaded}
                        alt=""
                        fit="cover"
                        className="absolute inset-0 h-full w-full bg-transparent"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-slate-900 via-slate-900/75 to-slate-900/30" />
                </>
            )}
            <div className="relative z-10 flex min-w-0 flex-1 items-start gap-3 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon size={16} />
                </div>
                <div className="min-w-0">
                    <p className="font-title text-[9px] tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 font-title text-2xl leading-none text-white">{value}</p>
                    <p className="mt-1 text-[10px] leading-snug text-slate-400">{sub}</p>
                </div>
            </div>
        </div>
    )
}

export default StatShowcaseCard
