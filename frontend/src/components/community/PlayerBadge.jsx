import { BADGE_TIERS } from '@/lib/playerBadges'

// Un badge non è mai mostrato "nudo": lo stesso giocatore ha un tier
// diverso per ogni game_id, quindi il nome del gioco è sempre affiancato
// al tier per evitare ambiguità (es. "LEGGENDA · Mario Kart DS").
const PlayerBadge = ({ badge, size = 'md', className = '' }) => {
    if (!badge) return null
    const meta = BADGE_TIERS[badge.tier] ?? BADGE_TIERS.esordiente
    const Icon = meta.Icon
    const sizeClasses = size === 'sm' ? 'gap-1 px-2 py-1 text-[9px]' : 'gap-1.5 px-3 py-1.5 text-xs'

    return (
        <div className={`inline-flex items-center rounded-xl border-2 font-black uppercase tracking-wider ${sizeClasses} ${meta.className} ${className}`}>
            <Icon size={size === 'sm' ? 11 : 13} />
            <span>{badge.label}</span>
            {badge.game_name && (
                <span className="font-bold normal-case tracking-normal opacity-70">· {badge.game_name}</span>
            )}
        </div>
    )
}

export default PlayerBadge
