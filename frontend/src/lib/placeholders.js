export const buildAvatarPlaceholder = (label = 'MK') => {
    return `https://placehold.co/320x320/0f172a/f8fafc?text=${encodeURIComponent(label)}`
}

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

export const buildCircuitPlaceholder = (label = 'Circuito') => {
    return `https://placehold.co/533x512/1e293b/94a3b8?text=${encodeURIComponent(label)}`
}
