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

const resolveGameKey = (gameId) => {
    if (gameId === 2) return 'mk8d'
    return 'mkds'
}

export const loadOverlayTexts = async (gameId) => {
    const key = resolveGameKey(gameId)
    if (cachedTexts[key]) return cachedTexts[key]

    try {
        const module = await import(`../assets/overlay-texts/${key}/texts.json`)
        const merged = {
            ...DEFAULT_TEXTS[key],
            ...module.default,
            countdown: {
                ...DEFAULT_TEXTS[key].countdown,
                ...(module.default?.countdown || {}),
                labels: {
                    ...DEFAULT_TEXTS[key].countdown.labels,
                    ...(module.default?.countdown?.labels || {}),
                },
            },
        }
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
