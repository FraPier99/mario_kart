import { useMemo, useRef, useState } from 'react'
import { Crown, Trophy, Flag, Sparkles, Filter, Calendar, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { compressImage } from '@/lib/imageCompression'
import { playersApi, getApiErrorMessage } from '@/services/apiClient'
import { Link } from 'react-router-dom'

const CONFETTI_COLORS = ['#f59e0b', '#d97706', '#b45309', '#fbbf24', '#fcd34d', '#fef3c7']
const PARTICLE_COUNT = 12

const StarBg = ({ count = 20 }) => {
  const [stars] = useState(() => Array.from({ length: count }).map((_, i) => ({
    key: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    width: 1.5 + Math.random() * 2.5,
    height: 1.5 + Math.random() * 2.5,
    duration: 1.5 + Math.random() * 2.5,
    delay: Math.random() * 3,
  })))

  return (
    <>
      {stars.map((s) => (
        <div
          key={s.key}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.width,
            height: s.height,
            animation: `twinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </>
  )
}

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ChampionCard = ({ player, wins, gamesWon, tournaments, index, onEntryClick }) => {
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      angle: (i / PARTICLE_COUNT) * 360,
      delay: i * 0.08,
      size: 3 + (i % 3) * 2,
    })), []
  )

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/30 bg-linear-to-br from-amber-100/90 via-amber-50/60 to-amber-100/80 dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60 transition-all duration-500 hover:scale-[1.02] gold-card-shimmer"
      style={{ animation: `fade-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both`, animationDelay: `${index * 0.06}s`, boxShadow: 'var(--circuit-shadow-md)' }}
    >
      {/* Crown badge */}
      <div className="absolute right-3 top-3 z-10 rounded-full bg-amber-400 p-1.5 shadow-lg shadow-amber-400/40" style={{ animation: 'crown-drop 1.2s cubic-bezier(0.34,1.56,0.64,1) both 0.3s' }}>
        <Crown size={14} className="text-amber-950" />
      </div>

      {/* Number badge */}
      <div className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-amber-950/60 text-[10px] font-black text-amber-300 backdrop-blur-sm">
        #{index + 1}
      </div>

      {/* Hover particles */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute left-1/2 top-1/2 rounded-full bg-amber-300/60"
            style={{
              width: p.size,
              height: p.size,
              animation: `burst-particle 1.2s ease-out infinite`,
              animationDelay: `${p.delay}s`,
              transform: `translate(-50%, -50%) rotate(${p.angle}deg) translateY(-50px)`,
            }}
          />
        ))}
      </div>

      {/* Avatar */}
      <div className="relative flex justify-center pt-8 pb-4">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-200/40 dark:from-amber-800/20 to-transparent" />
        <div className="relative">
          <div className="absolute -inset-1 rounded-2xl bg-amber-400/30 blur-md animate-pulse-glow" />
          <img
            src={player.champion_photo || player.img_url || buildAvatarPlaceholder(player.nickname)}
            alt={player.nickname}
            loading="lazy"
            decoding="async"
            className="relative h-24 w-24 rounded-2xl object-cover ring-2 ring-white/60 dark:ring-amber-500/30 shadow-lg"
          />
        </div>
      </div>

      {/* Info */}
      <div className="px-5 pb-5 text-center">
        <span className="inline-block rounded-full bg-amber-500/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-2">
          {player.nickname}
        </span>
        <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-foreground">
          {player.first_name} {player.last_name}
        </h3>

        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-400/20 dark:bg-amber-500/15 px-3 py-1.5">
            <Trophy size={13} className="text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-black text-amber-700 dark:text-amber-300">{wins}</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70">{wins === 1 ? 'titolo' : 'titoli'}</span>
          </div>
          {gamesWon > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-400/20 dark:bg-emerald-500/15 px-3 py-1.5">
              <Flag size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{gamesWon}</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">{gamesWon === 1 ? 'gioco' : 'giochi'}</span>
            </div>
          )}
        </div>

        {/* Last 2 tournaments preview */}
        {tournaments && tournaments.length > 0 && (
          <div className="mt-3 space-y-1">
            {tournaments.slice(0, 2).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-amber-200/30 dark:bg-amber-900/30 px-2.5 py-1">
                <span className="text-[9px] font-black text-slate-600 dark:text-amber-200 truncate max-w-[140px]">{t.name}</span>
                <div className="flex items-center gap-1">
                  <Calendar size={8} className="text-amber-500" />
                  <span className="text-[8px] text-slate-500 dark:text-amber-300/70">{formatDate(t.date)}</span>
                </div>
              </div>
            ))}
            {tournaments.length > 2 && (
              <p className="text-[8px] font-black text-amber-600/60 dark:text-amber-400/60">+{tournaments.length - 2} altri</p>
            )}
          </div>
        )}

        {/* Sparkles */}
        <div className="mt-3 flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <Sparkles
              key={i}
              size={11}
              className="text-amber-400"
              style={{ animation: `sparkle-explode 1.5s ease-out infinite`, animationDelay: `${i * 0.4}s` }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => onEntryClick({ player, wins, tournaments })}
          className="font-title mt-4 w-full cursor-pointer rounded-xl border-2 border-amber-800/30 bg-amber-600 py-2 text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-amber-500"
          style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
        >
          Vedi dettagli
        </button>
      </div>
    </div>
  )
}

const ChampionModal = ({ entry, games, onClose, isSuperadmin, onPhotoUploaded }) => {
  const { player, tournaments, wins } = entry
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Carica un file immagine valido'); return }
    setUploading(true)
    try {
      const data = await compressImage(file, { maxDimension: 1000, quality: 0.85 })
      await playersApi.uploadChampionPhoto(player.id, data)
      toast.success('Foto campione caricata!')
      onPhotoUploaded?.(player.id, data)
    } catch (err) {
      toast.error('Caricamento fallito', { description: getApiErrorMessage(err) })
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <div className="relative w-full max-w-lg rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/30 bg-white dark:bg-card animate-scale-in" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
        {/* Photo area */}
        <div className="relative h-56 bg-gradient-to-br from-amber-100 to-amber-300 dark:from-amber-950 dark:to-amber-800 flex items-center justify-center overflow-hidden">
          {player.champion_photo ? (
            <img src={player.champion_photo} alt="Campione" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-200/70 dark:bg-amber-900/50">
                <Trophy size={40} className="text-amber-600 dark:text-amber-300" />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">Foto del vincitore</p>
              <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70 italic">In attesa della foto ufficiale</p>
            </div>
          )}
          <button type="button" onClick={onClose} className="absolute top-3 right-3 rounded-full bg-black/20 p-1.5 text-white backdrop-blur-sm hover:bg-black/40 transition">
            <X size={16} />
          </button>
        </div>

        {/* Player info */}
        <div className="px-6 py-5 text-center border-b border-amber-100 dark:border-amber-500/20">
          <div className="relative inline-flex mb-3">
            <img
              src={player.champion_photo || player.img_url || buildAvatarPlaceholder(player.nickname)}
              alt={player.nickname}
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-amber-400/50 shadow-lg"
            />
          </div>
          <span className="inline-block rounded-full bg-amber-500/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
            {player.nickname}
          </span>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-foreground">
            {player.first_name} {player.last_name}
          </h2>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-400/20 dark:bg-amber-500/15 px-3 py-1.5">
            <Crown size={14} className="text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-black text-amber-700 dark:text-amber-300">{wins} {wins === 1 ? 'titolo' : 'titoli'}</span>
          </div>
        </div>

        {/* Tournament list */}
        <div className="px-6 py-5">
          <p className="font-title text-[9px] tracking-wide text-slate-500 dark:text-muted-foreground mb-3 flex items-center gap-1.5">
            <Trophy size={12} /> Tornei vinti
          </p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {tournaments.map((t) => {
              const game = games.find((g) => g.id === t.game_id)
              return (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy size={13} className="shrink-0 text-amber-500" />
                    <span className="text-sm font-black text-slate-700 dark:text-foreground truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {game && <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{game.name}</span>}
                    <div className="flex items-center gap-1">
                      <Calendar size={10} className="text-slate-400 dark:text-slate-500" />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(t.date)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upload button (superadmin) */}
        {isSuperadmin && (
          <div className="border-t border-amber-100 dark:border-amber-500/20 px-6 py-4">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="font-title flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-500/30 py-3 text-[10px] tracking-wide text-amber-500 dark:text-amber-400 transition hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-60"
            >
              <Upload size={14} />
              {uploading ? 'Caricamento...' : player.champion_photo ? 'Cambia foto vincitore' : 'Carica foto vincitore'}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

const HallOfFame = () => {
  const { detailedTournaments, playersById, games, loading } = useAppData()
  const { isSuperadmin } = useAuth()
  const [selectedGameId, setSelectedGameId] = useState('')
  const [selectedEntry, setSelectedEntry] = useState(null)

  const [heroConfetti] = useState(() => Array.from({ length: 15 }).map((_, i) => ({
    key: i,
    left: Math.random() * 100,
    width: 4 + Math.random() * 5,
    height: 6 + Math.random() * 8,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    delay: Math.random() * 2,
    rotation: Math.random() * 360,
  })))

  const [heroFloating] = useState(() => Array.from({ length: 6 }).map((_, i) => ({
    key: i,
    left: 5 + Math.random() * 90,
    top: 10 + Math.random() * 80,
    duration: 3 + Math.random() * 2,
    delay: Math.random() * 2,
    icon: i % 3 === 0 ? '👑' : i % 3 === 1 ? '🏆' : '⭐',
    animationName: i % 2 === 0 ? 'float' : 'drift-up',
    animationIteration: i % 2 === 0 ? 'infinite' : 'both',
  })))

  const champions = useMemo(() => {
    const filtered = selectedGameId
      ? detailedTournaments.filter((t) => t.game_id === Number(selectedGameId))
      : detailedTournaments

    const winners = new Map()
    filtered.forEach((t) => {
      if (!t.winner_id) return
      const player = playersById.get(t.winner_id)
      if (!player) return
      if (!winners.has(t.winner_id)) {
        winners.set(t.winner_id, {
          player,
          wins: 0,
          tournaments: [],
        })
      }
      const entry = winners.get(t.winner_id)
      entry.wins += 1
      entry.tournaments.push(t)
    })

    return Array.from(winners.values())
      .sort((a, b) => b.wins - a.wins)
  }, [detailedTournaments, selectedGameId, playersById])

  const gamesWonByPlayer = useMemo(() => {
    const map = new Map()
    detailedTournaments.forEach((t) => {
      if (!t.winner_id || !t.game_id) return
      const key = `${t.winner_id}-${t.game_id}`
      if (!map.has(key)) map.set(key, new Set())
      map.get(key).add(t.id)
    })
    const byPlayer = new Map()
    map.forEach((tourns, key) => {
      const [playerId] = key.split('-').map(Number)
      if (!byPlayer.has(playerId)) byPlayer.set(playerId, 0)
      byPlayer.set(playerId, byPlayer.get(playerId) + 1)
    })
    return byPlayer
  }, [detailedTournaments])

  const totalChampions = champions.length
  const totalWins = champions.reduce((s, c) => s + c.wins, 0)
  const uniqueGames = new Set(detailedTournaments.filter((t) => t.winner_id).map((t) => t.game_id)).size

  const handleEntryClick = (entry) => {
    setSelectedEntry(entry)
  }

  const handlePhotoUploaded = (playerId, imageData) => {
    setSelectedEntry((prev) => {
      if (!prev || prev.player.id !== playerId) return prev
      return { ...prev, player: { ...prev.player, champion_photo: imageData } }
    })
  }

  return (
    <AppLayout>
      <section className="mx-auto max-w-7xl px-4 py-10">
        {/* ── Hero Header ── */}
        <div className="relative mb-10 overflow-hidden rounded-[2.5rem] border border-amber-400/50 dark:border-amber-500/30 bg-linear-to-br from-amber-100 via-amber-400 to-amber-600 dark:from-amber-950 dark:via-amber-900 dark:to-amber-950 p-8 md:p-12 text-center shadow-2xl shadow-amber-300/30 dark:shadow-amber-950/50 gold-card-shimmer">
          <StarBg count={25} />

          {/* Confetti particles */}
          {heroConfetti.map((c) => (
            <div
              key={c.key}
              className="absolute top-0 pointer-events-none"
              style={{
                left: `${c.left}%`,
                width: c.width,
                height: c.height,
                background: c.background,
                borderRadius: c.borderRadius,
                animation: 'confetti-fall 3s ease-in both',
                animationDelay: `${c.delay}s`,
                transform: `rotate(${c.rotation}deg)`,
              }}
            />
          ))}

          {/* Floating elements */}
          {heroFloating.map((el) => (
            <div
              key={`float-${el.key}`}
              className="absolute pointer-events-none text-xl md:text-2xl opacity-40"
              style={{
                left: `${el.left}%`,
                top: `${el.top}%`,
                animation: `${el.animationName} ${el.duration}s ease-in-out ${el.animationIteration}`,
                animationDelay: `${el.delay}s`,
              }}
            >
              {el.icon}
            </div>
          ))}

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="rounded-full bg-amber-950/30 p-3 backdrop-blur-sm" style={{ animation: 'crown-drop 1.2s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <Crown size={36} className="text-amber-200" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-amber-950 dark:text-amber-100 drop-shadow-lg" style={{ animation: 'text-glow-breathe 3s ease-in-out infinite' }}>
              Hall of Fame
            </h1>
            <p className="mt-3 text-lg md:text-xl font-black uppercase tracking-[0.2em] text-amber-900/80 dark:text-amber-200/80">
              I Campioni della Lega
            </p>
            <p className="mt-2 max-w-xl mx-auto text-sm text-amber-800/70 dark:text-amber-300/70">
              Ogni torneo incorona un campione. Qui vive la gloria eterna di chi ha sollevato il trofeo.
            </p>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-amber-400/50 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 text-center" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <p className="font-title text-[9px] tracking-wide text-amber-600 dark:text-amber-400">Campioni</p>
            <p className="font-title mt-1 text-2xl text-amber-800 dark:text-amber-200">{loading ? '—' : totalChampions}</p>
          </div>
          <div className="rounded-2xl border-2 border-amber-400/50 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 text-center" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <p className="font-title text-[9px] tracking-wide text-amber-600 dark:text-amber-400">Titoli assegnati</p>
            <p className="font-title mt-1 text-2xl text-amber-800 dark:text-amber-200">{loading ? '—' : totalWins}</p>
          </div>
          <div className="rounded-2xl border-2 border-amber-400/50 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 text-center" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <p className="font-title text-[9px] tracking-wide text-amber-600 dark:text-amber-400">Giochi coperti</p>
            <p className="font-title mt-1 text-2xl text-amber-800 dark:text-amber-200">{loading ? '—' : uniqueGames}</p>
          </div>
        </div>

        {/* ── Filter ── */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-amber-500" />
            <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-muted-foreground">Filtra per gioco</span>
          </div>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="font-title rounded-xl border-2 border-amber-300 dark:border-amber-500/30 bg-white dark:bg-card px-4 py-2.5 text-[10px] tracking-wide outline-none focus:border-amber-500 text-slate-800 dark:text-foreground"
          >
            <option value="">Tutti i giochi</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* ── Champions Grid ── */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border-2 border-amber-400/30 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-950/20 p-5">
                <div className="mx-auto h-24 w-24 animate-shimmer rounded-2xl bg-linear-to-r from-amber-200 via-amber-300 to-amber-200 dark:from-amber-900 dark:via-amber-800 dark:to-amber-900 bg-size-[200%_100%]" />
                <div className="mt-4 h-4 w-2/3 mx-auto animate-shimmer rounded-lg bg-linear-to-r from-amber-200 via-amber-300 to-amber-200 dark:from-amber-900 dark:via-amber-800 dark:to-amber-900 bg-size-[200%_100%]" />
                <div className="mt-3 h-8 w-1/2 mx-auto animate-shimmer rounded-xl bg-linear-to-r from-amber-200 via-amber-300 to-amber-200 dark:from-amber-900 dark:via-amber-800 dark:to-amber-900 bg-size-[200%_100%]" />
              </div>
            ))}
          </div>
        ) : champions.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {champions.map((entry, idx) => (
              <ChampionCard
                key={entry.player.id}
                player={entry.player}
                wins={entry.wins}
                gamesWon={gamesWonByPlayer.get(entry.player.id) ?? 0}
                tournaments={entry.tournaments}
                index={idx}
                onEntryClick={handleEntryClick}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10 px-8 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
              <Trophy size={28} className="text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-amber-800 dark:text-amber-200">Ancora nessun campione</h3>
            <p className="mt-2 max-w-md mx-auto text-sm text-amber-700/70 dark:text-amber-300/70">
              Il primo torneo decreterà il nostro primo Hall of Famer! La gloria eterna attende.
            </p>
            <Link
              to="/history"
              className="font-title mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-amber-800/30 bg-amber-600 px-5 py-3 text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-amber-500"
              style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
            >
              <Trophy size={14} />
              Vedi tornei
            </Link>
          </div>
        )}
      </section>

      {selectedEntry && (
        <ChampionModal
          entry={selectedEntry}
          games={games}
          isSuperadmin={isSuperadmin}
          onClose={() => setSelectedEntry(null)}
          onPhotoUploaded={handlePhotoUploaded}
        />
      )}
    </AppLayout>
  )
}

export default HallOfFame