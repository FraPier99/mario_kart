/**
 * CollapsibleSection — Capitolo collassabile per la sezione "Gestione" del torneo.
 *
 * Permette di dividere la lunga schermata di gestione in capitoli separati
 * (Informazioni torneo, Partecipanti, Gironi, Duelli spareggio, Semifinali,
 * Finale, Classifica finale, Storico gare...) navigabili indipendentemente.
 */
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const CollapsibleSection = ({ title, subtitle, icon, defaultOpen = false, badge, children }) => {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-muted/40"
            >
                <div className="flex items-center gap-3 min-w-0">
                    {icon && <span className="shrink-0 text-amber-500">{icon}</span>}
                    <div className="min-w-0">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-foreground truncate">{title}</h3>
                        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground truncate">{subtitle}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {badge}
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {open && (
                <div className="space-y-4 border-t border-slate-100 dark:border-border/60 p-4">
                    {children}
                </div>
            )}
        </div>
    )
}

export default CollapsibleSection
