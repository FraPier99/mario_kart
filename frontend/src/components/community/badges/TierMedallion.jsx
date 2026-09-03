import { useId } from 'react'
import { Crown, Trophy, Star, Flame, Swords, Flag } from 'lucide-react'

// Medaglia illustrata per tier — sostituisce la vecchia pillola icona+testo
// piena. Costruita in SVG puro (nessun asset esterno, nessun tool di
// generazione immagini disponibile in questo ambiente): cerchio con
// gradiente metallico specifico per tier, texture "metallo invecchiato"
// (feTurbulence, ispirata a un riferimento fotorealistico mostrato
// dall'utente — qui riprodotta via filtri SVG, non un'immagine), bordo a
// doppio rilievo (luce in alto a sinistra, ombra in basso a destra) +
// icona lucide-react centrata. Ordine dal più al meno esclusivo, stessa
// scala cromatica di lib/playerBadges.js (circuit-gold/circuit-blue/circuit-red).
const TIER_METAL = {
    leggenda: {
        Icon: Crown,
        stops: ['#fff7e0', '#f6b60d', '#b8790a'],
        ring: '#f6b60d',
        iconColor: '#5b3a00',
        stars: true,
        rust: '158, 96, 8',
        seed: 2,
    },
    campione: {
        Icon: Trophy,
        stops: ['#ffe9a8', '#f6b60d', '#a6690a'],
        ring: '#c98a12',
        iconColor: '#5b3a00',
        stars: false,
        rust: '150, 90, 10',
        seed: 5,
    },
    veterano: {
        Icon: Star,
        stops: ['#f1f5f9', '#a8b4c2', '#5f6b7a'],
        ring: '#2e7df0',
        iconColor: '#243447',
        stars: false,
        rust: '60, 75, 95',
        seed: 8,
    },
    outsider: {
        Icon: Flame,
        stops: ['#e8b98a', '#a8631f', '#6b3c12'],
        ring: '#e13c2e',
        iconColor: '#3a1c0a',
        stars: false,
        rust: '120, 40, 20',
        seed: 11,
    },
    esordiente: {
        Icon: Flag,
        stops: ['#94a3b8', '#475569', '#1e293b'],
        ring: '#334155',
        iconColor: '#f1f5f9',
        stars: false,
        rust: '20, 30, 45',
        seed: 14,
    },
    sfidante: {
        Icon: Swords,
        stops: ['#cbd5e1', '#8a97a6', '#4b5563'],
        ring: '#64748b',
        iconColor: '#1e293b',
        stars: false,
        rust: '55, 62, 72',
        seed: 17,
    },
}

const TierMedallion = ({ tier, size = 40 }) => {
    const meta = TIER_METAL[tier] ?? TIER_METAL.esordiente
    const Icon = meta.Icon
    const uid = useId()
    const gradId = `${uid}-grad`
    const noiseId = `${uid}-noise`
    const clipId = `${uid}-clip`
    const [c1, c2, c3] = meta.stops

    return (
        <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0" style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.35))' }}>
            <defs>
                <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="55%" stopColor={c2} />
                    <stop offset="100%" stopColor={c3} />
                </radialGradient>
                {/* Texture "metallo invecchiato" — rumore frattale tinto color
                    ruggine/ossido del tier, sovrapposto in multiply così scurisce
                    e chiazza il metallo sottostante invece di coprirlo. */}
                <filter id={noiseId} x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={meta.seed} result="noise" />
                    <feColorMatrix in="noise" type="matrix" values={`0 0 0 0 ${parseInt(meta.rust.split(',')[0]) / 255}  0 0 0 0 ${parseInt(meta.rust.split(',')[1]) / 255}  0 0 0 0 ${parseInt(meta.rust.split(',')[2]) / 255}  0 0 0 0.55 0`} />
                </filter>
                <clipPath id={clipId}>
                    <circle cx="20" cy="20" r="16.5" />
                </clipPath>
            </defs>

            {/* Bordo esterno con rilievo: luce in alto-sx, ombra in basso-dx
                invece di un anello piatto monocolore. */}
            <circle cx="20" cy="20" r="19" fill={meta.ring} />
            <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="30 90" transform="rotate(-135 20 20)" />
            <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" strokeDasharray="30 90" transform="rotate(45 20 20)" />

            <circle cx="20" cy="20" r="16.5" fill={`url(#${gradId})`} stroke={meta.ring} strokeWidth="1" />
            <rect x="3.5" y="3.5" width="33" height="33" filter={`url(#${noiseId})`} clipPath={`url(#${clipId})`} style={{ mixBlendMode: 'multiply' }} />

            {meta.stars && (
                <>
                    <circle cx="9" cy="9" r="1.2" fill="#fff7e0" />
                    <circle cx="31" cy="9" r="1.2" fill="#fff7e0" />
                </>
            )}
            <foreignObject x="10" y="10" width="20" height="20">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <Icon size={size >= 32 ? 16 : 12} color={meta.iconColor} strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 0.5px rgba(0,0,0,0.4))' }} />
                </div>
            </foreignObject>
        </svg>
    )
}

export default TierMedallion
