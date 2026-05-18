import React from "react";
import { Users,Flag,Trophy,Crown} from "lucide-react";
import avatar from '../../assets/avatar/fede.jpeg';




const LastWinner =() =>{
    return (
       <div className="mx-auto px-4 py-6 bg-slate-100">
  <div className="max-w-7xl mx-auto px-4 py-6"> 
    
    {/* Titolo Sezione */}
    <div className="flex justify-start items-center gap-4">
      <Crown size={35} className="text-red-500 animate-pulse" />
      <h1 className="text-4xl font-bold tracking-tight text-slate-800">Ultimo Vincitore</h1>
    </div>

    {/* CARD LEGGENDARIA ORO */}
    <div className="relative overflow-hidden mt-4 p-2 sm:flex-row flex-col flex gap-6 rounded-2xl border border-amber-300/40 bg-linear-to-br from-amber-100 via-amber-400 to-amber-600 shadow-xl shadow-amber-950/20">
      
      {/* Riflesso di luce metallica obliquo */}
      <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/20 to-transparent pointer-events-none mix-blend-overlay" />

      {/* Sezione Avatar */}
      <div className="p-4 relative flex justify-center items-center">
        <div className="relative">
          <img 
            src={avatar} 
            alt="Avatar del vincitore" 
            className="w-40 h-40 rounded-full object-cover ring-4 ring-white/60 shadow-lg bg-amber-200" 
          />
          {/* Icona Trofeo posizionata sopra l'avatar */}
          <div className="absolute -top-2 -right-2 bg-amber-100 p-2 rounded-full shadow-md border border-amber-300 flex items-center justify-center animate-bounce">
            <Trophy size={24} className="text-amber-600" />
          </div>
        </div>
      </div>
      
      {/* Sezione Testi e Dettagli */}
      <div className="flex flex-col justify-center p-5 gap-1 flex-1 text-center sm:text-left">
        
        {/* Badge Torneo */}
        <div>
          <span className="inline-block bg-amber-950/80 backdrop-blur-xs text-amber-300 px-3 py-1 text-[0.7rem] font-black uppercase tracking-wider rounded-md shadow-xs">
            Torneo: Primo Torneo
          </span>
        </div>

        {/* Nome Campione */}
        <h1 className="text-5xl font-black uppercase text-amber-950 tracking-tight drop-shadow-xs mt-1">
          Federico
        </h1>
        
        {/* Data di conclusione */}
        <p className="text-xs text-amber-950/70 font-medium">
          Concluso il 15 marzo 2026
        </p>
        
        {/* Mini-Box Statistiche */}
        <div className="flex gap-4 mt-5 justify-center sm:justify-start">
          
          {/* Box Punti (Verde Smeraldo Lucido) */}
          <div className="flex flex-col items-center justify-center bg-emerald-600/90 backdrop-blur-xs border border-emerald-500/30 shadow-md rounded-xl w-36 py-4">
            <p className="text-3xl text-white font-black tracking-wider leading-none">
              45
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 mt-1.5 leading-none">
              Punti
            </p>
          </div>
          
          {/* Box Gare Vinte (Vetro Semi-trasparente) */}
          <div className="flex flex-col items-center justify-center bg-white/30 backdrop-blur-md border border-white/40 shadow-md rounded-xl w-36 py-4">
            <p className="text-3xl font-black text-amber-950 tracking-wider leading-none">
              8
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-900/80 mt-1.5 leading-none">
              Gare vinte
            </p>
          </div>

        </div>
      </div>

    </div>

  </div>
</div>
    )




}
export default LastWinner