/**
 * ClassicRaceForm — Inserimento gara torneo classic, in un solo salvataggio.
 *
 * Sostituisce la coppia RaceCreator (crea una gara vuota) + ResultEntryForm
 * (un risultato alla volta, quattro tendine per pilota): con 8+ partecipanti
 * il vecchio flusso richiedeva decine di interazioni per gara. Qui si sceglie
 * il circuito e si clicca l'ordine di arrivo — le posizioni si assegnano da
 * sole, stesso principio già usato dai gironi (GroupRaceForm) e dalla
 * classifica a click-in-sequenza della schedina (ClickRankRow).
 *
 * Props:
 *   tournament   {object}   — torneo completo (id, races, n_players)
 *   participants {array}    — partecipanti attivi (esclusi i ritirati) [{id, nickname, img_url, favorite_character_id}]
 *   circuits     {array}    — circuiti del gioco [{id, name}]
 *   characters   {array}    — personaggi del gioco [{id, name, img_url}]
 *   disabled     {boolean}  — torneo non in corso: form visibile ma bloccato
 *   onCreated    {function} — callback dopo submit riuscito
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Flag, Users, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { racesApi, resultsApi, getApiErrorMessage } from '@/services/apiClient'
import { getPlayerPreviousCharacterId } from '@/lib/raceEntry'
import { computePunteggi, medalFor, hasPunteggi } from '@/lib/punteggi'
import CircuitPicker from '@/components/tournaments/CircuitPicker'
import CharacterPicker from '@/components/tournaments/CharacterPicker'
import ClickRankRow from '@/components/common/ClickRankRow'
import { useAppData } from '@/context/AppDataContext'

const ClassicRaceForm = ({ tournament, participants = [], circuits = [], characters = [], disabled = false, onCreated }) => {
    const { results } = useAppData()

    const [order, setOrder] = useState([]) // sequenza di player id nell'ordine cliccato
    const [charactersByPlayer, setCharactersByPlayer] = useState({})
    const [circuitId, setCircuitId] = useState('')
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState([])

    const nextRaceOrder = useMemo(() => (tournament?.races?.length ?? 0) + 1, [tournament?.races])

    // Circuiti già usati in gare non-duello del torneo (stessa regola del
    // vecchio RaceCreator): restano selezionabili altrove ma non qui.
    const usedCircuitIds = useMemo(() => {
        return new Set((tournament?.races ?? []).filter((race) => !race.is_duello).map((race) => race.circuit_id))
    }, [tournament?.races])
    const availableCircuits = useMemo(() => circuits.filter((c) => !usedCircuitIds.has(c.id)), [circuits, usedCircuitIds])
    const noCircuitsLeft = circuits.length > 0 && availableCircuits.length === 0

    // Precompila il personaggio di ogni partecipante (ultimo usato in questo
    // torneo, altrimenti il preferito) così il picker si tocca solo quando il
    // pilota ha davvero cambiato. Riseeding solo quando cambia l'elenco
    // partecipanti (non a ogni refresh) per non sovrascrivere scelte manuali:
    // TournamentDetail fa polling ogni 20s mentre il torneo è in corso.
    const seededKeyRef = useRef(null)
    useEffect(() => {
        const key = participants.map((p) => p.id).join(',')
        if (seededKeyRef.current === key) return
        seededKeyRef.current = key
        const seeded = {}
        participants.forEach((p) => {
            const previous = getPlayerPreviousCharacterId({ playerId: p.id, results, races: tournament?.races ?? [] })
            seeded[p.id] = String(previous ?? p.favorite_character_id ?? '')
        })
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCharactersByPlayer(seeded)
    }, [participants, results, tournament?.races])

    const toggleRank = (id) => {
        setOrder((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
        setErrors([])
    }

    const setPlayerCharacter = (id, characterId) => {
        setCharactersByPlayer((prev) => ({ ...prev, [id]: String(characterId) }))
    }

    const playerMap = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])

    const punti = hasPunteggi(tournament?.n_players) ? computePunteggi(tournament.n_players) : null

    const validate = () => {
        const problemi = []
        if (!circuitId) problemi.push('Seleziona un circuito per questa gara.')
        if (order.length !== participants.length) {
            problemi.push(`Assegna la posizione a tutti e ${participants.length} i piloti (mancano ${participants.length - order.length}).`)
        }
        const senzaPersonaggio = order.filter((id) => !charactersByPlayer[id])
        if (senzaPersonaggio.length > 0) problemi.push('Assegna un personaggio a ogni pilota.')
        return problemi
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const problemi = validate()
        if (problemi.length > 0) { setErrors(problemi); return }

        setSaving(true)
        try {
            const raceRes = await racesApi.create({
                name: `Gara ${nextRaceOrder}`,
                race_order: nextRaceOrder,
                tournament_id: tournament.id,
                circuit_id: Number(circuitId),
            })
            const raceId = raceRes.data.id

            await Promise.all(
                order.map((playerId, index) => resultsApi.create({
                    race_id: raceId,
                    player_id: Number(playerId),
                    character_id: Number(charactersByPlayer[playerId]) || (playerMap.get(playerId)?.favorite_character_id ?? 1),
                    position: index + 1,
                }))
            )

            toast.success(`Gara ${nextRaceOrder} inserita!`, {
                description: circuits.find((c) => String(c.id) === String(circuitId))?.name ?? '',
            })

            setOrder([])
            setCircuitId('')
            setErrors([])
            onCreated?.()
        } catch (err) {
            toast.error('Errore durante il salvataggio', {
                description: `${getApiErrorMessage(err)} — alcuni risultati potrebbero non essere stati salvati, verifica nel tab Gare.`,
            })
        } finally {
            setSaving(false)
        }
    }

    if (participants.length < 2) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-border bg-white dark:bg-card p-6 text-sm text-slate-500 dark:text-muted-foreground">
                Servono almeno 2 partecipanti attivi per registrare una gara — gestiscili nella sezione Partecipanti.
            </div>
        )
    }

    const placed = order.map((id) => playerMap.get(id)).filter(Boolean)
    const pool = participants.filter((p) => !order.includes(p.id))
    const readyToSave = errors.length === 0 && order.length === participants.length && circuitId

    return (
        <form onSubmit={handleSubmit} className={`space-y-5 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/20 ${disabled ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3 rounded-2xl border border-blue-400/40 bg-blue-500/8 px-4 py-3 text-blue-700 dark:text-blue-300">
                <Flag size={15} className="shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-70">Registra gara</p>
                    <p className="text-sm font-black leading-tight">Gara {nextRaceOrder}</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white/60 dark:bg-black/20 px-2.5 py-1">
                    <Users size={11} />
                    <span className="text-[10px] font-black">{participants.length} piloti</span>
                </div>
            </div>

            {disabled && (
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Torneo completato — non è possibile inserire altre gare.</p>
            )}

            <fieldset disabled={disabled || saving} className="space-y-5">
                {/* Circuito */}
                <div className="space-y-1.5">
                    {noCircuitsLeft ? (
                        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/8 px-4 py-3">
                            <p className="text-xs font-black text-amber-700 dark:text-amber-300">Tutti i circuiti sono già stati usati in questo torneo.</p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Elimina una gara dal tab Gare per liberare un circuito.</p>
                        </div>
                    ) : (
                        <CircuitPicker
                            circuits={circuits}
                            value={circuitId}
                            onChange={(id) => { setCircuitId(id); setErrors([]) }}
                            usedCircuitIds={usedCircuitIds}
                            label="Circuito"
                            placeholder="Seleziona un circuito"
                        />
                    )}
                </div>

                {/* Ordine di arrivo — click in sequenza */}
                <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-muted-foreground">
                        Ordine di arrivo
                    </label>

                    {placed.length > 0 && (
                        <div className="space-y-2">
                            {placed.map((p, idx) => (
                                <div key={p.id} className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <ClickRankRow
                                            player={p}
                                            pos={idx}
                                            total={participants.length}
                                            complete={order.length === participants.length}
                                            onToggle={toggleRank}
                                        />
                                    </div>
                                    {characters.length > 0 && (
                                        <CharacterPicker
                                            characters={characters}
                                            value={charactersByPlayer[p.id] ?? ''}
                                            onChange={(id) => setPlayerCharacter(p.id, id)}
                                        />
                                    )}
                                    {punti && (
                                        <div className="flex flex-col items-center w-8 shrink-0">
                                            <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground leading-none">pt</span>
                                            <span className="text-sm font-black text-slate-900 dark:text-foreground leading-tight">{punti[idx] ?? '—'}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {pool.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                                {order.length === 0 ? 'Clicca il pilota che arriverà 1°' : `Da posizionare — clicca per assegnare il ${medalFor(order.length)} posto`}
                            </p>
                            {pool.map((p) => (
                                <ClickRankRow
                                    key={p.id}
                                    player={p}
                                    pos={-1}
                                    total={participants.length}
                                    complete={false}
                                    onToggle={toggleRank}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </fieldset>

            {/* Errori */}
            {errors.length > 0 && (
                <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/8 px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <AlertCircle size={13} className="shrink-0" />
                        <p className="text-xs font-black">Correggi prima di salvare</p>
                    </div>
                    {errors.map((err, i) => (
                        <p key={i} className="text-[11px] text-rose-500 dark:text-rose-400 pl-5">{err}</p>
                    ))}
                </div>
            )}

            {/* Anteprima */}
            {readyToSave && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/8 px-4 py-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                        <CheckCircle2 size={13} />
                        <p className="text-xs font-black">Pronto per il salvataggio</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pl-5">
                        {placed.map((p, i) => {
                            const ch = characters.find((c) => String(c.id) === String(charactersByPlayer[p.id]))
                            return (
                                <p key={p.id} className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    {i === 0 ? <Trophy size={11} className="text-amber-500 shrink-0" /> : <span>{medalFor(i)}</span>} {p.nickname}
                                    {ch && <span className="opacity-60">· {ch.name}</span>}
                                    {punti && <span className="font-black ml-auto">{punti[i] ?? '—'} pt</span>}
                                </p>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={disabled || saving}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3.5 text-sm font-black uppercase tracking-widest text-white transition active:scale-[0.98]"
            >
                {saving
                    ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
                    : <><Trophy size={15} /> Salva gara {nextRaceOrder}</>
                }
            </button>
        </form>
    )
}

export default ClassicRaceForm
