import { getCelebrationVolume, isCelebrationMuted } from '@/lib/celebrationSound'

const VOICE_VOLUME_MULTIPLIER = 2.0
const MAX_VOICE_DURATION = 2.0

const VOICE_GLOB_MK8D = import.meta.glob('../assets/sounds/mk8d/characters/**/*.wav', { query: '?url', import: 'default' })
const VOICE_GLOB_MKDS = import.meta.glob('../assets/sounds/mkds/characters/**/*.wav', { query: '?url', import: 'default' })

const ITALIAN_TO_ENGLISH_MK8D = {
    // ── DLC characters (MK8D native voices) ──
    'Birdo': { dir: 'birdo', source: 'mk8d' },
    'Diddy Kong': { dir: 'diddy_kong', source: 'mk8d' },
    'Funky Kong': { dir: 'funky_kong', source: 'mk8d' },
    'Gold Mario': { dir: 'gold_mario', source: 'mk8d' },
    'Inkling Boy': { dir: 'inkling_boy', source: 'mk8d' },
    'Inkling Girl': { dir: 'inkling_girl', source: 'mk8d' },
    'Kamek': { dir: 'kamek', source: 'mk8d' },
    'King Boo': { dir: 'king_boo', source: 'mk8d' },
    'Link': { dir: 'link', source: 'mk8d' },
    'Pauline': { dir: 'pauline', source: 'mk8d' },
    'Peachette': { dir: 'peachette', source: 'mk8d' },
    'Petey Piranha': { dir: 'petey_piranha', source: 'mk8d' },
    'Wiggler': { dir: 'wiggler', source: 'mk8d' },
    'Dry Bones': { dir: 'dry_bones', source: 'mkds' },
    'Bowser Jr.': { dir: 'bowser', source: 'mkds' },

    // ── Shared characters (fallback to MKDS voices) ──
    'Mario': { dir: 'mario', source: 'mkds' },
    'Luigi': { dir: 'luigi', source: 'mkds' },
    'Peach': { dir: 'peach', source: 'mkds' },
    'Daisy': { dir: 'daisy', source: 'mkds' },
    'Rosalina': { dir: 'peach', source: 'mkds' },
    'Yoshi': { dir: 'yoshi', source: 'mkds' },
    'Yoshi Rosso': { dir: 'yoshi', source: 'mkds' },
    'Yoshi Blu': { dir: 'yoshi', source: 'mkds' },
    'Yoshi Rosa': { dir: 'yoshi', source: 'mkds' },
    'Yoshi Arancione': { dir: 'yoshi', source: 'mkds' },
    'Yoshi Azzurro': { dir: 'yoshi', source: 'mkds' },
    'Yoshi Giallo': { dir: 'yoshi', source: 'mkds' },
    'Yoshi Nero': { dir: 'yoshi', source: 'mkds' },
    'Yoshi Bianco': { dir: 'yoshi', source: 'mkds' },
    'Wario': { dir: 'wario', source: 'mkds' },
    'Waluigi': { dir: 'waluigi', source: 'mkds' },
    'Donkey Kong': { dir: 'donkey_kong', source: 'mkds' },
    'Bowser': { dir: 'bowser', source: 'mkds' },
    'Toad': { dir: 'toad', source: 'mkds' },
    'Toadette': { dir: 'toad', source: 'mkds' },
    'Shy Guy': { dir: 'shy_guy', source: 'mkds' },
    'Shy Guy Blu': { dir: 'shy_guy', source: 'mkds' },
    'Shy Guy Giallo': { dir: 'shy_guy', source: 'mkds' },
    'Shy Guy Verde': { dir: 'shy_guy', source: 'mkds' },
    'Shy Guy Rosa': { dir: 'shy_guy', source: 'mkds' },
    'Shy Guy Azzurro': { dir: 'shy_guy', source: 'mkds' },
    'Shy Guy Bianco': { dir: 'shy_guy', source: 'mkds' },
    'Shy Guy Nero': { dir: 'shy_guy', source: 'mkds' },
    'Koopa Troopa': { dir: 'shy_guy', source: 'mkds' },
    'Lemmy': { dir: 'shy_guy', source: 'mkds' },
    'Larry': { dir: 'shy_guy', source: 'mkds' },
    'Wendy': { dir: 'peach', source: 'mkds' },
    'Baby Mario': { dir: 'mario', source: 'mkds' },
    'Baby Luigi': { dir: 'luigi', source: 'mkds' },
    'Baby Peach': { dir: 'peach', source: 'mkds' },
    'Baby Daisy': { dir: 'daisy', source: 'mkds' },
    'Baby Rosalina': { dir: 'peach', source: 'mkds' },

    // ── New characters with no voice → null ──
    'Lakitu': null,
    'Villager (M)': null,
    'Villager (F)': null,
    'Isabelle': null,
    'Mii': null,
    'Dry Bowser': null,
    'Roy': null,
    'Morton': null,
    'Ludwig': null,
    'Iggy': null,
    'Metal Mario': null,
    'Pink Gold Peach': null,
}

