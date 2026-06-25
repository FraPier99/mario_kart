// Le immagini caricate dagli utenti (avatar, foto galleria, foto campione,
// allegati ai commenti) vengono salvate come base64 direttamente nel DB e
// rispedite intere a ogni richiesta delle rotte che le includono (/players,
// /gallery). Una foto diretta da fotocamera/telefono non ridimensionata può
// pesare diversi MB — qui si ridimensiona e si ricomprime lato client prima
// dell'invio, così quello che arriva al backend (e che poi torna indietro
// a ogni richiesta) è già piccolo.
//
// Le GIF non vengono tocate: passarle per un <canvas> ne distruggerebbe
// l'animazione (canvas catturerebbe solo il primo frame).

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
 * Ridimensiona (mantenendo le proporzioni) e ricomprime un'immagine in JPEG.
 * Le GIF vengono restituite invariate (data URL originale) per non perdere
 * l'animazione. In caso di qualunque errore di decodifica, ritorna il file
 * originale invece di far fallire l'intero upload.
 */
export const compressImage = async (file, { maxDimension = 800, quality = 0.82 } = {}) => {
    const original = await readFileAsDataUrl(file)
    if (file.type === 'image/gif') return original

    try {
        const img = await loadImage(original)
        let { width, height } = img
        // Anche se le dimensioni sono già contenute, si ridisegna comunque su
        // canvas per ricomprimere in JPEG a qualità nota — uno screenshot PNG
        // di piccole dimensioni può comunque pesare molto più di un JPEG
        // equivalente.
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
        const compressed = canvas.toDataURL('image/jpeg', quality)
        // Se per qualche motivo il "compresso" risulta più pesante
        // dell'originale (capita con PNG già molto piccoli/semplici), si
        // tiene l'originale.
        return compressed.length < original.length ? compressed : original
    } catch {
        return original
    }
}
