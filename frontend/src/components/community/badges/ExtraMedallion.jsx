import { useId } from 'react'
import { Repeat, TrendingUp, Medal } from 'lucide-react'

// Nota: "streak" (Costanza) usa un ciano/teal invece del blu di TierMedallion
// "veterano" (#2e7df0) — le due palette erano identiche, indistinguibili tra
// il badge di tier e quello extra pur essendo concetti diversi.

// Medaglia illustrata per i badge extra (Costanza/In crescita/
// Consolazione) — stessa tecnica "metallo invecchiato" di TierMedallion.jsx
// ma più piccola e semplice (un solo giro di metallo, texture più
// leggera), coerente con la gerarchia "leggera" rispetto al badge di tier
// già stabilita.
const EXTRA_METAL = {
    streak: {
        Icon: Repeat,
        stops: ['#cffafe', '#06b6d4', '#0e7490'],
        ring: '#06b6d4',
        iconColor: '#083344',
        rust: '5, 60, 75',
        seed: 3,
    },
    improving: {
        Icon: TrendingUp,
        stops: ['#d1fae5', '#10b981', '#047857'],
        ring: '#10b981',
        iconColor: '#053b2c',
        rust: '5, 60, 40',
        seed: 6,
    },
    consolation: {
        Icon: Medal,
        stops: ['#ede9fe', '#8b5cf6', '#5b21b6'],
        ring: '#8b5cf6',
        iconColor: '#2e1065',
        rust: '55, 25, 90',
        seed: 9,
    },
}

const ExtraMedallion = ({ type, size = 22 }) => {
    const meta = EXTRA_METAL[type]
    const uid = useId()
    if (!meta) return null
    const Icon = meta.Icon
    const gradId = `${uid}-grad`
    const noiseId = `${uid}-noise`
    const clipId = `${uid}-clip`
    const [c1, c2, c3] = meta.stops
    const [rr, rg, rb] = meta.rust.split(',').map((v) => parseInt(v.trim()) / 255)

    return (
        <svg width={size} height={size} viewBox="0 0 28 28" className="shrink-0" style={{ filter: 'drop-shadow(0 1px 1px rgb(0 0 0 / 0.3))' }}>
            <defs>
                <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="55%" stopColor={c2} />
                    <stop offset="100%" stopColor={c3} />
                </radialGradient>
                <filter id={noiseId} x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={meta.seed} result="noise" />
                    <feColorMatrix in="noise" type="matrix" values={`0 0 0 0 ${rr}  0 0 0 0 ${rg}  0 0 0 0 ${rb}  0 0 0 0.45 0`} />
                </filter>
                <clipPath id={clipId}>
                    <circle cx="14" cy="14" r="11" />
                </clipPath>
            </defs>
            <circle cx="14" cy="14" r="13" fill={meta.ring} />
            <circle cx="14" cy="14" r="11" fill={`url(#${gradId})`} stroke={meta.ring} strokeWidth="0.75" />
            <rect x="2.5" y="2.5" width="23" height="23" filter={`url(#${noiseId})`} clipPath={`url(#${clipId})`} style={{ mixBlendMode: 'multiply' }} />
            <foreignObject x="6" y="6" width="16" height="16">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <Icon size={11} color={meta.iconColor} strokeWidth={2.5} />
                </div>
            </foreignObject>
        </svg>
    )
}

export default ExtraMedallion
