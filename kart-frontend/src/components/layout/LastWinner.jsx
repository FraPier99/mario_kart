import { Trophy, Crown, Flag } from "lucide-react";
import { useAppData } from '@/context/AppDataContext'
import { buildAvatarPlaceholder } from '@/lib/placeholders'

const LastWinner =() =>{
  const { latestTournament, lastWinner } = useAppData()
  const winnerName = lastWinner ? `${lastWinner.first_name} ${lastWinner.last_name}` : 'Nessun dato disponibile'
  const avatarUrl = lastWinner ? lastWinner.img_url || buildAvatarPlaceholder(lastWinner.nickname) : buildAvatarPlaceholder('MK')

    return (
       <div className="mx-auto px-4 py-6 bg-slate-100 dark:bg-muted">
  <div className="max-w-7xl mx-auto px-4 py-6"> 
    
    {/* Titolo Sezione */}
    <div className="flex justify-start items-center gap-4 animate-fade-in">
      <Flag size={30} className="text-emerald-500" />
      <h1 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-amber-100">Ultimo torneo</h1>
    </div>

    {/* CARD */}
    <div className="relative overflow-hidden mt-4 p-2 sm:flex-row flex-col flex gap-6 rounded-2xl border border-amber-300/40 bg-linear-to-br from-amber-100 via-amber-400 to-amber-600 shadow-xl shadow-amber-950/20 animate-scale-in">
      
      <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/20 to-transparent pointer-events-none mix-blend-overlay" />

      {lastWinner && (
        <div className="p-4 relative flex justify-center items-center">
          <div className="relative">
            <img 
              src={avatarUrl} 
              alt="Avatar del vincitore" 
              className="w-40 h-40 object-cover ring-4 ring-white/60 shadow-lg bg-amber-200" 
            />
            <div className="absolute -top-2 -right-2 bg-amber-100 p-2 rounded-full shadow-md border border-amber-300 flex items-center justify-center animate-bounce">
              <Trophy size={24} className="text-amber-600" />
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col justify-center p-5 gap-1 flex-1 text-center sm:text-left">
        
        <div>
          <span className="inline-block bg-amber-950/80 backdrop-blur-xs text-amber-300 px-3 py-1 text-[0.7rem] font-black uppercase tracking-wider rounded-md shadow-xs">
            Nome torneo
          </span>
        </div>

        <h1 className="text-4xl font-black uppercase text-amber-950 tracking-tight drop-shadow-xs mt-1">
          {latestTournament?.name ?? 'Nessun torneo'}
        </h1>

        {lastWinner && (
          <>
            <h2 className="text-2xl font-black uppercase text-amber-950/80 tracking-tight">
              Vincitore: {winnerName}
            </h2>
            {latestTournament?.date && (
              <p className="text-xs text-amber-950/70 font-medium">
                Concluso il {latestTournament.date}
              </p>
            )}
          </>
        )}

        {!lastWinner && latestTournament && (
          <p className="text-sm text-amber-950/70 font-medium mt-2">
            Torneo in corso — nessun vincitore ancora impostato
          </p>
        )}
      </div>

    </div>

  </div>
</div>
    )

}
export default LastWinner