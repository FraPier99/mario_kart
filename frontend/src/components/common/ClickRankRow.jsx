/**
 * ClickRankRow — Riga di una classifica a click-in-sequenza (al posto del
 * drag-and-drop, che sul touch era inaffidabile): si clicca un giocatore per
 * assegnargli la posizione successiva, lo si riclicca per rimuoverlo e le
 * posizioni dei successivi si compattano da sole.
 *
 * Estratta da SchedinaForm.jsx per essere condivisa con ClassicRaceForm
 * (inserimento gara classic). Le due specificità della schedina — evidenziazione
 * Guscio Blu e pill "Ultimo"/"Penultimo" — sono ora dietro le prop opzionali
 * `accent` e `pills`; senza di esse la riga è neutra e va bene per la gara.
 *
 *   pos      = posizione 0-based (-1 se non ancora piazzato)
 *   total    = numero totale di partecipanti
 *   complete = true quando tutti sono stati piazzati; solo allora ha senso
 *              evidenziare posizioni "di coda", che altrimenti cambierebbero
 *              a ogni click
 *   accent   = (pos, total, complete) => boolean — riga in stile "accento" (ciano)
 *   pills    = (pos, total, complete) => ReactNode — etichette in coda alla riga
 *   trailing = nodo sempre renderizzato in coda, FUORI dal bottone (es. un
 *              selettore): annidare un <button> in un <button> è HTML non valido
 */
import { Trophy, Ban } from 'lucide-react'

// Il cerchietto di posizione usa la stessa palette oro/argento/bronzo del
// podio in LeaderboardTable (medalClasses) invece di un verde uniforme per
// tutti i piazzati: senza, 1° e 5° erano indistinguibili a colpo d'occhio,
// bisognava leggere il numero. Dal 4° posto in poi resta un colore neutro
// ma ad alto contrasto, comunque ben distinto sia dal podio sia dal
// cerchietto "non piazzato" (chiarissimo, bg-slate-100).
const badgeClasses = (pos) => {
    if (pos === 0) return 'bg-circuit-gold text-circuit-ink'
    if (pos === 1) return 'bg-slate-300 text-slate-700'
    if (pos === 2) return 'bg-orange-400 text-orange-950'
    return 'bg-slate-700 text-white dark:bg-slate-600'
}

const ClickRankRow = ({
    player,
    pos,
    total,
    complete,
    onToggle,
    accent = null,
    pills = null,
    trailing = null,
}) => {
    const isPlaced = pos !== -1
    const isAccent = complete && Boolean(accent?.(pos, total, complete))

    const row = (
        <button
            type="button"
            onClick={() => onToggle(player.id)}
            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.99] ${
                isAccent
                    ? 'border-cyan-300 bg-cyan-50/60 dark:border-cyan-500/30 dark:bg-cyan-500/10'
                    : isPlaced
                        ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-border dark:bg-card'
            }`}
        >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isAccent ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300' : isPlaced ? badgeClasses(pos) : 'bg-slate-100 text-slate-400 dark:bg-muted dark:text-slate-500'}`}>
                {pos === 0 ? (
                    <Trophy size={14} className="text-amber-500" />
                ) : isAccent ? (
                    <Ban size={14} />
                ) : isPlaced ? `#${pos + 1}` : '—'}
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {player.img_url ? (
                    <img src={player.img_url} alt={player.nickname} className="h-7 w-7 shrink-0 rounded-lg object-cover" />
                ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-[10px] font-black text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        {player.nickname?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                )}
                <span className={`truncate text-sm font-bold ${isPlaced ? 'text-slate-900 dark:text-foreground' : 'text-slate-500 dark:text-slate-400'}`}>{player.nickname}</span>
            </div>
            {pos === 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-title tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Vincitore</span>}
            {pills?.(pos, total, complete)}
        </button>
    )

    if (!trailing) return row

    return (
        <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">{row}</div>
            {trailing}
        </div>
    )
}

export default ClickRankRow
