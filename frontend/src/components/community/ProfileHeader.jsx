import RoleBadge from '@/components/community/RoleBadge'
import PlayerBadge from '@/components/community/PlayerBadge'

// Header profilo condiviso fra ProfileDashboard.jsx (proprio profilo) e
// CommunityUserPage.jsx (profilo di un altro giocatore). Due fasce di
// contenuto — Identità (avatar, nome, sottotitolo, ruolo) e Achievements
// (badge di tier per gioco + extra, personaggio preferito, bio) — disposte
// diversamente per larghezza:
//
// - sotto `lg:`: colonna unica centrata (non più allineata a sinistra con
//   spazio vuoto intorno).
// - da `lg:` in su: le due fasce affiancate, per usare la larghezza della
//   card invece di impilare tutto in una striscia verticale stretta con
//   ampio spazio vuoto ai lati.
//
// `badges` è già filtrato/scelto da chi chiama: ProfileDashboard passa
// tutti i badge per gioco, CommunityUserPage passa solo il badge migliore
// (`activeBadge`) in un array di un elemento.
const ProfileHeader = ({
    avatarSrc,
    nickname,
    fallbackInitial,
    subtitle,
    accentColor,
    role,
    cardStyle,
    badges = [],
    favoriteCharacter,
    bio,
}) => {
    const hasAchievements = badges.length > 0 || favoriteCharacter || bio

    return (
        <div className="flex flex-col items-center text-center gap-6 lg:flex-row lg:items-start lg:text-left lg:justify-between lg:gap-10">
            {/* Fascia 1 — Identità */}
            <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center lg:gap-4 shrink-0">
                <div className="relative shrink-0">
                    <div className={`h-24 w-24 rounded-2xl border-4 p-1 shadow-md ${cardStyle ? cardStyle.avatarBorder : 'border-slate-200 dark:border-border'}`}>
                        <div
                            className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-muted"
                            style={accentColor ? { border: `2px solid ${accentColor}` } : undefined}
                        >
                            {avatarSrc ? (
                                <img src={avatarSrc} alt={nickname} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-3xl font-black text-slate-400 dark:text-slate-500">{fallbackInitial}</span>
                            )}
                        </div>
                    </div>
                    {cardStyle && (
                        <span className={`absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-card shadow-md ${cardStyle.badgeBg}`}>
                            <cardStyle.Icon size={11} className={cardStyle.badgeIconColor} />
                        </span>
                    )}
                    {!cardStyle && favoriteCharacter?.img_url && (
                        <div className="absolute -bottom-2 -right-2 h-8 w-8 overflow-hidden rounded-xl border-2 border-white dark:border-slate-900 shadow-md">
                            <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-full w-full object-cover" />
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-foreground">{nickname}</h1>
                    {subtitle && (
                        <p className="mt-1 text-sm capitalize text-slate-500 dark:text-muted-foreground">{subtitle}</p>
                    )}
                    <div className="mt-2 flex justify-center lg:justify-start">
                        <RoleBadge role={role} size="sm" />
                    </div>
                </div>
            </div>

            {/* Fascia 2 — Achievements: badge di tier (uno per riga, extra
                agganciati al proprio gioco) + personaggio preferito + bio */}
            {hasAchievements && (
                <div className="flex w-full flex-col items-center gap-4 lg:w-auto lg:flex-1 lg:items-start">
                    {badges.length > 0 && (
                        <div className="flex flex-col items-center gap-2 lg:items-start">
                            {badges.map((b) => (
                                <PlayerBadge key={b.game_id ?? 'best'} badge={b} />
                            ))}
                        </div>
                    )}
                    {(favoriteCharacter || bio) && (
                        <div className="flex flex-col items-center gap-3 lg:items-start">
                            {favoriteCharacter && (
                                <div className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-1.5">
                                    {favoriteCharacter.img_url && (
                                        <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-5 w-5 rounded-full object-cover" />
                                    )}
                                    <span className="text-xs font-black text-slate-600 dark:text-foreground">{favoriteCharacter.name}</span>
                                </div>
                            )}
                            {bio && (
                                <p className="max-w-md text-sm text-slate-600 dark:text-muted-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default ProfileHeader
