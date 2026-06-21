const VOLUME_KEY = 'kart_celebration_volume'
const MUTED_KEY = 'kart_celebration_muted'

let audioCtx = null
let unlocked = false

export const WAV_PATHS = {
    engineRumble: new URL('../assets/sounds/mkds/overlay/engine_rumble.wav', import.meta.url).href,
    explosionHit: new URL('../assets/sounds/mkds/overlay/explosion_hit.wav', import.meta.url).href,
    checkeredSwoosh: new URL('../assets/sounds/mkds/overlay/checkered_swoosh.wav', import.meta.url).href,
    blueShellIncoming: new URL('../assets/sounds/mkds/overlay/blue_shell_incoming.wav', import.meta.url).href,
    countdownGo: new URL('../assets/sounds/mkds/overlay/countdown_go.wav', import.meta.url).href,
    countdownBeep: new URL('../assets/sounds/mkds/overlay/countdown_beep.wav', import.meta.url).href,
    winnerReveal: new URL('../assets/sounds/mkds/overlay/winner_reveal.wav', import.meta.url).href,
    victoryFanfare: new URL('../assets/sounds/mkds/overlay/victory_fanfare.wav', import.meta.url).href,
}

export const WAV_PATHS_MK8D = {
    engineRumble: new URL('../assets/sounds/mk8d/overlay/engine_rumble.wav', import.meta.url).href,
    explosionHit: new URL('../assets/sounds/mk8d/overlay/explosion_hit.wav', import.meta.url).href,
    checkeredSwoosh: new URL('../assets/sounds/mk8d/overlay/checkered_swoosh.wav', import.meta.url).href,
    blueShellIncoming: new URL('../assets/sounds/mk8d/overlay/blue_shell_incoming.wav', import.meta.url).href,
    countdownGo: new URL('../assets/sounds/mk8d/overlay/countdown_go.wav', import.meta.url).href,
    countdownBeep: new URL('../assets/sounds/mk8d/overlay/countdown_beep.wav', import.meta.url).href,
    winnerReveal: new URL('../assets/sounds/mk8d/overlay/winner_reveal.wav', import.meta.url).href,
    victoryFanfare: new URL('../assets/sounds/mk8d/overlay/victory_fanfare.wav', import.meta.url).href,
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

export const getCelebrationVolume = () => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(VOLUME_KEY) : null
    const parsed = raw !== null ? Number(raw) : 0.5
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.5
}

export const setCelebrationVolume = (value) => {
    const clamped = Math.min(1, Math.max(0, Number(value) || 0))
    if (typeof window !== 'undefined') window.localStorage.setItem(VOLUME_KEY, String(clamped))
}

export const isCelebrationMuted = () => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(MUTED_KEY) === '1'
}

export const setCelebrationMuted = (muted) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
}

export const unlockCelebrationAudio = () => {
    const ctx = getAudioCtx()
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
    }
    const silent = new Audio()
    silent.volume = 0
    silent.play().catch(() => {})
    unlocked = true
}

if (typeof window !== 'undefined') {
    const onFirstInteraction = () => {
        unlockCelebrationAudio()
        window.removeEventListener('pointerdown', onFirstInteraction)
        window.removeEventListener('keydown', onFirstInteraction)
    }
    window.addEventListener('pointerdown', onFirstInteraction)
    window.addEventListener('keydown', onFirstInteraction)
}

const canPlay = () => {
    if (isCelebrationMuted()) return false
    const ctx = getAudioCtx()
    return Boolean(ctx) && (unlocked || ctx.state === 'running')
}

const masterVolume = () => getCelebrationVolume()

const playWav = (path) => {
    if (isCelebrationMuted()) return
    unlockCelebrationAudio()
    try {
        const audio = new Audio(path)
        audio.currentTime = 0
        audio.volume = getCelebrationVolume()
        audio.play().catch(() => {})
        audio.addEventListener('ended', () => {
            audio.remove()
        }, { once: true })
    } catch {
        // silent fallback
    }
}

