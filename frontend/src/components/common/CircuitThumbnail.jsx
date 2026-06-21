import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getCircuitImage } from '@/assets/images'
import { buildCircuitPlaceholder } from '@/lib/placeholders'

const SIZES = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-8 w-8',
}

const CircuitTooltip = ({ src, name, anchorRef }) => {
  const [pos, setPos] = useState({ left: 0, top: 0, above: true })

  useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      const spaceAbove = r.top
      const spaceBelow = window.innerHeight - r.bottom
      const above = spaceAbove >= spaceBelow
      setPos({
        left: r.left + r.width / 2,
        top: above ? r.top - 8 : r.bottom + 8,
        above,
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
    }, [anchorRef])

  return createPortal(
    <div
      className="fixed z-[9999] flex flex-col items-center pointer-events-none"
      style={{
        left: pos.left,
        top: pos.top,
        transform: `translateX(-50%) ${pos.above ? 'translateY(-100%)' : 'translateY(0)'}`,
      }}
    >
      <div className="flex flex-col items-center">
        <div
          className="bg-slate-800 dark:bg-black rounded-xl shadow-2xl p-2"
          style={{ order: pos.above ? 0 : 1 }}
        >
          <img src={src} alt={name} className="w-[150px] max-w-[90vw] rounded-lg" />
          <p className="text-xs font-bold text-white text-center mt-1.5 truncate max-w-[140px]">{name}</p>
        </div>
        <div
          className={`w-3 h-3 bg-slate-800 dark:bg-black rotate-45 ${pos.above ? '-mt-1.5' : 'mb-[-6px]'}`}
          style={{ order: pos.above ? 1 : 0 }}
        />
      </div>
    </div>,
    document.body,
  )
}

const CircuitThumbnail = ({ circuit, size = 'sm', className = '' }) => {
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const ref = useRef(null)
  const pinnedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        pinnedRef.current = false
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!circuit) {
    return (
      <img
        src={buildCircuitPlaceholder()}
        alt=""
        className={`${SIZES[size] || SIZES.sm} shrink-0 rounded object-cover ${className}`}
      />
    )
  }

  const src = (imgError ? null : getCircuitImage(circuit)) || buildCircuitPlaceholder(circuit.name)

  return (
    <div
      ref={ref}
      className="group relative inline-flex shrink-0 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        pinnedRef.current = !pinnedRef.current
        setOpen(pinnedRef.current)
      }}
      onMouseEnter={() => { if (!pinnedRef.current) setOpen(true) }}
      onMouseLeave={() => { if (!pinnedRef.current) setOpen(false) }}
    >
      <img
        src={src}
        alt={circuit.name}
        onError={() => setImgError(true)}
        className={`${SIZES[size] || SIZES.sm} shrink-0 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-600 ${className}`}
      />
      {open && <CircuitTooltip src={src} name={circuit.name} anchorRef={ref} />}
    </div>
  )
}

export default CircuitThumbnail
