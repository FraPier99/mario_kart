import RoleMedallion from '@/components/community/badges/RoleMedallion'
import { ROLE_BADGES } from '@/lib/roleBadges'

const RoleBadge = ({ role, size = 'md', className = '' }) => {
    const meta = ROLE_BADGES[role] ?? ROLE_BADGES.user
    const medallionSize = size === 'sm' ? 30 : 40

    return (
        <div className={`inline-flex items-center gap-2.5 ${className}`}>
            <RoleMedallion role={role} size={medallionSize} />
            <span className={`font-black uppercase tracking-wider text-slate-800 dark:text-foreground ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
                {meta.label}
            </span>
        </div>
    )
}

export default RoleBadge
