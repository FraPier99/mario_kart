import mugshotsPng from './mugshots.png'

// Striscia ritagliata a mano dal foglio sorgente ("Nintendo Switch - Mario
// Kart 8 Deluxe - Menus - Character Icons.png", griglia 12×7 di celle
// 129×129px, sfondo già trasparente) — ogni frame è la cella corrispondente
// con un inset di 1px per rimuovere la linea di griglia blu, quindi 128px
// di larghezza per frame, stessa tecnica di mkds/mugshots.js.
//
// Il foglio sorgente contiene più varianti/costumi di quante ne servano
// (colori extra di Yoshi/Tipo Timido/Inkling/Birdo, Cat Mario/Cat Peach,
// Mii amiibo, caselle "?" segnaposto) — per ogni gruppo di varianti è stato
// mappato solo il colore/costume che corrisponde a un nome esatto in
// app/data/mk8deluxe.py (MK8D_CHARACTERS). Verificato: i 64 nomi qui sotto
// coprono ESATTAMENTE le 64 voci di MK8D_CHARACTERS, nessuna esclusa e
// nessun duplicato. Per qualunque nome non presente in questa mappa,
// getMugshotBackground restituisce null e GlobalCelebrationOverlay ricade
// sulla foto individuale del personaggio (ch.img_url).
const MUGSHOTS_STRIP = mugshotsPng
const TOTAL_FRAMES = 64
const FRAME_PERCENT = 100 / TOTAL_FRAMES

const CHARACTER_OFFSETS = {
  'Mario': 0,
  'Luigi': 1,
  'Peach': 2,
  'Daisy': 3,
  'Rosalina': 4,
  'Yoshi': 5,
  'Yoshi Rosso': 6,
  'Yoshi Blu': 7,
  'Yoshi Azzurro': 8,
  'Yoshi Giallo': 9,
  'Yoshi Rosa': 10,
  'Yoshi Nero': 11,
  'Yoshi Bianco': 12,
  'Yoshi Arancione': 13,
  'Toad': 14,
  'Koopa Troopa': 15,
  'Tipo Timido': 16,
  'Tipo Timido Verde': 17,
  'Tipo Timido Blu': 18,
  'Tipo Timido Azzurro': 19,
  'Tipo Timido Giallo': 20,
  'Tipo Timido Rosa': 21,
  'Tipo Timido Nero': 22,
  'Tipo Timido Bianco': 23,
  'Lakitu': 24,
  'Toadette': 25,
  'King Boo': 26,
  'Baby Mario': 27,
  'Baby Luigi': 28,
  'Baby Peach': 29,
  'Baby Daisy': 30,
  'Baby Rosalina': 31,
  'Metal Mario': 32,
  'Gold Mario': 33,
  'Pink Gold Peach': 34,
  'Wario': 35,
  'Waluigi': 36,
  'Donkey Kong': 37,
  'Bowser': 38,
  'Tartosso': 39,
  'Bowser Jr.': 40,
  'Dry Bowser': 41,
  'Lemmy': 42,
  'Ludwig': 43,
  'Wendy': 44,
  'Larry': 45,
  'Iggy': 46,
  'Roy': 47,
  'Morton': 48,
  'Inkling Girl': 49,
  'Inkling Boy': 50,
  'Link': 51,
  'Villager (M)': 52,
  'Villager (F)': 53,
  'Isabelle': 54,
  'Birdo': 55,
  'Petey Piranha': 56,
  'Wiggler': 57,
  'Kamek': 58,
  'Peachette': 59,
  'Diddy Kong': 60,
  'Funky Kong': 61,
  'Pauline': 62,
  'Mii': 63,
}

const getMugshotBackground = (characterName) => {
  if (!characterName) return null
  const offset = CHARACTER_OFFSETS[characterName]
  if (offset === undefined) return null
  const xPos = offset * FRAME_PERCENT
  return `url(${MUGSHOTS_STRIP}) ${xPos}% 0% / ${TOTAL_FRAMES * 100}% 100%`
}

export { MUGSHOTS_STRIP, CHARACTER_OFFSETS, getMugshotBackground }
export default MUGSHOTS_STRIP
