import TierMedallion from '@/components/community/badges/TierMedallion'
import ExtraMedallion from '@/components/community/badges/ExtraMedallion'
import { EXTRA_BADGES, EXTRA_BADGE_IMAGES, STREAK_BADGE_THRESHOLD, TIER_BADGE_IMAGES } from '@/lib/playerBadges'

// Stessa dimensione per il badge di tier e per gli extra — condividevano lo
// stesso spazio prima di questo fix con l'extra visibilmente più piccolo,
// facendolo leggere come un'icona "minore" invece che un badge di pari
// dignità (i 3 extra premiano cose diverse dal tier, non qualcosa di meno
// importante).
const MEDALLION_SIZES = { sm: 30, md: 40, lg: 48 }

// Un badge non è mai mostrato "nudo": lo stesso giocatore ha un tier
// diverso per ogni game_id, quindi il nome del gioco è sempre affiancato
// al tier per evitare ambiguità (es. "LEGGENDA · Mario Kart DS").
//
// L'identità cromatica del tier ora la porta la medaglia illustrata
// (TierMedallion), non più una pillola piena — il testo diventa una
// didascalia secondaria accanto alla medaglia.
const PlayerBadge = ({ badge, size = 'md', className = '' }) => {
    if (!badge) return null
    const medallionSize = MEDALLION_SIZES[size] ?? MEDALLION_SIZES.md

    // Indicatori extra indipendenti dal tier — "premiano la via di mezzo"
    // (costanza, miglioramento, Consolazione) senza sostituire il badge di
    // tier principale (vedi lib/playerBadges.js EXTRA_BADGES). Anche loro
    // ora medaglie illustrate, ma più piccole/semplici — restano un
    // gradino sotto il tier per gerarchia visiva.
    const extras = []
    if ((badge.streak ?? 0) >= STREAK_BADGE_THRESHOLD) {
        extras.push({ key: 'streak', tooltip: EXTRA_BADGES.streak.tooltip(badge.streak) })
    }
    if (badge.improving) {
        extras.push({ key: 'improving', tooltip: EXTRA_BADGES.improving.tooltip() })
    }
    if ((badge.consolation_wins ?? 0) > 0) {
        extras.push({ key: 'consolation', tooltip: EXTRA_BADGES.consolation.tooltip(badge.consolation_wins) })
    }

    const badgeImage = TIER_BADGE_IMAGES[badge.tier]

    return (
        <div className={`inline-flex items-center gap-2.5 ${className}`}>
            {badgeImage ? (
                <img
                    src={badgeImage}
                    alt={`Badge ${badge.label}`}
                    className="shrink-0 object-contain"
                    style={{ width: medallionSize, height: medallionSize, opacity: badge.tier === 'sfidante' ? 0.85 : 1 }}
                />
            ) : (
                <TierMedallion tier={badge.tier} size={medallionSize} />
            )}
            <div className={size === 'sm' ? 'text-[10px]' : 'text-xs'}>
                <span className="font-black uppercase tracking-wider text-slate-800 dark:text-foreground">{badge.label}</span>
                {badge.game_name && (
                    <span className="ml-1 font-bold normal-case tracking-normal text-slate-500 dark:text-muted-foreground">· {badge.game_name}</span>
                )}
            </div>
            {extras.length > 0 && (
                <div className="flex items-center gap-2.5">
                    {extras.map(({ key, tooltip }) => {
                        const extraImage = EXTRA_BADGE_IMAGES[key]
                        const label = EXTRA_BADGES[key]?.label
                        return (
                            // Stessa coppia icona+didascalia del badge di tier — prima
                            // gli extra avevano solo un tooltip al passaggio del mouse,
                            // senza alcun testo visibile, mentre il tier ha sempre la
                            // sua descrizione accanto.
                            <div key={key} title={tooltip} className="inline-flex items-center gap-1.5">
                                {extraImage ? (
                                    <img src={extraImage} alt={tooltip} className="shrink-0 object-contain" style={{ width: medallionSize, height: medallionSize }} />
                                ) : (
                                    <ExtraMedallion type={key} size={medallionSize} />
                                )}
                                {label && (
                                    <span className={`font-bold normal-case tracking-normal text-slate-500 dark:text-muted-foreground ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>{label}</span>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default PlayerBadge
