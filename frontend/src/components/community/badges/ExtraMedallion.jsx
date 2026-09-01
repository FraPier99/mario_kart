import { useId } from 'react'
import { Repeat, TrendingUp, Medal } from 'lucide-react'

// Medaglia illustrata per i badge extra (Costanza/In crescita/
// Consolazione) — stessa tecnica di TierMedallion.jsx ma più piccola e
// semplice (un solo giro di metallo, nessuna decorazione), coerente con
// la gerarchia "leggera" rispetto al badge di tier già stabilita.
const EXTRA_METAL = {
    streak: {
        Icon: Repeat,
        stops: ['#dbeafe', '#2e7df0', '#1a4fa0'],
        ring: '#2e7df0',
        iconColor: '#0b2c66',
    },
    improving: {
        Icon: TrendingUp,
        stops: ['#d1fae5', '#10b981', '#047857'],
        ring: '#10b981',
        iconColor: '#053b2c',
    },
    consolation: {
        Icon: Medal,
        stops: ['#ede9fe', '#8b5cf6', '#5b21b6'],
        ring: '#8b5cf6',
        iconColor: '#2e1065',
    },
}

const ExtraMedallion = ({ type, size = 22 }) => {
    const meta = EXTRA_METAL[type]
    const gradId = useId()
    if (!meta) return null
    const Icon = meta.Icon
    const [c1, c2, c3] = meta.stops

    return (
        <svg width={size} height={size} viewBox="0 0 28 28" className="shrink-0" style={{ filter: 'drop-shadow(0 1px 1px rgb(0 0 0 / 0.2))' }}>
            <defs>
                <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="55%" stopColor={c2} />
                    <stop offset="100%" stopColor={c3} />
                </radialGradient>
            </defs>
            <circle cx="14" cy="14" r="13" fill={meta.ring} />
            <circle cx="14" cy="14" r="11" fill={`url(#${gradId})`} stroke={meta.ring} strokeWidth="0.75" />
            <foreignObject x="6" y="6" width="16" height="16">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <Icon size={11} color={meta.iconColor} strokeWidth={2.5} />
                </div>
            </foreignObject>
        </svg>
    )
}

export default ExtraMedallion
