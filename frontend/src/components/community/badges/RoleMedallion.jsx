import { useId } from 'react'
import { Shield, ShieldCheck, Gamepad2 } from 'lucide-react'

// Medaglia illustrata per il ruolo account — stessa tecnica "metallo
// invecchiato" di TierMedallion.jsx, stessa scala cromatica di
// ROLE_BADGES (lib/roleBadges.js): superadmin condivide l'oro di
// "leggenda", admin il blu di "veterano".
const ROLE_METAL = {
    superadmin: {
        Icon: Shield,
        stops: ['#fff7e0', '#f6b60d', '#b8790a'],
        ring: '#f6b60d',
        iconColor: '#5b3a00',
        rust: '158, 96, 8',
        seed: 21,
    },
    admin: {
        Icon: ShieldCheck,
        stops: ['#dbeafe', '#2e7df0', '#1a4fa0'],
        ring: '#2e7df0',
        iconColor: '#0b2c66',
        rust: '20, 45, 90',
        seed: 24,
    },
    user: {
        Icon: Gamepad2,
        stops: ['#cbd5e1', '#8a97a6', '#4b5563'],
        ring: '#64748b',
        iconColor: '#1e293b',
        rust: '55, 62, 72',
        seed: 27,
    },
}

const RoleMedallion = ({ role, size = 40 }) => {
    const meta = ROLE_METAL[role] ?? ROLE_METAL.user
    const Icon = meta.Icon
    const uid = useId()
    const gradId = `${uid}-grad`
    const noiseId = `${uid}-noise`
    const clipId = `${uid}-clip`
    const [c1, c2, c3] = meta.stops
    const [rr, rg, rb] = meta.rust.split(',').map((v) => parseInt(v.trim()) / 255)

    return (
        <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0" style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.35))' }}>
            <defs>
                <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="55%" stopColor={c2} />
                    <stop offset="100%" stopColor={c3} />
                </radialGradient>
                <filter id={noiseId} x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={meta.seed} result="noise" />
                    <feColorMatrix in="noise" type="matrix" values={`0 0 0 0 ${rr}  0 0 0 0 ${rg}  0 0 0 0 ${rb}  0 0 0 0.55 0`} />
                </filter>
                <clipPath id={clipId}>
                    <circle cx="20" cy="20" r="16.5" />
                </clipPath>
            </defs>
            <circle cx="20" cy="20" r="19" fill={meta.ring} />
            <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="30 90" transform="rotate(-135 20 20)" />
            <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" strokeDasharray="30 90" transform="rotate(45 20 20)" />
            <circle cx="20" cy="20" r="16.5" fill={`url(#${gradId})`} stroke={meta.ring} strokeWidth="1" />
            <rect x="3.5" y="3.5" width="33" height="33" filter={`url(#${noiseId})`} clipPath={`url(#${clipId})`} style={{ mixBlendMode: 'multiply' }} />
            <foreignObject x="10" y="10" width="20" height="20">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <Icon size={size >= 32 ? 16 : 12} color={meta.iconColor} strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 0.5px rgba(0,0,0,0.4))' }} />
                </div>
            </foreignObject>
        </svg>
    )
}

export default RoleMedallion
