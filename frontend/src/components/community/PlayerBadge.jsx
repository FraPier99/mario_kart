import TierMedallion from '@/components/community/badges/TierMedallion'
import ExtraMedallion from '@/components/community/badges/ExtraMedallion'
import { EXTRA_BADGES, STREAK_BADGE_THRESHOLD } from '@/lib/playerBadges'

// Un badge non è mai mostrato "nudo": lo stesso giocatore ha un tier
// diverso per ogni game_id, quindi il nome del gioco è sempre affiancato
// al tier per evitare ambiguità (es. "LEGGENDA · Mario Kart DS").
//
// L'identità cromatica del tier ora la porta la medaglia illustrata
// (TierMedallion), non più una pillola piena — il testo diventa una
// didascalia secondaria accanto alla medaglia.
const PlayerBadge = ({ badge, size = 'md', className = '' }) => {
    if (!badge) return null
    const medallionSize = size === 'sm' ? 30 : 40

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

    return (
        <div className={`inline-flex items-center gap-2.5 ${className}`}>
            <TierMedallion tier={badge.tier} size={medallionSize} />
            <div className={size === 'sm' ? 'text-[10px]' : 'text-xs'}>
                <span className="font-black uppercase tracking-wider text-slate-800 dark:text-foreground">{badge.label}</span>
                {badge.game_name && (
                    <span className="ml-1 font-bold normal-case tracking-normal text-slate-500 dark:text-muted-foreground">· {badge.game_name}</span>
                )}
            </div>
            {extras.length > 0 && (
                <div className="flex items-center gap-1">
                    {extras.map(({ key, tooltip }) => (
                        <div key={key} title={tooltip}>
                            <ExtraMedallion type={key} size={size === 'sm' ? 18 : 22} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default PlayerBadge
