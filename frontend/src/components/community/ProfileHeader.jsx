import { Flag } from 'lucide-react'
import RoleBadge from '@/components/community/RoleBadge'
import BadgeChip from '@/components/community/BadgeChip'
import TierMedallion from '@/components/community/badges/TierMedallion'
import ExtraMedallion from '@/components/community/badges/ExtraMedallion'
import {
    TIER_BADGE_IMAGES, EXTRA_BADGE_IMAGES, EXTRA_BADGES, STREAK_BADGE_THRESHOLD,
    TIER_ACCENT_COLORS, EXTRA_ACCENT_COLORS, pickBestBadge,
} from '@/lib/playerBadges'

// Una chip per badge (tier di un gioco, o un riconoscimento extra) — non più
// un'unica riga "tier+extra" per gioco, così ogni elemento va a capo in
// modo indipendente quando lo spazio finisce (vedi il blocco "Livelli" più
// sotto: prima uno scroll orizzontale troncava il nome del secondo gioco).
const chipsForBadge = (badge) => {
    const chips = [{
        key: `${badge.game_id ?? 'best'}-tier`,
        image: TIER_BADGE_IMAGES[badge.tier],
        medallion: <TierMedallion tier={badge.tier} size={32} />,
        title: badge.label,
        subtitle: badge.game_name,
        opacity: badge.tier === 'sfidante' ? 0.85 : 1,
        accentColor: TIER_ACCENT_COLORS[badge.tier],
    }]
    if ((badge.streak ?? 0) >= STREAK_BADGE_THRESHOLD) {
        chips.push({
            key: `${badge.game_id ?? 'best'}-streak`,
            image: EXTRA_BADGE_IMAGES.streak,
            medallion: <ExtraMedallion type="streak" size={32} />,
            title: EXTRA_BADGES.streak.label,
            subtitle: `${badge.streak} tornei di fila`,
            accentColor: EXTRA_ACCENT_COLORS.streak,
        })
    }
    if (badge.improving) {
        chips.push({
            key: `${badge.game_id ?? 'best'}-improving`,
            image: EXTRA_BADGE_IMAGES.improving,
            medallion: <ExtraMedallion type="improving" size={32} />,
            title: EXTRA_BADGES.improving.label,
            accentColor: EXTRA_ACCENT_COLORS.improving,
        })
    }
    if ((badge.consolation_wins ?? 0) > 0) {
        chips.push({
            key: `${badge.game_id ?? 'best'}-consolation`,
            image: EXTRA_BADGE_IMAGES.consolation,
            medallion: <ExtraMedallion type="consolation" size={32} />,
            title: EXTRA_BADGES.consolation.label,
            subtitle: badge.consolation_wins > 1 ? `Vinta ${badge.consolation_wins}×` : 'Vinta',
            accentColor: EXTRA_ACCENT_COLORS.consolation,
        })
    }
    return chips
}

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
    badges = [],
    favoriteCharacter,
    bio,
}) => {
    // Rango più alto fra tutti i giochi — stesso accento (anello + alone)
    // riusato sull'avatar e sul bordo di ogni chip, un solo linguaggio
    // visivo invece di un riempimento pieno colorato (segnalato in passato
    // come "clash") o di un header piatto senza alcun riferimento (segnalato
    // subito dopo come "troppo spento").
    const bestBadge = pickBestBadge(badges)
    const tierAccent = bestBadge ? TIER_ACCENT_COLORS[bestBadge.tier] : null

    return (
        <div className="flex flex-col items-center text-center gap-4">
            {/* Identità — avatar e nome sempre affiancati, card compatta. */}
            <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                    <div
                        className="h-16 w-16 rounded-2xl border-4 border-slate-200 dark:border-border p-1 shadow-md"
                        style={tierAccent ? {
                            borderColor: tierAccent,
                            boxShadow: `0 0 0 4px ${tierAccent}2e, 0 0 18px ${tierAccent}40`,
                        } : undefined}
                    >
                        <div
                            className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-muted"
                            style={accentColor ? { border: `2px solid ${accentColor}` } : undefined}
                        >
                            {avatarSrc ? (
                                <img src={avatarSrc} alt={nickname} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xl font-black text-slate-400">{fallbackInitial}</span>
                            )}
                        </div>
                    </div>
                    {/* Personaggio preferito sempre qui, vicino all'avatar — mai
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
                    {bestBadge && (
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: tierAccent }}>
                            Rango più alto: {bestBadge.label}
                        </p>
                    )}
                    {role && (
                        <div className="mt-1">
                            <RoleBadge role={role} size="sm" />
                        </div>
                    )}
                </div>
            </div>

            {/* Livelli — una chip per badge (tier di un gioco o riconoscimento
                extra), tutte alla stessa dimensione. flex-wrap invece di
                overflow-x: con tanti giochi la sezione cresce in altezza
                invece di troncare il nome del gioco o nascondersi dietro
                uno scroll forzato. Sotto ~480px le chip passano in colonna
                piena larghezza invece di stringersi in due colonne strette. */}
            {badges.length > 0 && (
                <div className="flex w-full flex-wrap items-center justify-center gap-2.5 max-[480px]:flex-col max-[480px]:items-stretch">
                    {badges.flatMap(chipsForBadge).map((chip) => (
                        <BadgeChip key={chip.key} {...chip} />
                    ))}
                </div>
            )}

            {/* Extra — personaggio preferito SOLO se non ha un'immagine (con
                immagine è già mostrato vicino all'avatar, mai duplicato qui
                sotto — segnalato dall'utente come duplicazione), e bio sotto
                un piccolo divider a bandiera. */}
            {((favoriteCharacter && !favoriteCharacter.img_url) || bio) && (
                <div className="flex w-full flex-col items-center gap-2">
                    {favoriteCharacter && !favoriteCharacter.img_url && (
                        <div className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-1.5">
                            <span className="text-xs font-black text-slate-600 dark:text-foreground">{favoriteCharacter.name}</span>
                        </div>
                    )}
                    {bio && (
                        <>
                            <div className="flex w-full max-w-xs items-center gap-2">
                                <span className="h-px flex-1 bg-slate-200 dark:bg-border" />
                                <Flag size={11} className="shrink-0 text-slate-300 dark:text-muted-foreground" />
                                <span className="h-px flex-1 bg-slate-200 dark:bg-border" />
                            </div>
                            <p className="max-w-sm text-sm text-slate-600 dark:text-muted-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default ProfileHeader
