import starPng from './items/star.png'
import spinyShellPng from './items/spinyShell.png'

// A differenza di mkds/items.js (un'unica striscia GIF indicizzata, sfondo
// pieno da rimuovere via chroma-key), qui ogni icona è già stata ritagliata
// dal foglio sorgente ("Nintendo Switch - Mario Kart 8 Deluxe -
// Miscellaneous - Item Icons.png", griglia 8×5 di celle 193×193px, sfondo
// GIÀ trasparente) in un proprio file PNG separato — niente canvas/chroma-key
// da fare qui, solo restituire l'URL importato.
//
// `itemBox` (il blocco "?") NON è presente in quel foglio sorgente (contiene
// solo le icone "risultato" — cosa si riceve — non il blocco stesso): finché
// non viene aggiunto un ritaglio `items/itemBox.png`, getItemBackground/
// getTransparentItemImage restituiscono null per quella chiave, e ItemSprite
// (GlobalCelebrationOverlay.jsx) già gestisce questo caso non mostrando
// alcuno sprite invece di rompersi.
const ITEM_IMAGES = {
    star: starPng,
    spinyShell: spinyShellPng,
}

const getItemBackground = (itemKey) => {
    const src = ITEM_IMAGES[itemKey]
    if (!src) return null
    return `url(${src}) center / contain no-repeat`
}

// Stessa firma async di mkds/items.js (usata da ItemSprite) — qui è già
// pronta all'uso, nessuna elaborazione da fare, ma resta una Promise per
// compatibilità con chi la chiama.
const getTransparentItemImage = async (itemKey) => ITEM_IMAGES[itemKey] ?? null

export { getItemBackground, getTransparentItemImage }
