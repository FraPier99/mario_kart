import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Database, PencilLine, Plus, RotateCcw, Search, Trash2, UserSquare2, ChevronDown, Trophy, Sparkles, Star, Crown, Upload, X as XIcon } from 'lucide-react'
import { toast } from 'sonner'

import AppLayout from '@/components/layout/AppLayout'
import ApiBanner from '@/components/common/ApiBanner'
import PlayerAvatar from '@/components/common/PlayerAvatar'
import { useAppData } from '@/context/AppDataContext'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { compressImage } from '@/lib/imageCompression'
import { getApiErrorMessage, playersApi } from '@/services/apiClient'
import { COLORS } from '@/lib/constants'

const CATALOG_PAGE_SIZE = 12

const ImageUpload = ({ value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const inputRef = useRef(null)

  const processFile = async (file) => {
    if (!file?.type.startsWith('image/')) return
    try {
      onChange(await compressImage(file, { maxDimension: 400, quality: 0.85 }))
    } catch {
      toast.error('Impossibile leggere il file')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    processFile(e.dataTransfer.files?.[0])
  }

  const handleFileChange = (e) => {
    processFile(e.target.files?.[0])
    e.target.value = ''
  }

  const handleUrlConfirm = () => {
    if (urlDraft.trim()) onChange(urlDraft.trim())
    setShowUrlInput(false)
    setUrlDraft('')
  }

  return (
    <div className="space-y-2.5">
      <p className="font-title text-[9px] tracking-wide text-slate-500 dark:text-slate-300">Foto profilo</p>
      <div className="flex items-center gap-4">
        {/* Circular drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Carica immagine profilo"
          className={`relative h-20 w-20 shrink-0 cursor-pointer select-none rounded-full border-2 border-dashed transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
            isDragging ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-300 dark:border-white/20 hover:border-emerald-400/60'
          }`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
        >
          {value ? (
            <>
              <img src={value} alt="Anteprima" className="h-full w-full rounded-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 hover:opacity-100 transition">
                <Upload size={16} className="text-white" />
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1">
              <UserSquare2 size={20} className="text-slate-400 dark:text-slate-500" />
              <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Carica</p>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Trascina un'immagine qui sopra o clicca il cerchio.<br />
            Accetta JPG, PNG, WebP.
          </p>
          <div className="flex flex-wrap gap-3">
            {value && (
              <button type="button" onClick={() => onChange('')}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400 transition hover:text-rose-400 dark:hover:text-rose-300">
                <XIcon size={10} /> Rimuovi
              </button>
            )}
            <button type="button" onClick={() => setShowUrlInput((v) => !v)}
              className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition hover:text-emerald-600 dark:hover:text-emerald-300">
              {showUrlInput ? 'Annulla URL' : '+ Inserisci URL'}
            </button>
          </div>
          {showUrlInput && (
            <div className="flex gap-2">
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlConfirm()}
                placeholder="https://..."
                className="flex-1 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-emerald-400"
              />
              <button type="button" onClick={handleUrlConfirm}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[9px] font-black text-white transition hover:bg-emerald-500">
                OK
              </button>
            </div>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}

const emptyForm = {
  first_name: '',
  last_name: '',
  nickname: '',
  favorite_character_id: '',
}

const resolveCharacterImage = (character) => {
  if (character?.img_url && character.img_url.trim().length > 0) {
    return character.img_url.trim()
  }

  return buildAvatarPlaceholder(character?.name ?? 'character')
}

export default function AdminPlayers() {
  const { players, characters, charactersById, games, gamesById, loading, errorMessage, refresh } = useAppData()
  const [form, setForm] = useState(emptyForm)
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogVisibleCount, setCatalogVisibleCount] = useState(CATALOG_PAGE_SIZE)
  const [characterSelectSearch, setCharacterSelectSearch] = useState('')
  const [catalogGameFilter, setCatalogGameFilter] = useState('')

  const [playerSearch, setPlayerSearch] = useState('')

  const [celebrating, setCelebrating] = useState(false)
  const [celebratedPlayer, setCelebratedPlayer] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const celebrateTimerRef = useRef(null)

  const [coinDrops] = useState(() => Array.from({ length: 12 }).map((_, i) => ({
    key: i,
    left: 5 + Math.random() * 90,
    fallDuration: 2 + Math.random() * 3,
    delay: Math.random() * 3,
  })))

  const [burstParticles] = useState(() => Array.from({ length: 80 }).map((_, i) => ({
    key: i,
    color: COLORS[i % COLORS.length],
    angle: (i / 80) * 360,
    distance: 120 + Math.random() * 320,
    delay: `${i * 0.02 + 0.15}s`,
    size: 3 + Math.random() * 8,
    duration: 2.5 + Math.random() * 2,
    isStar: i % 4 === 0,
  })))

  const triggerCelebration = useCallback((player) => {
    setCelebratedPlayer(player)
    setCelebrating(true)
    if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current)
    celebrateTimerRef.current = setTimeout(() => {
      setCelebrating(false)
      setCelebratedPlayer(null)
    }, 6000)
  }, [])

  useEffect(() => {
    return () => {
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current)
    }
  }, [])

  const sortedPlayers = useMemo(() => {
    let result = players.slice().sort((left, right) => left.nickname.localeCompare(right.nickname))
    if (playerSearch.trim()) {
      const term = playerSearch.toLowerCase()
      result = result.filter((p) =>
        p.nickname.toLowerCase().includes(term) ||
        p.first_name.toLowerCase().includes(term) ||
        p.last_name.toLowerCase().includes(term)
      )
    }
    return result
  }, [players, playerSearch])

  const characterOptions = useMemo(() => {
    return characters.slice().sort((left, right) => left.name.localeCompare(right.name))
  }, [characters])

  const filteredCharacterSelectOptions = useMemo(() => {
    if (!characterSelectSearch.trim()) return characterOptions
    const term = characterSelectSearch.toLowerCase()
    return characterOptions.filter((c) => c.name.toLowerCase().includes(term))
  }, [characterOptions, characterSelectSearch])

  const filteredCatalogCharacters = useMemo(() => {
    let result = characterOptions
    if (catalogGameFilter) {
      result = result.filter((c) => c.game_id === Number(catalogGameFilter))
    }
    if (catalogSearch.trim()) {
      const term = catalogSearch.toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(term))
    }
    return result
  }, [characterOptions, catalogSearch, catalogGameFilter])

  const visibleCatalogCharacters = filteredCatalogCharacters.slice(0, catalogVisibleCount)
  const hasMoreCatalog = catalogVisibleCount < filteredCatalogCharacters.length

  const startEdit = (player) => {
    setSelectedPlayerId(player.id)
    setForm({
      first_name: player.first_name ?? '',
      last_name: player.last_name ?? '',
      nickname: player.nickname ?? '',
      img_url: player.img_url ?? '',
      favorite_character_id: player.favorite_character_id ? String(player.favorite_character_id) : '',
    })
  }

  const resetForm = () => {
    setSelectedPlayerId(null)
    setForm(emptyForm)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      nickname: form.nickname.trim(),
      img_url: form.img_url.trim().length > 0 ? form.img_url.trim() : null,
      favorite_character_id: form.favorite_character_id ? Number(form.favorite_character_id) : null,
    }

    try {
      let savedPlayer
      if (selectedPlayerId) {
        const res = await playersApi.update(selectedPlayerId, payload)
        savedPlayer = res?.data ?? { ...payload, id: selectedPlayerId, first_name: form.first_name, last_name: form.last_name, nickname: form.nickname, img_url: payload.img_url }
        toast.success('Giocatore aggiornato')
      }
      else {
        const res = await playersApi.create(payload)
        savedPlayer = res?.data ?? { ...payload, first_name: form.first_name, last_name: form.last_name, nickname: form.nickname, img_url: payload.img_url }
        toast.success('Giocatore creato')
        triggerCelebration(savedPlayer)
      }

      await refresh()
      resetForm()
    }
    catch (requestError) {
      toast.error('Salvataggio non riuscito', {
        description: getApiErrorMessage(requestError),
      })
    }
    finally {
      setSaving(false)
    }
  }

  const handleDelete = async (player) => {
    setConfirmDelete(player)
  }

  const executeDelete = async (player) => {
    setConfirmDelete(null)
    if (!player) return

    try {
      await playersApi.remove(player.id)
      toast.success('Giocatore eliminato')
      if (selectedPlayerId === player.id) {
        resetForm()
      }
      await refresh()
    }
    catch (requestError) {
      toast.error('Eliminazione non riuscita', {
        description: getApiErrorMessage(requestError),
      })
    }
  }

  const isEditing = Boolean(selectedPlayerId)

  return (
    <>
      {confirmDelete && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setConfirmDelete(null)}>
          <div
            className="w-full max-w-sm rounded-2xl border-2 border-slate-900 dark:border-white/20 bg-white dark:bg-slate-900 p-6 animate-scale-in"
            style={{ boxShadow: 'var(--circuit-shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-black text-slate-900 dark:text-white text-center">Eliminare {confirmDelete.nickname?.toUpperCase()}?</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">Questa azione non può essere annullata.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-white transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-white/10">
                Annulla
              </button>
              <button onClick={() => executeDelete(confirmDelete)}
                className="flex-1 rounded-xl border-2 border-rose-900/30 bg-rose-500 px-4 py-2.5 text-sm font-title text-[11px] tracking-wide text-white transition active:translate-y-px hover:bg-rose-400"
                style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
      {celebrating && celebratedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl animate-fade-in overflow-hidden">
          {/* Coin rain */}
          {coinDrops.map((c) => (
            <div key={`coin-${c.key}`} className="absolute top-0 pointer-events-none z-0"
              style={{
                left: `${c.left}%`,
                animation: `coin-fall ${c.fallDuration}s ease-in both`,
                animationDelay: `${c.delay}s`,
              }}>
              <div className="rounded-sm"
                style={{
                  width: 8, height: 10,
                  background: 'linear-gradient(180deg, #fde68a, #34d399)',
                  boxShadow: '0 0 6px rgba(52,211,153,0.6)',
                  borderRadius: '2px 2px 3px 3px',
                }} />
            </div>
          ))}

          <div className="absolute inset-0 pointer-events-none bg-gradient-radial from-emerald-500/15 via-transparent to-transparent animate-pulse-radio"
            style={{ animation: 'rainbow-cycle 8s linear infinite, pulse-radio 2s ease-in-out infinite' }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400/30 pointer-events-none"
              style={{
                animation: `burst-wave ${0.8 + i * 0.3}s ease-out both`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
          {burstParticles.map((p) => (
            <div
              key={p.key}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
              style={{
                animation: `burst-particle ${p.duration}s ease-out both`,
                animationDelay: p.delay,
              }}
            >
              <div
                style={{
                  width: p.size,
                  height: p.isStar ? p.size : p.size,
                  background: p.color,
                  borderRadius: p.isStar ? '2px' : '50%',
                  clipPath: p.isStar ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : undefined,
                  boxShadow: `0 0 ${p.size * 2.5}px ${p.color}`,
                  transform: `rotate(${p.angle}deg) translateX(${p.distance}px)`,
                }}
              />
            </div>
          ))}
          <div className="relative z-20 flex flex-col items-center gap-10 text-center animate-bounce-in">
            <div className="relative">
              <Trophy size={96} className="text-emerald-400 drop-shadow-[0_0_50px_rgba(52,211,153,0.9)]" style={{ animation: 'trophy-float 3s ease-in-out infinite' }} />
              <Star size={32} className="absolute -top-4 -right-4 text-yellow-300 animate-ping" />
              <Star size={20} className="absolute -bottom-2 -left-2 text-emerald-200 animate-ping" style={{ animationDelay: '0.5s' }} />
              {[0, 1, 2].map((j) => (
                <div key={`trail-${j}`} className="absolute pointer-events-none"
                  style={{
                    width: 4, height: 4,
                    background: '#6ee7b7',
                    borderRadius: '50%',
                    boxShadow: '0 0 4px rgba(110,231,183,0.8)',
                    animation: `sparkle-trail ${1 + j * 0.4}s ease-out infinite`,
                    animationDelay: `${j * 0.4}s`,
                    '--tx': `${15 + j * 12}px`,
                    '--ty': `${-(15 + j * 12)}px`,
                    '--tx2': `${30 + j * 15}px`,
                    '--ty2': `${-(30 + j * 15)}px`,
                  }} />
              ))}
            </div>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
              <div className="relative shrink-0">
                <div className="absolute -inset-4 rounded-full bg-emerald-400/20 blur-2xl animate-pulse" />
                <div className="absolute -inset-6 rounded-full" style={{ animation: 'star-power-glow 1.5s ease-in-out infinite' }} />
                <img
                  src={celebratedPlayer.img_url || buildAvatarPlaceholder(celebratedPlayer.nickname ?? 'Player')}
                  alt={celebratedPlayer.nickname}
                  className="relative h-36 w-36 rounded-2xl object-cover ring-8 ring-emerald-400/60 shadow-2xl animate-bounce-in"
                />
                <Sparkles size={18} className="absolute -top-2 -right-1 text-yellow-300 animate-pulse" />
                <Sparkles size={14} className="absolute -bottom-2 -left-1 text-emerald-300 animate-pulse" style={{ animationDelay: '0.7s' }} />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-5xl font-black uppercase tracking-widest text-emerald-300 drop-shadow-[0_4px_12px_rgba(52,211,153,0.6)]"
                  style={{ animation: 'rainbow-cycle 6s linear infinite' }}>
                  {selectedPlayerId ? 'GIOCATORE AGGIORNATO!' : 'GIOCATORE CREATO!'}
                </p>
                <p className="mt-2 text-4xl font-black uppercase text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">
                  {celebratedPlayer.first_name?.toUpperCase()} {celebratedPlayer.last_name?.toUpperCase()}
                </p>
                <p className="mt-1 text-2xl font-bold uppercase text-emerald-400 drop-shadow-[0_2px_8px_rgba(52,211,153,0.4)]">
                  @{celebratedPlayer.nickname?.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center text-lg font-black uppercase tracking-widest text-emerald-200/80 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <Crown size={20} className="text-emerald-300" style={{ animation: 'trophy-float 2s ease-in-out infinite' }} />
              <span>PRONTO PER LA LEGA KART</span>
              <Crown size={20} className="text-emerald-300" style={{ animation: 'trophy-float 2s ease-in-out infinite', animationDelay: '1s' }} />
            </div>
          </div>
        </div>
      )}

    <AppLayout>
    <div className="px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200 dark:border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 md:p-8 space-y-6">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 transition hover:text-emerald-500"
        >
          <ArrowLeft size={14} />
          Torna alla Dashboard Admin
        </Link>

        <div className="rounded-2xl border-2 border-slate-900/30 dark:border-white/20 bg-linear-to-br from-white via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950 p-4" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="font-title inline-flex items-center gap-2 rounded-full border-2 border-emerald-500/40 dark:border-emerald-400/40 bg-emerald-500/10 dark:bg-emerald-400/10 px-3 py-1.5 text-[9px] tracking-wide text-emerald-700 dark:text-emerald-300">
                <Database className="h-3.5 w-3.5" />
                Admin giocatori
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  Gestione completa dei player e del pg preferito
                </h1>
                <p className="max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300 sm:text-sm">
                  Aggiungi o modifica i giocatori della lega, assegna il loro personaggio preferito e carica la foto profilo. Se non è presente un'immagine, viene mostrato automaticamente un avatar con le iniziali del giocatore.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-white transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Aggiorna dati
            </button>
          </div>
        </div>

        {errorMessage ? <ApiBanner title="Errore" message={errorMessage} action={<button type="button" onClick={refresh} className="font-title rounded-lg border-2 border-slate-900 bg-slate-900 px-3 py-1.5 text-[9px] tracking-wide text-white">Riprova</button>} /> : null}

        <div className="grid items-start gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section
            className="flex flex-col rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4"
            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-title text-[9px] tracking-wide text-emerald-600 dark:text-emerald-300">Form player</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  {isEditing ? 'Modifica giocatore' : 'Nuovo giocatore'}
                </h2>
              </div>
              <div className="rounded-xl border-2 border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-400/10 p-3 text-emerald-600 dark:text-emerald-300">
                {isEditing ? <PencilLine className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
            </div>

            <form className="flex flex-col space-y-2" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <span>Nome</span>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-emerald-400"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <span>Cognome</span>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-emerald-400"
                  />
                </label>
              </div>

              <label className="space-y-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                <span>Nickname</span>
                <input
                  name="nickname"
                  value={form.nickname}
                  onChange={handleChange}
                  required
                  minLength={3}
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition focus:border-emerald-400"
                />
              </label>

              <ImageUpload
                value={form.img_url}
                onChange={(val) => setForm((f) => ({ ...f, img_url: val }))}
              />

              <label className="space-y-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                <span>PG preferito</span>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cerca personaggio..."
                    value={characterSelectSearch}
                    onChange={(e) => setCharacterSelectSearch(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-9 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-400"
                  />
                </div>
                <select
                  name="favorite_character_id"
                  value={
                    filteredCharacterSelectOptions.some((c) => c.id === Number(form.favorite_character_id))
                      ? form.favorite_character_id
                      : ''
                  }
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-emerald-400"
                  size={Math.min(filteredCharacterSelectOptions.length + 1, 6)}
                >
                  <option value="">Nessuno</option>
                  {filteredCharacterSelectOptions.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name.toUpperCase()} {character.game_id ? `(${gamesById?.get(character.game_id)?.name ?? `game ${character.game_id}`})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-emerald-800/30 bg-emerald-500 px-4 py-2.5 font-black text-white transition active:translate-y-px hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                >
                  {saving ? 'Salvataggio...' : isEditing ? 'Aggiorna player' : 'Crea player'}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 font-bold text-slate-700 dark:text-white transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  Reset
                </button>
              </div>
            </form>


          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-title text-[9px] tracking-wide text-slate-500 dark:text-slate-400">Database player</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Tutti i giocatori salvati</h2>
                </div>
                <div className="rounded-xl bg-slate-100 dark:bg-white/5 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  {sortedPlayers.length} record
                </div>
              </div>
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Cerca giocatore per nome o nickname..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-9 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {loading ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-8 text-center text-slate-500 dark:text-slate-400">
                  Caricamento dati in corso...
                </div>
              ) : sortedPlayers.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-8 text-center text-slate-500 dark:text-slate-400">
                  Nessun giocatore presente nel database.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border-2 border-slate-200 dark:border-white/10">
                  {/* Vista mobile: cards */}
                  <div className="divide-y divide-slate-100 dark:divide-white/10 md:hidden">
                    {sortedPlayers.map((player) => {
                      const preferredCharacter = charactersById.get(player.favorite_character_id)

                      return (
                        <div key={player.id} className="bg-white dark:bg-slate-900/60 p-4 space-y-3">
                          <div className="flex items-center gap-3">
                    <PlayerAvatar
                      src={player.img_url ?? undefined}
                      name={`${player.first_name} ${player.last_name}`}
                      size="lg"
                      className="border border-slate-200 dark:border-white/10"
                    />
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 dark:text-white truncate uppercase">{player.first_name} {player.last_name}</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300 uppercase">{player.nickname}</p>
                    </div>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-300">
                    <img
                      src={resolveCharacterImage(preferredCharacter)}
                      alt={preferredCharacter?.name ?? 'Nessun pg preferito'}
                      className="h-10 w-10 rounded-xl border border-slate-200 dark:border-white/10 object-contain bg-slate-100 dark:bg-slate-800"
                    />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(player)}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/30 dark:border-emerald-400/20 bg-emerald-500/10 dark:bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200 transition active:translate-y-px hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20"
                            >
                              <PencilLine className="h-4 w-4" />
                              Modifica
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(player)}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-rose-500/30 dark:border-rose-400/20 bg-rose-500/10 dark:bg-rose-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-700 dark:text-rose-200 transition active:translate-y-px hover:bg-rose-500/20 dark:hover:bg-rose-400/20"
                            >
                              <Trash2 className="h-4 w-4" />
                              Elimina
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Vista desktop: tabella */}
                  <div className="hidden md:block max-h-125 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-white/10 text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="font-title bg-slate-50 dark:bg-slate-950/70 text-[9px] tracking-wide text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-4">Player</th>
                          <th className="px-4 py-4">PG preferito</th>
                          <th className="px-4 py-4 text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/10 bg-white dark:bg-slate-900/60">
                        {sortedPlayers.map((player) => {
                          const preferredCharacter = charactersById.get(player.favorite_character_id)

                          return (
                            <tr key={player.id} className="align-top transition hover:bg-slate-50 dark:hover:bg-white/5">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <PlayerAvatar
                                    src={player.img_url ?? undefined}
                                    name={`${player.first_name} ${player.last_name}`}
                                    size="lg"
                                    className="border border-slate-200 dark:border-white/10"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-black text-slate-900 dark:text-white truncate uppercase">{player.first_name} {player.last_name}</p>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300 uppercase">{player.nickname}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                <img
                                  src={resolveCharacterImage(preferredCharacter)}
                                  alt={preferredCharacter?.name ?? 'Nessun pg preferito'}
                                  className="h-10 w-10 rounded-xl border border-slate-200 dark:border-white/10 object-contain bg-slate-100 dark:bg-slate-800"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(player)}
                                    className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-500/30 dark:border-emerald-400/20 bg-emerald-500/10 dark:bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200 transition active:translate-y-px hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20"
                                  >
                                    <PencilLine className="h-4 w-4" />
                                    Modifica
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(player)}
                                    className="inline-flex items-center gap-2 rounded-xl border-2 border-rose-500/30 dark:border-rose-400/20 bg-rose-500/10 dark:bg-rose-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-700 dark:text-rose-200 transition active:translate-y-px hover:bg-rose-500/20 dark:hover:bg-rose-400/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Elimina
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-title text-[9px] tracking-wide text-slate-500 dark:text-slate-400">Catalogo pg preferiti</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Character disponibili</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  <UserSquare2 className="h-4 w-4" />
                  {filteredCatalogCharacters.length} / {characters.length} character
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cerca personaggio per nome..."
                    value={catalogSearch}
                    onChange={(e) => { setCatalogSearch(e.target.value); setCatalogVisibleCount(CATALOG_PAGE_SIZE) }}
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-9 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <select
                  value={catalogGameFilter}
                  onChange={(e) => { setCatalogGameFilter(e.target.value); setCatalogVisibleCount(CATALOG_PAGE_SIZE) }}
                  className="rounded-xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-emerald-400"
                >
                  <option value="">Tutti i giochi</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {filteredCatalogCharacters.length === 0 ? (
                <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-8 text-center text-slate-500 dark:text-slate-400">
                  {catalogSearch.trim() || catalogGameFilter ? 'Nessun character corrisponde ai filtri.' : 'Nessun character disponibile.'}
                </div>
              ) : (
                <>
                  <div className="mt-4 grid gap-2 overflow-visible sm:grid-cols-3 md:max-h-105 md:overflow-y-auto xl:grid-cols-4">
                    {visibleCatalogCharacters.map((character) => (
                      <div key={character.id} className="flex flex-col overflow-hidden border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 p-2.5 hover-lift hover:border-amber-500/40 rounded-xl">
                        <img
                          src={resolveCharacterImage(character)}
                          alt={character.name}
                          className="mb-2 h-20 w-full shrink-0 object-contain bg-slate-100 dark:bg-slate-800"
                        />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-slate-900 dark:text-white uppercase">{character.name}</p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">ID {character.id}</p>
                          </div>
                          <div className="max-w-[45%] shrink-0 truncate rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                            {gamesById?.get(character.game_id)?.name ?? `game ${character.game_id}`}
                          </div>
                        </div>
                        {character.description ? (
                          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300 line-clamp-2">{character.description}</p>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-slate-400 dark:text-slate-500">Descrizione non disponibile.</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {hasMoreCatalog && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setCatalogVisibleCount((c) => c + CATALOG_PAGE_SIZE)}
                        className="font-title inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-5 py-2 text-[10px] tracking-wide text-slate-600 dark:text-slate-300 transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        <ChevronDown size={14} />
                        Mostra altri ({filteredCatalogCharacters.length - catalogVisibleCount} nascosti)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
        </div>
      </div>
    </div>
    </AppLayout>
    </>
  )
}