import {
  playWavLoop, WAV_PATHS, WAV_PATHS_MK8D,
  playBlueShellIncoming, playExplosionHit,
  playCountdownBeep, playCountdownGo,
  playWinnerReveal, playVictoryFanfare,
  playItemRouletteTick, playSuspenseHeartbeat, playCoinSound,
  playMk8dBlueShellIncoming, playMk8dExplosionHit,
  playMk8dCountdownBeep, playMk8dCountdownGo,
  playMk8dWinnerReveal, playMk8dVictoryFanfare,
} from '@/lib/celebrationSound'

import { playMkdsCharacterVoice } from '@/lib/mkdsSounds'
import { playMk8dCharacterVoice } from '@/lib/mk8dSounds'
import { COLORS, CONFETTI_COLORS } from '@/lib/constants'

const mkdsConfig = {
  gameId: 1,
  name: 'Mario Kart DS',

  phaseSounds: {
    thankyou: () => { playCountdownBeep() },
    derapata: () => playWavLoop(WAV_PATHS.engineRumble),
    blueShell: () => { playBlueShellIncoming() },
    winnerReveal: () => { playWinnerReveal() },
    winner: () => { playVictoryFanfare() },
  },

  characterVoice: {
    winnerReveal: async (name) => { return await playMkdsCharacterVoice(name) },
    winner: async (name) => playMkdsCharacterVoice(name, { loop: true, loopGapMs: 4000 }),
  },

  engineLoopPhase: 'derapata',
  engineLoopCleanupPhases: ['blueShell', 'countdown'],
  blueShellImpactSound: playExplosionHit,

  countdown: {
    rouletteTick: playItemRouletteTick,
    onReveal: async (charName) => { playCountdownBeep(); if (charName) return await playMkdsCharacterVoice(charName); return null },
    afterPodium: playCountdownGo,
    suspenseHeartbeat: playSuspenseHeartbeat,
  },

  coin: { sound: playCoinSound, interval: 3000 },

  theme: {
    colors: COLORS,
    confettiColors: CONFETTI_COLORS,
    canvas: {
      blueShell: ['#3498db', '#2980b9', '#1abc9c'],
      winnerReveal: ['#f59e0b', '#ffd700', '#ef4444', '#10b981'],
      winnerBurst: ['#f59e0b', '#ffd700'],
    },
  },
}

const mk8dConfig = {
  gameId: 2,
  name: 'Mario Kart 8 Deluxe',

  phaseSounds: {
    thankyou: () => { playCountdownBeep() },
    derapata: () => playWavLoop(WAV_PATHS_MK8D.engineRumble),
    blueShell: () => { playMk8dBlueShellIncoming() },
    winnerReveal: () => { playMk8dWinnerReveal() },
    winner: () => { playMk8dVictoryFanfare() },
  },

  characterVoice: {
    winnerReveal: async (name) => { return await playMk8dCharacterVoice(name) },
    winner: async (name) => playMk8dCharacterVoice(name, { loop: true, loopGapMs: 4000 }),
  },

  engineLoopPhase: 'derapata',
  engineLoopCleanupPhases: ['blueShell', 'countdown'],
  blueShellImpactSound: playMk8dExplosionHit,

  countdown: {
    rouletteTick: playItemRouletteTick,
    onReveal: async (charName) => { playMk8dCountdownBeep(); if (charName) return await playMk8dCharacterVoice(charName); return null },
    afterPodium: playMk8dCountdownGo,
    suspenseHeartbeat: playSuspenseHeartbeat,
  },

  coin: { sound: playCoinSound, interval: 3000 },

  theme: {
    colors: ['#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd', '#6d28d9', '#5b21b6', '#4c1d95', '#3b0764', '#9333ea', '#e9d5ff'],
    confettiColors: ['#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd', '#6d28d9', '#5b21b6', '#4c1d95', '#3b0764', '#9333ea', '#e9d5ff'],
    canvas: {
      blueShell: ['#8b5cf6', '#7c3aed', '#6d28d9'],
      winnerReveal: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#e9d5ff'],
      winnerBurst: ['#8b5cf6', '#a78bfa'],
    },
  },
}

const CONFIGS = {
  1: mkdsConfig,
  2: mk8dConfig,
}

export const getCelebrationConfig = (gameId) =>
  CONFIGS[gameId] ?? mkdsConfig
