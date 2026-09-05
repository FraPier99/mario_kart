// Una chip = un badge (tier di un gioco, oppure un riconoscimento extra) —
// usata nel blocco "Livelli" del profilo al posto della vecchia riga a
// scroll orizzontale: con flex-wrap le chip vanno a capo invece di troncare
// il nome del gioco o nascondersi dietro uno scroll forzato.
//
// L'header profilo non ha più uno sfondo foto fisso dietro (rimosso in un
// passaggio precedente) — segue il tema del sito come le altre card, quindi
// anche questa chip deve essere tema-aware: prima restava sempre "scura
// traslucida su foto" e in light mode leggeva come un blocco grigio spento
// sopra una card bianca.
//
// L'accento colore (stessa palette dell'anello attorno all'avatar) è un
// bordo pieno + un lieve alone sulla chip stessa — non un cerchietto colorato
// separato dietro l'icona: un solo effetto "esterno" riusato ovunque invece
// di due accenti diversi che si accavallano.
const CHIP_SIZE = 32

const BadgeChip = ({ image, medallion, title, subtitle, opacity = 1, accentColor }) => (
    <div
        className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 dark:bg-black/40 dark:backdrop-blur-sm py-1.5 pr-3 pl-1.5"
        style={accentColor ? {
            border: `1.5px solid ${accentColor}`,
            boxShadow: `0 0 0 2px ${accentColor}2e`,
        } : undefined}
    >
        {image ? (
            <img src={image} alt={title} className="shrink-0 object-contain" style={{ width: CHIP_SIZE, height: CHIP_SIZE, opacity }} />
        ) : (
            medallion
        )}
        <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-800 dark:text-white">{title}</span>
            {subtitle && (
                <span className="text-[10px] normal-case text-slate-500 dark:text-slate-300">{subtitle}</span>
            )}
        </div>
    </div>
)

export default BadgeChip
