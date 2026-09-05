import { Link } from "react-router-dom";
import { Flag, ArrowRight, User } from "lucide-react";
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'
import { getTimeGreeting } from '@/lib/greeting'

const Header = () => {
    const { detailedTournaments, charactersById } = useAppData()
    const { user, isSuperadmin } = useAuth()
    const { dark } = useTheme()
    const theme = getProfileTheme(user, charactersById, dark)
    const player = user?.player ?? null

    // Il nome/avatar è cliccabile solo per chi ha un profilo da raggiungere
    // (giocatore o superadmin) — sostituisce la vecchia "Profile card" di
    // Hero.jsx, rimossa perché duplicava questa stessa identità.
    const identityLink = (player || isSuperadmin) ? '/dashboard' : null
    const IdentityTag = identityLink ? Link : 'div'
    const identityProps = identityLink ? { to: identityLink } : {}

    // "Continua torneo": il primo torneo NON concluso (in corso o da svolgere)
    // nell'elenco ordinato per data desc. Se il più recente è già concluso (o
    // non esistono tornei) non c'è nulla da "continuare" — si passa alle CTA
    // di fallback (Classifica/Profilo). I tornei amichevoli non vengono
    // proposti qui: sono partite per divertimento, non "da continuare" come
    // priorità in home.
    const activeTournament = detailedTournaments.find((t) => t.status !== 'concluso' && !t.winner_id && !t.is_friendly) ?? null
    const isScheduled = activeTournament?.status === 'da_svolgere'
    const tournamentLink = activeTournament ? `/tournaments/${activeTournament.id}` : null
    const greeting = getTimeGreeting()

    return (
        <section className="mx-auto max-w-7xl px-4 pt-8">
            {/* Card compatta "Chi sono io" — sfumatura tema leggera al posto della foto/blur/texture di sfondo */}
            <div
                className="overflow-hidden rounded-[2rem] border-2 border-slate-900/70 dark:border-white/20"
                style={{ background: theme.cardBackground, boxShadow: 'var(--circuit-shadow-lg)' }}
            >
                <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                    {/* Identità: avatar + eyebrow + nickname/team + badge campione */}
                    <IdentityTag
                        {...identityProps}
                        className="flex min-w-0 flex-1 items-center gap-4"
                    >
                        <div className="relative shrink-0">
                            <div className="absolute -inset-0.5 rounded-2xl opacity-60 animate-pulse" style={{ background: theme.accent }} />
                            <div className="relative h-18 w-18 overflow-hidden rounded-2xl border-2 border-slate-900/70 dark:border-white/20 bg-slate-100 dark:bg-slate-900 md:h-20 md:w-20" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                                {player?.img_url ? (
                                    <img src={player.img_url} alt={player.nickname} className="h-full w-full object-cover" />
                                ) : (
                                    <div className={`flex h-full w-full items-center justify-center text-3xl font-black ${theme.tailwind.textStrong}`}>
                                        {(player?.nickname ?? user?.username ?? '?').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <p className={`font-title text-xs tracking-[0.3em] ${theme.tailwind.textStrong}`}>
                                {isSuperadmin
                                    ? `⚡ ${greeting}, ${user?.username}`
                                    : player
                                        ? greeting
                                        : 'Benvenuto alla Lega Kart'}
                            </p>
                            <h1 className="mt-0.5 truncate text-3xl font-black uppercase tracking-tighter leading-none text-slate-900 dark:text-foreground md:text-4xl">
                                {isSuperadmin ? user?.username : player ? player.nickname ?? 'Area personale' : 'Mario Kart'}
                            </h1>
                        </div>
                    </IdentityTag>

                    {/* Azioni: bottone primario filled se c'è un torneo da continuare, altrimenti CTA secondarie */}
                    {activeTournament ? (
                        <Link
                            to={tournamentLink}
                            className="font-title inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-transparent px-5 py-3.5 text-[10px] tracking-wide text-white transition active:translate-y-px hover:opacity-90"
                            style={{ background: theme.accent, boxShadow: 'var(--circuit-shadow-sm)' }}
                        >
                            <Flag size={14} />
                            {isScheduled ? 'Inizia' : 'Continua'}: {activeTournament.name}
                            <ArrowRight size={14} />
                        </Link>
                    ) : identityLink && (
                        <div className="flex shrink-0 flex-wrap gap-3">
                            {/* Unico CTA rimasto — accento neon nel colore del tema
                                personale (stesso `theme.accent` dell'alone dietro
                                l'avatar), non più un bordo grigio generico uguale a
                                qualsiasi altro pulsante. */}
                            <Link
                                to={identityLink}
                                className="font-title inline-flex items-center gap-2 rounded-xl border-2 bg-transparent px-4 py-3 text-[10px] tracking-wide transition active:translate-y-px hover:brightness-110"
                                style={{
                                    borderColor: theme.accent,
                                    color: theme.accent,
                                    boxShadow: `0 0 14px ${theme.accent}55, 0 0 2px ${theme.accent}`,
                                }}
                            >
                                <User size={14} /> {player ? 'Il mio profilo' : 'Dashboard'}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default Header