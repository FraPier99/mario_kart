import itemsGif from './items/items.gif'

const ITEMS_SPRITE = itemsGif
const TOTAL_ITEMS = 18
const ITEM_PERCENT = 100 / TOTAL_ITEMS

const ITEM_OFFSETS = {
  mushroom: 0,
  tripleMushroom: 1,
  greenShell: 2,
  tripleGreenShells: 3,
  redShell: 4,
  tripleRedShells: 5,
  banana: 6,
  tripleBananas: 7,
  itemBox: 8,
  blooper: 9,
  bobomb: 10,
  megaMushroom: 11,
  spinyShell: 12,
  bulletBill: 13,
  thunderCloud: 14,
  star: 15,
  goldenMushroom: 16,
  chainChomp: 17,
}

const getItemBackground = (itemKey) => {
  const offset = ITEM_OFFSETS[itemKey]
  if (offset === undefined) return null
  const xPos = offset * ITEM_PERCENT
  // url(...) è obbligatorio: una stringa nuda nella shorthand "background"
  // non è un valore CSS valido per l'immagine, viene scartata in silenzio e
  // il div risulta vuoto (nessun errore in console, nessun img rotta visibile).
  return `url(${ITEMS_SPRITE}) ${xPos}% 0% / ${TOTAL_ITEMS * 100}% 100%`
}

export { ITEMS_SPRITE, ITEM_OFFSETS, getItemBackground }
export default ITEMS_SPRITE
