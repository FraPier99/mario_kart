# Integrazione Audio Mario Kart 8 Deluxe

## Download assets

19 ZIP da sounds.spriters-resource.com, URL pattern: `https://www.sounds-resource.com/media/assets/<category_id>/<asset_id>.zip?updated=<timestamp>`

### 4 Misc sound packs
| ZIP | Asset ID | Categoria | Files |
|-----|----------|-----------|-------|
| menu_sounds | 408048 | `405` | 82 |
| race_sounds | 408049 | `405` | 40 |
| common_sounds | 408050 | `405` | 86 |
| kart_engines | 436987 | `434` | 33 |

### 13 DLC character voice packs
| ZIP | Asset ID | Categoria | Files |
|-----|----------|-----------|-------|
| birdo | 441838 | `439` | 81 |
| diddy_kong | 447990 | `445` | 82 |
| funky_kong | 447991 | `445` | 81 |
| gold_mario | 433239 | `430` | 80 |
| inkling_boy | 406665 | `403` | 83 |
| inkling_girl | 406664 | `403` | 83 |
| kamek | 446731 | `444` | 106 |
| king_boo | 406663 | `403` | 74 |
| link | 433240 | `430` | 84 |
| pauline | 447993 | `445` | 82 |
| peachette | 447992 | `445` | 83 |
| petey_piranha | 446732 | `444` | 85 |
| wiggler | 446733 | `444` | 85 |

## Mappatura overlay sounds

| Nome MK8D | WAV sorgente | Descrizione |
|-----------|-------------|-------------|
| `engine_rumble.wav` | `Kart Engines/Body_K_Kpc/pSE_EG_LOOP_K_KPC.wav` | Standard Kart engine loop |
| `explosion_hit.wav` | `Common Sounds/SE_KT_CRASH.wav` | Crash/explosion |
| `checkered_swoosh.wav` | `Race Sounds/SE_RSLT_IN.wav` | Results screen transition in |
| `blue_shell_incoming.wav` | `Common Sounds/SE_ITM_ALARM.wav` | Warning alarm |
| `countdown_go.wav` | `Race Sounds/SE_RC_GO.wav` | Race start "GO!" |
| `countdown_beep.wav` | `Race Sounds/SE_RC_321.wav` | 3-2-1 countdown beeps |
| `winner_reveal.wav` | `Race Sounds/SE_TROPHY_APPEAR.wav` | Trophy appear |
| `victory_fanfare.wav` | `Race Sounds/SE_SHINE_GET.wav` | Shine Get jingle (victory fanfare) |

## File modificati

| File | Modifica |
|------|----------|
| `frontend/src/lib/celebrationSound.js` | Aggiunto `WAV_PATHS_MK8D` + 8 funzioni `playMk8d*` |
| `frontend/src/lib/mk8dSounds.js` | Nuovo: caricamento voci, mapping 64 personaggi, fallback MKDS |
| `frontend/src/config/celebrationConfig.js` | `mk8dConfig` usa path MK8D, `playMk8dCharacterVoice` |

## Mappatura voci personaggio

### 15 DLC → MK8D nativo
Birdo, Diddy Kong, Funky Kong, Gold Mario, Inkling Boy, Inkling Girl, Kamek, King Boo, Link, Pauline, Peachette, Petey Piranha, Wiggler, Dry Bones (via MKDS), Bowser Jr. (via MKDS)

### ~20 condivisi → fallback MKDS
Mario, Luigi, Peach, Daisy, Rosalina, Yoshi (tutte le varianti), Wario, Waluigi, Donkey Kong, Bowser, Toad, Toadette, Shy Guy (tutte le varianti), Koopa Troopa, Koopalings, Baby (Mario/Luigi/Peach/Daisy/Rosalina), Wendy

### ~13 senza voce → beep generico
Lakitu, Villager (M/F), Isabelle, Mii, Dry Bowser, Roy, Morton, Ludwig, Iggy, Metal Mario, Pink Gold Peach

## Nota tecnica: Vite glob

`import.meta.glob` in `mk8dSounds.js` viene risolto al startup del dev server. Se aggiungi nuovi WAV, riavvia Vite (`Ctrl+C` → `npm run dev`). Il glob non si aggiorna a caldo.

## Animazioni Overlay

L'overlay (`GlobalCelebrationOverlay.jsx`) ha 7 fasi con animazioni CSS definite in `frontend/src/index.css`:

