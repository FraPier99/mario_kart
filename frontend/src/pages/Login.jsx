import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Flag, Lock, LogIn, User, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const Login = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { login, isAuthenticated, user } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [localError, setLocalError] = useState('')

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true })
        }
    }, [isAuthenticated, navigate])

    const handleSubmit = async (event) => {
        event.preventDefault()
        setSubmitting(true)
        setLocalError('')

        try {
            const userData = await login(username, password)
            toast.success('Accesso effettuato')
            if (userData?.must_change_password) {
                navigate('/change-password', { replace: true })
                return
            }
            const redirectTo = location.state?.from?.pathname ?? '/dashboard'
            navigate(redirectTo, { replace: true })
        }
        catch (error) {
            const message = error?.message || 'Credenziali non valide'
            setLocalError(message)
            toast.error('Accesso fallito', { description: message })
        }
        finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
            <div className="px-4 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
                <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[2rem] border-2 border-white/20 bg-white/5 p-8 backdrop-blur-xl" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <div className="font-title inline-flex items-center gap-2 rounded-full border-2 border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-[10px] tracking-wide text-emerald-300">
                            <Flag size={16} /> Lega Kart
                        </div>
                        <h1 className="mt-5 text-4xl font-black uppercase tracking-tight">Accesso riservato</h1>
                        <p className="mt-4 text-sm leading-6 text-slate-300">
                            Nessuna registrazione pubblica. Le credenziali vengono assegnate manualmente e il ruolo decide cosa puoi fare nel sistema.
                        </p>
                        <div className="mt-6 rounded-2xl border-2 border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                            <p className="font-black text-white mb-1">🏁 Benvenuto nella Lega Kart!</p>
                            <p className="leading-relaxed">Qui si organizzano tornei, si compilano schedine, si sbloccano power-up e si discute in galleria. <span className="font-black text-white">Trofeo, statistiche e gloria ti aspettano.</span></p>
                            <p className="mt-2 text-emerald-300/70 text-[10px]">🍄 Il potere del Super Mushroom è nelle tue mani.</p>
                        </div>
                        {user && (
                            <div className="mt-6 rounded-2xl border-2 border-white/15 bg-black/20 p-4 text-sm text-slate-300">
                                Sei già autenticato come <span className="font-black text-white">{user.username}</span>.
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="rounded-[2rem] border-2 border-white/20 bg-slate-950/80 p-8 backdrop-blur-xl" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <div>
                            <p className="font-title text-[10px] tracking-wide text-emerald-300">Login</p>
                            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Entra nel pannello</h2>
                        </div>

                        <div className="mt-8 space-y-4">
                            <label className="block space-y-2">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Nickname o nome_cognome</span>
                                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-emerald-400">
                                    <User size={16} className="text-slate-400" />
                                    <input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                                        placeholder="es. fra oppure mario_rossi"
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                            </label>

                            <label className="block space-y-2">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Password</span>
                                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-emerald-400">
                                    <Lock size={16} className="text-slate-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="font-title mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-900/40 bg-linear-to-r from-emerald-500 to-green-600 px-5 py-3 text-xs tracking-wide text-white transition active:translate-y-px hover:from-emerald-400 hover:to-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                        >
                            <LogIn size={16} />
                            {submitting ? 'Accesso...' : 'Accedi'}
                        </button>

                        {localError && (
                            <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
                                <p>{localError}</p>
                            </div>
                        )}


                    </form>
                </div>
            </div>
            </div>
        </div>
    )
}

export default Login