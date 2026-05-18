import React from "react";
import { Users,Flag,Trophy} from "lucide-react";


const Hero =() =>{
    return (
     <div className="mx-auto bg-slate-100 p-8">
  <div className="max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 items-stretch mx-auto px-4">
    
    {/* 1. BOX VERDE: GIOCATORI ATTIVI */}
    <div className="relative overflow-hidden flex flex-col gap-4 items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-900 text-white border border-emerald-400/30 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105 group">
      {/* Riflesso di luce obliquo lucido */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none mix-blend-overlay" />
      
      <Users size={40} className="text-emerald-100 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]" />
      <h1 className="text-4xl font-black tracking-wider text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]">
        666
      </h1>
      <p className="text-xs font-black uppercase tracking-widest text-emerald-100/90 group-hover:text-white transition-colors">
        Giocatori Attivi
      </p>
    </div>

    {/* 2. BOX ROSSO: GARE COMPLETATE */}
    <div className="relative overflow-hidden flex flex-col gap-4 items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-red-400 via-red-600 to-red-900 text-white border border-red-400/30 shadow-[0_10px_25px_-5px_rgba(239,68,68,0.3)] transition-all duration-300 hover:scale-105 group">
      {/* Riflesso di luce obliquo lucido */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none mix-blend-overlay" />
      
      <Flag size={40} className="text-red-100 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]" />
      <h1 className="text-4xl font-black tracking-wider text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]">
        666
      </h1>
      <p className="text-xs font-black uppercase tracking-widest text-red-100/90 group-hover:text-white transition-colors">
        Gare Completate
      </p>
    </div>

    {/* 3. BOX NERO: TROFEI VINTI */}
    <div className="relative overflow-hidden flex flex-col gap-4 items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-slate-700 via-slate-900 to-zinc-950 text-white border border-slate-700/50 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-105 group">
      {/* Riflesso di luce obliquo lucido */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none mix-blend-overlay" />
      
      <Trophy size={40} className="text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-pulse" />
      <h1 className="text-4xl font-black tracking-wider text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]">
        1
      </h1>
      <p className="text-xs font-black uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors">
        Trofei Vinti
      </p>
    </div>

  </div>
</div>



        
    )

}

export default Hero