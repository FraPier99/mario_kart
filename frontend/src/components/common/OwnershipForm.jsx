import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// ── Riga +/- per una quantità (gioco, console o dispositivo R4) ──────────
export const QuantityRow = ({ label, value, onChange, accent = 'emerald' }) => {
    const accentText = accent === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
    return (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-foreground">{label}</span>
            <div className="flex shrink-0 items-center gap-2">
                <button
                    type="button"
                    onClick={() => onChange(Math.max(0, value - 1))}
                    disabled={value <= 0}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 dark:border-border text-slate-600 dark:text-muted-foreground transition active:translate-y-px hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    −
                </button>
                <span className={`w-6 shrink-0 text-center text-sm font-black ${value > 0 ? accentText : 'text-slate-400'}`}>{value}</span>
                <button
                    type="button"
                    onClick={() => onChange(value + 1)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 dark:border-border text-slate-600 dark:text-muted-foreground transition active:translate-y-px hover:border-slate-400"
                >
                    +
                </button>
            </div>
        </div>
    )
}

const draftFromOwnership = (data) => {
    const r4DevicesByKey = Object.fromEntries((data.r4_devices ?? []).map((d) => [d.key, d.quantity]))
    return {
        gamesById: Object.fromEntries((data.games ?? []).map((g) => [g.game_id, g.quantity])),
        consolesByKey: Object.fromEntries((data.consoles ?? []).map((c) => [c.key, c.quantity])),
        r4DevicesByKey,
        hasR4: Object.values(r4DevicesByKey).some((q) => q > 0),
    }
}

/**
 * Form di possessi (giochi/console/R4) — condiviso fra la scheda
 * self-service dell'utente (ProfileDashboard.jsx, salva su PUT /ownership/me)
 * e l'editing superadmin di un altro giocatore (PossessiTab.jsx, salva su
 * PUT /ownership/{user_id}). Possiede tutto lo stato di bozza, reinizializzato
 * ogni volta che cambia `ownership` (necessario per riusarlo su utenti
 * diversi senza smontare/rimontare il componente).
 */
const OwnershipForm = ({ ownership, games, consoles, onSave, saving = false }) => {
    const [draft, setDraft] = useState(() => draftFromOwnership(ownership))

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(draftFromOwnership(ownership))
    }, [ownership])

    const r4CompatibleConsoles = consoles.filter((c) => c.is_r4_compatible)

    // Una R4 gira su una console, non richiede la cartuccia originale del
    // gioco (è proprio l'alternativa a possederla): la sezione si sblocca
    // possedendo una console della famiglia DS/3DS, non MKDS.
    const hasR4CompatibleConsole = r4CompatibleConsoles.some((c) => (draft.consolesByKey[c.key] ?? 0) > 0)

    const setGameQuantity = (gameId, quantity) => {
        const nextQuantity = Math.max(0, quantity)
        setDraft((current) => ({
            ...current,
            gamesById: { ...current.gamesById, [gameId]: nextQuantity },
        }))
    }

    const toggleHasR4 = () => {
        setDraft((current) => ({
            ...current,
            hasR4: !current.hasR4,
            r4DevicesByKey: current.hasR4 ? {} : current.r4DevicesByKey,
        }))
    }

    const setConsoleQuantity = (key, quantity) => {
        const nextQuantity = Math.max(0, quantity)
        setDraft((current) => {
            const nextConsolesByKey = { ...current.consolesByKey, [key]: nextQuantity }
            // Rimuovere l'ultima console compatibile azzera anche le R4
            // dichiarate per quella console — non avrebbe più senso averle.
            const consoleCleared = nextQuantity === 0 && (current.r4DevicesByKey[key] ?? 0) > 0
            const nextR4ByKey = consoleCleared
                ? Object.fromEntries(Object.entries(current.r4DevicesByKey).filter(([k]) => k !== key))
                : current.r4DevicesByKey
            return {
                ...current,
                consolesByKey: nextConsolesByKey,
                r4DevicesByKey: nextR4ByKey,
                hasR4: consoleCleared ? Object.values(nextR4ByKey).some((q) => q > 0) : current.hasR4,
            }
        })
    }

    const setR4DeviceQuantity = (key, quantity) => {
        const nextQuantity = Math.max(0, quantity)
        setDraft((current) => ({
            ...current,
            r4DevicesByKey: { ...current.r4DevicesByKey, [key]: nextQuantity },
        }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const hasAtLeastOneConsole = Object.values(draft.consolesByKey).some((q) => q > 0)
        if (!hasAtLeastOneConsole) {
            toast.error('Seleziona almeno una console che possiedi')
            return
        }

        await onSave({
            games: draft.gamesById,
            consoles: draft.consolesByKey,
            r4_devices: draft.hasR4 ? draft.r4DevicesByKey : {},
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
                <span className="font-title text-[9px] tracking-wide text-slate-400">Giochi posseduti (numero di schede)</span>
                <div className="grid gap-2 sm:grid-cols-2">
                    {games.map((g) => (
                        <QuantityRow
                            key={g.game_id}
                            label={g.game_name}
                            value={draft.gamesById[g.game_id] ?? 0}
                            onChange={(next) => setGameQuantity(g.game_id, next)}
                        />
                    ))}
                    {games.length === 0 && (
                        <p className="text-xs text-slate-400">Nessun gioco disponibile.</p>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <span className="font-title text-[9px] tracking-wide text-slate-400">Console possedute (unità) <span className="text-rose-500">*</span></span>
                <p className="text-[11px] text-slate-400">Seleziona almeno una console — è l'unico dato obbligatorio in questa scheda.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                    {consoles.map((c) => (
                        <QuantityRow
                            key={c.key}
                            label={c.label}
                            value={draft.consolesByKey[c.key] ?? 0}
                            onChange={(next) => setConsoleQuantity(c.key, next)}
                            accent="emerald"
                        />
                    ))}
                </div>
            </div>

            {hasR4CompatibleConsole && (
                <div className="space-y-3">
                    <span className="font-title text-[9px] tracking-wide text-slate-400">R4 compatibile</span>
                    <label className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={draft.hasR4}
                            onChange={toggleHasR4}
                            className="h-4 w-4 rounded accent-amber-500 shrink-0"
                        />
                        <span className="text-sm font-bold text-slate-900 dark:text-foreground">Gioco Mario Kart DS tramite una o più R4 (senza cartuccia originale)</span>
                    </label>

                    {draft.hasR4 && (
                        <div className="space-y-2">
                            <p className="text-[11px] text-slate-400">Su quali console, e quante R4 per ciascuna? Non serve possedere la cartuccia di Mario Kart DS.</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {r4CompatibleConsoles.filter((c) => (draft.consolesByKey[c.key] ?? 0) > 0).map((c) => (
                                    <QuantityRow
                                        key={c.key}
                                        label={c.label}
                                        value={draft.r4DevicesByKey[c.key] ?? 0}
                                        onChange={(next) => setR4DeviceQuantity(c.key, next)}
                                        accent="amber"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <button type="submit" disabled={saving} className="rounded-2xl border-2 border-emerald-600 bg-emerald-600 px-5 py-3 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                {saving ? 'Salvataggio...' : 'Salva'}
            </button>
        </form>
    )
}

export default OwnershipForm
