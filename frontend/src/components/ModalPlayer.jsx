import { Crown, X, Trophy, Award, Swords, Star, Sparkles } from 'lucide-react'
import { useMemo, useEffect } from 'react'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { useAppData } from '@/context/AppDataContext'

const PARTICLE_COUNT = 6

const ModalPlayer = ({ player, stats, onClose, anchorTop }) => {
    const { charactersById, detailedTournaments } = useAppData()

    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    const bgParticles = useMemo(() =>
        Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
            id: i,
            left: 10 + (i * 17) % 80,
            top: 10 + (i * 23) % 80,
            delay: i * 0.4,
            size: 2 + (i % 3) * 1.5,
        })), []
    )

    if (!player) return null

    const favoriteCharacter = charactersById.get(player.favorite_character_id) ?? null

    const playerStats = stats ?? {
        racesPlayed: 0,
        tournamentWins: 0,
        raceWins: 0,
        podiums: 0,
    }

    const wonTournaments = detailedTournaments.filter((t) => t.winner_id === player.id)
    const isChampion = wonTournaments.length > 0

    const statCards = [
        { icon: Swords, label: 'GARE FATTE', value: playerStats.racesPlayed, color: isChampion ? 'text-amber-300' : 'text-slate-400', delay: 0 },
        { icon: Trophy, label: 'TORNEI VINTI', value: playerStats.tournamentWins, color: 'text-amber-400', delay: 0.1, gold: true },
        { icon: Award, label: 'VITTORIE', value: playerStats.raceWins, color: isChampion ? 'text-amber-300' : 'text-emerald-400', delay: 0.2 },
        { icon: Star, label: 'PODI', value: playerStats.podiums, color: isChampion ? 'text-amber-300' : 'text-blue-400', delay: 0.3 },
    ]

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
             style={{ justifyContent: anchorTop ? 'flex-start' : 'center' }}
             onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={anchorTop ? { marginTop: anchorTop } : undefined}
                className={`relative w-full max-w-2xl ${anchorTop ? '' : 'my-6'} animate-slide-up rounded-3xl border shadow-2xl ${
                isChampion
                    ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/60 via-amber-900/30 to-amber-950/60 shadow-amber-950/40'
                    : 'border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-black/40'
            }`}>
                {bgParticles.map((p) => (
                    <div
                        key={p.id}
                        className={`absolute rounded-full pointer-events-none ${
                            isChampion ? 'bg-amber-400/20' : 'bg-emerald-400/20'
                        }`}
                        style={{
                            left: `${p.left}%`,
                            top: `${p.top}%`,
                            width: p.size,
                            height: p.size,
                            animationDelay: `${p.delay}s`,
                            animationDuration: '3s',
                        }}
                    />
                ))}

                <div className={`absolute inset-0 rounded-3xl pointer-events-none ${
                    isChampion ? 'shimmer-gold opacity-40' : 'shimmer-gold opacity-20'
                }`} />

                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex flex-col md:flex-row gap-6 p-6 relative z-[1]">
                    <div className="flex flex-col items-center shrink-0 gap-3 md:w-52">
                        <div className="relative mt-2">
                            <div className={`absolute -inset-3 rounded-full blur-xl animate-pulse ${
                                isChampion
                                    ? 'bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-orange-500/30'
                                    : 'bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-purple-500/20'
                            }`} />
                            <div className={`absolute -inset-1 rounded-full animate-pulse ${
                                isChampion
                                    ? 'bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-orange-400/20'
                                    : 'bg-gradient-to-r from-emerald-400/10 via-amber-400/10 to-purple-400/10'
                            }`} style={{ animationDelay: '1s' }} />
                            <img
                                src={player.img_url || buildAvatarPlaceholder(player.nickname)}
                                alt={`${player.first_name} ${player.last_name}`}
                                className={`relative h-28 w-28 rounded-2xl object-cover object-center ring-4 animate-pulse-glow ${
                                    isChampion ? 'ring-amber-400/40' : 'ring-emerald-400/30'
                                }`}
                            />
                            {isChampion && (
                                <div className="absolute -top-3 -right-3">
                                    <Crown size={22} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-bounce-in" />
                                </div>
                            )}
                            <Sparkles size={14} className={`absolute -top-2 -left-2 animate-pulse ${isChampion ? 'text-amber-300' : 'text-emerald-300'}`} />
                            <Sparkles size={10} className="absolute -bottom-2 -right-2 text-amber-300 animate-pulse" style={{ animationDelay: '0.8s' }} />
                        </div>

                        <span className={`inline-block rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                            isChampion
                                ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                        }`}>
                            {player.nickname?.toUpperCase()}
                        </span>

                        <h3 className="text-base font-black uppercase tracking-tight text-white text-center leading-tight">
                            {player.first_name?.toUpperCase()} {player.last_name?.toUpperCase()}
                        </h3>

                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 w-full">
                            <img
                                src={favoriteCharacter?.img_url || buildAvatarPlaceholder(favoriteCharacter?.name ?? 'character')}
                                alt={favoriteCharacter?.name ?? 'Nessun pg preferito'}
                                className="h-14 w-14 shrink-0 rounded-xl object-contain bg-slate-800"
                            />
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">PG PREFERITO</p>
                                <p className="text-sm font-bold text-white truncate">
                                    {favoriteCharacter ? favoriteCharacter.name?.toUpperCase() : 'NESSUN PG PREFERITO'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className={`w-full rounded-2xl border p-4 ${
                            isChampion
                                ? 'border-amber-500/20 bg-amber-950/30'
                                : 'border-white/10 bg-slate-950/40'
                        }`}>
                            <h3 className={`mb-3 text-center text-[10px] font-black uppercase tracking-widest ${
                                isChampion ? 'text-amber-400' : 'text-slate-500'
                            }`}>
                                STATISTICHE GIOCATORE
                            </h3>

                            <div className="grid w-full grid-cols-2 gap-2">
                                {statCards.map((card) => (
                                    <div
                                        key={card.label}
                                        className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all duration-300 animate-fade-in hover-lift ${
                                            card.gold
                                                ? 'border-amber-500/30 bg-amber-500/10 hover:shadow-amber-500/20'
                                                : isChampion
                                                    ? 'border-amber-500/10 bg-amber-950/40 hover:shadow-amber-500/10'
                                                    : 'border-white/10 bg-slate-900 hover:shadow-white/5'
                                        }`}
                                        style={{ animationDelay: `${card.delay}s` }}
                                    >
                                        <card.icon className={`mb-1 h-4 w-4 ${card.color}`} />
                                        <span className={`text-xl font-black ${card.color}`}>{card.value || 0}</span>
                                        <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                                    </div>
                                ))}
                            </div>

                            {wonTournaments.length > 0 && (
                                <div className="mt-3 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                                    <h4 className="mb-1.5 text-center text-[9px] font-black uppercase tracking-widest text-amber-400">
                                        <Crown className="-mt-0.5 me-1 inline h-3 w-3" />
                                        TORNEI VINTI
                                    </h4>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {wonTournaments.map((t) => (
                                            <div
                                                key={t.id}
                                                className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/20"
                                            >
                                                <span className="truncate uppercase">{t.name}</span>
                                                <span className="shrink-0 text-[10px] text-amber-500">{t.date}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ModalPlayer
