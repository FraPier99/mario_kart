import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, BellRing, PenLine, Trophy, Zap, MessageCircle, ArrowRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { notificationsApi, schedineApi } from '@/services/apiClient'
import { useAppData } from '@/context/AppDataContext'

const TYPE_CONFIG = {
  schedina_pending:  { icon: PenLine,       color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Schedina da compilare' },
  tournament_ended:  { icon: Trophy,         color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Torneo concluso' },
  schedina_winner:   { icon: Zap,            color: 'text-purple-400',  bg: 'bg-purple-500/15',  label: 'Schedina vincente' },
  new_tournament:    { icon: Trophy,         color: 'text-violet-400',  bg: 'bg-violet-500/15',  label: 'Nuovo torneo' },
  gallery_mention:   { icon: MessageCircle,  color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Menzione in galleria' },
  mention:           { icon: MessageCircle,  color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Menzione' },
  comment_reply:     { icon: MessageCircle,  color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Risposta in galleria' },
  card_granted:      { icon: Zap,            color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Carta ricevuta' },
}
const DEFAULT_CFG = { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-500/15', label: 'Notifica' }

const resolveNotifLink = (notif) => {
  if (notif.link) return notif.link
  const ref = notif.ref_id ?? notif.source_tournament_id ?? notif.tournament_id ?? null
  switch (notif.type) {
    case 'tournament_ended': return ref ? `/tournaments/${ref}` : '/history'
    case 'schedina_winner':  return ref ? `/schedina/${ref}` : '/history'
    case 'schedina_pending': return ref ? `/schedina/${ref}/compila` : '/schedina'
    case 'new_tournament':   return ref ? `/tournaments/${ref}` : '/history'
    case 'gallery_mention':
    case 'comment_reply':    return '/gallery'
    case 'card_granted':     return '/dashboard'
    default:                 return ref ? `/tournaments/${ref}` : '/dashboard'
  }
}

const resolveNotifContext = (notif, getTournamentDisplayNumber) => {
  const tName = notif.tournament_name ?? notif.tournament ?? null
  const tId   = notif.ref_id ?? notif.tournament_id ?? null
  const num   = tId ? getTournamentDisplayNumber(tId) : null
  switch (notif.type) {
    case 'tournament_ended':
      return tName ?? (num ? `Torneo #${num}` : 'Vedi risultati →')
    case 'schedina_winner':
      return tName ? `Schedina · ${tName}` : (num ? `Schedina · Torneo #${num}` : 'Vedi torneo →')
    case 'schedina_pending':
      return tName ? `Da compilare · ${tName}` : (num ? `Torneo #${num}` : 'Compila ora →')
    case 'gallery_mention':
    case 'comment_reply':
      return 'Vai alla galleria →'
    default:
      return tName ?? (num ? `Torneo #${num}` : null)
  }
}

export default function NotificationBell() {
  const { getTournamentDisplayNumber } = useAppData()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [pendingSchedine, setPendingSchedine] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nr, sr] = await Promise.allSettled([
        notificationsApi.list(),
        schedineApi.pendingNotifications(),
      ])
      const notifData = nr.status === 'fulfilled' ? nr.value.data : null
      const pending   = sr.status === 'fulfilled' ? (sr.value.data ?? []) : []

      const rawNotifs = Array.isArray(notifData?.notifications)
        ? notifData.notifications
        : Array.isArray(notifData) ? notifData : []
      // "schedina_pending" persistente duplica il promemoria live
      // (pendingSchedine, sotto): quest'ultimo è sempre aggiornato e
      // scompare da solo a schedina compilata, quindi è l'unica fonte da
      // mostrare per questo tipo di promemoria.
      const notifs = rawNotifs.filter((n) => n.type !== 'schedina_pending')
      // Ricalcolato sui notifs filtrati: il conteggio del backend includerebbe
      // anche le "schedina_pending" appena escluse, raddoppiando il badge
      // insieme a pendingSchedine.
      const unread = notifs.filter((n) => !n.is_read).length

      setNotifications(notifs)
      setPendingSchedine(Array.isArray(pending) ? pending : [])
      setUnreadCount(unread + (Array.isArray(pending) ? pending.length : 0))
    } catch { /* notifiche non disponibili */ }
    finally { setLoading(false) }
  }, [])

  // Prima ricaricava a ogni cambio di pagina (location.pathname in
  // dipendenza) — con una SPA navigata spesso erano due chiamate API in più
  // ad ogni click sul menu, per un dato che non cambia così in fretta. Ora
  // carica una volta al mount e poi periodicamente, più al ritorno sul tab.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const interval = setInterval(() => load(), 45000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  useEffect(() => {
    if (!open) return
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const handleToggle = () => {
    const opening = !open
    setOpen(opening)
    if (opening) {
      // Auto-pulizia all'apertura: elimina le notifiche già lette (viste alla
      // precedente apertura) e segna lette quelle nuove → spariranno alla prossima.
      notificationsApi.deleteRead().catch(() => {})
      notificationsApi.markAllRead().catch(() => {})
      setNotifications((ns) => ns.filter((n) => !n.is_read).map((n) => ({ ...n, is_read: true })))
      // Il badge resta solo per i promemoria schedina (persistenti finché non compilate)
      setUnreadCount(pendingSchedine.length)
    }
  }

  const handleClickNotif = (notif) => {
    setOpen(false)
    notificationsApi.delete(notif.id).catch(() => {})
    setNotifications((ns) => ns.filter((n) => n.id !== notif.id))
  }

  const totalItems = notifications.length + pendingSchedine.length

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={unreadCount > 0 ? `Notifiche — ${unreadCount} non lette` : 'Notifiche'}
        className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 text-slate-400 transition hover:border-white/15 hover:text-white"
      >
        {unreadCount > 0
          ? <BellRing size={15} className="text-amber-400" />
          : <Bell size={15} />
        }
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-80 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
          style={{ background: 'var(--mk-navbar-bg)', borderColor: 'var(--mk-border)', zIndex: 60 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--mk-border)' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Notifiche</p>
            {totalItems > 0 && (
              <button
                type="button"
                onClick={() => {
                  notificationsApi.deleteAll().catch(() => {})
                  setNotifications([])
                  setPendingSchedine([])
                  setUnreadCount(0)
                }}
                className="text-[9px] font-black uppercase tracking-widest text-slate-500 transition hover:text-rose-400"
              >
                Cancella tutte
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="px-4 py-5 text-center text-xs text-slate-500">Caricamento...</p>
            )}

            {/* Schedine urgenti */}
            {pendingSchedine.map((s, i) => {
              const tournName = s.tournament_name ?? s.name ?? `Torneo #${getTournamentDisplayNumber(s.tournament_id)}`
              const raceNum   = s.race_number ?? s.round ?? s.race_num ?? null
              const bodyText  = raceNum ? `${tournName} — Gara ${raceNum}` : tournName
              const schedLink = s.tournament_id ? (s.tournament_format === 'group_stage' ? `/schedina/${s.tournament_id}/group-stage` : `/schedina/${s.tournament_id}/compila`) : '/schedina'
              return (
                <Link
                  key={`sched-${s.tournament_id ?? i}`}
                  to={schedLink}
                  onClick={() => { setOpen(false); setPendingSchedine([]) }}
                  className="group flex items-start gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/5 last:border-0"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                    <PenLine size={13} className="text-amber-400" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black leading-snug text-white">Compila la schedina!</p>
                    <p className="mt-0.5 text-[10px] text-amber-400/80 font-black truncate">{bodyText}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <ArrowRight size={11} className="text-slate-600 transition group-hover:text-amber-400 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}

            {/* Notifiche generali */}
            {notifications.map((notif) => {
              const cfg      = TYPE_CONFIG[notif.type] ?? DEFAULT_CFG
              const Icon     = cfg.icon
              const isUnread = !notif.is_read
              const context  = resolveNotifContext(notif, getTournamentDisplayNumber)
              const title    = notif.content || notif.title || notif.message || cfg.label
              const body     = notif.body || null
              return (
                <div
                  key={notif.id}
                  className={`group flex items-start gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/5 last:border-0 ${isUnread ? 'bg-white/3' : ''}`}
                >
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                    <Icon size={13} className={cfg.color} />
                  </span>
                  <Link
                    to={resolveNotifLink(notif)}
                    onClick={() => handleClickNotif(notif)}
                    className="flex-1 min-w-0"
                  >
                    <p className={`text-xs font-black leading-snug ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                      {title}
                    </p>
                    {(body || context) && (
                      <p className={`mt-0.5 text-[10px] leading-snug truncate ${cfg.color} opacity-80`}>
                        {body ?? context}
                      </p>
                    )}
                    {notif.created_at && (
                      <p className="mt-0.5 text-[9px] text-slate-600 tabular-nums">
                        {new Date(notif.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                    {isUnread && <span className="h-2 w-2 rounded-full bg-rose-400" />}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        notificationsApi.delete(notif.id).then(() => {
                          setNotifications((ns) => ns.filter((n) => n.id !== notif.id))
                        }).catch(() => {})
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-slate-600 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
                      title="Elimina notifica"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Empty state */}
            {!loading && totalItems === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-8">
                <Bell size={22} className="text-slate-600" />
                <p className="text-xs text-slate-500">Nessuna notifica per ora</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
