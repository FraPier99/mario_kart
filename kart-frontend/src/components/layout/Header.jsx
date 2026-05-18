import React from "react";
import { Link } from "react-router-dom";
import { Users,Zap} from "lucide-react";
import { Grid2X2 } from 'lucide-react';



const Header = () =>{
    return (
   
<header className="relative h-[60vh] min-h-[450px] w-full overflow-hidden bg-slate-950">
  {/* Immagine di Sfondo con zoom e opacità controllata */}
  <img
    src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwallpapercave.com%2Fwp%2Fwp15388117.jpg&f=1&nofb=1&ipt=288f0aff30d04642323f69162b760f41dace645e342a640fe03d39519ea7a980"
    alt="Mario Kart"
    className="absolute inset-0 w-full h-full object-cover opacity-60 blur-[2px] scale-105"
  />

  {/* Overlay Sfumato: Scurisce a sinistra per far esplodere i testi bianchi */}
  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />

  {/* Contenitore Contenuto */}
  <div className="max-w-7xl relative z-20 h-full mx-auto px-6 flex flex-col items-start justify-center text-white">
    
    {/* Tag di Benvenuto Inclinato */}
    <span className="inline-flex items-center gap-1.5 bg-[#e52e2e] text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-sm shadow-md skew-x-[-12deg]">
      <span className="inline-block skew-x-[12deg]">⚡ Benvenuto alla Lega Kart!</span>
    </span>
    
    {/* Titolo Principale in Blocco Unico Inclinato */}
    <div className="flex flex-col uppercase tracking-tighter skew-x-[-8deg] mt-4 select-none">
      <h1 className="text-5xl md:text-7xl font-black text-white leading-none [text-shadow:3px_3px_0px_#000] drop-shadow-xl">
        Mario Kart 
      </h1>
      <h1 className="text-5xl md:text-7xl font-black text-[#e52e2e] leading-none [text-shadow:3px_3px_0px_#000] drop-shadow-xl mt-1">
        Tournament
      </h1>
    </div>

    {/* Gruppo Pulsanti d'Azione */}
    <div className="flex flex-wrap gap-4 items-center mt-8 skew-x-[-10deg]">
      
      {/* Pulsante Sinistro: TORNEO IN CORSO (Rosso Neon) */}
      <Link 
        href="#tournaments" 
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#e52e2e] hover:bg-red-500 text-white font-black uppercase tracking-wider text-sm rounded-xl shadow-lg shadow-red-600/40 transition-all duration-200 active:scale-95 group"
      >
        <span className="inline-block skew-x-[10deg] flex items-center gap-2">
          <Zap className="w-4 h-4 text-white group-hover:animate-bounce" />
          Torneo in corso: FF
        </span>
      </Link>

      {/* Pulsante Destro: GIOCATORI (Vetro Sfocato Moderno) */}
      <Link 
        to="#players" 
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-black uppercase tracking-wider text-sm rounded-xl border border-white/20 shadow-md transition-all duration-200 active:scale-95"
      >
        <span className="inline-block skew-x-[10deg] flex items-center gap-2">
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