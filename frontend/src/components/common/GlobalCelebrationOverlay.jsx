    import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
    import { Crown, Sparkles, Star, Trophy, Volume2, VolumeX, X } from 'lucide-react'
    import confetti from 'canvas-confetti'
    import { buildAvatarPlaceholder } from '@/lib/placeholders'
    import { CELEBRATION_DURATION } from '@/lib/constants'
    import {
        isCelebrationMuted,
        setCelebrationMuted,
        unlockCelebrationAudio,
        stopWav,
    } from '@/lib/celebrationSound'
    import { getCelebrationConfig } from '@/config/celebrationConfig'
    import { loadOverlayTexts } from '@/lib/overlayTexts'
    import { useAppData } from '@/context/AppDataContext'
    import { getItemBackground } from '@/assets/images/mkds/items'
    import { MUGSHOTS_STRIP, CHARACTER_OFFSETS } from '@/assets/images/mkds/mugshots'

    const GlobalCelebrationOverlay = ({ leader, standings, tournament, onClose, celebrationConfig: externalConfig }) => {
    const config = useMemo(
        () => externalConfig ?? getCelebrationConfig(tournament?.game_id),
        [externalConfig, tournament?.game_id]
    )
    const { charactersById } = useAppData()
    const charactersByIdRef = useRef(charactersById)
    const leaderCharacterId = leader?.lastCharacterId ?? leader?.favoriteCharacterId
    const engineLoopRef = useRef(null)
        const [phase, setPhase] = useState('idle')
        const [muted, setMuted] = useState(() => isCelebrationMuted())
        const [revealPlayer, setRevealPlayer] = useState(null)
        const [revealedPlayerIds, setRevealedPlayerIds] = useState(new Set())
        const [countdownMessage, setCountdownMessage] = useState(null)
        const [shellAnim, setShellAnim] = useState(null) // 'intro' | 'impact' | null
        const [overlayTexts, setOverlayTexts] = useState(null)
        const [isRouletteSpinning, setIsRouletteSpinning] = useState(false)
        const [drumrollActive, setDrumrollActive] = useState(false)
        const [showPhaseFlash, setShowPhaseFlash] = useState(false)
        const thankyouRef = useRef(null)
        const derapataRef = useRef(null)
        const blueShellRef = useRef(null)
        const countdownRef = useRef(null)
        const winnerRevealRef = useRef(null)
        const confettiIntervalRef = useRef(null)
        const rouletteIntervalRef = useRef(null)
        const heartbeatIntervalRef = useRef(null)
        const winnerVoiceRef = useRef(null)
        const countdownVoiceRef = useRef(null)
        const prevPhaseRef = useRef(phase)
        const flashTimersRef = useRef([])

        const ItemSprite = useCallback(({ itemKey, className, style }) => {
            const bg = getItemBackground(itemKey)
            if (!bg) return null
            return <div className={className} style={{ background: bg, backgroundRepeat: 'no-repeat', ...style }} />
        }, [])



        // Static animation arrays
        const starryBg = useMemo(() => Array.from({ length: 25 }).map((_, i) => ({
            key: i, left: Math.random() * 100, top: Math.random() * 100,
            size: 1.5 + Math.random() * 2.5, delay: Math.random() * 3, duration: 1.5 + Math.random() * 2.5,
        })), [])

        const confettiRain = useMemo(() => Array.from({ length: 70 }).map((_, i) => ({
            key: i, color: config.theme.confettiColors[i % config.theme.confettiColors.length],
            left: Math.random() * 100, delay: `${Math.random() * 8}s`,
            duration: `${2 + Math.random() * 3}s`, size: 4 + Math.random() * 7,
            isCircle: i % 3 === 0, angle: Math.random() * 360,
        })), [config.theme])

        const floatingElements = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
            key: i, left: 5 + Math.random() * 90, top: 20 + Math.random() * 60,
            delay: 0.5 + Math.random() * 6, duration: 3.5 + Math.random() * 2.5,
            size: 12 + Math.random() * 14, isCrown: i % 3 === 0, loop: i % 2 === 0,
        })), [])

        const lateBurstParticles = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
            key: i, color: config.theme.colors[i % config.theme.colors.length], angle: (i / 50) * 360,
            distance: 100 + Math.random() * 280, delay: `${i * 0.04 + 3.5}s`,
            size: 3 + Math.random() * 7, duration: 2 + Math.random() * 1.5, isStar: i % 3 === 0,
        })), [config.theme])

        const coinConfetti = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
            key: i, left: 10 + Math.random() * 80, delay: `${Math.random() * 3}s`,
            duration: `${1 + Math.random() * 1.2}s`, size: 14 + Math.random() * 8,
        })), [])

        const bgParticles = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
            key: i, left: 5 + Math.random() * 90,
            delay: `${Math.random() * 2}s`, duration: `${2 + Math.random() * 1.5}s`,
            fx: (Math.random() - 0.5) * 60,
        })), [])

        const blueShellParticles = useMemo(() => Array.from({ length: 16 }).map((_, i) => ({
            key: i, left: 50 + (Math.random() - 0.5) * 60,
            top: 50 + (Math.random() - 0.5) * 60,
            delay: `${i * 0.04}s`,
            duration: `${0.8 + Math.random() * 0.6}s`,
        })), [])

        const winnerFountainParticles = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
            key: i, left: 10 + Math.random() * 80,
            fx: `${(Math.random() - 0.5) * 80}px`,
            delay: `${i * 0.12}s`,
            duration: `${1.8 + Math.random() * 1.2}s`,
        })), [])

        const winnerSpiralParticles = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
            key: i,
            sx: `${(Math.random() - 0.5) * 160}px`,
            sy: `${-80 - Math.random() * 120}px`,
            delay: `${i * 0.08 + 0.3}s`,
            duration: `${1.2 + Math.random() * 0.8}s`,
        })), [])

        const winnerSparkleTrail = useMemo(() => Array.from({ length: 6 }).map((_, i) => ({
            key: i,
            tx: `${(Math.random() - 0.5) * 60}px`,
            ty: `${-30 - Math.random() * 50}px`,
            tx2: `${(Math.random() - 0.5) * 100}px`,
            ty2: `${-60 - Math.random() * 80}px`,
            delay: `${i * 0.2 + 0.5}s`,
            duration: `${1.5 + Math.random() * 0.8}s`,
        })), [])

        const countdownRevealBursts = useMemo(() => Array.from({ length: 8 }).map((_, i) => ({
            key: i, angle: i * 45, dist: 50 + Math.random() * 30,
            delay: `${i * 0.06}s`,
            duration: `${0.8 + Math.random() * 0.4}s`,
        })), [])

        // Sync charactersById ref for effect closures
        useEffect(() => { charactersByIdRef.current = charactersById }, [charactersById])

        // Lock body scroll
        useEffect(() => {
            document.body.style.overflow = 'hidden'
            return () => { document.body.style.overflow = '' }
        }, [])

        // Load overlay texts
        useEffect(() => {
            loadOverlayTexts(tournament?.game_id).then((texts) => setOverlayTexts(texts))
        }, [tournament?.game_id])

    // Sound effects per phase
    useEffect(() => {
        unlockCelebrationAudio()

        if (config.engineLoopCleanupPhases?.includes(phase)) {
            stopWav(engineLoopRef.current)
            engineLoopRef.current = null
        }

        if (config.phaseSounds[phase]) {
            const result = config.phaseSounds[phase]()
            if (result && config.engineLoopPhase === phase) {
                engineLoopRef.current = result
            }
        }

        if (phase === 'blueShell') {
            setShellAnim('intro')
        }

        if (config.characterVoice?.[phase] && leaderCharacterId && charactersByIdRef.current) {
            const c = charactersByIdRef.current.get(leaderCharacterId)
            if (c) {
                if (winnerVoiceRef.current?.stop) { winnerVoiceRef.current.stop(); winnerVoiceRef.current = null }
                ;(async () => {
                    const ctrl = await config.characterVoice[phase](c.name)
                    if (ctrl?.stop) winnerVoiceRef.current = ctrl
                })()
            }
        }
    }, [phase, config])

        // Canvas-confetti effects
        useEffect(() => {
            const canvas = config.theme.canvas
            if (phase === 'blueShell') {
                confetti({
                    particleCount: 80, spread: 120, origin: { y: 0.4 },
                    colors: canvas.blueShell,
                })
            }
            if (phase === 'winnerReveal') {
                confetti({
                    particleCount: 250, spread: 180, origin: { y: 0.4 },
                    colors: canvas.winnerReveal,
                })
                setTimeout(() => {
                    confetti({
                        particleCount: 150, spread: 140, origin: { y: 0.3 },
                        colors: canvas.winnerBurst,
                    })
                }, 600)
            }
            if (phase === 'winner') {
                const fire = () => {
                    confetti({
                        particleCount: 40, spread: 90, origin: { y: 0.2 },
                        colors: config.theme.confettiColors,
                    })
                    confetti({
                        particleCount: 20, spread: 60, origin: { y: 0.8, x: 0.2 },
                        colors: canvas.winnerBurst,
                    })
                    confetti({
                        particleCount: 20, spread: 60, origin: { y: 0.8, x: 0.8 },
                        colors: canvas.winnerBurst,
                    })
                    config.coin.sound()
                }
                fire()
                confettiIntervalRef.current = setInterval(fire, config.coin.interval)
            }
            return () => {
                if (confettiIntervalRef.current) {
                    clearInterval(confettiIntervalRef.current)
                    confettiIntervalRef.current = null
                }
            }
        }, [phase, config])

        // Phase transition flash
        useEffect(() => {
            if (prevPhaseRef.current !== phase) {
                if (prevPhaseRef.current !== 'idle') {
                    setShowPhaseFlash(true)
                    const t = setTimeout(() => setShowPhaseFlash(false), 350)
                    flashTimersRef.current.push(t)
                }
                prevPhaseRef.current = phase
            }
            return () => { flashTimersRef.current.forEach(clearTimeout); flashTimersRef.current = [] }
        }, [phase])

        // Phase transitions
        useEffect(() => {
            if (phase !== 'thankyou') return undefined
            thankyouRef.current = setTimeout(() => setPhase('derapata'), CELEBRATION_DURATION.THANKYOU_MS)
            return () => { if (thankyouRef.current) clearTimeout(thankyouRef.current) }
        }, [phase])

        useEffect(() => {
            if (phase !== 'derapata') return undefined
            derapataRef.current = setTimeout(() => setPhase('blueShell'), CELEBRATION_DURATION.DERAPATA_MS)
            return () => { if (derapataRef.current) clearTimeout(derapataRef.current) }
        }, [phase])

        useEffect(() => {
            if (phase !== 'blueShell') return undefined
            setShellAnim('intro')
            const impactTimer = setTimeout(() => {
                setShellAnim('impact')
                if (config.blueShellImpactSound) config.blueShellImpactSound()
            }, 2000)
            blueShellRef.current = setTimeout(() => {
                setShellAnim(null)
                setPhase('countdown')
            }, CELEBRATION_DURATION.BLUE_SHELL_MS)
            return () => {
                clearTimeout(impactTimer)
                if (blueShellRef.current) clearTimeout(blueShellRef.current)
            }
        }, [phase])

        useEffect(() => {
            if (phase !== 'winnerReveal') return undefined
            winnerRevealRef.current = setTimeout(() => setPhase('winner'), CELEBRATION_DURATION.WINNER_REVEAL_MS)
            return () => { if (winnerRevealRef.current) clearTimeout(winnerRevealRef.current) }
        }, [phase])

        // Roulette tick + visual
        const startRoulette = useCallback(() => {
            setIsRouletteSpinning(true)
            if (rouletteIntervalRef.current) clearInterval(rouletteIntervalRef.current)
            rouletteIntervalRef.current = setInterval(() => config.countdown.rouletteTick(), 90)
        }, [])

        const stopRoulette = useCallback(() => {
            setIsRouletteSpinning(false)
            if (rouletteIntervalRef.current) {
                clearInterval(rouletteIntervalRef.current)
                rouletteIntervalRef.current = null
            }
        }, [])

        // Countdown phase — player reveal logic with item roulette
        useEffect(() => {
            if (phase !== 'countdown') return
            const players = standings
            if (!players?.length) { setPhase('winnerReveal'); return }

            setRevealedPlayerIds(new Set())
            setCountdownMessage(null)
            setRevealPlayer(null)
            const timers = []
            const ROULETTE_MS = 1200
            const HOLD = 2200
            const STEP = ROULETTE_MS + HOLD + 500
            const PODIUM_ROULETTE = 1500
            const PODIUM_HOLD = 2800
            const PODIUM_STEP = PODIUM_ROULETTE + PODIUM_HOLD + 300

            timers.push(setTimeout(() => {
                setCountdownMessage(overlayTexts?.countdown?.start ?? 'Sveliamo la classifica...')
                setTimeout(() => setCountdownMessage(null), 2000)
            }, 500))

            const nonPodium = players.slice(3).reverse()
            nonPodium.forEach((player, i) => {
                const rouletteStart = 2500 + i * STEP
                timers.push(setTimeout(() => startRoulette(), rouletteStart))
                timers.push(setTimeout(() => {
                    stopRoulette()
                    const pos = players.indexOf(player) + 1
                    setRevealPlayer({ ...player, _position: pos })
                    setRevealedPlayerIds((prev) => new Set([...prev, player.playerId]))
                    const charId = player.lastCharacterId || player.favoriteCharacterId || player.favorite_character_id
                    const cn = charId && charactersByIdRef.current?.get(charId)?.name
                    if (countdownVoiceRef.current?.stop) { countdownVoiceRef.current.stop(); countdownVoiceRef.current = null }
                    config.countdown.onReveal(cn).then(ctrl => { countdownVoiceRef.current = ctrl ?? null })
                    setTimeout(() => setRevealPlayer(null), HOLD)
                }, rouletteStart + ROULETTE_MS))
            })

            const podiumTransition = 2500 + nonPodium.length * STEP + 1000
            timers.push(setTimeout(() => setDrumrollActive(true), podiumTransition + 1800))
            timers.push(setTimeout(() => setDrumrollActive(false), podiumTransition + 3300))
            timers.push(setTimeout(() => {
                setCountdownMessage(overlayTexts?.countdown?.transition ?? 'E ora il podio...')
                setTimeout(() => setCountdownMessage(null), 2000)
            }, podiumTransition))

            const podiumStart = podiumTransition + 2500
            const podium = [players[2], players[1], players[0]].filter(Boolean)
            podium.forEach((player, i) => {
                const rouletteStart = podiumStart + i * PODIUM_STEP
                timers.push(setTimeout(() => startRoulette(), rouletteStart))
                timers.push(setTimeout(() => {
                    stopRoulette()
                    const pos = players.indexOf(player) + 1
                    setRevealPlayer({ ...player, _position: pos })
                    const charId = player.lastCharacterId || player.favoriteCharacterId || player.favorite_character_id
                    const cn = charId && charactersByIdRef.current?.get(charId)?.name
                    if (countdownVoiceRef.current?.stop) { countdownVoiceRef.current.stop(); countdownVoiceRef.current = null }
                    config.countdown.onReveal(cn).then(ctrl => { countdownVoiceRef.current = ctrl ?? null })
                    if (i === podium.length - 1) {
                        setCountdownMessage(overlayTexts?.countdown?.championReveal ?? 'E il nostro Campione è...')
                        setTimeout(() => setCountdownMessage(null), 1500)
                        setTimeout(() => config.countdown.afterPodium(), 500)
                    }
                    setTimeout(() => setRevealPlayer(null), PODIUM_HOLD)
                    setTimeout(() => {
                        setRevealedPlayerIds((prev) => new Set([...prev, player.playerId]))
                    }, PODIUM_HOLD + 200)
                }, rouletteStart + PODIUM_ROULETTE))
            })

            // 1st place reveal → small confetti burst
            const firstDelay = podiumStart + (podium.length - 1) * PODIUM_STEP + PODIUM_ROULETTE
            timers.push(setTimeout(() => {
                confetti({
                    particleCount: 80, spread: 100, origin: { y: 0.4 },
                    colors: config.theme.canvas.winnerBurst,
                })
            }, firstDelay + 500))

            // Heartbeat suspense before winner reveal (last 2 podium seconds)
            const heartbeatStart = firstDelay + 1200
            timers.push(setTimeout(() => {
                config.countdown.suspenseHeartbeat()
                if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
                heartbeatIntervalRef.current = setInterval(() => config.countdown.suspenseHeartbeat(), 2200)
            }, heartbeatStart))

            const totalDuration = podiumStart + podium.length * PODIUM_STEP + 2000
            countdownRef.current = setTimeout(() => {
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current)
                    heartbeatIntervalRef.current = null
                }
                stopRoulette()
                setPhase('winnerReveal')
            }, totalDuration)

            return () => {
                setDrumrollActive(false)
                timers.forEach((t) => clearTimeout(t))
                if (countdownRef.current) clearTimeout(countdownRef.current)
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current)
                    heartbeatIntervalRef.current = null
                }
                stopRoulette()
            }
        }, [phase, standings, startRoulette, stopRoulette])

        const cleanupTimers = useCallback(() => {
            setIsRouletteSpinning(false)
            setDrumrollActive(false)
            setShowPhaseFlash(false)
            stopWav(engineLoopRef.current)
            engineLoopRef.current = null
            if (winnerVoiceRef.current) {
                winnerVoiceRef.current.stop()
                winnerVoiceRef.current = null
            }
            [thankyouRef, derapataRef, blueShellRef, countdownRef, winnerRevealRef].forEach((ref) => {
                if (ref.current) clearTimeout(ref.current)
            })
            if (confettiIntervalRef.current) {
                clearInterval(confettiIntervalRef.current)
                confettiIntervalRef.current = null
            }
            if (rouletteIntervalRef.current) {
                clearInterval(rouletteIntervalRef.current)
                rouletteIntervalRef.current = null
            }
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current)
                heartbeatIntervalRef.current = null
            }
        }, [])

        const close = useCallback(() => {
            cleanupTimers()
            onClose?.()
        }, [cleanupTimers, onClose])

        const skipToWinner = useCallback(() => {
            cleanupTimers()
            setRevealedPlayerIds(new Set(standings.map((p) => p.playerId)))
            setRevealPlayer(null)
            setCountdownMessage(null)
            setPhase('winner')
        }, [cleanupTimers, standings])

        if (!leader) return null

        return (
            <div
                className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in overflow-hidden"
                style={{
                    animation: phase === 'derapata' ? 'engine-rumble 0.08s infinite, screen-shake 0.12s infinite'
                        : phase === 'blueShell' && shellAnim === 'intro' ? 'screen-shake 0.1s infinite'
                            : undefined,
                    background: phase === 'blueShell'
                        ? 'radial-gradient(ellipse at center, rgba(41,128,185,0.3) 0%, rgba(0,0,0,0.95) 70%)'
                        : undefined,
                }}
            >
                {/* Volume toggle */}
                <button
                    onClick={() => {
                        unlockCelebrationAudio()
                        const next = !muted
                        setCelebrationMuted(next)
                        setMuted(next)
                    }}
                    className="absolute left-5 top-5 z-200 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/50 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
                    title={muted ? 'Attiva audio' : 'Disattiva audio'}
                >
                    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                {/* X button */}
                {(phase === 'countdown' || phase === 'winnerReveal' || phase === 'winner') && (
                    <button
                        onClick={phase === 'winner' ? close : skipToWinner}
                        className="absolute right-5 top-5 z-200 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/50 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
                        title={phase === 'winner' ? 'Chiudi' : 'Salta al vincitore'}
                    >
                        <X size={20} />
                    </button>
                )}

                {/* Phase transition flash */}
                {showPhaseFlash && (
                    <div className="absolute inset-0 z-50 pointer-events-none animate-fade-out"
                        style={{ background: 'white', animationDuration: '0.35s' }} />
                )}

                {/* Continuous background particles (thankyou/derapata/blueShell) */}
                {(phase === 'thankyou' || phase === 'derapata' || phase === 'blueShell') && bgParticles.map((p) => (
                    <div key={p.key} className="absolute pointer-events-none"
                        style={{
                            left: `${p.left}%`, bottom: '-5%',
                            animation: `particle-fountain ${p.duration}s ease-out both`,
                            animationDelay: p.delay, animationIterationCount: 'infinite',
                            '--fx': `${p.fx}px`,
                        }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    </div>
                ))}

                {/* Starry background */}
                {(phase === 'thankyou' || phase === 'derapata' || phase === 'blueShell' || phase === 'countdown' || phase === 'winnerReveal' || phase === 'winner') && starryBg.map((s) => (
                    <div key={s.key} className="absolute rounded-full bg-white pointer-events-none" style={{
                        left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size,
                        animation: `twinkle ${s.duration}s ease-in-out infinite`, animationDelay: `${s.delay}s`,
                    }} />
                ))}

                {/* Floating elements */}
                {(phase === 'thankyou' || phase === 'derapata') && floatingElements.map((el) => (
                    <div key={el.key} className="absolute pointer-events-none flex items-center justify-center" style={{
                        left: `${el.left}%`, top: `${el.top}%`, width: `${el.size * 1.5}px`, height: `${el.size * 1.5}px`,
                        animation: `${el.loop ? 'float' : 'drift-up'} ${el.duration}s ease-in-out ${el.loop ? 'infinite' : 'both'}`,
                        animationDelay: `${el.delay}s`,
                    }}>
                        {el.isCrown ? (
                            <span className="text-2xl">👑</span>
                        ) : (
                            <ItemSprite itemKey="star" className="w-full h-full" />
                        )}
                    </div>
                ))}

                {/* Confetti rain */}
                {(phase === 'winnerReveal' || phase === 'winner') && confettiRain.map((c) => (
                    <div key={c.key} className="absolute top-0 pointer-events-none z-4" style={{
                        left: `${c.left}%`, width: c.size, height: c.isCircle ? c.size : c.size * 2,
                        background: c.color, borderRadius: c.isCircle ? '50%' : '2px',
                        animation: `confetti-fall ${c.duration} linear both`, animationDelay: c.delay,
                        transform: `rotate(${c.angle}deg)`,
                    }} />
                ))}

                {/* Late burst particles */}
                {phase === 'winnerReveal' && lateBurstParticles.map((p) => (
                    <div key={p.key} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-3 pointer-events-none" style={{
                        animation: `burst-particle ${p.duration}s ease-out both`, animationDelay: p.delay,
                    }}>
                        <div style={{
                            width: p.size, height: p.size, background: p.color,
                            borderRadius: p.isStar ? '2px' : '50%',
                            clipPath: p.isStar ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : undefined,
                            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                            transform: `rotate(${p.angle}deg) translateX(${p.distance}px)`,
                        }} />
                    </div>
                ))}

                {/* === IDLE PHASE === */}
                {phase === 'idle' && (
                    <div
                        className="relative z-20 flex flex-col items-center justify-center gap-6 text-center min-h-[60vh] w-full cursor-pointer select-none"
                        onClick={() => { unlockCelebrationAudio(); setPhase('thankyou') }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { unlockCelebrationAudio(); setPhase('thankyou') } }}
                        tabIndex={0}
                        role="button"
                        aria-label="Inizia celebrazione"
                    >
                        <div className="animate-bounce-in">
                            <Sparkles size={64} className="text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]" />
                        </div>
                        <p className="text-2xl md:text-4xl font-black uppercase tracking-widest text-white animate-pulse">
                            Tocca / clicca per iniziare
                        </p>
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-white/40">
                            {tournament?.name ?? ''}
                        </p>
                    </div>
                )}

                {/* === THANK YOU PHASE === */}
                {phase === 'thankyou' && (
                    <div className="relative z-20 flex flex-col items-center gap-6 text-center max-w-xl mx-auto px-6">
                        <div className="animate-bounce-in">
                            <Sparkles size={48} className="text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]" />
                        </div>
                        {(overlayTexts?.thankyou ?? `Grazie a tutti i partecipanti!`).split(/[.!]\s*/).filter(Boolean).map((sentence, i) => (
                            <p key={i} className="text-base md:text-lg leading-relaxed text-white/80 animate-fade-in" style={{
                                animationDelay: `${i * 1.8}s`, animationFillMode: 'both',
                            }}>
                                {sentence.endsWith('.') ? sentence : sentence + '.'}
                            </p>
                        ))}
                    </div>
                )}

                {/* === DERAPATA PHASE === */}
                {phase === 'derapata' && (
                    <div className="relative z-20 flex flex-col items-center gap-6 text-center">
                        {/* Checkered flag background */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
                            style={{
                                backgroundImage: 'repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%)',
                                backgroundSize: '40px 40px',
                                animation: 'checkered-scroll 1.5s linear infinite',
                            }}
                        />
                        <p className="text-sm font-black uppercase tracking-[0.4em] text-amber-400 animate-fade-in">
                            {(overlayTexts?.derapata ?? '{name} è giunto al termine').replace('{name}', tournament?.name ?? 'Il torneo')}
                        </p>
                        <div className="animate-bounce-in">
                            <Trophy size={80} className="text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.8)]"
                                style={{ animation: 'trophy-spin 1.5s ease-out both' }} />
                        </div>
                        <p className="text-lg md:text-2xl font-black uppercase tracking-widest text-white/70 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                            E il vincitore è...
                        </p>
                    </div>
                )}

                {/* === BLUE SHELL PHASE === */}
                {phase === 'blueShell' && (
                    <div className="relative z-20 flex flex-col items-center justify-center gap-6 text-center min-h-[60vh]">
                        {/* Spiny shell intro */}
                        {shellAnim === 'intro' && (
                            <div className="flex flex-col items-center gap-6">
                                <div className="text-8xl md:text-9xl animate-blue-shell-intro drop-shadow-[0_0_50px_rgba(52,152,219,0.9)] flex items-center justify-center">
                                    <ItemSprite itemKey="spinyShell" className="h-24 w-16 md:h-28 md:w-20" />
                                </div>
                                <p className="text-2xl md:text-4xl font-black uppercase tracking-widest text-blue-400 animate-incoming-text drop-shadow-[0_0_20px_rgba(52,152,219,0.6)]">
                                    SPINY SHELL!
                                </p>
                            </div>
                        )}
                        {/* Impact overlay */}
                        {shellAnim === 'impact' && (
                            <div className="absolute inset-0 z-25 pointer-events-none"
                                style={{ animation: 'screen-flash 1.2s ease-out both' }}>
                                <div className="absolute inset-0 bg-blue-500/20" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-96 h-96 rounded-full bg-blue-400/30 blur-3xl"
                                        style={{ animation: 'glow-expand 1s ease-out both' }} />
                                </div>
                                {/* Shell explosion */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <ItemSprite itemKey="spinyShell" className="h-24 w-16 animate-blue-shell-impact" />
                                </div>
                                {/* Burst wave rings */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-64 h-64 rounded-full border-4 border-blue-400/40 animate-burst-wave" />
                                    <div className="w-96 h-96 rounded-full border-2 border-blue-300/20 animate-burst-wave"
                                        style={{ animationDelay: '0.15s' }} />
                                    <div className="w-128 h-128 rounded-full border border-blue-200/10 animate-burst-wave"
                                        style={{ animationDelay: '0.3s' }} />
                                </div>
                                {/* Blue particles */}
                                {blueShellParticles.map((p) => (
                                    <div key={p.key} className="absolute pointer-events-none"
                                        style={{
                                            left: `${p.left}%`,
                                            top: `${p.top}%`,
                                            animation: `burst-particle ${p.duration}s ease-out both`,
                                            animationDelay: p.delay,
                                        }}>
                                        <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* === COUNTDOWN PHASE === */}
                {phase === 'countdown' && (
                    <div className="relative z-20 flex flex-col items-center gap-4 text-center w-full max-w-2xl mx-auto px-4">
                        <p className="text-sm font-black uppercase tracking-[0.4em] text-amber-400">Classifica finale</p>

                        {/* Visual item roulette */}
                        {isRouletteSpinning && !revealPlayer && !countdownMessage && (
                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex items-center justify-center animate-item-roulette-cycle drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]">
                                        <ItemSprite itemKey="itemBox" className="h-20 w-12 md:h-24 md:w-14" />
                                    </div>
                                    <p className="text-lg font-black uppercase tracking-widest text-amber-400/70 animate-suspense-pulse">
                                        In arrivo...
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Drumroll bar before podium */}
                        {drumrollActive && (
                            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                                <div className="w-full max-w-md">
                                    <div className="h-2 rounded-full bg-gradient-to-r from-amber-500/0 via-amber-500/60 to-amber-500/0 animate-drumroll"
                                        style={{ transformOrigin: 'center' }} />
                                    <p className="mt-3 text-base font-black uppercase tracking-[0.3em] text-amber-400/50 animate-text-show-cycle text-center">
                                        Rullo di tamburi...
                                    </p>
                                </div>
                            </div>
                        )}

                        {countdownMessage && !revealPlayer && (
                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                <p className="text-2xl md:text-4xl font-black uppercase tracking-widest text-white animate-fade-in"
                                    style={{ animation: 'text-glow-breathe 3.6s ease-in-out infinite' }}>
                                    {countdownMessage}
                                </p>
                            </div>
                        )}
                        {revealPlayer && (
                            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                <div className="flex flex-col items-center gap-4" style={{ animation: 'golden-reveal 1.1s ease-out both' }}>
                                    <div className="relative">
                                        <div className="rounded-3xl animate-avatar-reveal-ring">
                                            <img src={revealPlayer.img_url || buildAvatarPlaceholder(revealPlayer.nickname)}
                                                alt={revealPlayer.nickname}
                                                className="h-36 w-36 rounded-3xl object-cover ring-4 ring-amber-400 shadow-2xl will-change-transform"
                                                style={{ animation: 'glow-pulse 2.2s ease-in-out infinite' }} />
                                        </div>
                                        {(() => {
                                            const cid = revealPlayer.lastCharacterId || revealPlayer.favoriteCharacterId || revealPlayer.favorite_character_id
                                            const ch = cid && charactersByIdRef.current?.get(cid)
                                            if (!ch) return null
                                            const charIdx = CHARACTER_OFFSETS[ch.name]
                                            if (charIdx !== undefined) {
                                                const total = Object.keys(CHARACTER_OFFSETS).length
                                                const xPct = (charIdx / total) * 100
                                                return (
                                                    <div className="absolute -bottom-2 -right-2 h-14 w-14 rounded-xl border-2 border-amber-400 overflow-hidden bg-gray-900 shadow-lg ring-2 ring-amber-400/50"
                                                        style={{
                                                            backgroundImage: `url(${MUGSHOTS_STRIP})`,
                                                            backgroundPosition: `${xPct}% 0%`,
                                                            backgroundSize: `${total * 100}% 100%`,
                                                            backgroundRepeat: 'no-repeat',
                                                        }} />
                                                )
                                            }
                                            return ch?.img_url ? (
                                                <div className="absolute -bottom-2 -right-2 h-14 w-14 rounded-xl border-2 border-amber-400 overflow-hidden bg-gray-900 shadow-lg ring-2 ring-amber-400/50">
                                                    <img src={ch.img_url} alt={ch.name} className="h-full w-full object-cover" />
                                                </div>
                                            ) : null
                                        })()}
                                        <Star size={18} className="absolute -top-1 -right-1 text-yellow-300"
                                            style={{ animation: 'sparkle-explode 1.5s ease-out infinite' }} />
                                        {/* Sparkle burst particles on reveal */}
                                        {countdownRevealBursts.map((p) => (
                                            <div key={p.key} className="absolute pointer-events-none"
                                                style={{
                                                    left: '50%', top: '50%',
                                                    animation: `spark-trail ${p.duration}s ease-out both`,
                                                    animationDelay: p.delay,
                                                }}>
                                                <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.8)]"
                                                    style={{
                                                        transform: `rotate(${p.angle}deg) translateX(${p.dist}px)`,
                                                    }} />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-3xl font-black uppercase tracking-widest text-white drop-shadow-[0_2px_16px_rgba(245,158,11,0.6)]">
                                        {revealPlayer.nickname}
                                    </p>
                                    <p className="text-xl font-black text-amber-300 uppercase tracking-widest">
                                        {revealPlayer._position ?? ''}° Posto
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-end justify-center gap-3 mt-4 w-full" style={{ minHeight: '200px' }}>
                            {[1, 0, 2].map((standingIndex) => {
                                const player = standings?.[standingIndex]
                                if (!player) return <div key={`empty-${standingIndex}`} className="w-28" />
                                const position = standingIndex + 1
                                const isRevealed = revealedPlayerIds.has(player.playerId)
                                if (!isRevealed) return <div key={player.playerId} className="w-28" />
                                const heights = { 1: 'h-40', 2: 'h-32', 3: 'h-28' }
                                const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
                                const medalsLabel = { 1: '1°', 2: '2°', 3: '3°' }
                                const bgColors = {
                                    1: 'linear-gradient(180deg, rgba(245,158,11,0.5) 0%, rgba(245,158,11,0.15) 100%)',
                                    2: 'linear-gradient(180deg, rgba(192,192,192,0.35) 0%, rgba(192,192,192,0.08) 100%)',
                                    3: 'linear-gradient(180deg, rgba(205,127,50,0.3) 0%, rgba(205,127,50,0.08) 100%)',
                                }
                                const borderColors = { 1: '#f59e0b', 2: '#c0c0c0', 3: '#cd7f32' }
                                return (
                                    <div key={player.playerId} className="flex flex-col items-center gap-1.5" style={{ animation: 'fade-in 0.5s ease-out both' }}>
                                        <div className="flex flex-col items-center" style={{ animation: 'podium-pop-in 0.6s ease-out both' }}>
                                            <img src={player.img_url || buildAvatarPlaceholder(player.nickname)}
                                                alt={player.nickname}
                                                className="h-12 w-12 rounded-xl object-cover ring-2 shadow-lg will-change-transform"
                                                style={{ borderColor: borderColors[position] }} />
                                            <p className="mt-1.5 max-w-22.5 truncate text-xs font-black uppercase tracking-wide text-white">
                                                {player.nickname}
                                            </p>
                                        </div>
                                        <div className={`w-28 origin-bottom ${heights[position]} rounded-t-2xl flex flex-col items-center justify-center relative overflow-hidden will-change-transform`}
                                            style={{
                                                borderTop: `3px solid ${borderColors[position]}`,
                                                background: bgColors[position],
                                                boxShadow: position === 1
                                                    ? '0 0 40px rgba(245,158,11,0.4), 0 0 80px rgba(245,158,11,0.15), inset 0 0 30px rgba(245,158,11,0.1)'
                                                    : `0 0 20px ${borderColors[position]}33, inset 0 0 15px ${borderColors[position]}11`,
                                                animation: 'podium-column-grow 0.8s ease-out both',
                                            }}>
                                            {position === 1 && (
                                                <div className="absolute inset-0 rounded-t-2xl pointer-events-none will-change-transform"
                                                    style={{ animation: 'podium-glow-ring 2s ease-in-out infinite' }} />
                                            )}
                                            {position <= 3 && (
                                                <div className="absolute inset-0 pointer-events-none opacity-60"
                                                    style={{ animation: 'podium-spotlight 1.2s ease-out both', transformOrigin: 'top' }} />
                                            )}
                                            <span className="relative z-10 text-3xl will-change-transform"
                                                style={{ animation: 'podium-pop-in 0.65s ease-out both', animationDelay: '0.15s' }}>
                                                {medals[position]}
                                            </span>
                                            <p className="relative z-10 mt-1 text-[11px] font-black uppercase tracking-wider text-white/70 will-change-transform"
                                                style={{ animation: 'fade-in 0.65s ease-out both', animationDelay: '0.3s' }}>
                                                {player.points ?? 0} PT
                                            </p>
                                        </div>
                                        <p className="text-sm font-black" style={{ color: borderColors[position] }}>
                                            {medalsLabel[position]}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                        {standings?.length > 3 && (
                            <div className="w-full max-w-md space-y-1.5 mt-3">
                                {standings.slice(3).map((player, i) => {
                                    const position = i + 4
                                    const isRevealed = revealedPlayerIds.has(player.playerId)
                                    if (!isRevealed) return null
                                    return (
                                        <div key={player.playerId}
                                            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-2 will-change-transform"
                                            style={{ animation: 'slide-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
                                            <span className="text-sm font-black text-amber-400/60 w-6">#{position}</span>
                                            <img src={player.img_url || buildAvatarPlaceholder(player.nickname)}
                                                alt={player.nickname}
                                                className="h-6 w-6 rounded-lg object-cover ring-1 ring-white/10" />
                                            <span className="text-sm font-bold text-white/80 flex-1 text-left truncate">{player.nickname}</span>
                                            <span className="text-xs text-amber-300/60 font-black">{player.points ?? 0} PT</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* === WINNER REVEAL PHASE === */}
                {phase === 'winnerReveal' && (
                    <div className="relative z-20 flex flex-col items-center gap-6 text-center">
                        {/* Rubber stripe banners */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <div className="absolute top-1/4 -left-2 h-16 w-64 animate-rubber-stripe-1">
                                <div className="h-full w-full bg-gradient-to-r from-amber-500/80 via-yellow-400/60 to-transparent flex items-center pl-6"
                                    style={{ clipPath: 'polygon(0 0, 100% 0, 92% 100%, 0 100%)' }}>
                                    <span className="text-lg font-black uppercase tracking-widest text-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                                        <Sparkles size={16} className="inline mr-2" />CAMPIONE
                                    </span>
                                </div>
                            </div>
                            <div className="absolute bottom-1/4 -right-2 h-16 w-64 animate-rubber-stripe-2">
                                <div className="h-full w-full bg-gradient-to-l from-amber-500/80 via-yellow-400/60 to-transparent flex items-center justify-end pr-6"
                                    style={{ clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)' }}>
                                    <span className="text-lg font-black uppercase tracking-widest text-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                                        VINCITORE <Sparkles size={16} className="inline ml-2" />
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Particle fountain from bottom */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {winnerFountainParticles.map((p) => (
                                <div key={p.key} className="absolute bottom-0 pointer-events-none"
                                    style={{
                                        left: `${p.left}%`,
                                        animation: `particle-fountain ${p.duration}s ease-out both`,
                                        animationDelay: p.delay,
                                        '--fx': p.fx,
                                    }}>
                                    <div className="w-1.5 h-1.5 rounded-full"
                                        style={{
                                            background: config.theme.colors[p.key % config.theme.colors.length],
                                            boxShadow: `0 0 6px ${config.theme.colors[p.key % config.theme.colors.length]}`,
                                        }} />
                                </div>
                            ))}
                        </div>

                        {/* Victory beams */}
                        {[0, 30, 60, 90, 120, 150].map((angle) => (
                            <div key={angle} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div style={{
                                    width: '200%', height: '3px',
                                    background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.35), transparent)',
                                    transform: `rotate(${angle}deg)`,
                                    animation: 'victory-beam 1.5s ease-out both',
                                    animationDelay: `${angle * 0.02}s`,
                                }} />
                            </div>
                        ))}

                        {/* Rainbow glow ring around winner */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-72 h-72 md:w-96 md:h-96 rounded-full opacity-30"
                                style={{ animation: 'star-power-rainbow 0.8s linear infinite', filter: 'blur(30px)' }} />
                        </div>

                        {/* Confetti spiral particles */}
                        <div className="absolute inset-0 pointer-events-none">
                            {winnerSpiralParticles.map((p) => (
                                <div key={p.key} className="absolute top-1/2 left-1/2"
                                    style={{
                                        '--sx': p.sx,
                                        '--sy': p.sy,
                                        animation: `confetti-spiral ${p.duration}s ease-out both`,
                                        animationDelay: p.delay,
                                    }}>
                                    <div className="w-2 h-2 rounded-full"
                                        style={{
                                            background: config.theme.confettiColors[p.key % config.theme.confettiColors.length],
                                        }} />
                                </div>
                            ))}
                        </div>

                        <div className="relative animate-bounce-in" style={{ animation: 'star-power-rainbow 1.2s linear infinite' }}>
                            <div className="animate-avatar-reveal-ring rounded-3xl">
                                <img src={leader.img_url || buildAvatarPlaceholder(leader.nickname ?? 'Campione')}
                                    alt={leader.nickname}
                                    className="h-36 w-36 md:h-44 md:w-44 rounded-3xl object-cover ring-4 ring-amber-400 shadow-2xl will-change-transform"
                                    style={{
                                        animation: 'star-power-glow 1.2s ease-in-out infinite, glow-expand 1.5s ease-out both',
                                    }}
                                />
                            </div>
                            {(() => {
                                const cid = leader.lastCharacterId || leader.favoriteCharacterId
                                const ch = cid && charactersByIdRef.current?.get(cid)
                                if (!ch) return null
                                const charIdx = CHARACTER_OFFSETS[ch.name]
                                if (charIdx !== undefined) {
                                    const total = Object.keys(CHARACTER_OFFSETS).length
                                    const xPct = (charIdx / total) * 100
                                    return (
                                        <div className="absolute -bottom-2 -right-2 h-14 w-14 md:h-16 md:w-16 rounded-xl border-2 border-amber-400 overflow-hidden bg-gray-900 shadow-lg ring-2 ring-amber-400/50"
                                            style={{
                                                backgroundImage: `url(${MUGSHOTS_STRIP})`,
                                                backgroundPosition: `${xPct}% 0%`,
                                                backgroundSize: `${total * 100}% 100%`,
                                                backgroundRepeat: 'no-repeat',
                                            }} />
                                    )
                                }
                                return ch?.img_url ? (
                                    <div className="absolute -bottom-2 -right-2 h-14 w-14 md:h-16 md:w-16 rounded-xl border-2 border-amber-400 overflow-hidden bg-gray-900 shadow-lg ring-2 ring-amber-400/50">
                                        <img src={ch.img_url} alt={ch.name} className="h-full w-full object-cover" />
                                    </div>
                                ) : null
                            })()}
                            <Star size={20} className="absolute -top-1 -right-1 text-yellow-300"
                                style={{ animation: 'sparkle-explode 1.5s ease-out infinite' }} />
                            <Star size={14} className="absolute top-1 -left-3 text-yellow-200"
                                style={{ animation: 'sparkle-explode 1.8s ease-out infinite', animationDelay: '0.3s' }} />
                        </div>

                        <p className="text-4xl md:text-6xl font-black uppercase tracking-[0.15em] text-amber-300 drop-shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center gap-3"
                            style={{ animation: 'text-neon-pulse 0.5s ease-in-out infinite alternate' }}>
                            <ItemSprite itemKey="star" className="h-8 w-6 md:h-10 md:w-8 shrink-0" />
                            {overlayTexts?.countdown?.labels?.campione ?? 'CAMPIONE!'}
                            <ItemSprite itemKey="star" className="h-8 w-6 md:h-10 md:w-8 shrink-0" />
                        </p>
                    </div>
                )}

                {/* === WINNER PHASE === */}
                {phase === 'winner' && (
                    <div className="relative z-20 flex flex-col items-center gap-6 text-center animate-fade-in">
                        {/* Coin confetti */}
                        {coinConfetti.map((c) => (
                            <div key={c.key} className="absolute top-1/3 pointer-events-none z-4 flex items-center justify-center"
                                style={{
                                    left: `${c.left}%`, width: `${c.size}px`, height: `${c.size}px`,
                                    animation: `coin-sparkle ${c.duration} ease-out both`,
                                    animationDelay: c.delay,
                                }}>
                                {c.key % 2 === 0 ? (
                                    <span className="text-2xl">🪙</span>
                                ) : (
                                    <ItemSprite itemKey="star" className="w-full h-full" />
                                )}
                            </div>
                        ))}

                        {/* Crown drop animation — più dinamico */}
                        <div className="absolute -top-4 z-30 pointer-events-none text-6xl"
                            style={{ animation: 'crown-drop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
                            <span className="filter drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">👑</span>
                        </div>

                        {/* Sparkle trail around winner */}
                        {winnerSparkleTrail.map((p) => (
                            <div key={p.key} className="absolute pointer-events-none z-5"
                                style={{
                                    left: '50%', top: '50%',
                                    '--tx': p.tx,
                                    '--ty': p.ty,
                                    '--tx2': p.tx2,
                                    '--ty2': p.ty2,
                                    animation: `sparkle-trail ${p.duration}s ease-out both`,
                                    animationDelay: p.delay,
                                }}>
                                <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                            </div>
                        ))}

                        <div className="relative animate-bounce-in" style={{ animation: 'rainbow-cycle 2s linear infinite' }}>
                            <img src={leader.img_url || buildAvatarPlaceholder(leader.nickname ?? 'Campione')}
                                alt={leader.nickname}
                                className="h-44 w-44 md:h-56 md:w-56 rounded-3xl object-cover ring-4 ring-amber-400 shadow-2xl will-change-transform"
                                style={{
                                    animation: 'crown-glow 2.4s ease-in-out infinite, trophy-float 3s ease-in-out infinite, trophy-entrance 2s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                                }} />
                            <Crown size={28} className="absolute -top-3 -right-3 text-yellow-300"
                                style={{ animation: 'sparkle-explode 1.6s ease-out infinite' }} />
                            <Star size={18} className="absolute top-0 -left-4 text-yellow-200"
                                style={{ animation: 'sparkle-explode 1.8s ease-out infinite', animationDelay: '0.4s' }} />
                        </div>
                        <p className="text-5xl md:text-7xl font-black uppercase tracking-widest text-amber-300 drop-shadow-[0_4px_20px_rgba(245,158,11,0.6)]"
                            style={{ animation: 'text-glow-breathe 3.6s ease-in-out infinite' }}>
                            {overlayTexts?.countdown?.labels?.winner ?? 'CAMPIONE!'}
                        </p>
                        <p className="text-2xl md:text-3xl font-black uppercase text-white">{leader.nickname?.toUpperCase()}</p>
                    </div>
                )}
            </div>
        )
    }

    export default GlobalCelebrationOverlay
