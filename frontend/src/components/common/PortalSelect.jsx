import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

/**
 * Select custom renderizzato via React Portal.
 * Il dropdown fluttua in document.body — immune a overflow:hidden,
 * CSS transform e backdrop-filter dei parent.
 *
 * Props:
 *   value       — valore selezionato (stringa o numero)
 *   onChange    — (value: string) => void
 *   options     — Array<{ value, label, disabled? }>
 *   placeholder — testo mostrato quando value è vuoto
 *   className   — classi extra sul trigger
 */
export default function PortalSelect({
  value = '',
  onChange,
  options = [],
  placeholder = 'Seleziona…',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [dropStyle, setDropStyle] = useState({})
  const triggerRef = useRef(null)
  const listRef = useRef(null)

  const reposition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const LIST_MAX = 224
    const spaceBelow = window.innerHeight - rect.bottom - 6
    const spaceAbove = rect.top - 6
    const openUp = spaceBelow < 80 && spaceAbove > spaceBelow
    setDropStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      maxHeight: openUp ? Math.min(LIST_MAX, spaceAbove) : Math.min(LIST_MAX, spaceBelow),
      zIndex: 10000,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, { capture: true, passive: true })
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, { capture: true })
    }
  }, [open, reposition])

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!open) return
    const handle = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (listRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Chiudi con Escape
  useEffect(() => {
    if (!open) return
    const handle = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open])

  const selected = options.find((o) => String(o.value) === String(value))

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-left outline-none transition hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <span className={selected ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            style={dropStyle}
            className="overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 py-1 shadow-2xl"
          >
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <li
                  key={opt.value ?? '__empty'}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (opt.disabled) return
                    onChange(String(opt.value))
                    setOpen(false)
                  }}
                  className={[
                    'flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition',
                    opt.disabled
                      ? 'cursor-not-allowed opacity-40 text-slate-500 dark:text-slate-400 pointer-events-none'
                      : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10',
                    isSelected ? 'font-black bg-slate-100 dark:bg-white/10' : '',
                  ].join(' ')}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={13} className="ml-2 shrink-0 text-amber-500" />}
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </div>
  )
}
