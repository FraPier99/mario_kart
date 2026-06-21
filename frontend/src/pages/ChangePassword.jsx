import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Key, Lock, Shield, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/services/apiClient'
import AppLayout from '@/components/layout/AppLayout'

export default function ChangePassword() {
    const navigate = useNavigate()
    const { refreshMe } = useAuth()
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (newPassword.length < 6) {
            setError('La password deve essere di almeno 6 caratteri')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('Le password non coincidono')
            return
        }

        setSubmitting(true)
        try {
            await authApi.changePassword({ new_password: newPassword, force: true })
            toast.success('Password cambiata con successo')
            await refreshMe()
            navigate('/dashboard', { replace: true })
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Errore durante il cambio password'
            setError(msg)
            toast.error('Cambio password fallito', { description: msg })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AppLayout>
            <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg items-center justify-center px-4 py-8">
                <div className="w-full animate-fade-in">
                    <div className="rounded-[2rem] border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-card p-8 shadow-2xl">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/30 mb-4">
                                <Key size={28} className="text-white" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-600 dark:text-amber-400">Sicurezza</p>
                            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Cambio Password</h1>
                            <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">
                                È richiesto un cambio password prima di procedere.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <label className="block space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nuova Password</span>
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-muted px-4 py-3 focus-within:border-amber-400">
                                    <Lock size={16} className="text-slate-400 shrink-0" />
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                        className="w-full bg-transparent text-sm text-slate-900 dark:text-foreground outline-none placeholder:text-slate-400"
                                        placeholder="••••••••" minLength={6} required autoFocus />
                                </div>
                            </label>

                            <label className="block space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Conferma Password</span>
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-muted px-4 py-3 focus-within:border-amber-400">
                                    <Shield size={16} className="text-slate-400 shrink-0" />
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full bg-transparent text-sm text-slate-900 dark:text-foreground outline-none placeholder:text-slate-400"
                                        placeholder="••••••••" minLength={6} required />
                                </div>
                            </label>

                            {error && (
                                <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-200">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-400" />
                                    <p>{error}</p>
                                </div>
                            )}

                            <button type="submit" disabled={submitting}
                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-60">
                                <Key size={16} />
                                {submitting ? 'Aggiornamento...' : 'Cambia Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </AppLayout>
    )
}
