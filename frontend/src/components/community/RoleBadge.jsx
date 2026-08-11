import { ROLE_BADGES } from '@/lib/roleBadges'

const RoleBadge = ({ role, size = 'md', className = '' }) => {
    const meta = ROLE_BADGES[role] ?? ROLE_BADGES.user
    const Icon = meta.Icon
    const sizeClasses = size === 'sm' ? 'gap-1 px-2 py-1 text-[9px]' : 'gap-1.5 px-3 py-1.5 text-xs'

    return (
        <div className={`inline-flex items-center rounded-xl border-2 font-black uppercase tracking-wider ${sizeClasses} ${meta.className} ${className}`}>
            <Icon size={size === 'sm' ? 11 : 13} />
            <span>{meta.label}</span>
        </div>
    )
}

export default RoleBadge
