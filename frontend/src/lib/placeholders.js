export const buildBannerPlaceholder = (label = 'Mario Kart') => {
    return `https://placehold.co/1280x720/111827/f9fafb?text=${encodeURIComponent(label)}`
}

const AVATAR_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
]

export const getAvatarColor = (name) => {
    if (!name) return AVATAR_COLORS[0]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const darken = (hex, amount) => {
    const n = parseInt(hex.slice(1), 16)
    const clamp = (v) => Math.max(0, Math.min(255, v))
    const r = clamp(((n >> 16) & 0xff) - amount)
    const g = clamp(((n >> 8) & 0xff) - amount)
    const b = clamp((n & 0xff) - amount)
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// Avatar di default per giocatori senza foto: iniziali su un gradiente a
// tema (colore hash-based dal nickname, coerente col resto del design
// system) invece del vecchio testo intero su sfondo piatto via placehold.co
// (leggeva come un placeholder rotto). Restituisce un data URI SVG — nessuna
// chiamata di rete, drop-in compatibile con ogni <img src={...}> esistente.
export const buildAvatarPlaceholder = (label = 'MK') => {
    const initials = (label ?? '').trim().slice(0, 2).toUpperCase() || 'MK'
    const base = getAvatarColor(label)
    const dark = darken(base, 40)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0%" stop-color="${base}"/><stop offset="100%" stop-color="${dark}"/>` +
        `</linearGradient></defs>` +
        `<rect width="320" height="320" rx="40" fill="url(#g)"/>` +
        `<text x="50%" y="52%" font-family="system-ui, sans-serif" font-weight="900" font-size="130" fill="#ffffff" fill-opacity="0.95" text-anchor="middle" dominant-baseline="middle">${initials}</text>` +
        `</svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const buildCircuitPlaceholder = (label = 'Circuito') => {
    return `https://placehold.co/533x512/1e293b/94a3b8?text=${encodeURIComponent(label)}`
}
