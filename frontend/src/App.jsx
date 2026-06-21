import './App.css'
import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import AppRouter from './Router/AppRouter'
import { AppDataProvider } from './context/AppDataContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CelebrationProvider } from './context/CelebrationContext'
import { SocketProvider } from './context/SocketContext'
import { ThemeProvider } from './context/ThemeContext'
import { UISoundProvider } from './context/UISoundContext'
import { Toaster } from 'sonner'
import { authApi, getApiErrorMessage } from './services/apiClient'

// Overlay che blocca tutta l'app finché l'utente non cambia la password al primo accesso
function ForcePasswordChangeOverlay() {
  const { mustChangePassword, refreshMe, logout } = useAuth()
  const [form, setForm] = useState({ new_password: '', confirm_password: '' })
  const [saving, setSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  if (!mustChangePassword) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.new_password.length < 6) { toast.error('La password deve essere di almeno 6 caratteri'); return }
    if (form.new_password !== form.confirm_password) { toast.error('Le password non coincidono'); return }
    setSaving(true)
    try {
      await authApi.changePassword({ current_password: null, new_password: form.new_password, force: true })
      toast.success('Password impostata. Benvenuto!')
      await refreshMe()
    } catch (err) {
      toast.error('Errore durante il cambio password', { description: getApiErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl animate-scale-in">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 mx-auto mb-6">
          <KeyRound size={30} className="text-amber-400" />
        </div>

        <div className="text-center mb-6">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-400">Primo accesso</p>
          <h1 className="mt-2 text-2xl font-black text-white">Imposta la tua password</h1>
          <p className="mt-2 text-sm text-slate-400">
            Questo account è stato creato con una password temporanea. Scegli una nuova password per continuare.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nuova password</span>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.new_password}
                onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Minimo 6 caratteri"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white outline-none focus:border-amber-400 placeholder:text-slate-500"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conferma password</span>
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
              required
              autoComplete="new-password"
              placeholder="Ripeti la nuova password"
              className={`w-full rounded-2xl border bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 placeholder:text-slate-500 ${form.confirm_password && form.new_password !== form.confirm_password ? 'border-rose-500' : 'border-white/10'}`}
            />
            {form.confirm_password && form.new_password !== form.confirm_password && (
              <p className="text-[11px] text-rose-400 font-black">Le password non coincidono</p>
            )}
          </label>

          <button
            type="submit"
            disabled={saving || !form.new_password || form.new_password !== form.confirm_password}
            className="w-full rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
          >
            {saving ? 'Salvataggio...' : 'Imposta password e accedi'}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition py-1"
          >
            Torna al login
          </button>
        </form>
      </div>
    </div>
  )
}

// Wrapper interno che ha accesso a AuthContext
function AppInner() {
  return (
    <>
      <ForcePasswordChangeOverlay />
      <AppRouter />
    </>
  )
}

function App() {
  return (
    <>
      <ThemeProvider>
        <AuthProvider>
          <UISoundProvider>
          <CelebrationProvider>
            <SocketProvider>
              <AppDataProvider>
                <AppInner />
              </AppDataProvider>
            </SocketProvider>
          </CelebrationProvider>
          </UISoundProvider>
        </AuthProvider>
      </ThemeProvider>
      <Toaster position="top-right" richColors closeButton duration={2000} />
    </>
  )
}

export default App
