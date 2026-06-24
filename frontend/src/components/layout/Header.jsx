import { Link } from "react-router-dom";
import { Users, Zap } from "lucide-react";
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'

const Header = () => {
    const { latestTournament, charactersById } = useAppData()
    const { user, isSuperadmin } = useAuth()
    const { dark } = useTheme()
    const theme = getProfileTheme(user, charactersById, dark)
    const player = user?.player ?? null
    const favoriteCharacter = player?.favorite_character_id ? charactersById.get(player.favorite_character_id) : null
    const isFinished = latestTournament && (latestTournament.status === 'concluso' || Boolean(latestTournament.winner_id))
    const isScheduled = latestTournament?.status === 'da_svolgere'
    const tournamentLabel = latestTournament
        ? isFinished
            ? `Torneo concluso: ${latestTournament.name}`
            : isScheduled
                ? `Torneo da svolgere: ${latestTournament.name}`
                : `Torneo in corso: ${latestTournament.name}`
        : 'Crea il primo torneo'
    const tournamentLink = latestTournament ? `/tournaments/${latestTournament.id}` : '/tournaments/new'

    return (
        <header className="relative min-h-112.5 w-full overflow-hidden bg-slate-950 md:min-h-[60vh]">
            <img
                src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwallpapercave.com%2Fwp%2Fwp15388117.jpg&f=1&nofb=1&ipt=288f0aff30d04642323f69162b760f41dace645e342a640fe03d39519ea7a980"
                alt="Mario Kart"
                className="absolute inset-0 w-full h-full object-cover opacity-60 blur-[2px] scale-105"
            />

            <div className="absolute inset-0 z-10" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.82), rgba(0,0,0,0.36) 60%, transparent), ${theme.pageOverlay}` }} />

            <div className="max-w-7xl relative z-20 mx-auto px-6 py-10 flex flex-col items-start justify-center text-white md:h-full">
                <span className="inline-flex items-center gap-1.5 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-sm shadow-md -skew-x-12" style={{ background: theme.accentStrong, boxShadow: `0 0 30px ${theme.accentGlow}` }}>
                    <span className="inline-flex skew-x-12">{isSuperadmin ? `⚡ ${user?.username} · Superadmin` : player ? `Benvenuto, ${player.nickname ?? user?.username}` : 'Benvenuto alla Lega Kart!'}</span>
                </span>

                <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                    <div className="h-20 w-20 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 shadow-xl">
                        {player?.img_url ? (
                            <img src={player.img_url} alt={player.nickname} className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl font-black text-white/80">
                                {(player?.nickname ?? user?.username ?? '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-200">
                            {theme.teamName}
                        </p>
                        <h1 className="mt-1 text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none [text-shadow:3px_3px_0px_#000] drop-shadow-xl">
                            {isSuperadmin ? user?.username : player ? player.nickname ?? 'Area personale' : 'Mario Kart'}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">
                            {isSuperadmin
                                ? 'Account di supervisione: gestisci tornei, utenti e schedine della lega.'
                                : favoriteCharacter
                                    ? `Il tuo profilo è legato a ${favoriteCharacter.name}. La home cambia colore e stile in base al tuo personaggio.`
                                    : 'Completa il profilo per attivare avatar, tema personale e personaggio preferito.'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center mt-8 -skew-x-10">
                    <Link
                        to={tournamentLink}
                        className="inline-flex items-center gap-2 px-8 py-3.5 text-white font-black uppercase tracking-wider text-sm rounded-xl shadow-lg transition-all duration-200 active:scale-95 group"
                        style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`, boxShadow: `0 18px 50px ${theme.accentSoft}` }}
                    >
                        <span className="inline-flex items-center gap-2 skew-x-10">
                            <Zap className="w-4 h-4 text-white group-hover:animate-bounce" />
                            {tournamentLabel}
                        </span>
                    </Link>

                    <Link
                        to="/stats"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-black uppercase tracking-wider text-sm rounded-xl border border-white/20 shadow-md transition-all duration-200 active:scale-95"
                    >
                        <span className="inline-flex items-center gap-2 skew-x-10">
                            <Users className="w-4 h-4 text-white/80" />
                            Classifica
                        </span>
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default Header