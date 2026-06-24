import mugshotsPng from './mugshots.png'

const MUGSHOTS_STRIP = mugshotsPng
const TOTAL_FRAMES = 12
const FRAME_PERCENT = 100 / TOTAL_FRAMES

const CHARACTER_OFFSETS = {
  'Mario': 0,
  'Luigi': 1,
  'Peach': 2,
  'Yoshi': 3,
  'Toad': 4,
  'Wario': 5,
  'Waluigi': 6,
  'Donkey Kong': 7,
  'Bowser': 8,
  'Daisy': 9,
  'Koopa Troopa': 10,
  'Shy Guy': 11,
}

const getMugshotBackground = (characterName) => {
  if (!characterName) return null
  const offset = CHARACTER_OFFSETS[characterName]
  if (offset === undefined) return null
  const xPos = offset * FRAME_PERCENT
  // vedi nota in items.js getItemBackground: serve url(...), una stringa nuda
  // non è un valore CSS valido per l'immagine e il div risulta vuoto.
  return `url(${MUGSHOTS_STRIP}) ${xPos}% 0% / ${TOTAL_FRAMES * 100}% 100%`
}

export { MUGSHOTS_STRIP, CHARACTER_OFFSETS, getMugshotBackground }
export default MUGSHOTS_STRIP
