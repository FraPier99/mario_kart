import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Ban } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'

const MASTER = {
  gradient: 'linear-gradient(160deg, #1c0a00 0%, #3b1500 30%, #1c0a00 60%, #2d1000 100%)',
  gradientBack: 'linear-gradient(160deg, #1c0a00 0%, #3b1500 50%, #1c0a00 100%)',
  glowAnim: 'mk-card-master-glow',
  shineAnim: 'mk-card-master-shine',
  borderColor: 'rgba(245,158,11,0.5)',
  textColor: 'text-amber-300',
  textGlow: '0 0 20px rgba(245,158,11,0.8)',
  textGlowSm: '0 0 12px rgba(245,158,11,0.5)',
  iconGrad: 'linear-gradient(135deg, #f59e0b, #d97706, #92400e)',
  iconAnim: 'mk-card-star-spin',
  rarityLabel: '★ Leggendaria ★',
  rarityLabelShort: '★ Leggendaria',
  rarityClass: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  name: 'Carta Master',
  subtitle: 'Il privilegio del campione',
  orbColors: ['#fcd34d', '#f59e0b'],
  borderClass: 'border-amber-300/50 dark:border-amber-500/30',
  infoBorder: 'border-amber-500/20',
  infoBg: 'rgba(245,158,11,0.06)',
  ctaGrad: 'from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 dark:from-amber-500 dark:to-orange-500',
  texture: 'repeating-linear-gradient(45deg, rgba(245,158,11,0.4) 0px, rgba(245,158,11,0.4) 1px, transparent 1px, transparent 12px)',
  shineColor: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.25), transparent)',
  cornerIcon: '★',
  cornerColor: 'text-amber-500/60',
}

const SHELL = {
  gradient: 'linear-gradient(160deg, #020b1a 0%, #041830 30%, #06234a 60%, #020b1a 100%)',
  gradientBack: 'linear-gradient(160deg, #020b1a 0%, #041830 50%, #020b1a 100%)',
  glowAnim: 'mk-card-shell-glow',
  shineAnim: 'mk-card-shell-shine',
  borderColor: 'rgba(6,182,212,0.45)',
  textColor: 'text-cyan-300',
  textGlow: '0 0 20px rgba(6,182,212,0.8)',
  textGlowSm: '0 0 12px rgba(6,182,212,0.5)',
  iconGrad: 'linear-gradient(135deg, #0e7490, #1d4ed8, #312e81)',
  iconAnim: 'mk-card-shell-spin',
  rarityLabel: '⚡ Rara ⚡',
  rarityLabelShort: '⚡ Rara',
  rarityClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
  name: 'Guscio Blu',
  subtitle: 'Il premio dei dimenticati',
  orbColors: ['#22d3ee', '#818cf8'],
  borderClass: 'border-sky-300/50 dark:border-sky-500/30',
  infoBorder: 'border-cyan-500/20',
  infoBg: 'rgba(6,182,212,0.05)',
  ctaGrad: 'from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 dark:from-cyan-500 dark:to-blue-500',
  texture: 'repeating-linear-gradient(60deg, rgba(6,182,212,0.3) 0px, rgba(6,182,212,0.3) 1px, transparent 1px, transparent 14px),repeating-linear-gradient(-60deg, rgba(6,182,212,0.3) 0px, rgba(6,182,212,0.3) 1px, transparent 1px, transparent 14px)',
  shineColor: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.3), rgba(99,102,241,0.15), transparent)',
  cornerIcon: '⚡',
  cornerColor: 'text-cyan-400/60',
}

function getTheme(type) {
  return type === 'master' ? MASTER : SHELL
}

