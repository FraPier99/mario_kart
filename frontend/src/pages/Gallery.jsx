import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, ChevronLeft, ChevronRight, Image as ImageIcon, MessageCircle, Pencil, Send, Smile, Trash2, Upload, X, Check } from 'lucide-react'
import { getAvatarColor } from '@/lib/placeholders'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/context/AuthContext'
import { useAppData } from '@/context/AppDataContext'
import { galleryApi, getApiErrorMessage } from '@/services/apiClient'

const QUICK_EMOJIS = ['😂','❤️','🔥','👏','😍','🏆','⭐','🎮','🚀','💥','😎','🎉','💪','🥇','😱','🤣','👀','🎯','💀','🤩']

/** Highlights @mentions in comment text with a coloured span */
const renderMentions = (text) => {
    if (!text?.includes('@')) return text
    const parts = text.split(/(@[\w.-]+)/g)
    return parts.map((part, i) =>
        part.startsWith('@')
            ? <span key={i} className="font-black text-emerald-600 dark:text-emerald-400">{part}</span>
            : part
    )
}

const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(new Error('Impossibile leggere il file'))
        reader.readAsDataURL(file)
    })

const formatDate = (value) => {
    if (!value) return ''
    return new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateTime = (value) => {
    if (!value) return ''
    const d = new Date(value)
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    const date = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${time} - ${date}`
}

export default function Gallery() {
    const { user, isSuperadmin } = useAuth()
    const { tournaments, players } = useAppData()
    const playerNicknames = useMemo(() => players.map((p) => p.nickname).filter(Boolean), [players])

    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeIdx, setActiveIdx] = useState(0)
    const [commentText, setCommentText] = useState('')
    const [submittingComment, setSubmittingComment] = useState(false)
    const [deletingComment, setDeletingComment] = useState(null)
    const [deletingPhoto, setDeletingPhoto] = useState(null)
    const [editingCommentId, setEditingCommentId] = useState(null)
    const [editCommentText, setEditCommentText] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [mentionSuggestions, setMentionSuggestions] = useState([])

    // Upload form state
    const [uploadOpen, setUploadOpen] = useState(false)
    const [uploadForm, setUploadForm] = useState({ tournament_id: '', caption: '', image_data: '' })
    const [imageFileName, setImageFileName] = useState('')
    const [uploading, setUploading] = useState(false)

    const commentInputRef = useRef(null)

    const loadPhotos = async () => {
        try {
            const res = await galleryApi.list()
            setPhotos(res.data ?? [])
        } catch {
            setPhotos([])
        } finally {
            setLoading(false)
        }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadPhotos() }, [])

    const activePhoto = photos[activeIdx] ?? null

    const prev = () => setActiveIdx((i) => Math.max(0, i - 1))
    const next = () => setActiveIdx((i) => Math.min(photos.length - 1, i + 1))

    useEffect(() => {
        const handleKey = (e) => {
            if (editingCommentId) return
            if (e.key === 'ArrowLeft') setActiveIdx((i) => Math.max(0, i - 1))
            if (e.key === 'ArrowRight') setActiveIdx((i) => Math.min(photos.length - 1, i + 1))
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [photos.length, editingCommentId])

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) { toast.error('Carica un file immagine valido'); return }
        try {
            const data = await readFileAsDataUrl(file)
            setImageFileName(file.name)
            setUploadForm((f) => ({ ...f, image_data: data }))
        } catch { toast.error('Impossibile leggere il file') }
    }

    const handleUpload = async (e) => {
        e.preventDefault()
        if (!uploadForm.image_data) { toast.error('Seleziona un\'immagine'); return }
        setUploading(true)
        try {
            await galleryApi.upload({
                tournament_id: uploadForm.tournament_id ? Number(uploadForm.tournament_id) : null,
                image_data: uploadForm.image_data,
                caption: uploadForm.caption.trim() || null,
            })
            toast.success('Foto caricata!')
            setUploadForm({ tournament_id: '', caption: '', image_data: '' })
            setImageFileName('')
            setUploadOpen(false)
            await loadPhotos()
        } catch (err) {
            toast.error('Caricamento fallito', { description: getApiErrorMessage(err) })
        } finally { setUploading(false) }
    }

    const handleDeletePhoto = async (photoId) => {
        if (!window.confirm('Eliminare questa foto e tutti i commenti?')) return
        setDeletingPhoto(photoId)
        try {
            await galleryApi.remove(photoId)
            toast.success('Foto eliminata')
            setActiveIdx(0)
            await loadPhotos()
        } catch (err) {
            toast.error('Errore eliminazione', { description: getApiErrorMessage(err) })
        } finally { setDeletingPhoto(null) }
    }

    const handleCommentInput = (val) => {
        setCommentText(val)
        const match = val.match(/@([\w.-]*)$/)
        if (match) {
            const q = match[1].toLowerCase()
            setMentionSuggestions(playerNicknames.filter((n) => n.toLowerCase().startsWith(q)).slice(0, 5))
        } else {
            setMentionSuggestions([])
        }
    }

    const insertMention = (nickname) => {
        const withoutPartial = commentText.replace(/@[\w.-]*$/, `@${nickname} `)
        setCommentText(withoutPartial)
        setMentionSuggestions([])
        commentInputRef.current?.focus()
    }

    const insertEmoji = (emoji) => {
        setCommentText((prev) => prev + emoji)
        setShowEmojiPicker(false)
        commentInputRef.current?.focus()
    }

    const handleAddComment = async (photoId) => {
        if (!commentText.trim()) return
        setSubmittingComment(true)
        try {
            await galleryApi.addComment(photoId, commentText.trim())
            setCommentText('')
            await loadPhotos()
        } catch (err) {
            toast.error('Errore commento', { description: getApiErrorMessage(err) })
        } finally { setSubmittingComment(false) }
    }

    const startEditComment = (c) => {
        setEditingCommentId(c.id)
        setEditCommentText(c.text)
    }

    const handleSaveEdit = async (commentId) => {
        if (!editCommentText.trim()) return
        setSavingEdit(true)
        try {
            await galleryApi.editComment(commentId, editCommentText.trim())
            setEditingCommentId(null)
            setEditCommentText('')
            await loadPhotos()
        } catch (err) {
            toast.error('Modifica fallita', { description: getApiErrorMessage(err) })
        } finally { setSavingEdit(false) }
    }

    const handleDeleteComment = async (commentId) => {
        setDeletingComment(commentId)
        try {
            await galleryApi.deleteComment(commentId)
            await loadPhotos()
        } catch (err) {
            toast.error('Errore eliminazione commento', { description: getApiErrorMessage(err) })
        } finally { setDeletingComment(null) }
    }

    if (loading) {
        return (
            <AppLayout>
                <section className="mx-auto max-w-7xl px-4 py-8">
                    <div className="h-96 animate-shimmer rounded-3xl bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
                </section>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">

                {/* HEADER */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-400">Galleria</p>
                        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">Foto Tornei</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">Rivivi i momenti migliori delle serate di gioco</p>
                    </div>
                    {isSuperadmin && (
                        <button type="button" onClick={() => setUploadOpen(true)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500">
                            <Upload size={15} /> Carica Foto
                        </button>
                    )}
                </div>

                {/* UPLOAD MODAL */}
                {uploadOpen && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center">
                        <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-border bg-white dark:bg-card shadow-2xl">
                            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-border">
                                <p className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-foreground">Carica nuova foto</p>
                                <button type="button" onClick={() => setUploadOpen(false)} className="rounded-xl border border-slate-200 dark:border-border p-1.5 text-slate-400 transition hover:text-slate-700 dark:hover:text-white">
                                    <X size={15} />
                                </button>
                            </div>
                            <form onSubmit={handleUpload} className="p-5 space-y-4">
                                <label className="block">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Immagine</span>
                                    <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-5 text-center transition hover:border-emerald-400">
                                        {uploadForm.image_data ? (
                                            <img src={uploadForm.image_data} alt="preview" className="mx-auto max-h-40 rounded-xl object-cover" />
                                        ) : (
                                            <div className="mx-auto flex flex-col items-center gap-2 text-slate-400">
                                                <ImageIcon size={32} />
                                                <span className="text-xs font-black uppercase tracking-wider">{imageFileName || 'Clicca per scegliere'}</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                </label>
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Torneo di riferimento</span>
                                    <select value={uploadForm.tournament_id} onChange={(e) => setUploadForm((f) => ({ ...f, tournament_id: e.target.value }))}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-500">
                                        <option value="">— Nessun torneo —</option>
                                        {[...tournaments].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.date})</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block space-y-1.5">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Didascalia (opzionale)</span>
                                    <input type="text" maxLength={300} placeholder="Descrivi questo momento..."
                                        value={uploadForm.caption} onChange={(e) => setUploadForm((f) => ({ ...f, caption: e.target.value }))}
                                        className="w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-3 text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-500" />
                                </label>
                                <div className="flex gap-3 pt-1">
                                    <button type="button" onClick={() => setUploadOpen(false)} className="flex-1 rounded-2xl border border-slate-200 dark:border-border py-3 text-sm font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground transition hover:border-slate-300">Annulla</button>
                                    <button type="submit" disabled={uploading || !uploadForm.image_data} className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed">
                                        {uploading ? 'Caricamento...' : 'Carica'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        </div>
                    </div>
                )}

                {/* EMPTY STATE */}
                {photos.length === 0 && (
                    <div className="rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10 p-16 text-center">
                        <Camera size={48} className="mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="mt-4 text-sm font-black uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Nessuna foto ancora</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                            {isSuperadmin ? 'Carica la prima foto usando il pulsante in alto.' : 'Le foto delle serate verranno pubblicate presto.'}
                        </p>
                    </div>
                )}

                {photos.length > 0 && (
                    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

                        {/* LEFT: carosello full-width */}
                        <div className="space-y-3">
                            {/* Main image — full-width con aspect ratio 16:9 */}
                            <div className="relative w-full overflow-hidden rounded-[2rem] bg-slate-100 dark:bg-slate-800 shadow-xl transition-all duration-300"
                                style={{ aspectRatio: '16 / 9' }}>
                                {activePhoto && (
                                    <img
                                        key={activePhoto.id}
                                        src={activePhoto.image_data}
                                        alt={activePhoto.caption || 'Foto torneo'}
                                        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                                    />
                                )}
                                {/* Nav arrows */}
                                {photos.length > 1 && (
                                    <>
                                        <button type="button" onClick={prev} disabled={activeIdx === 0}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-30">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button type="button" onClick={next} disabled={activeIdx === photos.length - 1}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-30">
                                            <ChevronRight size={18} />
                                        </button>
                                    </>
                                )}
                                {/* Delete (superadmin) */}
                                {isSuperadmin && activePhoto && (
                                    <button type="button" onClick={() => handleDeletePhoto(activePhoto.id)} disabled={deletingPhoto === activePhoto.id}
                                        className="absolute top-3 right-3 flex items-center gap-1.5 rounded-xl bg-rose-600/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-sm transition hover:bg-rose-500 disabled:opacity-60">
                                        <Trash2 size={11} />
                                        {deletingPhoto === activePhoto.id ? '...' : 'Elimina'}
                                    </button>
                                )}
                                {/* Counter */}
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[10px] font-black text-white backdrop-blur-sm">
                                    {activeIdx + 1} / {photos.length}
                                </div>
                            </div>

                            {/* Caption + meta */}
                            {activePhoto && (
                                <div className="rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-3">
                                    {activePhoto.caption && <p className="text-sm text-slate-700 dark:text-foreground mb-1">{activePhoto.caption}</p>}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-muted-foreground">
                                        {activePhoto.tournament_name && (
                                            <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 font-black uppercase tracking-wider">
                                                {activePhoto.tournament_name}
                                            </span>
                                        )}
                                        <span>{formatDate(activePhoto.created_at)}</span>
                                        <span className="flex items-center gap-1"><MessageCircle size={11} />{activePhoto.comments?.length ?? 0} commenti</span>
                                    </div>
                                </div>
                            )}

                            {/* Thumbnail strip */}
                            {photos.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {photos.map((p, i) => (
                                        <button key={p.id} type="button" onClick={() => setActiveIdx(i)}
                                            className={`shrink-0 h-14 overflow-hidden rounded-xl border-2 transition-all duration-200 ${i === activeIdx ? 'border-emerald-500 shadow-md scale-105 w-24' : 'border-transparent opacity-60 hover:opacity-90 hover:scale-105 w-14'}`}>
                                            <img src={p.image_data} alt="" className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: commenti */}
                        {activePhoto && (
                            <div className="flex flex-col rounded-[2rem] border border-slate-200 dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden" style={{ maxHeight: '640px' }}>
                                <div className="shrink-0 px-4 py-3 border-b border-slate-100 dark:border-border">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground flex items-center gap-2">
                                        <MessageCircle size={13} /> Commenti ({activePhoto.comments?.length ?? 0})
                                    </p>
                                </div>

                                {/* Comment list */}
                                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                                    {(activePhoto.comments ?? []).length === 0 ? (
                                        <div className="py-8 text-center">
                                            <MessageCircle size={28} className="mx-auto text-slate-200 dark:text-slate-700" />
                                            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Nessun commento ancora.</p>
                                        </div>
                                    ) : (
                                        (activePhoto.comments ?? []).map((c) => {
                                            const isMe = c.user_id === user?.id
                                            const isEditing = editingCommentId === c.id
                                            return (
                                                <div key={c.id} className={`rounded-2xl px-3 py-2.5 ${isMe ? 'bg-emerald-50 dark:bg-emerald-500/10 ml-4' : 'bg-slate-50 dark:bg-muted mr-4'}`}>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Link to={`/community/user/${c.user_id}`} className="shrink-0">
                                                            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/50 dark:border-slate-600"
                                                                style={{ backgroundColor: c.img_url || c.user_img_url || c.favorite_character_img_url ? 'transparent' : getAvatarColor(c.nickname ?? c.username) }}>
                                                                {c.img_url ? (
                                                                    <img src={c.img_url} alt={c.nickname ?? c.username} className="h-full w-full object-cover" />
                                                                ) : c.user_img_url ? (
                                                                    <img src={c.user_img_url} alt={c.nickname ?? c.username} className="h-full w-full object-cover" />
                                                                ) : c.favorite_character_img_url ? (
                                                                    <img src={c.favorite_character_img_url} alt={c.nickname ?? c.username} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center text-[8px] font-black text-white">
                                                                        {(c.nickname ?? c.username ?? '?').charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            </Link>
                                                            <Link to={`/community/user/${c.user_id}`} className={`text-[10px] font-black uppercase tracking-wider truncate transition ${isMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-muted-foreground hover:text-emerald-600'}`}>
                                                                {c.nickname ?? c.username}{isMe && <span className="ml-1 opacity-60">(tu)</span>}
                                                            </Link>
                                                        </div>
                                                        {isSuperadmin && (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button type="button" onClick={() => startEditComment(c)}
                                                                    className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition hover:text-blue-500">
                                                                    <Pencil size={10} />
                                                                </button>
                                                                <button type="button" onClick={() => handleDeleteComment(c.id)} disabled={deletingComment === c.id}
                                                                    className="flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition hover:text-rose-500 disabled:opacity-40">
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isEditing ? (
                                                        <div className="mt-1.5 flex gap-1.5">
                                                            <input
                                                                type="text"
                                                                value={editCommentText}
                                                                onChange={(e) => setEditCommentText(e.target.value)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(c.id); if (e.key === 'Escape') setEditingCommentId(null) }}
                                                                className="flex-1 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-slate-700 px-2 py-1 text-xs text-slate-900 dark:text-foreground outline-none focus:border-blue-400"
                                                                autoFocus
                                                            />
                                                            <button type="button" onClick={() => handleSaveEdit(c.id)} disabled={savingEdit}
                                                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500 text-white disabled:opacity-60">
                                                                <Check size={10} />
                                                            </button>
                                                            <button type="button" onClick={() => setEditingCommentId(null)}
                                                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500">
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="mt-1 text-sm text-slate-700 dark:text-foreground">{renderMentions(c.text)}</p>
                                                    )}

                                                    <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-400">
                                                        <span>{formatDateTime(c.created_at)}</span>
                                                        {c.edited_by_username && c.edited_at && (
                                                            <span className="italic">· Edit by {c.edited_by_username} at {formatDateTime(c.edited_at)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {/* Comment input */}
                                {user && (
                                    <div className="shrink-0 border-t border-slate-100 dark:border-border px-3 py-3 space-y-2">
                                        {/* Mention suggestions */}
                                        {mentionSuggestions.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {mentionSuggestions.map((nick) => (
                                                    <button key={nick} type="button" onClick={() => insertMention(nick)}
                                                        className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-100">
                                                        @{nick}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {/* Emoji picker */}
                                        {showEmojiPicker && (
                                            <div className="grid grid-cols-10 gap-1 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card p-2 shadow-lg">
                                                {QUICK_EMOJIS.map((e) => (
                                                    <button key={e} type="button" onClick={() => insertEmoji(e)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-lg transition hover:bg-slate-100 dark:hover:bg-muted hover:scale-125">
                                                        {e}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setShowEmojiPicker((v) => !v)}
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${showEmojiPicker ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-500' : 'border-slate-200 dark:border-border text-slate-400 hover:text-amber-500'}`}>
                                                <Smile size={15} />
                                            </button>
                                            <input
                                                ref={commentInputRef}
                                                type="text"
                                                maxLength={500}
                                                placeholder="Scrivi un commento… usa @nickname per menzionare"
                                                value={commentText}
                                                onChange={(e) => handleCommentInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey && mentionSuggestions.length === 0) {
                                                        e.preventDefault(); handleAddComment(activePhoto.id)
                                                    }
                                                }}
                                                className="flex-1 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2 text-sm text-slate-900 dark:text-foreground outline-none focus:border-emerald-400"
                                            />
                                            <button type="button" onClick={() => handleAddComment(activePhoto.id)} disabled={submittingComment || !commentText.trim()}
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-50">
                                                <Send size={14} />
                                            </button>
                                        </div>
                                        {isSuperadmin && (
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 italic">Moderazione attiva — puoi modificare ed eliminare qualsiasi commento.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </AppLayout>
    )
}
