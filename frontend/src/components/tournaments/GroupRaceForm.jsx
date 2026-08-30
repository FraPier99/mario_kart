/**
 * GroupRaceForm — Inserimento gara modalità a gironi
 *
 * Props:
 *   tournament         {object}   — torneo completo (id, races, game_id)
 *   activeGroupPlayers {array}    — giocatori del girone corrente [{id, nickname, img_url, favorite_character_id}]
 *   circuits           {array}    — circuiti disponibili [{id, name}]
 *   characters         {array}    — personaggi del gioco [{id, name, img_url}] (opzionale, filtrabi per game)
 *   phase              {string}   — "group" | "finals"
 *   groupName          {string}   — "1" | "2" | ... | "top" | "bottom"
 *   onCreated          {function} — callback dopo submit riuscito
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { Trophy, AlertCircle, CheckCircle2, Loader2, Flag, Users } from 'lucide-react'
import { toast } from 'sonner'
import { racesApi, resultsApi, getApiErrorMessage } from '@/services/apiClient'
import { groupColor, groupLabel } from '@/lib/groupStage'
import { getPlayerPreviousCharacterId, resolveFavoriteCharacterId } from '@/lib/raceEntry'
import CircuitPicker from '@/components/tournaments/CircuitPicker'
import CharacterPicker from '@/components/tournaments/CharacterPicker'
import { useAppData } from '@/context/AppDataContext'

const PUNTI_4 = [5, 3, 2, 1]

const PHASE_LABEL = {
    group: 'Fase 1 — Gironi',
    semifinal: 'Fase 2 — Semifinali',
    finals: 'Fase finale',
}

const GROUP_COLOR_CLASSES = {
    blue:    'border-blue-400/50    bg-blue-500/8    text-blue-400',
    violet:  'border-violet-400/50  bg-violet-500/8  text-violet-400',
    emerald: 'border-emerald-400/50 bg-emerald-500/8 text-emerald-400',
    rose:    'border-rose-400/50    bg-rose-500/8    text-rose-400',
    cyan:    'border-cyan-400/50    bg-cyan-500/8    text-cyan-400',
    fuchsia: 'border-fuchsia-400/50 bg-fuchsia-500/8 text-fuchsia-400',
    lime:    'border-lime-400/50    bg-lime-500/8    text-lime-400',
    orange:  'border-orange-400/50  bg-orange-500/8  text-orange-400',
    amber:   'border-amber-400/50   bg-amber-500/8   text-amber-400',
    slate:   'border-slate-400/50   bg-slate-500/8   text-slate-400',
}

const MEDAL = ['🥇', '🥈', '🥉', '4°']

// ─── Main component ───────────────────────────────────────────────────────────

const GroupRaceForm = ({
    tournament,
    activeGroupPlayers = [],
    circuits = [],
    characters = [],
    phase = 'group',
    groupName = '1',
    onCreated,
    randomizeCircuit = false,
}) => {
    // Postazioni = numero effettivo di piloti del girone/batteria (3 o 4, vincolo schermo).
    const slotCount = Math.min(Math.max(activeGroupPlayers.length, 2), 4)
    const PUNTI = PUNTI_4.slice(0, slotCount)

    const { results } = useAppData()

    const emptySlots = () => Array.from({ length: slotCount }, (_, i) => ({
        playerId: '',
        characterId: resolveFavoriteCharacterId(activeGroupPlayers[i], characters) ?? '',
    }))

    const [slots, setSlots]               = useState(emptySlots)
    const [circuitId, setCircuitId]       = useState('')
    const [saving, setSaving]             = useState(false)
    const [errors, setErrors]             = useState([])

    const nextRaceOrder = useMemo(() => (tournament?.races?.length ?? 0) + 1, [tournament?.races])

    // Pool piste indipendente per fase/girone: una pista già usata in questa
    // combinazione fase+gruppo viene disabilitata, ma resta selezionabile per
    // gli altri gironi paralleli e si azzera completamente al passaggio di fase.
    // Per gli spareggi (randomizeCircuit), esclude anche le piste già usate
    // nelle gare ufficiali (non duello) del torneo.
    const usedCircuitIds = useMemo(() => {
        const ids = new Set(
            (tournament?.races ?? [])
                .filter((race) => race.phase === phase && race.group_name === groupName)
                .map((race) => race.circuit_id)
        )
        if (randomizeCircuit) {
            (tournament?.races ?? []).forEach((race) => {
                ids.add(race.circuit_id)
            })
        }
        return ids
    }, [tournament?.races, phase, groupName, randomizeCircuit])

    // Reset slots SOLO quando cambia davvero il contesto (fase+girone+slot),
    // non ad ogni riesecuzione dell'effetto — il polling di refresh di
    // TournamentDetail (ogni 20s mentre il torneo è in_corso) dà a
    // `tournament.races` una nuova identità di array ad ogni ciclo, che a
    // sua volta cambia `usedCircuitIds`/`circuits` e rieseguirebbe l'intero
    // effetto: senza la guardia sul key, questo cancellava silenziosamente
    // pilota/personaggio già selezionati (e, per i duelli con
    // randomizeCircuit, ri-randomizzava la pista) mentre l'utente stava
    // ancora compilando il form dal vivo. Se randomizeCircuit è attivo (es.
    // Spareggio a gara secca o duello podio), la stessa guardia preseleziona
    // una pista a caso tra quelle non ancora usate SOLO la prima volta per
    // questo specifico duello.
    const [noCircuitsLeft, setNoCircuitsLeft] = useState(false)
    const autoPickKeyRef = useRef(null)
    useEffect(() => {
        const key = `${phase}-${groupName}-${slotCount}`
        if (autoPickKeyRef.current === key) return
        autoPickKeyRef.current = key

        setSlots(emptySlots())
        setErrors([])

        if (!randomizeCircuit) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCircuitId('')
            return
        }

        const available = circuits.filter((c) => !usedCircuitIds.has(c.id))
        if (available.length === 0) {
            setNoCircuitsLeft(true)
            setCircuitId('')
        } else {
            setNoCircuitsLeft(false)
            const pick = available[Math.floor(Math.random() * available.length)]
            setCircuitId(pick ? String(pick.id) : '')
        }
    }, [phase, groupName, slotCount, usedCircuitIds, circuits, tournament?.races, randomizeCircuit])

    const setSlotPlayer = (index, playerId) => {
        setSlots((prev) => prev.map((s, i) => {
            if (i !== index) return s
            // Preferisce il personaggio dell'ultima gara giocata da questo
            // pilota in questo torneo; altrimenti il favorite_character_id.
            const player = activeGroupPlayers.find((p) => String(p.id) === String(playerId))
            const previousCharacterId = getPlayerPreviousCharacterId({ playerId, results, races: tournament?.races ?? [] })
            const favoriteCharacterId = resolveFavoriteCharacterId(player, characters)
            const characterId = previousCharacterId
                ? String(previousCharacterId)
                : favoriteCharacterId ? String(favoriteCharacterId) : s.characterId
            return { ...s, playerId, characterId }
        }))
        setErrors([])
    }

    const setSlotCharacter = (index, characterId) => {
        setSlots((prev) => prev.map((s, i) => i === index ? { ...s, characterId: String(characterId) } : s))
    }

    const validate = () => {
        const problemi = []
        if (!circuitId) problemi.push('Seleziona un circuito per questa gara.')
        const postiVuoti = slots.filter((s) => !s.playerId).length
        if (postiVuoti > 0) problemi.push(`Assegna tutti e ${slotCount} i posti (mancano ${postiVuoti}).`)
        const ids = slots.map((s) => s.playerId).filter(Boolean)
        if (new Set(ids).size !== ids.length) problemi.push('Lo stesso giocatore non può comparire in due posizioni.')
        const giocatoriValidi = new Set(activeGroupPlayers.map((p) => String(p.id)))
        const estranei = ids.filter((id) => !giocatoriValidi.has(String(id)))
        if (estranei.length > 0) problemi.push('Uno o più giocatori non appartengono a questo girone.')
        return problemi
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const problemi = validate()
        if (problemi.length > 0) { setErrors(problemi); return }

        setSaving(true)
        try {
            const racePayload = {
                name:          `Gara ${nextRaceOrder} — ${groupLabel(groupName)}`,
                race_order:    nextRaceOrder,
                tournament_id: tournament.id,
                circuit_id:    Number(circuitId),
                phase,
                group_name:    groupName,
                is_duello:     randomizeCircuit,
            }
            const raceRes = await racesApi.create(racePayload)
            const raceId  = raceRes.data.id

            await Promise.all(
                slots.map((slot, index) =>
                    resultsApi.create({
                        race_id:      raceId,
                        player_id:    Number(slot.playerId),
                        character_id: Number(slot.characterId) || (
                            resolveFavoriteCharacterId(
                                activeGroupPlayers.find((p) => String(p.id) === String(slot.playerId)),
                                characters
                            ) ?? 1
                        ),
                        position:     index + 1,
                    })
                )
            )

            toast.success(`Gara ${nextRaceOrder} inserita!`, {
                description: `${groupLabel(groupName)} · ${circuits.find((c) => String(c.id) === String(circuitId))?.name ?? ''}`,
            })

            setSlots(emptySlots())
            setCircuitId('')
            setErrors([])
            onCreated?.()
        } catch (err) {
            toast.error('Errore durante il salvataggio', { description: getApiErrorMessage(err) })
        } finally {
            setSaving(false)
        }
    }

    const usedPlayerIds = useMemo(
        () => new Set(slots.map((s) => s.playerId).filter(Boolean)),
        [slots]
    )

    const groupColorClass = GROUP_COLOR_CLASSES[groupColor(groupName)] ?? GROUP_COLOR_CLASSES.slate

    return (
        <form onSubmit={handleSubmit} className="space-y-5">

            {/* Header */}
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${groupColorClass}`}>
                <Flag size={15} className="shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-70">
                        {PHASE_LABEL[phase] ?? phase}
                    </p>
                    <p className="text-sm font-black leading-tight">
                        {groupLabel(groupName)}
                        <span className="ml-2 font-normal opacity-60">· Gara {nextRaceOrder}</span>
                    </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white/10 dark:bg-black/20 px-2.5 py-1">
                    <Users size={11} />
                    <span className="text-[10px] font-black">{activeGroupPlayers.length} piloti</span>
                </div>
            </div>

            {/* Circuito — pool indipendente per questa fase/girone */}
            <div className="space-y-1.5">
                {noCircuitsLeft ? (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/8 px-4 py-3">
                        <p className="text-xs font-black text-amber-700 dark:text-amber-300">
                            Tutti i circuiti sono già stati usati in questo torneo.
                        </p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                            Non ci sono piste disponibili per un nuovo duello. Elimina una gara per liberare un circuito.
                        </p>
                    </div>
                ) : (
                    <CircuitPicker
                        circuits={circuits}
                        value={circuitId}
                        onChange={(id) => { setCircuitId(id); setErrors([]) }}
                        disabled={saving}
                        usedCircuitIds={usedCircuitIds}
                        label={`Circuito · ${groupLabel(groupName)}`}
                        placeholder="Seleziona un circuito"
                    />
                )}
            </div>

            {/* 4 postazioni */}
            <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-muted-foreground">
                    Risultati — posizioni e personaggi
                </label>
                <div className="space-y-2">
                    {slots.map((slot, index) => {
                        const isFirst = index === 0
                        const selectedPlayer = activeGroupPlayers.find((p) => String(p.id) === String(slot.playerId))
                        return (
                            <div
                                key={index}
                                className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition-colors ${
                                    slot.playerId
                                        ? isFirst
                                            ? 'border-amber-400/60 bg-amber-500/8'
                                            : 'border-emerald-400/40 bg-emerald-500/6'
                                        : 'border-slate-200 dark:border-border bg-slate-50/50 dark:bg-card'
                                }`}
                            >
                                {/* Medaglia — nascosta sotto sm: puramente decorativa
                                    (l'ordine di posizione è già implicito nella lista e nel
                                    bordo ambra/verde della riga), toglierla libera spazio
                                    per il dropdown pilota che altrimenti si accalcava. */}
                                <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 dark:bg-muted text-sm font-black select-none">
                                    {MEDAL[index]}
                                </div>

                                {/* Punti */}
                                <div className="flex flex-col items-center w-6 sm:w-7 shrink-0">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground leading-none">pt</span>
                                    <span className="text-base font-black text-slate-900 dark:text-foreground leading-tight">{PUNTI[index]}</span>
                                </div>

                                {/* Avatar giocatore selezionato */}
                                <div className="shrink-0">
                                    {selectedPlayer?.img_url
                                        ? <img src={selectedPlayer.img_url} alt={selectedPlayer.nickname} className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl object-cover border-2 border-white dark:border-border" />
                                        : <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-slate-200 dark:bg-muted flex items-center justify-center text-[10px] font-black text-slate-500">
                                            {selectedPlayer?.nickname?.charAt(0)?.toUpperCase() ?? '?'}
                                          </div>
                                    }
                                </div>

                                {/* Dropdown giocatore */}
                                <select
                                    value={slot.playerId}
                                    onChange={(e) => setSlotPlayer(index, e.target.value)}
                                    disabled={saving}
                                    className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-muted px-2 py-2 text-sm font-black text-slate-900 dark:text-foreground outline-none focus:border-amber-500 dark:focus:border-amber-400 disabled:opacity-50"
                                >
                                    <option value="">— Pilota —</option>
                                    {activeGroupPlayers.map((p) => (
                                        <option
                                            key={p.id}
                                            value={p.id}
                                            disabled={usedPlayerIds.has(String(p.id)) && String(slot.playerId) !== String(p.id)}
                                        >
                                            {p.nickname}{usedPlayerIds.has(String(p.id)) && String(slot.playerId) !== String(p.id) ? ' ✓' : ''}
                                        </option>
                                    ))}
                                </select>

                                {/* Character picker */}
                                {characters.length > 0 && (
                                    <CharacterPicker
                                        characters={characters}
                                        value={slot.characterId}
                                        onChange={(id) => setSlotCharacter(index, id)}
                                        disabled={saving || !slot.playerId}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

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
            {errors.length === 0 && slots.every((s) => s.playerId) && circuitId && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/8 px-4 py-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                        <CheckCircle2 size={13} />
                        <p className="text-xs font-black">Pronto per il salvataggio</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pl-5">
                        {slots.map((slot, i) => {
                            const p = activeGroupPlayers.find((pl) => String(pl.id) === String(slot.playerId))
                            const ch = characters.find((c) => String(c.id) === String(slot.characterId))
                            return (
                                <p key={i} className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    {MEDAL[i]} {p?.nickname ?? '—'}
                                    {ch && <span className="opacity-60">· {ch.name}</span>}
                                    <span className="font-black ml-auto">{PUNTI[i]} pt</span>
                                </p>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3.5 text-sm font-black uppercase tracking-widest text-white transition active:scale-[0.98]"
            >
                {saving
                    ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
                    : <><Trophy size={15} /> Salva gara {nextRaceOrder}</>
                }
            </button>
        </form>
    )
}

export default GroupRaceForm