export const playWavLoop = (path) => {
    if (isCelebrationMuted()) return null
    unlockCelebrationAudio()
    try {
        const audio = new Audio(path)
        audio.currentTime = 0
        audio.volume = getCelebrationVolume()
        audio.loop = true
        audio.play().catch(() => {})
        return audio
    } catch {
        return null
    }
}

export const stopWav = (audio) => {
    if (!audio) return
    try {
        audio.pause()
        audio.currentTime = 0
        audio.remove()
    } catch {
        // silent
    }
}

// ─── WAV-based overlay sounds (MKDS) ─────────────────────────────────

export const playBlueShellIncoming = () => playWav(WAV_PATHS.blueShellIncoming)
export const playCheckeredSwoosh = () => playWav(WAV_PATHS.checkeredSwoosh)
export const playCountdownBeep = () => playWav(WAV_PATHS.countdownBeep)
export const playCountdownGo = () => playWav(WAV_PATHS.countdownGo)
export const playEngineRumble = () => playWav(WAV_PATHS.engineRumble)
export const playExplosionHit = () => playWav(WAV_PATHS.explosionHit)
export const playVictoryFanfare = () => playWav(WAV_PATHS.victoryFanfare)
export const playWinnerReveal = () => playWav(WAV_PATHS.winnerReveal)

// ─── WAV-based overlay sounds (MK8D) ────────────────────────────────

export const playMk8dBlueShellIncoming = () => playWav(WAV_PATHS_MK8D.blueShellIncoming)
export const playMk8dCheckeredSwoosh = () => playWav(WAV_PATHS_MK8D.checkeredSwoosh)
export const playMk8dCountdownBeep = () => playWav(WAV_PATHS_MK8D.countdownBeep)
export const playMk8dCountdownGo = () => playWav(WAV_PATHS_MK8D.countdownGo)
export const playMk8dEngineRumble = () => playWav(WAV_PATHS_MK8D.engineRumble)
export const playMk8dExplosionHit = () => playWav(WAV_PATHS_MK8D.explosionHit)
export const playMk8dVictoryFanfare = () => playWav(WAV_PATHS_MK8D.victoryFanfare)
export const playMk8dWinnerReveal = () => playWav(WAV_PATHS_MK8D.winnerReveal)

// ─── Synthesized sounds (legacy / fallback) ─────────────────────────

const scheduleTone = (ctx, { freq, type = 'sine', start, duration, gain = 1, freqEnd }) => {
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, start + duration)
    const peak = gain * masterVolume()
    gainNode.gain.setValueAtTime(0, start)
    gainNode.gain.linearRampToValueAtTime(peak, start + Math.min(0.05, duration / 4))
    gainNode.gain.linearRampToValueAtTime(0, start + duration)
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + duration + 0.05)
}

const scheduleNoiseBurst = (ctx, { start, duration, gain = 1, filterFreq = 2000 }) => {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    const gainNode = ctx.createGain()
    const peak = gain * masterVolume()
    gainNode.gain.setValueAtTime(peak, start)
    gainNode.gain.linearRampToValueAtTime(0, start + duration)
    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(ctx.destination)
    noise.start(start)
    noise.stop(start + duration + 0.05)
}

export const playTireScreech = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    scheduleNoiseBurst(ctx, { start: now, duration: 0.35, gain: 0.4, filterFreq: 2800 })
    scheduleTone(ctx, { freq: 1200, freqEnd: 400, type: 'square', start: now, duration: 0.3, gain: 0.2 })
}

export const playPodiumFanfare = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
        scheduleTone(ctx, { freq, type: 'triangle', start: now + i * 0.14, duration: 0.32, gain: 0.45 })
    })
}

