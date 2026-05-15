import { Plus, Home, Users, History,Flag } from "lucide-react" // Ho aggiunto icone diverse per estetica
import { Button } from "../ui/button"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils" // L'utility di shadcn per gestire le classi

export default function Navbar() {
  const location = useLocation(); // Questo ci dice in che pagina siamo

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={18} /> },
    { name: 'Players', path: '/dashboard', icon: <Users size={18} /> },
    { name: 'Storico', path: '/settings', icon: <History size={18} /> }
  ]

  return (
    <nav className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* LOGO */}
      <div className="flex items-center justify-center font-bold text-2xl tracking-tight text-primary">
  <Link to='/' className="flex items-center">
    <Flag size={20} className="mr-2" />
    <span className="text-green-400   mr-2">MK </span> <span>Tournament</span>
  </Link>
</div>

        {/* LINKS - Mappati dinamicamente */}
        <div className="hidden md:flex items-center gap-2 text-sm font-medium">
          {navItems.map((item) => {
            // Controlliamo se il path attuale corrisponde al link
            const isActive = location.pathname === item.path;

            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  // Classi base per tutti i link
                  "flex items-center gap-2 px-4 py-2 rounded-md transition-all border border-transparent",
                  // Classi se ATTIVO (Verde come nel tuo esempio)
                  isActive 
                    ? "bg-green-500 text-white border-green-600 shadow-sm" 
                    : "text-muted-foreground hover:bg-green-50 hover:text-green-600"
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* AZIONI */}
        <div className="flex items-center gap-2">
          <Button variant="default" className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Torneo
          </Button>
        </div>
      </div>
    </nav>
  )
}