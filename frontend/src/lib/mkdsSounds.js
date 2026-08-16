import { getCelebrationVolume, isCelebrationMuted } from '@/lib/celebrationSound'

const VOICE_VOLUME_MULTIPLIER = 2.0
const MAX_VOICE_DURATION = 2.0

const UI_SOUND_URLS = {
    confirm: new URL('../assets/sounds/mkds/ui/confirm.wav', import.meta.url).href,
    denied: new URL('../assets/sounds/mkds/ui/denied.wav', import.meta.url).href,
    select: new URL('../assets/sounds/mkds/ui/select.wav', import.meta.url).href,
    nextButton: new URL('../assets/sounds/mkds/ui/next_button.wav', import.meta.url).href,
    back: new URL('../assets/sounds/mkds/ui/back1.wav', import.meta.url).href,
    toggleOn: new URL('../assets/sounds/mkds/ui/toggle_on.wav', import.meta.url).href,
    toggleOff: new URL('../assets/sounds/mkds/ui/toggle_off.wav', import.meta.url).href,
    loading: new URL('../assets/sounds/mkds/ui/loading.wav', import.meta.url).href,
    startRace: new URL('../assets/sounds/mkds/ui/start_race.wav', import.meta.url).href,
    wfcCountdown: new URL('../assets/sounds/mkds/ui/wfc_countdown.wav', import.meta.url).href,
    wfcError: new URL('../assets/sounds/mkds/ui/wfc_error.wav', import.meta.url).href,
    courseDetermined: new URL('../assets/sounds/mkds/ui/wfc_coursedetermined.wav', import.meta.url).href,
    cupUnlocked: new URL('../assets/sounds/mkds/ui/character_cup_unlocked.wav', import.meta.url).href,
    prompt: new URL('../assets/sounds/mkds/ui/prompt1.wav', import.meta.url).href,
    balloonPop: new URL('../assets/sounds/mkds/ui/balloon_pop.wav', import.meta.url).href,
    balloonGet: new URL('../assets/sounds/mkds/ui/balloon_get.wav', import.meta.url).href,
    shineGet: new URL('../assets/sounds/mkds/ui/shine_get.wav', import.meta.url).href,
    shineAppear: new URL('../assets/sounds/mkds/ui/shine_appear.wav', import.meta.url).href,
}

const VOICE_GLOB = import.meta.glob('../assets/sounds/mkds/characters/**/*.wav', { query: '?url', import: 'default' })

// Esportata così l'admin (CharactersTab.jsx) può mostrare il nome esatto
// atteso dal verso audio prima di rinominare un personaggio — le chiavi
// sono l'unica fonte di verità per il match (resolveVoiceDir sotto).
export const MKDS_VOICE_NAME_MAP = {
    'Mario': 'mario',
    'Luigi': 'luigi',
    'Peach': 'peach',
    'Daisy': 'daisy',
    'Yoshi': 'yoshi',
    'Yoshi Rosso': 'yoshi',
    'Yoshi Blu': 'yoshi',
    'Yoshi Rosa': 'yoshi',
    'Yoshi Arancione': 'yoshi',
    'Yoshi Azzurro': 'yoshi',
    'Yoshi Giallo': 'yoshi',
    'Yoshi Nero': 'yoshi',
    'Yoshi Bianco': 'yoshi',
    'Wario': 'wario',
    'Waluigi': 'waluigi',
    'Donkey Kong': 'donkey_kong',
    'Bowser': 'bowser',
    'Toad': 'toad',
    'Shy Guy': 'shy_guy',
    'Shy Guy Blu': 'shy_guy',
    'Shy Guy Giallo': 'shy_guy',
    'Shy Guy Verde': 'shy_guy',
    'Shy Guy Rosa': 'shy_guy',
    'Shy Guy Azzurro': 'shy_guy',
    'Shy Guy Bianco': 'shy_guy',
    'Shy Guy Nero': 'shy_guy',
    'R.O.B.': 'rob',
    'Dry Bones': 'dry_bones',
    'Koopa Troopa': 'shy_guy',
    'Lemmy': 'shy_guy',
    'Larry': 'shy_guy',
    'Wendy': 'peach',
    'Toadette': 'toad',
    'Bowser Jr.': 'bowser',
    'Rosalina': 'peach',
    'Baby Mario': 'mario',
    'Baby Luigi': 'luigi',
    'Baby Peach': 'peach',
    'Baby Daisy': 'daisy',
    'Baby Rosalina': 'peach',
}

let audioCtx = null
let uiBuffers = {}
let uiLoaded = false
let uiLoadingPromise = null
let voiceBuffersByChar = {}
let voiceLoadPromises = {}

const getAudioCtx = () => {
    if (typeof window === 'undefined') return null
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return null
        audioCtx = new Ctx()
    }
    return audioCtx
}

export const unlockMkdsAudio = () => {
    if (audioCtx?.state === 'suspended') {
        audioCtx.resume()
    }
}

export const isMkdsUiLoaded = () => uiLoaded

export const preloadMkdsUISounds = async () => {
    if (uiLoaded || uiLoadingPromise) return uiLoadingPromise
    const ctx = getAudioCtx()
    if (!ctx) return

    uiLoadingPromise = Promise.all(
        Object.entries(UI_SOUND_URLS).map(async ([key, url]) => {
            try {
                const resp = await fetch(url)
                const arrayBuffer = await resp.arrayBuffer()
                uiBuffers[key] = await ctx.decodeAudioData(arrayBuffer)
            } catch {
                // silent fallback
            }
        })
    )

    try {
        await uiLoadingPromise
        uiLoaded = true
    } catch {
        // preload failed partially
    }
    return
}

