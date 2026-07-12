import { useEffect, useState } from 'react'
import { Shield, Ban, Info } from 'lucide-react'
import { inventoryApi } from '@/services/apiClient'
import { buildAvatarPlaceholder } from '@/lib/placeholders'

// Ultimo classificato (+ penultimo se >=7 partecipanti) — stessa regola del
// Guscio Blu applicata da settle_tournament_schedine (backend), usata qui
// solo come fallback quando non esiste una card reale (torneo pre-sistema
// carte) e il formato è "classic", l'unico per cui tournament.standings è
// la classifica ufficiale (vedi gotcha in CLAUDE.md).
const computeRetroactiveBlueShell = (standings) => {
    if (!standings || standings.length === 0) return []
    const sorted = [...standings].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    const last = sorted[sorted.length - 1]
    const winners = [last]
    if (sorted.length >= 7) winners.push(sorted[sorted.length - 2])
    return winners.map((s) => ({ player_id: s.playerId, nickname: s.nickname, img_url: s.img_url }))
}

const AwardRow = ({ nickname, img_url }) => (
    <div className="flex items-center gap-2 rounded-xl bg-white/30 dark:bg-black/15 px-2 py-1">
        <img
            src={img_url || buildAvatarPlaceholder(nickname)}
            alt={nickname}
            loading="lazy"
            decoding="async"
            className="h-6 w-6 shrink-0 rounded-full object-cover"
        />
        <span className="min-w-0 flex-1 truncate text-xs font-bold capitalize text-slate-800 dark:text-foreground">{nickname}</span>
    </div>
)

const AwardNote = ({ children }) => (
    <div className="flex items-start gap-1.5 rounded-xl bg-white/20 dark:bg-black/10 px-2 py-1.5 text-[9px] text-slate-500 dark:text-muted-foreground">
        <Info size={11} className="mt-0.5 shrink-0" />
        <span>{children}</span>
    </div>
)

const TournamentAwardsPanel = ({ tournamentId, tournamentFormat, standings }) => {
    const [awards, setAwards] = useState(null)

    useEffect(() => {
        let active = true
        inventoryApi.tournamentAwards(tournamentId)
            .then((res) => { if (active) setAwards(res.data) })
            .catch(() => { if (active) setAwards({ master_winners: [], blue_shell_winners: [] }) })
        return () => { active = false }
    }, [tournamentId])

    if (!awards) return null

    const masterWinners = awards.master_winners
    const blueShellWinners = awards.blue_shell_winners.length > 0
        ? awards.blue_shell_winners
        : (tournamentFormat === 'classic' ? computeRetroactiveBlueShell(standings) : [])
    const blueShellIsRetroactive = awards.blue_shell_winners.length === 0 && blueShellWinners.length > 0

    return (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-amber-400/40 dark:border-amber-500/20 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-600/70 dark:text-amber-400/60">Premi torneo</p>

            {/* ── Vincitore Schedina (Carta Master) ── */}
            <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Shield size={11} />
                    <p className="text-[9px] font-black uppercase tracking-widest">Vincitore Schedina</p>
                </div>
                {masterWinners.length > 0 ? (
                    <div className="space-y-1">
                        {masterWinners.map((w) => <AwardRow key={w.player_id} {...w} />)}
                    </div>
                ) : (
                    <AwardNote>* Logica schedina non ancora introdotta per questo torneo.</AwardNote>
                )}
            </div>

            {/* ── Guscio Blu ── */}
            <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                    <Ban size={11} />
                    <p className="text-[9px] font-black uppercase tracking-widest">Guscio Blu</p>
                </div>
                {blueShellWinners.length > 0 ? (
                    <div className="space-y-1">
                        {blueShellWinners.map((w) => <AwardRow key={w.player_id} {...w} />)}
                        {blueShellIsRetroactive && (
                            <AwardNote>Il sistema carte non era ancora attivo: lo avrebbe ottenuto in base alla classifica finale.</AwardNote>
                        )}
                    </div>
                ) : (
                    <AwardNote>Non disponibile per questo torneo.</AwardNote>
                )}
            </div>
        </div>
    )
}

export default TournamentAwardsPanel
