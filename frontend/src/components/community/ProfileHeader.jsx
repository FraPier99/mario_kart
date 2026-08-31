import RoleBadge from '@/components/community/RoleBadge'
import PlayerBadge from '@/components/community/PlayerBadge'

// Header profilo condiviso fra ProfileDashboard.jsx (proprio profilo) e
// CommunityUserPage.jsx (profilo di un altro giocatore) — prima duplicato
// con struttura diversa nelle due pagine, con avatar/badge/personaggio
// preferito/bio in un unico flex-wrap senza gerarchia. Tre fasce distinte:
//
// 1. Identità  — avatar, nome, sottotitolo, ruolo (chi è)
// 2. Livelli   — un badge di tier per riga, coi suoi extra (Costanza/In
//                crescita/Consolazione) sempre agganciati SOLO a quel
//                gioco — mai un flex-wrap che mescola più giochi insieme
//                (cosa ha ottenuto — il blocco più importante)
// 3. Extra     — personaggio preferito + bio (info secondarie/decorative)
//
// `badges` è già filtrato/scelto da chi chiama: ProfileDashboard passa
// tutti i badge per gioco, CommunityUserPage passa solo il badge migliore
// (`activeBadge`) in un array di un elemento — stesso comportamento di
// prima, il componente si limita a renderizzare ciò che riceve.
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
    actions,
}) => {
    return (
        <div>
            {/* Riga identità — avatar e nome SEMPRE affiancati, a ogni
                larghezza: impilarli su righe separate (pattern preso da
                CommunityUserPage) lasciava una riga avatar quasi vuota su
                mobile e un blocco magro e disallineato su desktop — questo
                usa lo spazio orizzontale in modo costante. */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                        <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 p-1 shadow-md ${cardStyle ? cardStyle.avatarBorder : 'border-slate-200 dark:border-border'}`}>
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
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-foreground truncate">{nickname}</h1>
                        {subtitle && (
                            <p className="mt-1 text-sm capitalize text-slate-500 dark:text-muted-foreground truncate">{subtitle}</p>
                        )}
                        <RoleBadge role={role} size="sm" className="mt-2" />
                    </div>
                </div>
                {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </div>

            {/* Fascia 2 — Livelli: un badge per riga, extra sempre agganciati al proprio gioco */}
            {badges.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                    {badges.map((b) => (
                        <PlayerBadge key={b.game_id ?? 'best'} badge={b} />
                    ))}
                </div>
            )}

            {/* Fascia 3 — Extra: personaggio preferito + bio, info secondarie */}
            {(favoriteCharacter || bio) && (
                <div className="mt-4 space-y-3">
                    {favoriteCharacter && (
                        <div className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-1.5">
                            {favoriteCharacter.img_url && (
                                <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-5 w-5 rounded-full object-cover" />
                            )}
                            <span className="text-xs font-black text-slate-600 dark:text-foreground">{favoriteCharacter.name}</span>
                        </div>
                    )}
                    {bio && (
                        <p className="max-w-xl text-sm text-slate-600 dark:text-muted-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
                    )}
                </div>
            )}
        </div>
    )
}

export default ProfileHeader
