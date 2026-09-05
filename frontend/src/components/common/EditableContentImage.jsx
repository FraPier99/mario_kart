import { useRef, useState } from 'react'
import { Upload, ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { compressImage } from '@/lib/imageCompression'
import { contentImagesApi, getApiErrorMessage } from '@/services/apiClient'
import { cn } from '@/lib/utils'

// Slot immagine di contenuto statico (es. foto "La Lega" nella pagina /faq):
// mostra l'immagine se presente, altrimenti un placeholder. Il superadmin
// vede in più un controllo di upload (stesso flusso client-side di
// compressione già usato per avatar/foto campione altrove nell'app).
// `contentKey` deve corrispondere alla key usata in GET /content-images.
// `fit`: 'contain' (default, l'immagine intera resta sempre visibile — utile
// per un banner panoramico dove non si vuole ritagliare nulla) oppure
// 'cover' (riempie il riquadro ritagliando gli eccessi — sensato solo con un
// riquadro poco sensibile al ritaglio, es. un quadrato/4:3 di formato
// prevedibile, come nella coppia di foto affiancate in /faq).
// `fadeEdge`: 'left' | 'right' | 'none' (default) — applica una maschera a
// gradiente sul lato indicato così l'immagine caricata sfuma nello sfondo
// della card che la ospita, qualunque esso sia, invece di avere un bordo
// netto — usato per le immagini decorative "a bleed" (stat card profilo,
// card torneo) dove l'admin non deve preoccuparsi di pre-processare la foto.
// `imageOpacity`: 0-1 (default 1) — applicata solo all'<img>, non al
// pulsante di upload che ci si sovrappone in hover (che deve restare a piena
// opacità per il superadmin).
// `imageClassName`: classi extra aggiunte solo all'<img> (es. `blur-[1px]
// brightness-75`) — per un'immagine "a piena card" leggermente scurita/
// sfocata (Layer 1 di una composizione a livelli: immagine → overlay scuro
// → contenuto), lasciando poi a un overlay a gradiente separato, sopra
// l'immagine ma sotto il contenuto, il compito di garantire la leggibilità
// del testo senza nascondere l'immagine.
const EditableContentImage = ({ contentKey, imageUrl, onUploaded, alt = '', className = '', fit = 'contain', fadeEdge = 'none', imageOpacity = 1, imageClassName = '' }) => {
    const { isSuperadmin } = useAuth()
    const [uploading, setUploading] = useState(false)
    const [removing, setRemoving] = useState(false)
    const inputRef = useRef(null)

    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setUploading(true)
        try {
            const dataUrl = await compressImage(file, { maxDimension: 1400, quality: 0.85 })
            const res = await contentImagesApi.upload(contentKey, dataUrl)
            onUploaded?.(res.data)
            toast.success('Immagine aggiornata')
        } catch (error) {
            toast.error('Caricamento fallito', { description: getApiErrorMessage(error) })
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = async (e) => {
        e.stopPropagation()
        if (!window.confirm('Rimuovere questa immagine?')) return
        setRemoving(true)
        try {
            await contentImagesApi.remove(contentKey)
            onUploaded?.({ key: contentKey, image_url: null })
            toast.success('Immagine rimossa')
        } catch (error) {
            toast.error('Rimozione fallita', { description: getApiErrorMessage(error) })
        } finally {
            setRemoving(false)
        }
    }

    const maskStyle = fadeEdge === 'right'
        ? { maskImage: 'linear-gradient(to right, transparent, black 55%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 55%)' }
        : fadeEdge === 'left'
            ? { maskImage: 'linear-gradient(to left, transparent, black 55%)', WebkitMaskImage: 'linear-gradient(to left, transparent, black 55%)' }
            : undefined
    const imageStyle = { ...maskStyle, opacity: imageOpacity }

    return (
        // `cn()` (twMerge) invece della semplice concatenazione di stringhe:
        // quando un consumer passa `absolute`/`bg-transparent` in `className`
        // per usare questo componente come livello di sfondo full-bleed, una
        // concatenazione naive lascia `relative`/`bg-slate-100` di base nella
        // stessa stringa — con specificità identica, chi vince dipende
        // dall'ordine nel CSS generato (non dall'ordine nella stringa), quindi
        // "absolute" poteva perdere contro "relative" e il livello immagine
        // restava nel flusso del layout invece di finire dietro al contenuto
        // come sfondo assoluto (bug segnalato: l'immagine "spostava" il testo).
        <div className={cn('group relative overflow-hidden bg-slate-100 dark:bg-muted', className)}>
            {imageUrl ? (
                // `block` toglie lo spazio extra sotto l'immagine che un <img>
                // inline lascia per default (altrimenti sembrava "non adattarsi"
                // bene al riquadro).
                <img src={imageUrl} alt={alt} style={imageStyle} className={cn('block h-full w-full object-center', fit === 'cover' ? 'object-cover' : 'object-contain', imageClassName)} />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-muted text-slate-400 dark:text-muted-foreground">
                    <ImagePlus size={28} />
                    {!isSuperadmin && <span className="text-xs font-bold">Nessuna immagine</span>}
                </div>
            )}

            {isSuperadmin && (
                <>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading || removing}
                        className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 text-transparent transition group-hover:bg-black/50 group-hover:text-white disabled:cursor-wait"
                    >
                        <Upload size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">
                            {uploading ? 'Caricamento…' : imageUrl ? 'Sostituisci' : 'Carica immagine'}
                        </span>
                    </button>
                    {imageUrl && (
                        // Pulsante di rimozione separato dal click "sostituisci" a
                        // piena card — prima non c'era alcun modo di tornare allo
                        // stato "nessuna immagine" una volta caricata una foto.
                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={uploading || removing}
                            title="Rimuovi immagine"
                            className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-600 disabled:cursor-wait"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </>
            )}
        </div>
    )
}

export default EditableContentImage
