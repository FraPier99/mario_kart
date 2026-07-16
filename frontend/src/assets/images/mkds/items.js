import itemsGif from './items/items.gif'

const ITEMS_SPRITE = itemsGif
const SHEET_WIDTH = 643
const SHEET_HEIGHT = 66

// Rettangolo esatto in pixel di ciascuna icona nello sprite sheet
// items.gif, misurato analizzando i bordi neri tra le icone: le icone NON
// sono tutte larghe uguale (la maggior parte è 32px, ma alcune sono 16/28/36/
// 54/64px), quindi dividere lo sheet in fette percentuali fisse (100/18)
// ritagliava la posizione sbagliata per praticamente ogni voce dopo la
// prima — mostrando l'icona di un altro oggetto (o un frame vuoto/rotto)
// invece di quella richiesta. Qui ci sono solo le 3 chiavi effettivamente
// usate nell'app (le altre 15 definite in precedenza non erano mai
// referenziate da nessun componente ed erano comunque mappate a offset
// sbagliati).
const ITEM_RECTS = {
  itemBox: { x: 34, width: 32 },
  star: { x: 315, width: 32 },
  spinyShell: { x: 479, width: 32 },
}

const getItemBackground = (itemKey) => {
  const rect = ITEM_RECTS[itemKey]
  if (!rect) return null
  const sizePct = (SHEET_WIDTH / rect.width) * 100
  const posPct = (rect.x / (SHEET_WIDTH - rect.width)) * 100
  // url(...) è obbligatorio: una stringa nuda nella shorthand "background"
  // non è un valore CSS valido per l'immagine, viene scartata in silenzio e
  // il div risulta vuoto (nessun errore in console, nessun img rotta visibile).
  return `url(${ITEMS_SPRITE}) ${posPct}% 0% / ${sizePct}% 100%`
}

// Gli item nello sprite sheet originale (asset di gioco MKDS) hanno un
// colore di sfondo bruciato nel frame (es. la stella su un riquadro blu, il
// guscio su un riquadro rosso). Si ritaglia il singolo frame su un canvas
// offscreen e si rende trasparente il colore dell'angolo (0,0) — quello di
// sfondo — con una tolleranza per l'anti-aliasing del GIF indicizzato.
// Risultato cachato in memoria: calcolato una sola volta per itemKey.
const CHROMA_KEY_TOLERANCE = 40
const transparentImageCache = new Map()
let spriteImagePromise = null

const loadSpriteImage = () => {
  if (!spriteImagePromise) {
    spriteImagePromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = ITEMS_SPRITE
    })
  }
  return spriteImagePromise
}

const getTransparentItemImage = async (itemKey) => {
  if (transparentImageCache.has(itemKey)) return transparentImageCache.get(itemKey)
  const rect = ITEM_RECTS[itemKey]
  if (!rect) return null

  const img = await loadSpriteImage()
  const canvas = document.createElement('canvas')
  canvas.width = rect.width
  canvas.height = SHEET_HEIGHT
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, rect.x, 0, rect.width, SHEET_HEIGHT, 0, 0, rect.width, SHEET_HEIGHT)

  const imageData = ctx.getImageData(0, 0, rect.width, SHEET_HEIGHT)
  const data = imageData.data
  const bgR = data[0]
  const bgG = data[1]
  const bgB = data[2]
  const toleranceSq = CHROMA_KEY_TOLERANCE * CHROMA_KEY_TOLERANCE
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bgR
    const dg = data[i + 1] - bgG
    const db = data[i + 2] - bgB
    if (dr * dr + dg * dg + db * db <= toleranceSq) {
      data[i + 3] = 0
    }
  }
  ctx.putImageData(imageData, 0, 0)

  const dataUrl = canvas.toDataURL('image/png')
  transparentImageCache.set(itemKey, dataUrl)
  return dataUrl
}

export { ITEMS_SPRITE, ITEM_RECTS, getItemBackground, getTransparentItemImage }
export default ITEMS_SPRITE
