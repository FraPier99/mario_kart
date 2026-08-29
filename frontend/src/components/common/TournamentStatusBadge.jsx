import { getTournamentStatusMeta } from '@/lib/tournamentStatus'

// Stesso stile pillola-bordata-con-icona di RoleBadge/PlayerBadge, applicato
// allo stato del torneo — riusato ovunque compaia una lista tornei lato admin.
const TournamentStatusBadge = ({ status, size = 'sm', className = '' }) => {
    const meta = getTournamentStatusMeta(status)
    const Icon = meta.Icon
    const sizeClasses = size === 'sm' ? 'gap-1 px-2 py-0.5 text-[9px]' : 'gap-1.5 px-3 py-1.5 text-xs'

    return (
        <span className={`inline-flex items-center rounded-lg border-2 font-title tracking-wide ${sizeClasses} ${meta.className} ${className}`}>
            <Icon size={size === 'sm' ? 10 : 13} />
            {meta.label}
        </span>
    )
}

export default TournamentStatusBadge