export default function PowerCard({
  type = 'master',
  mode = 'card',
  flipped = false,
  onFlip,
  consumed = false,
  sourceTournamentId,
  sourceTournamentName,
  sourceGameName,
  consumedInRaceId,
  consumedEffect,
  consumedAt,
  consumedTournamentName,
  customTitle,
}) {
  const { getTournamentDisplayNumber } = useAppData()
  const t = getTheme(type)
  const isMaster = type === 'master'
  const isShell = !isMaster
  const IconComponent = isMaster ? Shield : Ban

  // Su mobile la card "flip" occupa quasi tutto lo schermo: con un click
  // diretto su tutta l'area, qualsiasi tentativo di scorrere la pagina
  // partendo da sopra la card veniva interpretato come un tap e la
  // ribaltava, rendendo impossibile scrollare oltre. Si traccia lo
  // spostamento del puntatore tra down e up: solo un tap "fermo" (sotto
  // soglia) gira la card, un drag/scroll viene ignorato.
  const pointerStartRef = useRef(null)
  const handlePointerDown = (event) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
  }
  const handlePointerUp = (event) => {
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start) return
    const dx = Math.abs(event.clientX - start.x)
    const dy = Math.abs(event.clientY - start.y)
    if (dx < 10 && dy < 10) onFlip?.()
  }

  if (mode === 'mini') {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border p-3 ${consumed ? 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 opacity-60' : t.borderClass}`}
        style={{ background: consumed ? undefined : t.gradient }}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${isMaster ? 'bg-linear-to-br from-amber-400 to-orange-500' : 'bg-linear-to-br from-cyan-400 to-blue-600'}`}>
          <IconComponent size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold ${consumed ? 'text-slate-500 dark:text-slate-400' : t.textColor}`}>
            {customTitle || t.name}
          </p>
          {consumedAt && (
            <p className="text-[9px] text-slate-400 dark:text-slate-500">
              Consumata {new Date(consumedAt).toLocaleDateString('it-IT')}
              {consumedTournamentName && <span> · {consumedTournamentName}</span>}
            </p>
          )}
          {sourceGameName && (
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {sourceGameName}{sourceTournamentName && ` · ${sourceTournamentName}`}
            </p>
          )}
          {consumed && (consumedEffect || consumedInRaceId) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {consumedEffect && (
                <span className="rounded-md bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {consumedEffect}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (mode === 'card') {
    return (
      <div
        className={`relative overflow-hidden rounded-[2rem] border-2 p-0 transition-all hover:shadow-2xl ${consumed ? 'border-slate-200 dark:border-white/10 opacity-50' : t.borderClass}`}
        style={{
          background: consumed ? undefined : t.gradient,
          animation: consumed ? undefined : `${t.glowAnim} 4s ease-in-out infinite`,
          animationDelay: consumed ? undefined : (isMaster ? '0s' : '1s'),
        }}
      >
        {!consumed && (
          <>
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
              <div className="absolute top-0 h-full w-1/3"
                style={{
                  background: t.shineColor,
                  animation: `${t.shineAnim} 5s ease-in-out infinite`,
                }} />
            </div>
            {[isMaster ? [0, 120, 240] : [0, 180]].map((degs, gi) =>
              degs.map((deg, i) => (
                <div key={`${gi}-${i}`} className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
                  style={{
                    animation: `${isMaster ? 'mk-card-orbit' : 'mk-card-orbit-reverse'} ${isMaster ? 2.8 + i * 0.4 : 3.2 + i * 0.5}s linear infinite`,
                    animationDelay: `${isMaster ? i * 0.35 : i * 0.6}s`,
                  }}>
                  <div className="h-2 w-2 rounded-full"
                    style={{
                      background: isMaster ? t.orbColors[i % 2] : t.orbColors[i % 2],
                      boxShadow: isMaster ? '0 0 6px #f59e0b' : `0 0 8px ${i === 0 ? '#06b6d4' : '#6366f1'}`,
                    }} />
                </div>
              ))
            )}
            {['top-2 left-3', 'top-2 right-3', 'bottom-2 left-3', 'bottom-2 right-3'].map((pos, i) => (
              <span key={i} className={`pointer-events-none absolute ${pos} ${t.cornerColor} text-xs select-none`}
                style={{ animation: 'mk-card-spark 2s ease-in-out infinite', animationDelay: `${i * 0.5}s` }}>{t.cornerIcon}</span>
            ))}
          </>
        )}
        <div className="pointer-events-none absolute inset-0 rounded-[2rem]"
          style={{ boxShadow: `inset 0 0 0 1.5px ${t.borderColor}, inset 0 0 30px rgba(0,0,0,0.08)`, opacity: consumed ? 0 : 1 }} />

        <div className="relative z-10 p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {!consumed && (
                <div className="absolute inset-0 rounded-2xl blur-lg"
                  style={{ background: isMaster ? 'rgba(245,158,11,0.4)' : 'rgba(6,182,212,0.4)', transform: 'scale(1.2)' }} />
              )}
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border text-white shadow-xl ${consumed ? 'bg-slate-300 dark:bg-slate-700 border-slate-200 dark:border-slate-600' : `bg-gradient-to-br ${isMaster ? 'from-amber-400 to-orange-600 border-amber-300/30' : 'from-cyan-400 to-blue-700 border-cyan-300/30'}`}`}>
                <IconComponent size={30} className={consumed ? 'text-slate-400 dark:text-slate-500' : ''}
                  style={consumed ? {} : { animation: `${t.iconAnim} 5s linear infinite` }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {!consumed && (
                <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.3em] mb-1.5 ${t.rarityClass}`}>
                  {t.rarityLabelShort}
                </div>
              )}
              <p className={`text-base font-black ${consumed ? 'text-slate-500 dark:text-slate-400' : t.textColor}`}
                style={consumed ? {} : { textShadow: t.textGlowSm }}>
                {customTitle || t.name}
              </p>
              {sourceGameName && (
                <span className={`inline-block rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest mb-0.5 ${isMaster ? 'bg-amber-500/15 text-amber-400' : 'bg-cyan-500/15 text-cyan-400'}`}>
                  {sourceGameName}
                </span>
              )}
              {sourceTournamentId && (
                <Link to={`/tournaments/${sourceTournamentId}`}
                  className="block text-[9px] text-slate-500 hover:text-slate-300 underline transition">
                  {sourceTournamentName ? `Vinta in: ${sourceTournamentName}` : `Torneo #${getTournamentDisplayNumber(sourceTournamentId)}`}
                </Link>
              )}
            </div>
          </div>

          {!consumed && (
            <div className={`rounded-2xl border p-3 space-y-2 ${t.infoBorder}`} style={{ background: t.infoBg }}>
              <div>
                <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-1 ${isMaster ? 'text-amber-400' : 'text-cyan-400'}`}>Come si ottiene</p>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {isMaster
                    ? 'Viene assegnata al vincitore assoluto della schedina di ogni torneo. È il premio più raro della competizione.'
                    : "Viene assegnata all'ultimo classificato della classifica reale. Se il torneo ha 7 o più partecipanti, viene assegnata anche al penultimo."}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1 text-slate-400">Effetto</p>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  {isMaster
                    ? 'Scegli tra: annulla la pista di un avversario e imponi la tua, obbliga un player a usare un personaggio specifico, o aggiungi una gara extra a fine torneo.'
                    : 'Scegli tra: impone agli avversari di fermarsi un giro, impone agli avversari di fermarsi X secondi, o impedisce a un avversario di usare item per 30s.'}
                </p>
              </div>
            </div>
          )}

          {consumed && (consumedInRaceId || consumedEffect) && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1">
              {consumedEffect && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-black uppercase tracking-wider">Effetto:</span> {consumedEffect}
                </p>
              )}
              {consumedInRaceId && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-black uppercase tracking-wider">Gara:</span> #{consumedInRaceId}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const orbitalDegs = isShell ? [0, 180] : [0, 120, 240]
  const orbitalParticles = orbitalDegs.map((deg, i) => (
    <div key={deg} className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
      style={{
        animation: `${isShell ? 'mk-card-orbit-reverse' : 'mk-card-orbit'} ${isShell ? 3.2 + i * 0.5 : 2.8 + i * 0.4}s linear infinite`,
        animationDelay: `${i * (isShell ? 0.6 : 0.35)}s`,
      }}>
      <div className="h-2 w-2 rounded-full"
        style={{
          background: isShell ? (i === 0 ? '#22d3ee' : '#818cf8') : (i === 1 ? '#fcd34d' : '#f59e0b'),
          boxShadow: isShell ? `0 0 8px ${i === 0 ? '#06b6d4' : '#6366f1'}` : '0 0 6px #f59e0b',
        }} />
    </div>
  ))

  const cornerPositions = ['top-2 left-3', 'top-2 right-3', 'bottom-2 left-3', 'bottom-2 right-3']
  const cornerIcons = cornerPositions.map((pos, i) => (
    <span key={i} className={`pointer-events-none absolute ${pos} text-xs select-none ${isShell ? 'text-cyan-400/60' : 'text-amber-500/60'}`}
      style={{ animation: 'mk-card-spark 2s ease-in-out infinite', animationDelay: `${i * 0.5}s` }}>
      {isShell ? '⚡' : '★'}
    </span>
  ))

  const shineSweep = (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute top-0 h-full w-1/3"
        style={{
          background: isShell
            ? 'linear-gradient(90deg, transparent, rgba(6,182,212,0.3), rgba(99,102,241,0.15), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,215,0,0.25), transparent)',
          animation: `${isShell ? 'mk-card-shell-shine' : 'mk-card-master-shine'} ${isShell ? '3.8s' : '3.5s'} ease-in-out infinite`,
          animationDelay: isShell ? '1.2s' : '0.5s',
        }} />
    </div>
  )

  const dangerBar = (
    <div className="pointer-events-none absolute top-0 left-0 right-0 h-1.5 overflow-hidden rounded-t-2xl">
      <div className="h-full w-full"
        style={{
          background: 'repeating-linear-gradient(90deg, #06b6d4 0px, #06b6d4 8px, #1e1b4b 8px, #1e1b4b 16px)',
          animation: 'mk-shell-bar-pulse 2s ease-in-out infinite',
        }} />
    </div>
  )

  const frontFace = (
    <div
      className="absolute inset-0 h-full w-full overflow-hidden rounded-2xl"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        // Su alcuni browser mobile backface-visibility:hidden da solo non
        // basta a nascondere davvero la faccia (rimane visibile/sovrapposta
        // al retro, soprattutto con animazioni continue come queste): opacity
        // + pointer-events forzano la faccia "non attiva" a essere invisibile
        // e non interattiva su qualsiasi browser, indipendentemente dal bug.
        opacity: flipped ? 0 : 1,
        pointerEvents: flipped ? 'none' : 'auto',
        transition: 'opacity 0.2s linear',
        background: t.gradient,
        animation: `${t.glowAnim} ${isMaster ? '3s' : '3.2s'} ease-in-out infinite`,
        animationDelay: isMaster ? '0s' : '0.8s',
      }}
    >
      {isMaster ? (
        <div className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: t.texture }} />
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 opacity-8"
            style={{ backgroundImage: t.texture }} />
          {dangerBar}
        </>
      )}
      {shineSweep}
      <div className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: `inset 0 0 0 1.5px ${t.borderColor}, inset 0 0 30px rgba(0,0,0,0.08)` }} />
      {orbitalParticles}
      {cornerIcons}
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${t.rarityClass}`}>
          <span className="text-[8px] font-black uppercase tracking-[0.3em]">{t.rarityLabel}</span>
        </div>
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl blur-xl" style={{ background: isMaster ? 'rgba(245,158,11,0.4)' : 'rgba(6,182,212,0.4)', transform: 'scale(1.3)' }} />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border"
            style={{ background: t.iconGrad, borderColor: isMaster ? 'rgba(245,158,11,0.3)' : 'rgba(6,182,212,0.3)' }}>
            <IconComponent size={44} className="text-white drop-shadow-xl" style={{ animation: `${t.iconAnim} 4s linear infinite` }} />
          </div>
        </div>
        <div>
          <p className="text-xl font-black tracking-tight" style={{ color: isMaster ? '#fcd34d' : '#22d3ee', textShadow: t.textGlow }}>
            {customTitle || t.name}
          </p>
          <p className={`mt-1 text-[10px] font-black uppercase tracking-widest ${isMaster ? 'text-amber-600/70' : 'text-cyan-600/70'}`}>{t.subtitle}</p>
          <p className="mt-3 text-[11px] text-slate-400" style={{ animation: 'mk-card-float 3s ease-in-out infinite' }}>
            ✦ Clicca per rivelare ✦
          </p>
        </div>
      </div>
    </div>
  )

  const backFace = (
    <div
      className="absolute inset-0 flex h-full w-full flex-col rounded-2xl overflow-hidden"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
        opacity: flipped ? 1 : 0,
        pointerEvents: flipped ? 'auto' : 'none',
        transition: 'opacity 0.2s linear',
        background: t.gradientBack,
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute top-0 h-full w-1/2"
          style={{
            background: isMaster
              ? 'linear-gradient(90deg, transparent, rgba(255,215,0,0.06), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(6,182,212,0.07), transparent)',
            animation: `${t.shineAnim} 6s ease-in-out infinite`,
            animationDelay: isMaster ? '0s' : '1s',
          }} />
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ boxShadow: `inset 0 0 0 1.5px ${isMaster ? 'rgba(245,158,11,0.35)' : 'rgba(6,182,212,0.3)'}, inset 0 0 40px rgba(0,0,0,0.06)` }} />

      <div className="relative z-10 flex flex-col h-full p-5 overflow-y-auto">
        <div className="flex items-center gap-3 shrink-0">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${isMaster ? 'border-amber-400/30' : 'border-cyan-400/30'}`}
            style={{ background: isMaster ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #0e7490, #1d4ed8)' }}>
            <IconComponent size={20} className="text-white" />
          </div>
          <div>
            <p className={`text-[8px] font-black uppercase tracking-[0.35em] ${isMaster ? 'text-amber-600' : 'text-cyan-600'}`}>
              {t.rarityLabelShort}
            </p>
            <p className={`text-sm font-black leading-tight ${t.textColor}`} style={{ textShadow: t.textGlowSm }}>
              {customTitle || t.name}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 flex-1">
          <div className="rounded-2xl border p-3" style={{ borderColor: isMaster ? 'rgba(245,158,11,0.25)' : 'rgba(6,182,212,0.25)', background: t.infoBg }}>
            <div className="flex items-center gap-2 mb-2">
              <span className={isMaster ? 'text-amber-400' : 'text-cyan-400'}>{isMaster ? '🏆' : '🎯'}</span>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isMaster ? 'text-amber-400' : 'text-cyan-400'}`}>Come si ottiene</p>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {isMaster ? (
                <>Vinci la schedina di un torneo. Solo il <span className="text-amber-300 font-black">vincitore assoluto</span> riceve questo privilegio.</>
              ) : (
                <>Assegnata all'<span className="text-cyan-300 font-black">ultimo classificato</span> della classifica reale. Se il torneo ha 7 o più partecipanti, viene assegnata anche al penultimo.</>
              )}
            </p>
          </div>

          <div className="rounded-2xl border p-3" style={{ borderColor: isMaster ? 'rgba(245,158,11,0.25)' : 'rgba(6,182,212,0.25)', background: t.infoBg }}>
            <div className="flex items-center gap-2 mb-2">
              <span className={isMaster ? 'text-amber-400' : 'text-cyan-400'}>{isMaster ? '⚡' : '💥'}</span>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isMaster ? 'text-amber-400' : 'text-cyan-400'}`}>Effetto</p>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {isMaster ? (
                <><span className="text-amber-300 font-black">Scegli tra 3 effetti</span>: annulla la pista di un avversario e imponi la tua, obbliga un player a usare un personaggio specifico, o aggiungi una gara extra a fine torneo.</>
              ) : (
                <><span className="text-cyan-300 font-black">Scegli tra 3 effetti</span>: ferma gli avversari per un giro, fermali per X secondi, o impedisci item per 30s.</>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-slate-400">👤</span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Come funziona</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              L'<span className="text-slate-300 font-black">organizzatore del torneo</span> registra l'uso nella pagina di gestione. Il portatore segnala prima dell'inizio della gara successiva.
            </p>
          </div>
        </div>

        <p className={`shrink-0 pt-3 text-center text-[9px] ${isMaster ? 'text-amber-900/70' : 'text-sky-900/70'}`}
          style={{ animation: 'mk-card-float 3s ease-in-out infinite' }}>
          ✦ Clicca per girare ✦
        </p>
      </div>
    </div>
  )

  return (
    <div
      className="group relative cursor-pointer touch-pan-y perspective-[1000px]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div
        className="relative h-112 w-full rounded-2xl transition-transform duration-500 ease-out transform-3d"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', willChange: 'transform' }}
      >
        {frontFace}
        {backFace}
      </div>
    </div>
  )
}
