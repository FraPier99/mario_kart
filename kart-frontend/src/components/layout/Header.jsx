import { Link } from "react-router-dom";
import { Users, Zap } from "lucide-react";
import { useAppData } from '@/context/AppDataContext'

const Header = () => {
    const { latestTournament } = useAppData()
    const isFinished = latestTournament && Boolean(latestTournament.winner_id)
    const tournamentLabel = latestTournament
        ? isFinished ? `Torneo: ${latestTournament.name}` : `Torneo in corso: ${latestTournament.name}`
        : 'Crea il primo torneo'
    const tournamentLink = latestTournament ? `/tournaments/${latestTournament.id}` : '/tournaments/new'

    return (
        <header className="relative h-[60vh] min-h-112.5 w-full overflow-hidden bg-slate-950">
            <img
                src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwallpapercave.com%2Fwp%2Fwp15388117.jpg&f=1&nofb=1&ipt=288f0aff30d04642323f69162b760f41dace645e342a640fe03d39519ea7a980"
                alt="Mario Kart"
                className="absolute inset-0 w-full h-full object-cover opacity-60 blur-[2px] scale-105"
            />

            <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent z-10" />

            <div className="max-w-7xl relative z-20 h-full mx-auto px-6 flex flex-col items-start justify-center text-white">
                <span className="inline-flex items-center gap-1.5 bg-[#e52e2e] text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-sm shadow-md -skew-x-12">
                    <span className="inline-flex skew-x-12">⚡ Benvenuto alla Lega Kart!</span>
                </span>

                <div className="flex flex-col uppercase tracking-tighter -skew-x-8 mt-4 select-none">
                    <h1 className="text-5xl md:text-7xl font-black text-white leading-none [text-shadow:3px_3px_0px_#000] drop-shadow-xl">
                        Mario Kart
                    </h1>
                    <h1 className="text-5xl md:text-7xl font-black text-[#e52e2e] leading-none [text-shadow:3px_3px_0px_#000] drop-shadow-xl mt-1">
                        Tournament
                    </h1>
                </div>

                <div className="flex flex-wrap gap-4 items-center mt-8 -skew-x-10">
                    <Link
                        to={tournamentLink}
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#e52e2e] hover:bg-red-500 text-white font-black uppercase tracking-wider text-sm rounded-xl shadow-lg shadow-red-600/40 transition-all duration-200 active:scale-95 group"
                    >
                        <span className="inline-flex items-center gap-2 skew-x-10">
                            <Zap className="w-4 h-4 text-white group-hover:animate-bounce" />
                            {tournamentLabel}
                        </span>
                    </Link>

                    <Link
                        to="/players"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-black uppercase tracking-wider text-sm rounded-xl border border-white/20 shadow-md transition-all duration-200 active:scale-95"
                    >
                        <span className="inline-flex items-center gap-2 skew-x-10">
                            <Users className="w-4 h-4 text-white/80" />
                            Giocatori
                        </span>
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default Header