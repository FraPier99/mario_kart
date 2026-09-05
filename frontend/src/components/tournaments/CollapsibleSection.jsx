/**
 * CollapsibleSection — Capitolo collassabile per la sezione "Gestione" del torneo.
 *
 * Permette di dividere la lunga schermata di gestione in capitoli separati
 * (Informazioni torneo, Partecipanti, Gironi, Duelli spareggio, Semifinali,
 * Finale, Classifica finale, Storico gare...) navigabili indipendentemente.
 */
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// `dark`: variante a tema scuro fisso (indipendente da light/dark del sito)
// per un uso dentro un contenitore già scuro a prescindere dal tema (es. il
// pannello "Ultimo torneo" in Home.jsx) — altrimenti in light mode questa
// sezione renderebbe un riquadro bianco dentro un pannello nero.
const CollapsibleSection = ({ title, subtitle, icon, defaultOpen = false, badge, children, dark = false }) => {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div className={dark
            ? 'rounded-3xl border border-white/10 bg-slate-800 shadow-sm overflow-hidden'
            : 'rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden'
        }>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition ${dark ? 'hover:bg-white/5' : 'hover:bg-slate-50 dark:hover:bg-muted/40'}`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    {icon && <span className="shrink-0 text-amber-500">{icon}</span>}
                    <div className="min-w-0">
                        <h3 className={`text-sm font-black uppercase tracking-[0.2em] truncate ${dark ? 'text-white' : 'text-slate-900 dark:text-foreground'}`}>{title}</h3>
                        {subtitle && <p className={`mt-0.5 text-xs truncate ${dark ? 'text-slate-400' : 'text-slate-500 dark:text-muted-foreground'}`}>{subtitle}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {badge}
                    <ChevronDown size={16} className={`transition-transform ${dark ? 'text-slate-400' : 'text-slate-400'} ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {open && (
                <div className={`space-y-4 border-t p-4 ${dark ? 'border-white/10' : 'border-slate-100 dark:border-border/60'}`}>
                    {children}
                </div>
            )}
        </div>
    )
}

export default CollapsibleSection
