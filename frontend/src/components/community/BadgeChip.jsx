// Una chip = un badge (tier di un gioco, oppure un riconoscimento extra) —
// usata nel blocco "Livelli" del profilo al posto della vecchia riga a
// scroll orizzontale: con flex-wrap le chip vanno a capo invece di troncare
// il nome del gioco o nascondersi dietro uno scroll forzato.
const CHIP_SIZE = 32

const BadgeChip = ({ image, medallion, title, subtitle, opacity = 1 }) => (
    <div className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 py-1.5 pr-3 pl-1.5">
        {image ? (
            <img src={image} alt={title} className="shrink-0 object-contain" style={{ width: CHIP_SIZE, height: CHIP_SIZE, opacity }} />
        ) : (
            medallion
        )}
        <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-800 dark:text-foreground">{title}</span>
            {subtitle && (
                <span className="text-[10px] normal-case text-slate-500 dark:text-muted-foreground">{subtitle}</span>
            )}
        </div>
    </div>
)

export default BadgeChip
