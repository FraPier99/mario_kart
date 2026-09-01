import { useId } from 'react'
import { Crown, Trophy, Star, Flame, Swords, Flag } from 'lucide-react'

// Medaglia illustrata per tier — sostituisce la vecchia pillola icona+testo
// piena. Costruita in SVG puro (nessun asset esterno, nessun tool di
// generazione immagini disponibile in questo ambiente): cerchio con
// gradiente metallico specifico per tier + bordo doppio in rilievo +
// icona lucide-react centrata (stessa mappatura icona-tier di prima, solo
// il contenitore cambia). Ordine dal più al meno esclusivo, stessa scala
// cromatica di lib/playerBadges.js (circuit-gold/circuit-blue/circuit-red).
const TIER_METAL = {
    leggenda: {
        Icon: Crown,
        stops: ['#fff7e0', '#f6b60d', '#b8790a'],
        ring: '#f6b60d',
        iconColor: '#5b3a00',
        stars: true,
    },
    campione: {
        Icon: Trophy,
        stops: ['#ffe9a8', '#f6b60d', '#a6690a'],
        ring: '#c98a12',
        iconColor: '#5b3a00',
        stars: false,
    },
    veterano: {
        Icon: Star,
        stops: ['#f1f5f9', '#a8b4c2', '#5f6b7a'],
        ring: '#2e7df0',
        iconColor: '#243447',
        stars: false,
    },
    outsider: {
        Icon: Flame,
        stops: ['#e8b98a', '#a8631f', '#6b3c12'],
        ring: '#e13c2e',
        iconColor: '#3a1c0a',
        stars: false,
    },
    esordiente: {
        Icon: Flag,
        stops: ['#94a3b8', '#475569', '#1e293b'],
        ring: '#334155',
        iconColor: '#f1f5f9',
        stars: false,
    },
    sfidante: {
        Icon: Swords,
        stops: ['#cbd5e1', '#8a97a6', '#4b5563'],
        ring: '#64748b',
        iconColor: '#1e293b',
        stars: false,
    },
}

const TierMedallion = ({ tier, size = 40 }) => {
    const meta = TIER_METAL[tier] ?? TIER_METAL.esordiente
    const Icon = meta.Icon
    const gradId = useId()
    const [c1, c2, c3] = meta.stops

    return (
        <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0" style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.25))' }}>
            <defs>
                <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="55%" stopColor={c2} />
                    <stop offset="100%" stopColor={c3} />
                </radialGradient>
            </defs>
            <circle cx="20" cy="20" r="19" fill={meta.ring} />
            <circle cx="20" cy="20" r="16.5" fill={`url(#${gradId})`} stroke={meta.ring} strokeWidth="1" />
            {meta.stars && (
                <>
                    <circle cx="9" cy="9" r="1.2" fill="#fff7e0" />
                    <circle cx="31" cy="9" r="1.2" fill="#fff7e0" />
                </>
            )}
            <foreignObject x="10" y="10" width="20" height="20">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <Icon size={size >= 32 ? 16 : 12} color={meta.iconColor} strokeWidth={2.5} />
                </div>
            </foreignObject>
        </svg>
    )
}

export default TierMedallion
