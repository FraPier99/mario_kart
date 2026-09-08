import { overlayTextsApi } from '@/services/apiClient'

const DEFAULT_TEXTS = {
    mkds: {
        thankyou: null,
        countdown: {
            start: 'Sveliamo la classifica...',
            transition: 'E ora il podio...',
            championReveal: 'E il nostro Campione è...',
            labels: {
                campione: '⭐ CAMPIONE! ⭐',
                winner: 'CAMPIONE!',
            },
        },
        derapata: 'Il torneo è giunto al termine',
    },
    mk8d: {
        thankyou: null,
        countdown: {
            start: 'Sveliamo la classifica...',
            transition: 'E ora il podio...',
            championReveal: 'E il nostro Campione è...',
            labels: {
                campione: '⭐ CAMPIONE! ⭐',
                winner: 'CAMPIONE!',
            },
        },
        derapata: 'Il torneo è giunto al termine',
    },
}

let cachedTexts = {}

// Esportata (non più solo interna a questo file) — usata anche da
// lib/overlayAssets.js per risolvere la stessa cartella "per gioco" per gli
// sprite (mugshot/item), con la stessa identica logica dei testi.
export const resolveGameKey = (gameId) => {
    if (gameId === 2) return 'mk8d'
    return 'mkds'
}

const mergeTexts = (key, override) => ({
    ...DEFAULT_TEXTS[key],
    ...override,
    countdown: {
        ...DEFAULT_TEXTS[key].countdown,
        ...(override?.countdown || {}),
        labels: {
            ...DEFAULT_TEXTS[key].countdown.labels,
            ...(override?.countdown?.labels || {}),
        },
    },
})

// Ordine di risoluzione: 1) testo salvato dal superadmin nel DB (editabile
// da /superadmin senza deploy) — 2) file statico bundlato nel frontend
// (frontend/src/assets/overlay-texts/<key>/texts.json, tenuto come fallback
// "offline"/legacy, utile anche se il backend non ha ancora questa tabella
// o è irraggiungibile) — 3) default hardcoded qui sopra. Risultato cachato
// in memoria per la sessione (vedi invalidateOverlayTextsCache per
// aggiornarlo subito dopo un salvataggio dal pannello superadmin).
export const loadOverlayTexts = async (gameId) => {
    const key = resolveGameKey(gameId)
    if (cachedTexts[key]) return cachedTexts[key]

    try {
        const res = await overlayTextsApi.get(key)
        if (res.data?.data) {
            const merged = mergeTexts(key, res.data.data)
            cachedTexts[key] = merged
            return merged
        }
    } catch {
        // backend irraggiungibile o non ancora aggiornato — si prova col
        // file statico prima di arrendersi ai default hardcoded.
    }

    try {
        const module = await import(`../assets/overlay-texts/${key}/texts.json`)
        const merged = mergeTexts(key, module.default)
        cachedTexts[key] = merged
        return merged
    } catch {
        cachedTexts[key] = DEFAULT_TEXTS[key]
        return cachedTexts[key]
    }
}

export const getCachedOverlayTexts = (gameId) => {
    const key = resolveGameKey(gameId)
    return cachedTexts[key] || DEFAULT_TEXTS[key]
}

// Da chiamare subito dopo un salvataggio riuscito dal pannello superadmin,
// così la prossima festa (o un refresh del form) legge il testo appena
// salvato invece di quello ancora in cache per la sessione corrente.
export const invalidateOverlayTextsCache = (gameId) => {
    if (gameId === undefined) {
        cachedTexts = {}
        return
    }
    delete cachedTexts[resolveGameKey(gameId)]
}
