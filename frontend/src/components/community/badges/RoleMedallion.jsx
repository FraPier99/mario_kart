import { useId } from 'react'
import { Shield, ShieldCheck, Gamepad2 } from 'lucide-react'

// Medaglia illustrata per il ruolo account — stessa tecnica di
// TierMedallion.jsx, stessa scala cromatica di ROLE_BADGES (lib/roleBadges.js):
// superadmin condivide l'oro di "leggenda", admin il blu di "veterano".
const ROLE_METAL = {
    superadmin: {
        Icon: Shield,
        stops: ['#fff7e0', '#f6b60d', '#b8790a'],
        ring: '#f6b60d',
        iconColor: '#5b3a00',
    },
    admin: {
        Icon: ShieldCheck,
        stops: ['#dbeafe', '#2e7df0', '#1a4fa0'],
        ring: '#2e7df0',
        iconColor: '#0b2c66',
    },
    user: {
        Icon: Gamepad2,
        stops: ['#cbd5e1', '#8a97a6', '#4b5563'],
        ring: '#64748b',
        iconColor: '#1e293b',
    },
}

const RoleMedallion = ({ role, size = 40 }) => {
    const meta = ROLE_METAL[role] ?? ROLE_METAL.user
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
            <foreignObject x="10" y="10" width="20" height="20">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <Icon size={size >= 32 ? 16 : 12} color={meta.iconColor} strokeWidth={2.5} />
                </div>
            </foreignObject>
        </svg>
    )
}

export default RoleMedallion
