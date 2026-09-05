import { useAuth } from '@/context/AuthContext'
import EditableContentImage from '@/components/common/EditableContentImage'

// Card statistica "vetrina" per l'header del profilo (Tornei vinti/Vittorie
// gara/Podi/Punti) — isola scura a tema fisso (indipendente da light/dark,
// come le altre card con immagine dell'app). L'immagine caricabile dal
// superadmin è lo sfondo dell'intera card (non solo di una porzione),
// mantenuta semi-trasparente in modo che il testo sopra resti sempre
// perfettamente leggibile senza bisogno di un overlay scuro che la nasconda.
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
                <EditableContentImage
                    contentKey={contentKey}
                    imageUrl={imageUrl}
                    onUploaded={onUploaded}
                    alt=""
                    fit="cover"
                    imageOpacity={0.32}
                    className="absolute inset-0 h-full w-full bg-transparent"
                />
            )}
            <div className="relative z-10 flex min-w-0 flex-1 items-start gap-3 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon size={16} />
                </div>
                <div className="min-w-0">
                    <p className="font-title text-[9px] tracking-wide text-slate-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{label}</p>
                    <p className="mt-1 font-title text-2xl leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{value}</p>
                    <p className="mt-1 text-[10px] leading-snug text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{sub}</p>
                </div>
            </div>
        </div>
    )
}

export default StatShowcaseCard
