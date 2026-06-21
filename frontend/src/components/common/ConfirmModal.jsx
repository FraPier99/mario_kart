import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Conferma azione',
  message = 'Sei sicuro di voler procedere?',
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  confirmVariant = 'danger',
  loading = false,
  icon = null,
}) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const confirmColors = {
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white',
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center"
        onClick={(e) => e.stopPropagation()}>
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-scale-in"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/20">
            {icon || <AlertTriangle size={24} className="text-rose-600 dark:text-rose-400" />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-black uppercase tracking-widest transition disabled:opacity-60 ${confirmColors[confirmVariant] || confirmColors.danger}`}
          >
            {loading ? 'Caricamento...' : confirmText}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