export const playBlueShellHit = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    scheduleNoiseBurst(ctx, { start: now, duration: 0.8, gain: 0.7, filterFreq: 400 })
    scheduleTone(ctx, { freq: 60, freqEnd: 20, type: 'sawtooth', start: now, duration: 0.6, gain: 0.6 })
    scheduleTone(ctx, { freq: 150, freqEnd: 40, type: 'square', start: now + 0.05, duration: 0.5, gain: 0.4 })
    scheduleNoiseBurst(ctx, { start: now + 0.2, duration: 0.4, gain: 0.3, filterFreq: 3000 })
}

export const playWinnerAnthem = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    const melody = [523.25, 659.25, 783.99, 659.25, 783.99, 1046.5]
    melody.forEach((freq, i) => {
        scheduleTone(ctx, { freq, type: 'triangle', start: now + i * 0.22, duration: 0.35, gain: 0.4 })
    })
    scheduleTone(ctx, { freq: 261.63, type: 'sine', start: now, duration: 1.5, gain: 0.2 })
    scheduleTone(ctx, { freq: 392, type: 'sine', start: now + 0.8, duration: 1.0, gain: 0.2 })
}

export const playMKCountdown = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    scheduleTone(ctx, { freq: 880, type: 'square', start: now, duration: 0.25, gain: 0.3 })
    scheduleTone(ctx, { freq: 660, type: 'square', start: now + 0.6, duration: 0.25, gain: 0.3 })
    scheduleTone(ctx, { freq: 440, type: 'square', start: now + 1.2, duration: 0.25, gain: 0.3 })
    scheduleTone(ctx, { freq: 1100, type: 'square', start: now + 1.9, duration: 0.5, gain: 0.4 })
}

export const playItemRouletteTick = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    const freq = 400 + Math.random() * 800
    scheduleTone(ctx, { freq, type: 'sine', start: now, duration: 0.05, gain: 0.12 })
}

export const playSuspenseHeartbeat = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    scheduleTone(ctx, { freq: 55, type: 'sine', start: now, duration: 0.25, gain: 0.4 })
    scheduleTone(ctx, { freq: 60, type: 'sine', start: now + 0.12, duration: 0.2, gain: 0.3 })
    scheduleTone(ctx, { freq: 55, type: 'sine', start: now + 0.6, duration: 0.25, gain: 0.4 })
    scheduleTone(ctx, { freq: 60, type: 'sine', start: now + 0.72, duration: 0.2, gain: 0.3 })
}

export const playStarPowerActivation = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((freq, i) => {
        scheduleTone(ctx, { freq, type: 'triangle', start: now + i * 0.1, duration: 0.2, gain: 0.3 })
        scheduleTone(ctx, { freq: freq * 2, type: 'sine', start: now + i * 0.1, duration: 0.15, gain: 0.1 })
    })
    scheduleNoiseBurst(ctx, { start: now + 0.3, duration: 0.8, gain: 0.15, filterFreq: 5000 })
}

export const playCoinSound = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    scheduleTone(ctx, { freq: 1760, type: 'sine', start: now, duration: 0.08, gain: 0.25 })
    scheduleTone(ctx, { freq: 2640, type: 'sine', start: now + 0.03, duration: 0.06, gain: 0.15 })
}

export const playVictoryReveal = () => {
    if (!canPlay()) return
    const ctx = getAudioCtx()
    const now = ctx.currentTime
    const chords = [
        [523.25, 659.25, 783.99],
        [698.46, 880, 1046.5],
        [783.99, 987.77, 1174.66],
        [1046.5, 1318.5, 1568],
    ]
    chords.forEach((chord, i) => {
        chord.forEach((freq) => {
            scheduleTone(ctx, { freq, type: 'triangle', start: now + i * 0.25, duration: 0.4, gain: 0.3 })
        })
    })
    scheduleTone(ctx, { freq: 261.63, type: 'sine', start: now, duration: 1.5, gain: 0.25 })
}
