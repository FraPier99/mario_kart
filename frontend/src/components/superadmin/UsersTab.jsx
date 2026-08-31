import { useEffect, useMemo, useState } from 'react'
import {
    Clock, Copy, Key, Plus, RefreshCw, Search, Trash2, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { SkeletonRows } from '@/components/common/Skeleton'
import { authApi, auditApi, getApiErrorMessage } from '@/services/apiClient'

// Estratto da SuperAdminPanel.jsx (tab "Utenti") così il superadmin può
// gestire gli account senza dover lasciare /admin — stesso principio già
// usato per DatabaseTab.jsx: componente autonomo (fetch/stato propri),
// riceve solo ciò che serve dal chiamante (players per il picker, e
// setConfirmModal per condividere lo stesso ConfirmModal della pagina).
const UsersTab = ({ players, setConfirmModal }) => {
    const [users, setUsers] = useState([])
    const [usersLoading, setUsersLoading] = useState(false)
    const [userSearch, setUserSearch] = useState('')
    const [userForm, setUserForm] = useState({ username: '', role: 'user', player_id: '' })
    const [userSaving, setUserSaving] = useState(false)
    const [resettingPasswords, setResettingPasswords] = useState({})
    const [lastResetInfo, setLastResetInfo] = useState(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [tempPwModal, setTempPwModal] = useState({ open: false, userId: null, username: '', passwords: [], loading: false })

    const loadUsers = async () => {
        setUsersLoading(true)
        try { const res = await authApi.listUsers(); setUsers(res.data ?? []) }
        catch { toast.error('Impossibile caricare gli utenti') }
        finally { setUsersLoading(false) }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadUsers()
    }, [])

    const filteredUsers = useMemo(() => {
        if (!userSearch.trim()) return users
        const q = userSearch.toLowerCase()
        return users.filter(u =>
            u.username.toLowerCase().includes(q) ||
            (u.player?.nickname ?? '').toLowerCase().includes(q)
        )
    }, [users, userSearch])

    const buildUsernameSuggestion = (p) => {
        if (!p) return ''
        return (p.nickname || `${p.first_name}.${p.last_name}`).trim().toLowerCase()
            .replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    }

    const handleUserFormChange = (e) => {
        const { name, value } = e.target
        if (name === 'player_id') {
            const sel = players.find(p => p.id === Number(value))
            setUserForm(f => ({ ...f, player_id: value, username: buildUsernameSuggestion(sel) || f.username }))
        } else {
            setUserForm(f => ({ ...f, [name]: value }))
        }
    }

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
        let pwd = ''
        for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
        return pwd
    }

    const handleCreateUser = async (e) => {
        e.preventDefault()
        if (userForm.role !== 'superadmin' && !userForm.player_id) { toast.error('Seleziona un giocatore'); return }
        const generatedPw = generatePassword()
        setUserSaving(true)
        try {
            await authApi.createUser({
                username: userForm.username.trim() || null,
                password: generatedPw,
                role: userForm.role,
                player_id: userForm.role === 'superadmin' ? null : Number(userForm.player_id),
                is_active: true,
                must_change_password: true,
            })
            setLastResetInfo({ username: userForm.username.trim() || userForm.role, temp_password: generatedPw })
            toast.success('Account creato')
            setUserForm({ username: '', role: 'user', player_id: '' })
            setShowCreateModal(false)
            await loadUsers()
        } catch (err) { toast.error('Creazione fallita', { description: getApiErrorMessage(err) }) }
        finally { setUserSaving(false) }
    }

    const updateUserRow = async (userId, patch) => {
        try { await authApi.updateUser(userId, patch); await loadUsers() }
        catch (err) { toast.error('Aggiornamento fallito', { description: getApiErrorMessage(err) }) }
    }

    const deleteUser = async (userId, username) => {
        try { await authApi.deleteUser(userId); toast.success(`Utente ${username} eliminato`); await loadUsers() }
        catch (err) { toast.error('Eliminazione fallita', { description: getApiErrorMessage(err) }) }
    }

    const handleResetPassword = async (account) => {
        if (resettingPasswords[account.id]) return
        setResettingPasswords(p => ({ ...p, [account.id]: true }))
        try {
            const res = await auditApi.resetPassword(account.id)
            const { temp_password, username } = res.data
            setLastResetInfo({ username, temp_password })
            toast.success(`Password reimpostata per ${username}`)
            await loadUsers()
        } catch { toast.error(`Reset fallito per ${account.username}`) }
        finally { setResettingPasswords(p => ({ ...p, [account.id]: false })) }
    }

    const handleShowTempPasswords = async (account) => {
        setTempPwModal({ open: true, userId: account.id, username: account.username, passwords: [], loading: true })
        try {
            const res = await auditApi.tempPasswords(account.id)
            setTempPwModal(p => ({ ...p, passwords: res.data ?? [], loading: false }))
        } catch {
            toast.error('Impossibile caricare lo storico password temporanee')
            setTempPwModal(p => ({ ...p, loading: false }))
        }
    }

    return (
        <div className="space-y-6">

            {/* Password temporanea */}
            {lastResetInfo && (
                <div className="rounded-[2rem] border-2 border-rose-400 bg-rose-50 dark:bg-rose-500/10 p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-title text-xs tracking-wide text-rose-600 dark:text-rose-400">Password temporanea generata</p>
                            <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">Copia e consegna a <strong>{lastResetInfo.username}</strong> — non verrà mostrata di nuovo.</p>
                        </div>
                        <button type="button" onClick={() => setLastResetInfo(null)} className="shrink-0 rounded-full p-1 text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                        <code className="flex-1 rounded-xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 px-4 py-3 text-lg font-mono font-black tracking-widest text-rose-700 dark:text-rose-300 select-all">
                            {lastResetInfo.temp_password}
                        </code>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(lastResetInfo.temp_password); toast.success('Copiata!') }}
                            className="shrink-0 rounded-xl bg-rose-600 px-3 py-2.5 font-title text-[10px] tracking-wide text-white hover:bg-rose-500 transition active:translate-y-px">
                            <Copy size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Gestione utenti — full width */}
            <div className="rounded-[2rem] border-2 border-slate-200 dark:border-border bg-white dark:bg-card p-5" style={{ boxShadow: 'var(--circuit-shadow-md)' }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <p className="font-title text-xs tracking-wide text-emerald-600 dark:text-emerald-400">Account registrati</p>
                        <h2 className="mt-0.5 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Gestione utenti</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500">
                            <Plus size={12} /> Crea account
                        </button>
                        <button type="button" onClick={loadUsers}
                            className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 font-title text-[10px] tracking-wide text-slate-700 dark:text-slate-100 transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-slate-700">
                            <RefreshCw size={12} /> Aggiorna
                        </button>
                    </div>
                </div>
                <div className="relative mb-3">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cerca username o nickname..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
                        className="w-full rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 pl-8 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />
                </div>
                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                    {usersLoading ? (
                        <SkeletonRows count={4} />
                    ) : filteredUsers.map(account => (
                        <div key={account.id} className="rounded-xl border-2 border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-slate-900 dark:text-foreground">{account.username}</p>
                                    <p className="truncate text-[10px] text-slate-500 dark:text-muted-foreground">
                                        {account.player?.nickname ?? 'Nessun giocatore collegato'} · <span className="capitalize">{account.role}</span>
                                    </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 font-title text-[9px] tracking-wide ${account.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                    {account.is_active ? 'Attivo' : 'Bloccato'}
                                </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <select value={account.role} onChange={e => {
                                    const newRole = e.target.value
                                    if (account.role === newRole) return
                                    setConfirmModal({ open: true, title: 'Cambia ruolo', message: `Cambiare il ruolo di "${account.username}" a "${newRole}"?`, confirmText: 'Cambia', confirmVariant: 'warning',
                                        onConfirm: () => { updateUserRow(account.id, { role: newRole }); setConfirmModal(p => ({ ...p, open: false })) }
                                    })
                                }} className="rounded-lg border-2 border-slate-200 dark:border-border bg-white dark:bg-card px-2 py-1 font-title text-[10px] tracking-wide text-slate-700 dark:text-foreground">
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="superadmin">Superadmin</option>
                                </select>
                                <button type="button" onClick={() => updateUserRow(account.id, { is_active: !account.is_active })}
                                    className="rounded-lg bg-slate-700 dark:bg-slate-600 px-2 py-1 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-slate-600">
                                    {account.is_active ? 'Disattiva' : 'Riattiva'}
                                </button>
                                <button type="button" onClick={() => handleResetPassword(account)} disabled={resettingPasswords[account.id]}
                                    className="rounded-lg bg-amber-500 px-2 py-1 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-amber-400 disabled:opacity-60">
                                    {resettingPasswords[account.id] ? '...' : <Key size={11} />}
                                    <span className="ml-1">{resettingPasswords[account.id] ? 'Reset...' : 'Reset pw'}</span>
                                </button>
                                <button type="button" onClick={() => handleShowTempPasswords(account)}
                                    className="rounded-lg bg-indigo-500 px-2 py-1 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-indigo-400">
                                    <Clock size={11} />
                                    <span className="ml-1">Storico pw</span>
                                </button>
                                <button type="button" onClick={() => setConfirmModal({ open: true, title: 'Elimina utente', message: `Eliminare "${account.username}"?`, confirmText: 'Elimina', confirmVariant: 'danger',
                                    onConfirm: () => { deleteUser(account.id, account.username); setConfirmModal(p => ({ ...p, open: false })) }
                                })} className="rounded-lg bg-rose-600 px-2 py-1 font-title text-[10px] tracking-wide text-white transition active:translate-y-px hover:bg-rose-500">
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {!usersLoading && filteredUsers.length === 0 && (
                        <p className="py-6 text-center text-sm text-slate-500 dark:text-muted-foreground">{userSearch ? 'Nessun risultato' : 'Nessun account'}</p>
                    )}
                </div>
            </div>

            {/* ── Modale Crea account ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
                    onClick={() => setShowCreateModal(false)}>
                    <div className="flex min-h-full items-center justify-center"
                        onClick={(e) => e.stopPropagation()}>
                    <div className="w-full max-w-md rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 animate-scale-in" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <p className="font-title text-xs tracking-wide text-emerald-600 dark:text-emerald-400">Nuovo accesso</p>
                                <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Crea account</h2>
                            </div>
                            <button type="button" onClick={() => setShowCreateModal(false)}
                                className="rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <label className="block space-y-1.5">
                                <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-slate-400">Ruolo</span>
                                <select name="role" value={userForm.role} onChange={handleUserFormChange}
                                    className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition">
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="superadmin">Superadmin</option>
                                </select>
                            </label>
                            {userForm.role !== 'superadmin' ? (
                                <label className="block space-y-1.5">
                                    <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-slate-400">Giocatore</span>
                                    <select name="player_id" value={userForm.player_id} onChange={handleUserFormChange} required
                                        className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition">
                                        <option value="">Seleziona giocatore…</option>
                                        {players.map(p => {
                                            const linked = users.some(u => u.player_id === p.id)
                                            return <option key={p.id} value={p.id} disabled={linked}>{p.nickname}{linked ? ' (già collegato)' : ''}</option>
                                        })}
                                    </select>
                                </label>
                            ) : (
                                <label className="block space-y-1.5">
                                    <span className="font-title text-[10px] tracking-wide text-slate-500 dark:text-slate-400">Username</span>
                                    <input name="username" value={userForm.username} onChange={handleUserFormChange} required
                                        className="w-full rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />
                                </label>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowCreateModal(false)}
                                    className="flex-1 rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition active:translate-y-px hover:bg-slate-100 dark:hover:bg-white/10">
                                    Annulla
                                </button>
                                <button type="submit" disabled={userSaving}
                                    className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2.5 font-title text-[11px] tracking-wide text-white transition active:translate-y-px hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed">
                                    {userSaving ? 'Creazione...' : 'Crea account'}
                                </button>
                            </div>
                        </form>
                    </div>
                    </div>
                </div>
            )}

            {/* ── Modale Storico Password Temporanee ── */}
            {tempPwModal.open && (
                <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
                    onClick={() => setTempPwModal(p => ({ ...p, open: false }))}>
                    <div className="flex min-h-full items-center justify-center"
                        onClick={(e) => e.stopPropagation()}>
                    <div className="w-full max-w-lg rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 animate-scale-in max-h-[80vh] flex flex-col" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                        <div className="flex items-start justify-between gap-4 mb-5 shrink-0">
                            <div>
                                <p className="font-title text-xs tracking-wide text-indigo-600 dark:text-indigo-400">Storico password</p>
                                <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{tempPwModal.username}</h2>
                            </div>
                            <button type="button" onClick={() => setTempPwModal(p => ({ ...p, open: false }))}
                                className="rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {tempPwModal.loading ? (
                                <SkeletonRows count={3} />
                            ) : tempPwModal.passwords.length === 0 ? (
                                <p className="py-8 text-center text-sm text-slate-400">Nessuna password temporanea attiva (scadute dopo 48h).</p>
                            ) : (
                                tempPwModal.passwords.map(pw => {
                                    const created = new Date(pw.created_at)
                                    const expires = new Date(pw.expires_at)
                                    const isExpired = expires < new Date()
                                    return (
                                        <div key={pw.id} className={`rounded-xl border-2 px-3 py-2.5 ${isExpired ? 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50' : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10'}`}>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <code className="text-sm font-mono font-black tracking-widest text-slate-800 dark:text-slate-100 select-all">{pw.temp_password}</code>
                                                <button type="button" onClick={() => { navigator.clipboard.writeText(pw.temp_password); toast.success('Copiata!') }}
                                                    className="shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 p-1.5 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                                                <span>Creato: {created.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>Scade: {expires.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                {isExpired && <span className="text-rose-500 font-black">Scaduta</span>}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default UsersTab