let audioCtx = null
let voiceBuffersByChar = {}
let voiceLoadPromises = {}
let placeholderBuffer = null

const getPlaceholderBuffer = (ctx) => {
    if (placeholderBuffer) return placeholderBuffer
    const sampleRate = ctx.sampleRate
    const duration = 0.3
    const length = Math.floor(sampleRate * duration)
    const buffer = ctx.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        const freq = 880 + (t / duration) * 440
        const envelope = Math.max(0, 1 - t / duration)
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3
    }
    placeholderBuffer = buffer
    return buffer
}

const getAudioCtx = () => {
    if (typeof window === 'undefined') return null
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return null
        audioCtx = new Ctx()
    }
    return audioCtx
}

export const unlockMk8dAudio = () => {
    if (audioCtx?.state === 'suspended') {
        audioCtx.resume()
    }
}

const resolveVoiceDir = (characterName) => {
    if (!characterName) return null
    const lowerName = characterName.toLowerCase()
    for (const [key, value] of Object.entries(ITALIAN_TO_ENGLISH_MK8D)) {
        if (key.toLowerCase() === lowerName) return value
    }
    return null
}

export const preloadCharacterVoice = async (charName) => {
    const mapping = resolveVoiceDir(charName)
    if (!mapping) return

    const { dir, source } = mapping
    const key = `${source}:${dir}`
    if (voiceBuffersByChar[key]) return
    if (voiceLoadPromises[key]) return voiceLoadPromises[key]

    const ctx = getAudioCtx()
    if (!ctx) return

    const glob = source === 'mk8d' ? VOICE_GLOB_MK8D : VOICE_GLOB_MKDS

    voiceLoadPromises[key] = (async () => {
        const entries = Object.entries(glob).filter(([path]) => {
            const parts = path.replace(/\\/g, '/').split('/')
            return parts[parts.length - 2] === dir
        })

        if (entries.length === 0) {
            voiceLoadPromises[key] = null
            return
        }

        const loadedBuffers = []
        for (const [, loader] of entries) {
            try {
                const url = await loader()
                const resp = await fetch(url)
                if (!resp.ok) continue
                const arrayBuffer = await resp.arrayBuffer()
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
                if (audioBuffer.duration <= MAX_VOICE_DURATION) {
                    loadedBuffers.push(audioBuffer)
                }
            } catch {
                // skip bad files
            }
        }

        if (loadedBuffers.length > 0) {
            voiceBuffersByChar[key] = loadedBuffers
        }
    })()

    return voiceLoadPromises[key]
}

export const playMk8dCharacterVoice = async (characterName, { loop = false, loopGapMs = 4000 } = {}) => {
    if (isCelebrationMuted()) return null
    unlockMk8dAudio()
    const ctx = getAudioCtx()
    if (!ctx) return null

    const mapping = resolveVoiceDir(characterName)
    let clips = null
    if (mapping) {
        const { dir, source } = mapping
        const key = `${source}:${dir}`
        if (!voiceBuffersByChar[key]) {
            await preloadCharacterVoice(characterName)
        }
        clips = voiceBuffersByChar[key]
    }

    const vol = getCelebrationVolume()
    const clip = (clips && clips.length > 0)
        ? clips[Math.floor(Math.random() * clips.length)]
        : getPlaceholderBuffer(ctx)
    if (!clip) return null

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
