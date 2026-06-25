// Le immagini caricate dagli utenti (avatar, foto galleria, foto campione,
// allegati ai commenti) vengono salvate come base64 nel DB. Qui si
// ridimensiona e ricomprime lato client in WebP prima dell'invio, così
// l'upload è già leggero. Il backend ri-ottimizza comunque in modo
// autoritativo (app/core/image_optim.py), incluse le GIF animate → WebP
// animato che il <canvas> NON può fare (catturerebbe solo il primo frame):
// per questo qui le GIF si lasciano passare invariate e ci pensa il server.

const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(new Error('Impossibile leggere il file'))
        reader.readAsDataURL(file)
    })

const loadImage = (dataUrl) =>
    new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Impossibile decodificare l\'immagine'))
        img.src = dataUrl
    })

/**
 * Ridimensiona (mantenendo le proporzioni) e ricomprime un'immagine in WebP
 * (fallback JPEG sui browser che non sanno codificare WebP da canvas — ormai
 * rari). Le GIF vengono restituite invariate (data URL originale): il backend
 * le converte in WebP animato. In caso di qualunque errore di decodifica,
 * ritorna il file originale invece di far fallire l'intero upload.
 */
export const compressImage = async (file, { maxDimension = 800, quality = 0.82 } = {}) => {
    const original = await readFileAsDataUrl(file)
    if (file.type === 'image/gif') return original

    try {
        const img = await loadImage(original)
        let { width, height } = img
        // Anche se le dimensioni sono già contenute, si ridisegna comunque su
        // canvas per ricomprimere a qualità nota — uno screenshot PNG di
        // piccole dimensioni può comunque pesare molto più di un WebP equivalente.
        if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
                height = Math.round((height / width) * maxDimension)
                width = maxDimension
            } else {
                width = Math.round((width / height) * maxDimension)
                height = maxDimension
            }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        // WebP a parità di qualità pesa meno del JPEG; se il browser non lo
        // supporta (toDataURL ignora il tipo e ricade su PNG) si usa JPEG.
        let compressed = canvas.toDataURL('image/webp', quality)
        if (!compressed.startsWith('data:image/webp')) {
            compressed = canvas.toDataURL('image/jpeg', quality)
        }
        // Se per qualche motivo il "compresso" risulta più pesante
        // dell'originale (capita con PNG già molto piccoli/semplici), si
        // tiene l'originale.
        return compressed.length < original.length ? compressed : original
    } catch {
        return original
    }
}
