import { BADGE_TIERS, EXTRA_BADGES, STREAK_BADGE_THRESHOLD } from '@/lib/playerBadges'

// Un badge non è mai mostrato "nudo": lo stesso giocatore ha un tier
// diverso per ogni game_id, quindi il nome del gioco è sempre affiancato
// al tier per evitare ambiguità (es. "LEGGENDA · Mario Kart DS").
const PlayerBadge = ({ badge, size = 'md', className = '' }) => {
    if (!badge) return null
    const meta = BADGE_TIERS[badge.tier] ?? BADGE_TIERS.esordiente
    const Icon = meta.Icon
    const sizeClasses = size === 'sm' ? 'gap-1 px-2 py-1 text-[9px]' : 'gap-1.5 px-3 py-1.5 text-xs'
    // Gli extra scalano col size del badge principale invece di restare
    // fissi a 9px — a size="sm" il badge principale è già a 9px, quindi
    // fermarli più piccoli li rende illeggibili (segnalato dall'utente).
    // Restano comunque un gradino sotto il principale (niente border-2/
    // maiuscolo/sfondo pieno) per la gerarchia visiva.
    const extraSizeClasses = size === 'sm' ? 'gap-1 px-1.5 py-0.5 text-[10px]' : 'gap-1 px-2 py-0.5 text-[11px]'
    const extraIconSize = size === 'sm' ? 10 : 11

    // Indicatori extra indipendenti dal tier — "premiano la via di mezzo"
    // (costanza, miglioramento, Consolazione) senza sostituire il badge di
    // tier principale (vedi lib/playerBadges.js EXTRA_BADGES). Stile
    // volutamente più leggero/compatto: sono annotazioni secondarie, non
    // devono competere in gerarchia visiva col badge di tier, che è l'unico
    // basato sui risultati reali.
    const extras = []
    if ((badge.streak ?? 0) >= STREAK_BADGE_THRESHOLD) {
        extras.push({ key: 'streak', ...EXTRA_BADGES.streak, tooltip: EXTRA_BADGES.streak.tooltip(badge.streak) })
    }
    if (badge.improving) {
        extras.push({ key: 'improving', ...EXTRA_BADGES.improving, tooltip: EXTRA_BADGES.improving.tooltip() })
    }
    if ((badge.consolation_wins ?? 0) > 0) {
        extras.push({ key: 'consolation', ...EXTRA_BADGES.consolation, tooltip: EXTRA_BADGES.consolation.tooltip(badge.consolation_wins) })
    }

    return (
        <div className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
            <div className={`inline-flex items-center rounded-xl border-2 font-black uppercase tracking-wider ${sizeClasses} ${meta.className}`}>
                <Icon size={size === 'sm' ? 11 : 13} />
                <span>{badge.label}</span>
                {badge.game_name && (
                    <span className="font-bold normal-case tracking-normal opacity-70">· {badge.game_name}</span>
                )}
            </div>
            {extras.map(({ key, Icon: ExtraIcon, label, tooltip, className: extraClassName }) => (
                <div key={key} title={tooltip}
                    className={`inline-flex items-center rounded-full border font-bold normal-case tracking-normal ${extraSizeClasses} ${extraClassName}`}>
                    <ExtraIcon size={extraIconSize} />
                    <span>{label}</span>
                </div>
            ))}
        </div>
    )
}

export default PlayerBadge
