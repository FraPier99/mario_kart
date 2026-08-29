const ENABLED_KEY = 'kart_ui_sound_enabled'

/**
 * Preferenza separata dal mute della celebration overlay
 * (`kart_celebration_muted` in celebrationSound.js, che resta attivo di
 * default) — questi sono micro-suoni per momenti minori (carta usata,
 * salita di tier badge), pensati come opt-in esplicito, quindi di
 * default OFF finché l'utente non li attiva dalle impostazioni profilo.
 */
export const isUiSoundEnabled = () => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(ENABLED_KEY) === '1'
}

export const setUiSoundEnabled = (enabled) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0')
}
