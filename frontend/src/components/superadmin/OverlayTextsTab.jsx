import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { overlayTextsApi, getApiErrorMessage } from '@/services/apiClient'
import { invalidateOverlayTextsCache } from '@/lib/overlayTexts'
import { SkeletonRows } from '@/components/common/Skeleton'

// Stesse due game key già usate da lib/overlayTexts.js / lib/overlayAssets.js
// (resolveGameKey) — game_id qui serve solo per invalidare la cache in
// memoria del client corrente subito dopo il salvataggio.
const GAMES = [
    { key: 'mkds', label: 'Mario Kart DS', gameId: 1 },
    { key: 'mk8d', label: 'Mario Kart 8 Deluxe', gameId: 2 },
]

const emptyForm = () => ({
    thankyou: '',
    countdown: { start: '', transition: '', championReveal: '', labels: { campione: '', winner: '' } },
    derapata: '',
})

const fieldCls = 'w-full rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2 text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-400'
const labelCls = 'text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-muted-foreground'

const GameTextForm = ({ gameKey, gameLabel, gameId }) => {
    const [form, setForm] = useState(emptyForm())
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        let active = true
        overlayTextsApi.get(gameKey)
            .then((res) => {
                if (!active) return
                const data = res.data?.data
                if (data) {
                    setForm({
                        thankyou: data.thankyou ?? '',
                        countdown: {
                            start: data.countdown?.start ?? '',
                            transition: data.countdown?.transition ?? '',
                            championReveal: data.countdown?.championReveal ?? '',
                            labels: {
                                campione: data.countdown?.labels?.campione ?? '',
                                winner: data.countdown?.labels?.winner ?? '',
                            },
                        },
                        derapata: data.derapata ?? '',
                    })
                }
            })
            .catch(() => {})
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [gameKey])

    const handleSave = async () => {
        setSaving(true)
        try {
            await overlayTextsApi.upload(gameKey, {
                thankyou: form.thankyou.trim() || null,
                countdown: {
                    // Vuoto -> null: il rendering (overlayTexts.js) usa ?? per
                    // ricadere sul default sensato, che controlla solo
                    // null/undefined, non la stringa vuota — senza questa
                    // normalizzazione un campo lasciato vuoto qui mostrerebbe
                    // un flash di testo bianco invece del default in overlay.
                    start: form.countdown.start.trim() || null,
                    transition: form.countdown.transition.trim() || null,
                    championReveal: form.countdown.championReveal.trim() || null,
                    labels: {
                        campione: form.countdown.labels.campione.trim() || null,
                        winner: form.countdown.labels.winner.trim() || null,
                    },
                },
                derapata: form.derapata.trim() || null,
            })
            invalidateOverlayTextsCache(gameId)
            toast.success(`Testo "${gameLabel}" aggiornato`)
        } catch (error) {
            toast.error('Salvataggio fallito', { description: getApiErrorMessage(error) })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-2xl border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5 space-y-4">
            <p className="font-title text-xs tracking-wide text-slate-700 dark:text-foreground">{gameLabel}</p>
            {loading ? (
                <SkeletonRows count={3} />
            ) : (
                <>
                    <label className="block space-y-1.5">
                        <span className={labelCls}>Messaggio di ringraziamento (opzionale)</span>
                        <textarea rows={2} value={form.thankyou}
                            onChange={(e) => setForm((f) => ({ ...f, thankyou: e.target.value }))}
                            placeholder="Grazie a tutti i partecipanti!"
                            className={`${fieldCls} resize-none`} />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-1.5">
                            <span className={labelCls}>Countdown — inizio</span>
                            <input value={form.countdown.start}
                                onChange={(e) => setForm((f) => ({ ...f, countdown: { ...f.countdown, start: e.target.value } }))}
                                placeholder="Sveliamo la classifica..."
                                className={fieldCls} />
                            <span className="text-[9px] text-slate-400">Flash prima di rivelare la classifica generale.</span>
                        </label>
                        <label className="block space-y-1.5">
                            <span className={labelCls}>Countdown — transizione al podio</span>
                            <input value={form.countdown.transition}
                                onChange={(e) => setForm((f) => ({ ...f, countdown: { ...f.countdown, transition: e.target.value } }))}
                                placeholder="E ora il podio..."
                                className={fieldCls} />
                            <span className="text-[9px] text-slate-400">Flash quando si passa al podio (1°-3°).</span>
                        </label>
                        <label className="block space-y-1.5">
                            <span className={labelCls}>Countdown — rivelazione campione</span>
                            <input value={form.countdown.championReveal}
                                onChange={(e) => setForm((f) => ({ ...f, countdown: { ...f.countdown, championReveal: e.target.value } }))}
                                placeholder="E il nostro Campione è..."
                                className={fieldCls} />
                            <span className="text-[9px] text-slate-400">Flash subito prima di svelare il vincitore.</span>
                        </label>
                        <label className="block space-y-1.5">
                            <span className={labelCls}>Etichetta "campione" (con emoji)</span>
                            <input value={form.countdown.labels.campione}
                                onChange={(e) => setForm((f) => ({ ...f, countdown: { ...f.countdown, labels: { ...f.countdown.labels, campione: e.target.value } } }))}
                                placeholder="⭐ CAMPIONE! ⭐"
                                className={fieldCls} />
                            <span className="text-[9px] text-slate-400">Testo grande nel momento esatto della rivelazione.</span>
                        </label>
                        <label className="block space-y-1.5">
                            <span className={labelCls}>Etichetta "campione" (breve)</span>
                            <input value={form.countdown.labels.winner}
                                onChange={(e) => setForm((f) => ({ ...f, countdown: { ...f.countdown, labels: { ...f.countdown.labels, winner: e.target.value } } }))}
                                placeholder="CAMPIONE!"
                                className={fieldCls} />
                            <span className="text-[9px] text-slate-400">Testo grande nella schermata finale, sopra al nome.</span>
                        </label>
                        <label className="block space-y-1.5">
                            <span className={labelCls}>Frase di chiusura torneo</span>
                            <input value={form.derapata}
                                onChange={(e) => setForm((f) => ({ ...f, derapata: e.target.value }))}
                                placeholder="{name} è giunto al termine"
                                className={fieldCls} />
                            <span className="text-[9px] text-slate-400">Usa <code>{'{name}'}</code> per inserire il nome del torneo.</span>
                        </label>
                    </div>
                    <button type="button" onClick={handleSave} disabled={saving}
                        className="rounded-xl border-2 border-emerald-600 bg-emerald-600 px-4 py-2 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                        {saving ? 'Salvataggio...' : 'Salva'}
                    </button>
                </>
            )}
        </div>
    )
}

// Testo dell'overlay di festeggiamento, per gioco — salvato nel DB
// (OverlayText, /overlay-texts) invece che hardcoded in un file statico del
// frontend: si aggiorna subito, senza deploy. Le modifiche valgono solo per
// i tornei decretati DA QUESTO MOMENTO IN POI — un torneo già concluso ha il
// suo testo "congelato" al momento della decretazione (Tournament.
// celebration_text) e non cambia più.
const OverlayTextsTab = () => (
    <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Testo mostrato nell'overlay di festeggiamento a fine torneo. Le modifiche si applicano subito
            (nessun deploy necessario) ma solo ai prossimi tornei decretati — quelli già conclusi mantengono
            il testo così com'era al momento della decretazione.
        </p>
        {GAMES.map((game) => (
            <GameTextForm key={game.key} gameKey={game.key} gameLabel={game.label} gameId={game.gameId} />
        ))}
    </div>
)

export default OverlayTextsTab
