import RoleBadge from '@/components/community/RoleBadge'
import PlayerBadge from '@/components/community/PlayerBadge'

// Header profilo condiviso fra ProfileDashboard.jsx (proprio profilo) e
// CommunityUserPage.jsx (profilo di un altro giocatore). Card compatta,
// ispirata a un profilo "trading card" (identità stretta, non un layout
// che si allarga a riempire lo schermo) — un flusso verticale unico, mai
// diviso in due colonne larghe: quel pattern lasciava sempre spazio vuoto
// a destra su schermi lg/md, indipendentemente da quanto si stringesse la
// card, perché il contenuto reale (nome, badge, bio) è intrinsecamente
// stretto.
//
// `badges` è già filtrato/scelto da chi chiama: ProfileDashboard passa
// tutti i badge per gioco, CommunityUserPage passa solo il badge migliore
// (`activeBadge`) in un array di un elemento.
//
// `role` è passato solo per il superadmin (nessun badge di gioco per
// quell'account, il ruolo è l'unica informazione di "livello" disponibile)
// — admin/user non mostrano più il badge ruolo qui, era ridondante col
// tag già visibile accanto al nome in Navbar.
const ProfileHeader = ({
    avatarSrc,
    nickname,
    fallbackInitial,
    accentColor,
    role,
    cardStyle,
    badges = [],
    favoriteCharacter,
    bio,
}) => {
    return (
        <div className="flex flex-col items-center text-center gap-4">
            {/* Identità — avatar e nome sempre affiancati, card compatta */}
            <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                    <div className={`h-16 w-16 rounded-2xl border-4 p-1 shadow-md ${cardStyle ? cardStyle.avatarBorder : 'border-slate-200 dark:border-border'}`}>
                        <div
                            className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-muted"
                            style={accentColor ? { border: `2px solid ${accentColor}` } : undefined}
                        >
                            {avatarSrc ? (
                                <img src={avatarSrc} alt={nickname} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xl font-black text-slate-400 dark:text-slate-500">{fallbackInitial}</span>
                            )}
                        </div>
                    </div>
                    {cardStyle && (
                        <span className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white dark:border-card shadow-md ${cardStyle.badgeBg}`}>
                            <cardStyle.Icon size={9} className={cardStyle.badgeIconColor} />
                        </span>
                    )}
                    {/* Personaggio preferito sempre qui, vicino all'avatar (angolo
                        opposto al badge di tier, nessuna sovrapposizione) — mai
                        anche ripetuto sotto come chip separata (segnalato
                        dall'utente come duplicazione). */}
                    {favoriteCharacter?.img_url && (
                        <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 overflow-hidden rounded-lg border-2 border-white dark:border-slate-900 shadow-md">
                            <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-full w-full object-cover" />
                        </div>
                    )}
                </div>
                <div className="min-w-0 text-left">
                    <h1 className="text-xl font-black text-slate-900 dark:text-foreground">{nickname}</h1>
                    {role && (
                        <div className="mt-1">
                            <RoleBadge role={role} size="sm" />
                        </div>
                    )}
                </div>
            </div>

            {/* Livelli — un badge per gioco, sulla stessa riga quando ce n'è
                più di uno (extra sempre agganciati al proprio badge, mai
                mescolati fra giochi diversi anche se affiancati). */}
            {badges.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                    {badges.map((b) => (
                        <PlayerBadge key={b.game_id ?? 'best'} badge={b} size="sm" />
                    ))}
                </div>
            )}

            {/* Extra — bio, e personaggio preferito SOLO se non ha un'immagine
                (con immagine è già mostrato vicino all'avatar, mai duplicato
                qui sotto — segnalato dall'utente). */}
            {((favoriteCharacter && !favoriteCharacter.img_url) || bio) && (
                <div className="flex flex-col items-center gap-2">
                    {favoriteCharacter && !favoriteCharacter.img_url && (
                        <div className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-1.5">
                            <span className="text-xs font-black text-slate-600 dark:text-foreground">{favoriteCharacter.name}</span>
                        </div>
                    )}
                    {bio && (
                        <p className="max-w-sm text-sm text-slate-600 dark:text-muted-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
                    )}
                </div>
            )}
        </div>
    )
}

export default ProfileHeader
