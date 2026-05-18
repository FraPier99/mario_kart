import { Plus, Home, Users, History,Flag, } from "lucide-react" // Ho aggiunto icone diverse per estetica
import { Button } from "../ui/button"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils" // L'utility di shadcn per gestire le classi


export default function Navbar() {
  const location = useLocation(); // Questo ci dice in che pagina siamo

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={18} /> },
    { name: 'Players', path: '/players', icon: <Users size={18} /> },
    { name: 'Storico', path: '/settings', icon: <History size={18} /> },
    { name: 'Stats', path: '/stats', icon:  <Flag size={18} /> },
  ]

  return (
<nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-md shadow-lg">
  <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
    
    {/* LOGO (Stile Corse) */}
    <div className="flex items-center justify-center font-black text-2xl tracking-tighter skew-x-[-6deg]">
      <Link to='/' className="flex items-center text-white select-none">
        <Flag size={22} className="mr-2 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
        <span className="text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.3)]">MK</span>
        <span className="text-white ml-1 [text-shadow:1px_1px_0px_#000]">Tournament</span>
      </Link>
    </div>

    {/* LINKS - Mappati dinamicamente */}
    <div className="hidden md:flex items-center gap-3 text-sm font-black uppercase tracking-wider">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;

        return (
          <Link 
            key={item.path} 
            to={item.path}
            className={cn(
              // Classi base animate per tutti i link con transizione fluida
              "flex items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200 skew-x-[-10deg] active:scale-95",
              
              // Se ATTIVO: Verde smeraldo tridimensionale lucido
              isActive 
                ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-green-600/30 border border-emerald-400/20" 
                : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
            )}
          >
            {/* Contro-incliniamo il testo interno per lasciarlo dritto e leggibile */}
            <span className="inline-block skew-x-[10deg] flex items-center gap-2">
              {item.icon}
              {item.name}
            </span>
          </Link>
        )
      })}
    </div>

    {/* AZIONI - Bottone "+ Nuovo Torneo" coordinato */}
    <div className="flex items-center gap-2">
      <Link
        to="/nuovo-torneo" /* Assicurati che sia un Link o mantieni il tuo tag Button modificando le classi */
        className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-md shadow-green-600/20 border border-emerald-400/20 transition-all duration-200 active:scale-95 skew-x-[-10deg]"
      >
        <span className="inline-block skew-x-[10deg] flex items-center gap-1">
          <Plus className="h-4 w-4 stroke-[3]" />
          Nuovo Torneo
        </span>
      </Link>
    </div>

  </div>
</nav>
  )
}