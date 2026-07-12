import itemsGif from './items/items.gif'

const ITEMS_SPRITE = itemsGif
const SHEET_WIDTH = 643

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

export { ITEMS_SPRITE, ITEM_RECTS, getItemBackground }
export default ITEMS_SPRITE
