import { useRef, useState } from 'react'
import { Upload, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { compressImage } from '@/lib/imageCompression'
import { contentImagesApi, getApiErrorMessage } from '@/services/apiClient'

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
const EditableContentImage = ({ contentKey, imageUrl, onUploaded, alt = '', className = '', fit = 'contain', fadeEdge = 'none' }) => {
    const { isSuperadmin } = useAuth()
    const [uploading, setUploading] = useState(false)
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

    const maskStyle = fadeEdge === 'right'
        ? { maskImage: 'linear-gradient(to right, transparent, black 55%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 55%)' }
        : fadeEdge === 'left'
            ? { maskImage: 'linear-gradient(to left, transparent, black 55%)', WebkitMaskImage: 'linear-gradient(to left, transparent, black 55%)' }
            : undefined

    return (
        <div className={`group relative overflow-hidden bg-slate-100 dark:bg-muted ${className}`}>
            {imageUrl ? (
                // `block` toglie lo spazio extra sotto l'immagine che un <img>
                // inline lascia per default (altrimenti sembrava "non adattarsi"
                // bene al riquadro).
                <img src={imageUrl} alt={alt} style={maskStyle} className={`block h-full w-full object-center ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
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
                        disabled={uploading}
                        className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 text-transparent transition group-hover:bg-black/50 group-hover:text-white disabled:cursor-wait"
                    >
                        <Upload size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">
                            {uploading ? 'Caricamento…' : imageUrl ? 'Sostituisci' : 'Carica immagine'}
                        </span>
                    </button>
                    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </>
            )}
        </div>
    )
}

export default EditableContentImage
