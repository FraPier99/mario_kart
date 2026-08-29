import { toast } from 'sonner'
import { BADGE_TIERS, BADGE_TIER_RANK } from '@/lib/playerBadges'
import { playMkdsCupUnlocked } from '@/lib/mkdsSounds'
import { isUiSoundEnabled } from '@/lib/uiSoundPrefs'

const STORAGE_PREFIX = 'kart_badge_tier_'

const tierRank = (tier) => {
    const idx = BADGE_TIER_RANK.indexOf(tier)
    return idx === -1 ? BADGE_TIER_RANK.length : idx
}

const fireTierUpToast = (badge, gameName) => {
    const meta = BADGE_TIERS[badge.tier]
    if (!meta) return
    const Icon = meta.Icon
    if (isUiSoundEnabled()) playMkdsCupUnlocked()
    toast.custom((t) => (
        <div
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 shadow-lg ${meta.className}`}
            style={{ boxShadow: 'var(--circuit-shadow-md)' }}
            onClick={() => toast.dismiss(t)}
        >
            <Icon size={22} className="shrink-0" />
            <div className="min-w-0">
                <p className="font-title text-[9px] tracking-wide opacity-80">Nuovo livello!</p>
                <p className="truncate text-sm font-black">
                    {badge.label}{gameName ? ` · ${gameName}` : ''}
                </p>
            </div>
        </div>
    ))
}

/**
 * Confronta i badge appena caricati per un giocatore con l'ultimo tier
 * noto (salvato in localStorage, non c'è alcuna cache lato client dei
 * badge precedenti altrove) e, se un gioco è salito di tier, mostra un
 * mini-toast — versione leggera del linguaggio visivo dei tier badge,
 * non l'overlay festeggiamenti completo (troppo invasivo per un evento
 * che può capitare a ogni ricalcolo classifica, non solo a fine torneo).
 */
export function checkBadgeTierUps(playerId, badges, games) {
    if (!playerId || !Array.isArray(badges) || typeof window === 'undefined') return
    badges.forEach((badge) => {
        const key = `${STORAGE_PREFIX}${playerId}_${badge.game_id}`
        let prevTier = null
        try { prevTier = window.localStorage.getItem(key) } catch { /* storage non disponibile */ }
        try { window.localStorage.setItem(key, badge.tier) } catch { /* storage non disponibile */ }
        if (prevTier && prevTier !== badge.tier && tierRank(badge.tier) < tierRank(prevTier)) {
            const gameName = games?.find((g) => g.id === badge.game_id)?.name
            fireTierUpToast(badge, gameName)
        }
    })
}
