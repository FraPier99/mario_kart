import { useEffect, useRef, useState } from "react"
import {
  Home, Trophy, BarChart3, Users, Menu, X, Sun, Moon,
  Flag, LogOut, User, ChevronDown, PenLine,
  Plus, Shield, LayoutDashboard, Crown, BookOpen, Zap
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useAppData } from '@/context/AppDataContext'
import { getProfileTheme } from '@/lib/profileTheme'
import NotificationBell from '@/components/common/NotificationBell'

export default function Navbar() {
  const location = useLocation()
  const { user, isAuthenticated, isAdmin, isSuperadmin, logout } = useAuth()
  const isPrivileged = isAdmin || isSuperadmin
  const { charactersById } = useAppData()
  const { dark, toggle: toggleDark } = useTheme()
  const theme = getProfileTheme(user, charactersById, dark)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [torneiOpen, setTorneiOpen] = useState(false)
  const profileRef = useRef(null)
  const adminRef = useRef(null)
  const torneiRef = useRef(null)

    const navItems = [
        { name: 'Home',        path: '/',        icon: <Home size={15} /> },
        { name: 'Tornei',      path: '/history', icon: <Trophy size={15} /> },
        { name: 'Classifiche', path: '/stats',   icon: <BarChart3 size={15} /> },
        { name: 'Giocatori',   path: '/players', icon: <Users size={15} /> },
        // Galleria temporaneamente disattivata lato backend (foto troppo pesanti) — vedi app/main.py
        { name: 'Hall of Fame', path: '/hall-of-fame', icon: <Crown size={15} /> },
    ]

    const torneiSubItems = [
        { name: 'Storico',     path: '/history',     icon: <Trophy size={15} /> },
        { name: 'Regolamento', path: '/regolamento', icon: <BookOpen size={15} /> },
        { name: 'Schedina',    path: '/schedina',    icon: <PenLine size={15} /> },
        { name: 'Carte',       path: '/carte',       icon: <Zap size={15} /> },
    ]

  const adminItems = [
    { name: 'Dashboard Admin',    path: '/admin',         icon: <BarChart3 size={15} /> },
    { name: 'Crea Torneo',        path: '/tournaments/new', icon: <Plus size={15} /> },
    { name: 'Gestione Giocatori', path: '/admin/players', icon: <Users size={15} /> },
  ]

  const player = user?.player ?? null
  const favoriteCharacter = player?.favorite_character_id
    ? charactersById?.get(player.favorite_character_id) ?? null
    : null

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (adminRef.current && !adminRef.current.contains(e.target)) setAdminOpen(false)
      if (torneiRef.current && !torneiRef.current.contains(e.target)) setTorneiOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileOpen(false)
    setMobileOpen(false)
    setAdminOpen(false)
    setTorneiOpen(false)
  }, [location.pathname])

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const isTorneiActive = () => torneiSubItems.some((item) => isActive(item.path))

  const NavLink = ({ item }) => (
    <Link
      to={item.path}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 select-none",
        isActive(item.path)
          ? "text-white shadow-md"
          : "text-slate-300 hover:text-white hover:bg-white/8"
      )}
      style={isActive(item.path) ? {
        background: `linear-gradient(135deg, var(--mk-primary), var(--mk-primary-strong))`,
        boxShadow: `0 4px 14px var(--mk-primary-soft)`,
      } : {}}
    >
      {item.icon}
      <span className="hidden lg:inline">{item.name}</span>
      <span className="lg:hidden">{item.name}</span>
    </Link>
  )

  return (
    <nav
      className="sticky top-0 z-50 border-b shadow-lg backdrop-blur-md"
      style={{ background: 'var(--mk-navbar-bg)', borderBottomColor: 'var(--mk-border)' }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 gap-3">

        {/* LOGO */}
        <Link to='/' className="flex shrink-0 items-center gap-2 select-none">
          <Flag
            size={20}
            style={{ color: 'var(--mk-primary)', filter: 'drop-shadow(0 0 6px var(--mk-primary-glow))' }}
          />
          <span
            className="font-title text-base font-black"
            style={{ color: 'var(--mk-primary)', textShadow: '0 0 10px var(--mk-primary-soft)' }}
          >
            MK
          </span>
        </Link>

        {/* DESKTOP — NAV LINKS centrati */}
        <div className="hidden md:flex items-center gap-0.5 rounded-2xl border border-white/5 bg-white/4 p-1">
          {navItems.map((item) => {
            if (item.name === 'Tornei') {
              return (
                <div key={item.path} className="relative" ref={torneiRef}>
                  <button
                    type="button"
                    onClick={() => setTorneiOpen((v) => !v)}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 select-none"
                    style={isTorneiActive() ? {
                      background: 'linear-gradient(135deg, var(--mk-primary), var(--mk-primary-strong))',
                      boxShadow: '0 4px 14px var(--mk-primary-soft)',
                      color: '#fff',
                    } : {
                      color: torneiOpen ? '#fff' : 'rgb(203 213 225)',
                      background: torneiOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                    }}
                  >
                    <Trophy size={15} />
                    <span className="hidden lg:inline">Tornei</span>
                    <span className="lg:hidden">Tornei</span>
                    <ChevronDown size={11} className={`transition-transform ${torneiOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {torneiOpen && (
                    <div
                      className="absolute left-0 top-full mt-1.5 min-w-44 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl"
                      style={{ background: 'var(--mk-navbar-bg)', borderColor: 'var(--mk-border)' }}
                    >
                      {torneiSubItems.map((sub) => (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setTorneiOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider transition hover:bg-white/8"
                          style={{ color: isActive(sub.path) ? 'var(--mk-primary)' : 'rgb(203 213 225)' }}
                        >
                          {sub.icon}
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return <NavLink key={item.path} item={item} />
          })}
        </div>

        {/* DESKTOP — RIGHT ACTIONS */}
        <div className="hidden md:flex items-center gap-1.5">

          {/* Admin dropdown — solo se privilegiato */}
          {isPrivileged && (
            <div className="relative" ref={adminRef}>
              <button
                type="button"
                onClick={() => setAdminOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all",
                  adminOpen
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/8 text-slate-400 hover:border-white/15 hover:text-white"
                )}
              >
                <Shield size={13} />
                <span className="hidden lg:inline">Admin</span>
                <ChevronDown size={11} className={`transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
              </button>

              {adminOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 min-w-52 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl"
                  style={{ background: 'var(--mk-navbar-bg)', borderColor: 'var(--mk-border)' }}
                >
                  {isSuperadmin ? (
                    /* Versione semplificata per SuperAdmin */
                    <>
                      <p className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Azioni rapide</p>
                      <Link
                        to="/tournaments/new"
                        onClick={() => setAdminOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/8 hover:text-white"
                      >
                        <Plus size={13} /> Crea Torneo
                      </Link>
                      <Link
                        to="/admin/players"
                        onClick={() => setAdminOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/8 hover:text-white"
                      >
                        <Users size={13} /> Gestisci Giocatori
                      </Link>
                      <div className="my-1 border-t" style={{ borderColor: 'var(--mk-border)' }} />
                      <Link
                        to="/superadmin"
                        onClick={() => setAdminOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/10 hover:text-amber-200"
                      >
                        <Shield size={13} /> Pannello SuperAdmin
                      </Link>
                    </>
                  ) : (
                    /* Menu completo per admin standard */
                    <>
                      <p className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Strumenti admin</p>
                      {adminItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setAdminOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/8 hover:text-white"
                        >
                          {item.icon}
                          {item.name}
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Campanella notifiche */}
          {isAuthenticated && <NotificationBell />}

          {/* Dark toggle */}
          <button
            type="button"
            onClick={toggleDark}
            title={dark ? 'Modalità chiara' : 'Modalità scura'}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/8 text-slate-400 transition hover:border-white/15 hover:text-white"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Profile dropdown */}
          {isAuthenticated && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="relative flex cursor-pointer items-center gap-2 rounded-xl border px-2 py-1 transition"
                style={{
                  borderColor: profileOpen ? 'var(--mk-primary)' : 'var(--mk-border)',
                  background: profileOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                }}
              >
                <div className="h-7 w-7 overflow-hidden rounded-lg border border-white/10 bg-white/10 shrink-0">
                  {favoriteCharacter?.img_url ? (
                    <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-full w-full object-cover" />
                  ) : player?.img_url ? (
                    <img src={player.img_url} alt={player.nickname} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-white">
                      {(player?.nickname || user?.username || '?').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="hidden xl:block text-left leading-none">
                  <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${theme.tailwind.text}`}>{theme.teamName}</p>
                  <p className="mt-0.5 text-xs font-black text-white">{player?.nickname || user?.username}</p>
                </div>
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl"
                  style={{ background: 'var(--mk-navbar-bg)', borderColor: 'var(--mk-border)' }}
                >
                  {/* Header profilo */}
                  <div className="mb-1 flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-9 w-9 overflow-hidden rounded-lg border border-white/10 shrink-0">
                      {favoriteCharacter?.img_url ? (
                        <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
                          {(player?.nickname || '?').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{player?.nickname || user?.username}</p>
                      <p className={`text-[9px] uppercase tracking-wider truncate ${theme.tailwind.text}`}>{theme.teamName}</p>
                    </div>
                  </div>

                  {/* ACCOUNT */}
                  <p className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Account</p>
                  <Link to="/dashboard" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/8 hover:text-white">
                    <User size={13} /> Il mio Profilo
                  </Link>

                  {/* Admin link — solo per admin non-superadmin */}
                  {isPrivileged && !isSuperadmin && (
                    <>
                      <div className="my-1 border-t" style={{ borderColor: 'var(--mk-border)' }} />
                      <p className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Admin</p>
                      <Link to="/admin" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/8 hover:text-white">
                        <LayoutDashboard size={13} /> Dashboard Admin
                      </Link>
                    </>
                  )}

                  {/* SuperAdmin link */}
                  {isSuperadmin && (
                    <>
                      <div className="my-1 border-t" style={{ borderColor: 'var(--mk-border)' }} />
                      <Link to="/superadmin" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/10 hover:text-amber-200">
                        <Shield size={13} /> Pannello SuperAdmin
                      </Link>
                    </>
                  )}

                  <div className="my-1 border-t" style={{ borderColor: 'var(--mk-border)' }} />
                  <button
                    type="button"
                    onClick={() => { setProfileOpen(false); logout() }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <LogOut size={13} /> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MOBILE — right bar */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={toggleDark}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 text-slate-400"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {isAuthenticated && <NotificationBell />}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/8 text-slate-300 transition hover:bg-white/8 hover:text-white"
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div
          className="md:hidden border-t"
          style={{ borderTopColor: 'var(--mk-border)', background: 'var(--mk-navbar-bg)' }}
        >
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">

            {/* Profilo card mobile */}
            {isAuthenticated && (
              <div className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-9 w-9 overflow-hidden rounded-lg border border-white/10 bg-white/10 shrink-0">
                  {favoriteCharacter?.img_url ? (
                    <img src={favoriteCharacter.img_url} alt={favoriteCharacter.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-black text-white">
                      {(player?.nickname || '?').charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-white">{player?.nickname || user?.username}</p>
                  <p className={`text-[9px] uppercase tracking-wider ${theme.tailwind.text}`}>{theme.teamName}</p>
                </div>
              </div>
            )}

            {/* NAVIGAZIONE */}
            <p className="px-2 pt-1 pb-0.5 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Navigazione</p>
            <div className="grid grid-cols-2 gap-1">
              {navItems.flatMap((item) => {
                if (item.name === 'Tornei') {
                  return torneiSubItems.map((sub) => (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider transition",
                        isActive(sub.path)
                          ? `${theme.tailwind.bgSoft} ${theme.tailwind.text}`
                          : "text-slate-300 hover:bg-white/5"
                      )}
                    >
                      {sub.icon}
                      {sub.name}
                    </Link>
                  ))
                }
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider transition",
                      isActive(item.path)
                        ? `${theme.tailwind.bgSoft} ${theme.tailwind.text}`
                        : "text-slate-300 hover:bg-white/5"
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* ACCOUNT */}
            {isAuthenticated && (
              <>
                <div className="border-t pt-2" style={{ borderTopColor: 'var(--mk-border)' }}>
                  <p className="px-2 pb-0.5 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Account</p>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/5"
                  >
                    <User size={15} /> Il mio Profilo
                  </Link>
                </div>
              </>
            )}

            {/* ADMIN */}
            {isPrivileged && (
              <div className="rounded-xl border border-white/8 p-2 space-y-0.5">
                {isSuperadmin ? (
                  <>
                    <p className="px-2 pb-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Azioni rapide</p>
                    <Link to="/tournaments/new" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/5">
                      <Plus size={15} /> Crea Torneo
                    </Link>
                    <Link to="/admin/players" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/5">
                      <Users size={15} /> Gestisci Giocatori
                    </Link>
                    <div className="my-1 border-t border-white/8" />
                    <Link to="/superadmin" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/10">
                      <Shield size={15} /> Pannello SuperAdmin
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="px-2 pb-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Admin</p>
                    {adminItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/5"
                      >
                        {item.icon}
                        {item.name}
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* LOGOUT */}
            {isAuthenticated && (
              <div className="border-t pt-2" style={{ borderTopColor: 'var(--mk-border)' }}>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); logout() }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider text-rose-400 transition hover:bg-rose-500/10"
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
