import { useState, useRef } from "react"
import { Plus, Home, Users, History, Flag, BarChart3, Shield, Swords, Map, Moon, Sun, Menu, X, ChevronDown } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/useTheme"


export default function Navbar() {
  const { isDark, toggle } = useTheme()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreTimer = useRef(null)

  const handleMoreClick = () => {
    setMoreOpen((prev) => !prev)
  }

  const handleMoreEnter = () => {
    clearTimeout(moreTimer.current)
    setMoreOpen(true)
  }

  const handleMoreLeave = () => {
    moreTimer.current = setTimeout(() => setMoreOpen(false), 350)
  }

  const mainItems = [
    { name: 'Home', path: '/', icon: <Home size={18} /> },
    { name: 'Players', path: '/players', icon: <Users size={18} /> },
    { name: 'Storico', path: '/history', icon: <History size={18} /> },
    { name: 'Stats', path: '/stats', icon: <BarChart3 size={18} /> },
  ]

  const moreItems = [
    { name: 'Confronto', path: '/compare', icon: <Swords size={18} /> },
    { name: 'Circuiti', path: '/circuits', icon: <Map size={18} /> },
    { name: 'Admin', path: '/admin/players', icon: <Shield size={18} /> },
  ]

  const allItems = [...mainItems, ...moreItems]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* LOGO */}
        <div className="flex items-center justify-center font-black text-2xl tracking-tighter -skew-x-6">
          <Link to='/' className="flex items-center text-white select-none">
            <Flag size={22} className="mr-2 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
            <span className="text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.3)]">MK</span>
            <span className="text-white ml-1 [text-shadow:1px_1px_0px_#000]">Tournament</span>
          </Link>
        </div>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex items-center gap-1 text-sm font-black uppercase tracking-wider">
          {mainItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 -skew-x-10 active:scale-95",
                isActive(item.path)
                  ? "bg-linear-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-green-600/30 border border-emerald-400/20"
                  : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <span className="inline-flex items-center gap-2 skew-x-10">
                {item.icon}
                {item.name}
              </span>
            </Link>
          ))}

          {/* More dropdown */}
          <div className="relative" onMouseEnter={handleMoreEnter} onMouseLeave={handleMoreLeave}>
            <button
              type="button"
              onClick={handleMoreClick}
              className={cn(
                "flex cursor-pointer items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 -skew-x-10 active:scale-95 border",
                moreItems.some((i) => isActive(i.path))
                  ? "bg-linear-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-green-600/30 border-emerald-400/20"
                  : "text-slate-300 hover:text-white hover:bg-white/5 border-transparent"
              )}
            >
              <span className="inline-flex items-center gap-1 skew-x-10">
                Altro
                <ChevronDown size={14} />
              </span>
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-xl shadow-black/30">
                {moreItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-black uppercase tracking-wider transition hover:bg-white/10",
                      isActive(item.path) ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300"
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="hidden sm:flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title={isDark ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link
            to="/tournaments/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-md shadow-green-600/20 border border-emerald-400/20 transition-all duration-200 active:scale-95 -skew-x-10"
          >
            <span className="inline-flex items-center gap-1 skew-x-10">
              <Plus className="h-4 w-4 stroke-3" />
              <span className="hidden sm:inline">Nuovo Torneo</span>
            </span>
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {allItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition",
                  isActive(item.path) ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:bg-white/5"
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => { toggle(); setMobileOpen(false) }}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/5"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              {isDark ? 'Modalità chiara' : 'Modalità scura'}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
