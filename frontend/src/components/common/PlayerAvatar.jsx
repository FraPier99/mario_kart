import { useState } from 'react'

const PALETTE = [
  'bg-amber-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
]

/** Colore deterministico basato sulla stringa — stesso nome = stessa tinta. */
function colorForName(name) {
  let h = 0
  for (const ch of String(name)) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

/** Iniziali: prime due lettere del nickname, oppure prima lettera di nome + cognome. */
function initials(name = '') {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const SIZES = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-20 w-20 text-xl',
}

/**
 * Avatar giocatore con fallback alle iniziali su sfondo colorato.
 *
 * Props:
 *   src       — URL immagine (opzionale). Se assente o in errore, mostra le iniziali.
 *   name      — nome / nickname del giocatore (usato per le iniziali e il colore).
 *   size      — 'sm' | 'md' | 'lg' | 'xl'  (default: 'md')
 *   className — classi extra (es. 'border border-white/10')
 */
export default function PlayerAvatar({ src, name = '', size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = SIZES[size] ?? SIZES.md
  const bg = colorForName(name)

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClass} shrink-0 rounded-xl object-cover ${className}`}
      />
    )
  }

  return (
    <div
      title={name}
      className={`${sizeClass} ${bg} shrink-0 flex items-center justify-center rounded-xl font-black text-white select-none ${className}`}
    >
      {initials(name)}
    </div>
  )
}