| Fase | Animazioni |
|------|-----------|
| `idle` | Sparkles pulsanti, testo "Tocca/clicca" |
| `thankyou` | Frasi con fade-in scalato, `particle-fountain` continuo |
| `derapata` | Sfondo a scacchi scorrevole, trofeo con `trophy-spin`, `engine-rumble` + `screen-shake` su contenitore, `particle-fountain` continuo |
| `blueShell` | **NUOVO**: Spirale `blue-shell-intro` + testo "SPINY SHELL!" con `incoming-text` (2s), poi impatto `blue-shell-impact` + `screen-flash` + `burst-wave` + particelle blu |
| `countdown` | Roulette visiva: box `📦` con `item-roulette-cycle`/`item-roulette-exit`, `golden-reveal` giocatore, `avatar-reveal-ring`, `spark-trail` burst, `podium-column-grow` podio, `podium-spotlight`, `drumroll` prima del podio, `podium-glow-ring` sul 1° |
| `winnerReveal` | **NUOVO**: `rubber-stripe-1/2` banner "CAMPIONE"/"VINCITORE", `particle-fountain` dal basso, `confetti-spiral`, `victory-beam`, `star-power-rainbow`, `star-power-glow`, `avatar-reveal-ring`, `text-neon-pulse` |
| `winner` | **NUOVO**: `crown-drop` (più dinamico), `trophy-entrance` arricchito, `sparkle-trail`, `coin-sparkle`, `rainbow-cycle`, `crown-glow`, `text-glow-breathe` |

### Transizioni
Flash bianco breve (`animate-fade-out` 0.35s) tra ogni cambio fase.

### Effetti continui
`particle-fountain` con particelle bianche durante thankyou/derapata/blueShell.

### Particelle pre-calcolate
Tutte le particelle con `Math.random` sono generate in `useMemo` all'inizializzazione del componente, per evitare rigenerazioni a ogni render.

## MKDS Sprite / CDN (Aggiornato 21/06/2026)

### Circuiti via CDN

I circuiti MKDS non usano più asset locali. Le `image_url` in `app/data/circuits.py` puntano a CDN:
`https://textures.spriters-resource.com/media/asset_icons/{folder}/{id}.png`

Il mapping folder/id è in `FILENAME_TO_CDN` (circuits.py). `bootstrap.py` backfilla automaticamente.

File eliminati:
- `frontend/src/assets/images/mkds/circuits.js` (non serve più `import.meta.glob`)
- `frontend/src/assets/images/mkds/circuits/` (32 PNG)

### Asset sprite locali rimasti

```
frontend/src/assets/images/mkds/
├── items/
│   └── items.gif              # Items sprite strip (643×66, 18 item frame)
├── mugshots.png               # Mugshots strip (862×75, 12 personaggi)
├── items.js                   # getItemBackground(itemKey) helper
├── mugshots.js                # CHARACTER_OFFSETS[name] → frame index
└── (circuits/ e circuits.js)  # ✅ ELIMINATI — CDN ora
```

### Asset index files

| File | Descrizione |
|------|-------------|
| `frontend/src/assets/images/mkds/items.js` | Esporta `ITEMS_SPRITE`, `getItemBackground(itemKey)` (18 frame: `itemBox`, `spinyShell`, `star`, ...) |
| `frontend/src/assets/images/mkds/mugshots.js` | Esporta `MUGSHOTS_STRIP`, `CHARACTER_OFFSETS[name]` (12 personaggi MKDS) |
| `frontend/src/assets/images/index.js` | `getCircuitImage(circuit)` → `circuit?.image_url` (URL CDN diretto) |

### CircuitThumbnail — componente riutilizzabile

`frontend/src/components/common/CircuitThumbnail.jsx`:

- **Props**: `circuit` (oggetto con `name`, `image_url` URL CDN), `size`, `className`
- **Hover zoom** + tooltip via portal (mai clippato)
- **onError fallback**: se CDN offline, `buildCircuitPlaceholder(circuit.name)` via `imgError` state
- **Fallback**: `buildCircuitPlaceholder()` se circuito null

### GlobalCelebrationOverlay — sprite integration

| Emoji sostituita | Sprite | Fonte |
|-----------------|--------|-------|
| ⭐ | Star | `items.gif` frame 15 (`itemKey: "star"`) |
| 🌀 | Spiny Shell | `items.gif` frame 12 (`itemKey: "spinyShell"`) |
| 📦 | Item Box | `items.gif` frame 8 (`itemKey: "itemBox"`) |
| Faccia personaggio | Mugshot | `mugshots.png` → `CHARACTER_OFFSETS[name]` |

### Componenti che usano CircuitThumbnail

| Componente | size | Contesto |
|------------|------|----------|
| `CircuitPicker.jsx` | `lg` (32px) / `md` (28px) | trigger button + dropdown items |
| `PhaseCircuitsCard.jsx` | `xs` (16px) / `sm` (20px) | badge disponibili / usati |
| `RaceList.jsx` | `sm` (20px) | badge circuito nell'header gara |
| `PodiumDuelCard.jsx` | `xs` (16px) | storico gare spareggio |

### Per aggiungere sprite di un altro gioco

1. Creare `frontend/src/assets/images/<game_id>/` con sprite locali
2. Esportare helpers in `index.js` (es. `getCircuitImage`)
3. Aggiungere `image_url` nei dati seed del backend (`app/data/`)
4. Riavviare Vite per nuovi glob

## Estendere con altri giochi

1. Creare `frontend/src/assets/sounds/<game>/overlay/` con 8 WAV + `characters/` con voci
2. Aggiungere `WAV_PATHS_<GAME>` in `celebrationSound.js`
3. Creare `<game>Sounds.js` con mapping personaggi
4. Aggiungere config in `celebrationConfig.js`
5. Riavviare Vite per nuovi glob