export const preloadCharacterVoice = async (charDir) => {
    if (voiceBuffersByChar[charDir]) return
    if (voiceLoadPromises[charDir]) return voiceLoadPromises[charDir]

    const ctx = getAudioCtx()
    if (!ctx) return

    voiceLoadPromises[charDir] = (async () => {
        const entries = Object.entries(VOICE_GLOB).filter(([path]) => {
            const parts = path.replace(/\\/g, '/').split('/')
            return parts[parts.length - 2] === charDir
        })

        if (entries.length === 0) {
            voiceLoadPromises[charDir] = null
            return
        }

        const loadedBuffers = []
        for (const [, loader] of entries) {
            try {
                const url = await loader()
                const resp = await fetch(url)
                const arrayBuffer = await resp.arrayBuffer()
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
                if (audioBuffer.duration <= MAX_VOICE_DURATION) {
                    loadedBuffers.push(audioBuffer)
                }
            } catch (error) {
                // Un file che non si decodifica per questo personaggio passa
                // inosservato (skip silenzioso) finché non se ne accumulano
                // troppi e la voce risulta muta senza nessun indizio in
                // console: loggare qui rende diagnosticabile "perché questo
                // personaggio non ha mai voce" la prossima volta.
                console.warn(`[mkdsSounds] voce non decodificabile per "${charDir}"`, error)
            }
        }

        if (loadedBuffers.length > 0) {
            voiceBuffersByChar[charDir] = loadedBuffers
        }
    })()

    return voiceLoadPromises[charDir]
}

const resolveVoiceDir = (characterName) => {
    if (!characterName) return null
    const lowerName = characterName.toLowerCase()
    for (const [key, dir] of Object.entries(MKDS_VOICE_NAME_MAP)) {
        if (key.toLowerCase() === lowerName) return dir
    }
    return null
}

// Preload by-name, da chiamare in anticipo (es. all'apertura di un selettore
// personaggi) così playMkdsCharacterVoice trova già il buffer pronto invece
// di dover fare fetch+decode al momento del click — è quel fetch+decode che
// causava il ritardo percepito "scelgo il personaggio ma sento il verso solo
// dopo aver chiuso il menu".
export const preloadMkdsCharacterVoiceByName = (characterName) => {
    const dir = resolveVoiceDir(characterName)
    if (!dir) return
    preloadCharacterVoice(dir)
}

export const playMkdsCharacterVoice = async (characterName, { loop = false, loopGapMs = 4000 } = {}) => {
    if (isCelebrationMuted()) return null
    unlockMkdsAudio()
    const ctx = getAudioCtx()
    if (!ctx) return null

    const dir = resolveVoiceDir(characterName)
    if (!dir) return null

    if (!voiceBuffersByChar[dir]) {
        await preloadCharacterVoice(dir)
    }

    const clips = voiceBuffersByChar[dir]
    if (!clips || clips.length === 0) return null

    const vol = getCelebrationVolume()
    const clip = clips[Math.floor(Math.random() * clips.length)]

    let currentSource = null
    let stopped = false
    let timeoutId = null

    const play = () => {
        if (stopped) return
        currentSource = ctx.createBufferSource()
        currentSource.buffer = clip

        const gainNode = ctx.createGain()
        gainNode.gain.setValueAtTime(Math.min(vol * VOICE_VOLUME_MULTIPLIER, 1), ctx.currentTime)

        currentSource.connect(gainNode)
        gainNode.connect(ctx.destination)
        currentSource.start(0)

        if (loop) {
            currentSource.onended = () => {
                if (isCelebrationMuted()) { stopped = true; return }
                timeoutId = setTimeout(play, loopGapMs)
            }
        }
    }

    play()

    return {
        stop: () => {
            stopped = true
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
            }
            if (currentSource) {
                try { currentSource.stop() } catch { /* already stopped */ }
                currentSource = null
            }
        }
    }
}

const playUiBuffer = (key, opts = {}) => {
    if (isCelebrationMuted()) return
    const ctx = getAudioCtx()
    if (!ctx || !uiBuffers[key]) return

    const source = ctx.createBufferSource()
    source.buffer = uiBuffers[key]

    if (opts.loop) source.loop = true

    const gainNode = ctx.createGain()
    const vol = getCelebrationVolume()
    gainNode.gain.setValueAtTime(vol, ctx.currentTime)

    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(0)
    return source
}

// ─── UI sounds (used by UISoundContext / soundToast) ───
export const playMkdsConfirm = () => playUiBuffer('confirm')
export const playMkdsDenied = () => playUiBuffer('denied')
export const playMkdsSelect = () => playUiBuffer('select')
export const playMkdsNextButton = () => playUiBuffer('nextButton')
export const playMkdsBack = () => playUiBuffer('back')
export const playMkdsToggleOn = () => playUiBuffer('toggleOn')
export const playMkdsToggleOff = () => playUiBuffer('toggleOff')
export const playMkdsLoading = () => playUiBuffer('loading')
export const playMkdsStartRace = () => playUiBuffer('startRace')
export const playMkdsWfcCountdown = () => playUiBuffer('wfcCountdown')
export const playMkdsWfcError = () => playUiBuffer('wfcError')
export const playMkdsCourseDetermined = () => playUiBuffer('courseDetermined')
export const playMkdsCupUnlocked = () => playUiBuffer('cupUnlocked')
export const playMkdsPrompt = () => playUiBuffer('prompt')
export const playMkdsBalloonPop = () => playUiBuffer('balloonPop')
export const playMkdsBalloonGet = () => playUiBuffer('balloonGet')
export const playMkdsShineGet = () => playUiBuffer('shineGet')
export const playMkdsShineAppear = () => playUiBuffer('shineAppear')
