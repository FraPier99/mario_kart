/**
 * PlayerTournamentHistory — Elenco dei tornei a cui un giocatore ha
 * partecipato, con la posizione raggiunta e statistiche semplici (punti,
 * gare vinte, podi) — non il dettaglio gara-per-gara. Usato sia nel
 * profilo personale sia in /community/user/:id.
 *
 * Posizione: per i tornei classic si legge direttamente dall'indice in
 * tournament.standings (già la classifica ufficiale per questo formato).
 * Per i tornei a gironi, tournament.standings NON è affidabile come
 * classifica finale (vedi gotcha in CLAUDE.md) — la posizione reale va
 * presa da GET /tournaments/{id}/group-stage/overall-classifica, quindi
 * richiede una chiamata per ciascun torneo a gironi concluso in lista.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Trophy } from 'lucide-react'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { tournamentsApi } from '@/services/apiClient'
import { toTitleCase } from '@/lib/utils'
import EditableContentImage from '@/components/common/EditableContentImage'

const FORMAT_LABEL = { classic: 'Classifica unica', group_stage: 'A gironi' }

const POSITION_BADGE = {
    1: 'bg-circuit-gold text-circuit-ink border-circuit-ink',
    2: 'bg-slate-300 text-slate-800 border-circuit-ink',
    3: 'bg-orange-400 text-orange-950 border-circuit-ink',
}
const DEFAULT_BADGE_IMAGE = 'bg-black/30 backdrop-blur-sm text-slate-300 border-white/20'
const DEFAULT_BADGE_FLAT = 'bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground border-slate-200 dark:border-border'

// Accento del bordo sinistro della card per posizione — stesso linguaggio
// cromatico del badge posizione, per far risaltare 1°/2°/3° a colpo d'occhio
// anche prima di leggere il numero nel badge.
const POSITION_BORDER = {
    1: 'border-l-4 border-l-amber-400',
    2: 'border-l-4 border-l-slate-300',
    3: 'border-l-4 border-l-orange-400',
}

const PlayerTournamentHistory = ({ playerId }) => {
    const { detailedTournaments, games, contentImages, updateContentImage } = useAppData()
    const { isSuperadmin } = useAuth()
    const [selectedGameId, setSelectedGameId] = useState('')
    const [groupStagePositions, setGroupStagePositions] = useState({})

    // Ordine esplicito per data desc — vista "timeline", il più recente
    // prima, indipendentemente dall'ordine con cui il backend restituisce
    // i tornei.
    const myTournaments = useMemo(
        () => (detailedTournaments ?? [])
            .filter((t) => !t.is_friendly && (t.standings ?? []).some((s) => s.playerId === playerId))
            .sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0)),
        [detailedTournaments, playerId]
    )

    const filteredTournaments = useMemo(() => {
        if (!selectedGameId) return myTournaments
        return myTournaments.filter((t) => t.game_id === Number(selectedGameId))
    }, [myTournaments, selectedGameId])

    // Posizione reale per i tornei a gironi conclusi: una chiamata a
    // testa (numero contenuto, solo quelli effettivamente in lista).
    useEffect(() => {
        const toFetch = filteredTournaments.filter((t) => t.tournament_format === 'group_stage' && t.status === 'concluso' && groupStagePositions[t.id] === undefined)
        if (toFetch.length === 0) return
        let active = true
        Promise.all(toFetch.map((t) => tournamentsApi.overallClassifica(t.id).then((res) => [t.id, res.data?.order ?? []]).catch(() => [t.id, []])))
            .then((entries) => {
                if (!active) return
                setGroupStagePositions((prev) => {
                    const next = { ...prev }
                    entries.forEach(([id, order]) => { next[id] = order })
                    return next
                })
            })
        return () => { active = false }
    }, [filteredTournaments, groupStagePositions])

    if (myTournaments.length === 0) return null

    return (
        <div className="rounded-2xl border-2 border-slate-200 dark:border-border bg-white/85 dark:bg-card/85 backdrop-blur-sm p-4 sm:p-5" style={{ boxShadow: 'var(--circuit-shadow-sm)' }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h3 className="font-title text-xs tracking-wide text-slate-700 dark:text-muted-foreground">Tornei disputati</h3>
                </div>
                <select
                    value={selectedGameId}
                    onChange={(e) => setSelectedGameId(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2 text-xs font-black uppercase tracking-widest outline-none focus:border-emerald-500"
                >
                    <option value="">Tutti i giochi</option>
                    {games.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            {filteredTournaments.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400 dark:text-muted-foreground">Nessun torneo per questo gioco.</p>
            ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTournaments.map((t) => {
                        const standing = t.standings.find((s) => s.playerId === playerId)
                        const isGroupStage = t.tournament_format === 'group_stage'
                        let position = null
                        if (isGroupStage) {
                            const order = groupStagePositions[t.id]
                            if (order) {
                                const idx = order.indexOf(playerId)
                                position = idx === -1 ? null : idx + 1
                            }
                        } else {
                            const idx = t.standings.findIndex((s) => s.playerId === playerId)
                            position = idx === -1 ? null : idx + 1
                        }
                        const hasImage = Boolean(contentImages[`tournament-image-${t.id}`])
                        const badgeClass = position != null && POSITION_BADGE[position] ? POSITION_BADGE[position] : (hasImage ? DEFAULT_BADGE_IMAGE : DEFAULT_BADGE_FLAT)
                        const borderCls = position != null && POSITION_BORDER[position] ? POSITION_BORDER[position] : (hasImage ? 'border-l-4 border-l-white/10' : 'border-l-4 border-l-slate-200 dark:border-l-border')
                        const gameName = games.find((g) => g.id === t.game_id)?.name
                        const imageContentKey = `tournament-image-${t.id}`
                        const imageUrl = contentImages[imageContentKey]

                        return (
                            <Link
                                key={t.id}
                                to={`/tournaments/${t.id}`}
                                className={
                                    hasImage
                                        ? `relative flex flex-col gap-2.5 overflow-hidden rounded-xl bg-slate-900 p-3.5 transition hover:brightness-110 ${borderCls}`
                                        : `relative flex flex-col gap-2.5 overflow-hidden rounded-xl border border-slate-200 dark:border-border bg-white/85 dark:bg-card/85 backdrop-blur-sm p-3.5 transition hover:brightness-95 dark:hover:brightness-110 ${borderCls}`
                                }
                            >
                                {/* Composizione a 3 livelli SOLO quando c'è un'immagine: 1)
                                    immagine full-bleed (bordo a bordo, leggermente scurita/
                                    sfocata via filtro CSS, non una colonna separata), 2) overlay
                                    a gradiente sopra l'immagine — più scuro in alto/basso dove
                                    sta il testo, più chiaro al centro — 3) contenuto, sempre
                                    sopra, mai spostato dall'immagine. Senza immagine la card
                                    resta semplicemente a tema (niente isola scura vuota). */}
                                {hasImage ? (
                                    <>
                                        <EditableContentImage
                                            contentKey={imageContentKey}
                                            imageUrl={imageUrl}
                                            onUploaded={updateContentImage}
                                            alt=""
                                            fit="cover"
                                            imageClassName="blur-[0.5px] brightness-90"
                                            className="absolute inset-0 h-full w-full bg-transparent"
                                        />
                                        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-slate-900/65 via-slate-900/20 to-slate-900/65" />
                                    </>
                                ) : isSuperadmin ? (
                                    <EditableContentImage
                                        contentKey={imageContentKey}
                                        imageUrl={null}
                                        onUploaded={updateContentImage}
                                        alt=""
                                        fit="cover"
                                        className="absolute right-2 top-2 h-8 w-8 rounded-lg"
                                    />
                                ) : null}
                                <div className="relative z-10 flex flex-col gap-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p title={t.name} className={`truncate text-sm font-black ${hasImage ? 'text-white' : 'text-slate-900 dark:text-foreground'}`}>{toTitleCase(t.name)}</p>
                                        <div className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] ${hasImage ? 'text-slate-300' : 'text-slate-500 dark:text-muted-foreground'}`}>
                                            <span className="flex items-center gap-1"><Calendar size={10} />{t.date}</span>
                                            {gameName && <span className="flex items-center gap-1"><MapPin size={10} />{gameName}</span>}
                                        </div>
                                    </div>
                                    <span className={`shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 font-title text-[11px] ${badgeClass}`}>
                                        {position ?? '—'}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${hasImage ? 'text-slate-300' : 'text-slate-500 dark:text-muted-foreground'}`}>
                                    <span>{FORMAT_LABEL[t.tournament_format] ?? t.tournament_format}</span>
                                </div>
                                {standing && (
                                    <div className={`flex items-center gap-3 border-t pt-2 text-xs ${hasImage ? 'border-white/15' : 'border-slate-200 dark:border-border'}`}>
                                        <span className={`font-black ${hasImage ? 'text-slate-200' : 'text-slate-800 dark:text-foreground'}`}>{standing.points} pt</span>
                                        <span className={hasImage ? 'text-slate-400' : 'text-slate-500 dark:text-muted-foreground'}>{standing.raceWins} vittorie</span>
                                        <span className={hasImage ? 'text-slate-400' : 'text-slate-500 dark:text-muted-foreground'}>{standing.podiums} podi</span>
                                    </div>
                                )}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default PlayerTournamentHistory
