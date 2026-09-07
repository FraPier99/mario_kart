// Risoluzione degli sprite (mugshot personaggi, item box) per gioco, stesso
// principio di lib/overlayTexts.js per i testi: una cartella per gioco sotto
// assets/images/, scelta in base al game_id del torneo.
//
// A differenza dei testi (un file .json sempre presente per ogni gioco
// conosciuto, con default hardcoded di fallback), gli sprite sono PNG/GIF
// veri che vanno procurati a mano — oggi esiste solo `assets/images/mkds/`.
// `import.meta.glob` con pattern statico (richiesto da Vite: la parte
// variabile è solo il carattere jolly `*`, risolta a build time) restituisce
// SOLO i moduli che esistono davvero: se `assets/images/mk8d/mugshots.js`
// non c'è ancora, semplicemente non compare nella mappa — nessun errore di
// build, nessun import rotto. Aggiungere gli sprite di un nuovo gioco è
// quindi solo questione di aggiungere i file nella stessa forma di
// assets/images/mkds/{mugshots.js,items.js} — zero modifiche di codice qui.
import { resolveGameKey } from './overlayTexts'

const mugshotModules = import.meta.glob('../assets/images/*/mugshots.js', { eager: true })
const itemModules = import.meta.glob('../assets/images/*/items.js', { eager: true })

const extractGameKey = (path, filename) => {
    const match = path.match(new RegExp(`assets/images/([^/]+)/${filename}$`))
    return match?.[1] ?? null
}

const mugshotsByGame = Object.fromEntries(
    Object.entries(mugshotModules)
        .map(([path, mod]) => [extractGameKey(path, 'mugshots.js'), mod])
        .filter(([key]) => key)
)
const itemsByGame = Object.fromEntries(
    Object.entries(itemModules)
        .map(([path, mod]) => [extractGameKey(path, 'items.js'), mod])
        .filter(([key]) => key)
)

// `null` quando per quel gioco non esiste (ancora) uno sprite sheet — i
// punti d'uso in GlobalCelebrationOverlay.jsx già ricadono su un fallback
// pulito (icona/iniziale generica, o l'immagine del personaggio) quando le
// funzioni qui sotto non sono disponibili, esattamente come oggi già
// succede per un personaggio non presente in CHARACTER_OFFSETS.
export const getGameAssets = (gameId) => {
    const key = resolveGameKey(gameId)
    const mugshots = mugshotsByGame[key]
    const items = itemsByGame[key]
    return {
        MUGSHOTS_STRIP: mugshots?.MUGSHOTS_STRIP ?? null,
        CHARACTER_OFFSETS: mugshots?.CHARACTER_OFFSETS ?? {},
        getMugshotBackground: mugshots?.getMugshotBackground ?? null,
        getItemBackground: items?.getItemBackground ?? null,
        getTransparentItemImage: items?.getTransparentItemImage ?? null,
    }
}
