/**
 * ClassicRaceForm — Inserimento/modifica gara torneo classic, in un solo salvataggio.
 *
 * Modalità creazione (default): sostituisce la vecchia coppia RaceCreator (crea una
 * gara vuota) + ResultEntryForm (un risultato alla volta): si sceglie il circuito e si
 * clicca l'ordine di arrivo — le posizioni si assegnano da sole, stesso principio già
 * usato dai gironi (GroupRaceForm) e dalla classifica a click-in-sequenza della
 * schedina (ClickRankRow).
 *
 * Modalità modifica (prop `editingRace`): stesso form, precompilato con circuito,
 * ordine e personaggi della gara esistente — sostituisce sia il vecchio modale
 * "modifica gara" (solo nome/ordine/circuito) sia "modifica risultato" (un pilota alla
 * volta). L'insieme dei piloti non cambia: si possono solo riordinare le posizioni e
 * cambiare i personaggi.
 *
 * Props:
 *   tournamentId {number}    — id del torneo
 *   races        {array}     — gare del torneo (per calcolare il prossimo numero e i circuiti già usati)
 *   nPlayers     {number?}   — tournament.n_players, solo per l'anteprima punti (opzionale)
 *   participants {array}     — piloti selezionabili [{id, nickname, img_url, favorite_character_id}]
 *                               (in modifica: i piloti che hanno corso QUESTA gara)
 *   circuits     {array}     — circuiti del gioco [{id, name}]
 *   characters   {array}     — personaggi del gioco [{id, name, img_url}]
 *   disabled     {boolean}   — torneo non in corso: form visibile ma bloccato
 *   editingRace  {object?}   — gara da modificare (con .results popolati); assente = crea
 *   pendingEffects {array}   — effetti Master (ban_pista/imponi_personaggio) dichiarati
 *                               ma non ancora collegati a una gara (solo modalità creazione:
 *                               vedi inventoryApi.tournamentPendingEffects) — proposti in
 *                               automatico e risolti al salvataggio se il bersaglio corre in questa gara
 *   onSaved      {function}  — callback dopo submit riuscito (creazione o modifica)
 *   onCardEffectsResolved {function} — callback dopo aver collegato effetti in sospeso a questa gara
 */
import { useState, useMemo } from 'react'
import { AlertCircle, Loader2, Flag, Shield, Users, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { racesApi, resultsApi, inventoryApi, getApiErrorMessage } from '@/services/apiClient'
import { getPlayerPreviousCharacterId, resolveFavoriteCharacterId } from '@/lib/raceEntry'
import { computePunteggi, medalFor, hasPunteggi } from '@/lib/punteggi'
import CircuitPicker from '@/components/tournaments/CircuitPicker'
import CharacterPicker from '@/components/tournaments/CharacterPicker'
import ClickRankRow from '@/components/common/ClickRankRow'
import { useAppData } from '@/context/AppDataContext'

const ClassicRaceForm = ({ tournamentId, races = [], nPlayers, participants = [], circuits = [], characters = [], disabled = false, editingRace = null, pendingEffects = [], onSaved, onCardEffectsResolved }) => {
    const { results } = useAppData()
    const isEditing = Boolean(editingRace)

    const initialOrder = useMemo(() => {
        if (!editingRace) return []
        return [...(editingRace.results ?? [])]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((r) => r.player_id)
    }, [editingRace])

    const initialCharacters = useMemo(() => {
        const map = {}
        ;(editingRace?.results ?? []).forEach((r) => { map[r.player_id] = String(r.character_id ?? '') })
        return map
    }, [editingRace])

    const [order, setOrder] = useState(initialOrder) // sequenza di player id nell'ordine cliccato
    const [charactersByPlayer, setCharactersByPlayer] = useState(initialCharacters)
    const [circuitId, setCircuitId] = useState(editingRace ? String(editingRace.circuit_id ?? '') : '')
    const [name, setName] = useState(editingRace?.name ?? '')
    const [raceOrderInput, setRaceOrderInput] = useState(editingRace?.race_order ?? '')
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState([])

    const nextRaceOrder = useMemo(() => (races?.length ?? 0) + 1, [races])

    // Circuiti già usati in gare non-duello del torneo; in modifica va escluso il
    // circuito della gara stessa, altrimenti risulterebbe "già usato" da se stessa.
    const usedCircuitIds = useMemo(() => {
        const ids = new Set(races.filter((race) => !race.is_duello).map((race) => race.circuit_id))
        if (editingRace) ids.delete(editingRace.circuit_id)
        return ids
    }, [races, editingRace])
    const availableCircuits = useMemo(() => circuits.filter((c) => !usedCircuitIds.has(c.id)), [circuits, usedCircuitIds])
    const noCircuitsLeft = circuits.length > 0 && availableCircuits.length === 0

    const playerMap = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])

    // Effetti Master "in sospeso" (ban_pista/imponi_personaggio) che riguardano
    // un partecipante di QUESTA gara — solo in creazione: in modifica l'ordine
    // dei piloti è già quello della gara esistente, un cambio pista/pg
    // retroattivo non avrebbe senso qui.
    const relevantPendingEffects = useMemo(() => {
        if (isEditing) return []
        const participantIds = new Set(participants.map((p) => p.id))
        return pendingEffects.filter((e) => participantIds.has(e.target_player_id))
    }, [isEditing, pendingEffects, participants])
    const pendingCircuitEffects = relevantPendingEffects.filter((e) => e.imposed_circuit_id != null)
    const pendingCharacterEffectsByTarget = useMemo(() => {
        const map = new Map()
        relevantPendingEffects
            .filter((e) => e.imposed_character_id != null)
            .forEach((e) => map.set(e.target_player_id, e))
        return map
    }, [relevantPendingEffects])

    // Il personaggio "precedente" si calcola al VOLO quando un pilota viene
    // piazzato (stesso approccio di GroupRaceForm.setSlotPlayer), non con un
    // pre-seeding in blocco all'apertura: pre-calcolare tutto in anticipo e
    // proteggerlo con un ref sull'elenco partecipanti si bloccava dopo la
    // prima gara (l'elenco non cambia da una gara all'altra, quindi il
    // re-seed non scattava mai) e la "memoria" smetteva di aggiornarsi.
    const toggleRank = (id) => {
        setOrder((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id)
            setCharactersByPlayer((chars) => {
                if (chars[id]) return chars // già scelto manualmente in questa sessione: non sovrascrivere
                const player = playerMap.get(id)
                const previous = getPlayerPreviousCharacterId({ playerId: id, results, races })
                const favorite = resolveFavoriteCharacterId(player, characters)
                return { ...chars, [id]: String(previous ?? favorite ?? '') }
            })
            return [...prev, id]
        })
        setErrors([])
    }

    const setPlayerCharacter = (id, characterId) => {
        setCharactersByPlayer((prev) => ({ ...prev, [id]: String(characterId) }))
    }

    const punti = hasPunteggi(nPlayers) ? computePunteggi(nPlayers) : null

    const validate = () => {
        const problemi = []
        if (!circuitId) problemi.push('Seleziona un circuito per questa gara.')
        if (isEditing && !raceOrderInput) problemi.push('Indica il numero d\'ordine della gara.')
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
            if (isEditing) {
                await racesApi.update(editingRace.id, {
                    name: name.trim() || `Gara ${raceOrderInput}`,
                    race_order: Number(raceOrderInput),
                    tournament_id: tournamentId,
                    circuit_id: Number(circuitId),
                })
                await racesApi.reorderResults(editingRace.id, (editingRace.results ?? []).map((result) => ({
                    result_id: result.id,
                    position: order.indexOf(result.player_id) + 1,
                    character_id: Number(charactersByPlayer[result.player_id]),
                })))
                toast.success('Gara aggiornata')
            } else {
                const raceRes = await racesApi.create({
                    name: `Gara ${nextRaceOrder}`,
                    race_order: nextRaceOrder,
                    tournament_id: tournamentId,
                    circuit_id: Number(circuitId),
                })
                const raceId = raceRes.data.id

                await Promise.all(
                    order.map((playerId, index) => resultsApi.create({
                        race_id: raceId,
                        player_id: Number(playerId),
                        character_id: Number(charactersByPlayer[playerId]) || (resolveFavoriteCharacterId(playerMap.get(playerId), characters) ?? 1),
                        position: index + 1,
                    }))
                )

                if (relevantPendingEffects.length > 0) {
                    await Promise.all(
                        relevantPendingEffects.map((e) => inventoryApi.resolveCardUsage(e.id, raceId))
                    )
                    onCardEffectsResolved?.()
                }

                toast.success(`Gara ${nextRaceOrder} inserita!`, {
                    description: circuits.find((c) => String(c.id) === String(circuitId))?.name ?? '',
                })

                setOrder([])
                setCircuitId('')
                setCharactersByPlayer({})
            }
            setErrors([])
            onSaved?.()
        } catch (err) {
            toast.error('Errore durante il salvataggio', {
                description: isEditing
                    ? getApiErrorMessage(err)
                    : `${getApiErrorMessage(err)} — alcuni risultati potrebbero non essere stati salvati, verifica nel tab Gare.`,
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

    return (
        <form onSubmit={handleSubmit} className={`space-y-5 rounded-3xl border border-slate-200 dark:border-border bg-white dark:bg-card p-6 shadow-lg shadow-slate-200/60 dark:shadow-black/20 ${disabled ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3 rounded-2xl border border-blue-400/40 bg-blue-500/8 px-4 py-3 text-blue-700 dark:text-blue-300">
                <Flag size={15} className="shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-70">{isEditing ? 'Modifica gara' : 'Registra gara'}</p>
                    <p className="text-sm font-black leading-tight">Gara {isEditing ? editingRace.race_order : nextRaceOrder}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/60 dark:bg-black/20 px-2.5 py-1">
                    <Users size={11} className="shrink-0" />
                    <span className="text-[10px] font-black whitespace-nowrap">{participants.length} piloti</span>
                </div>
            </div>

            {disabled && (
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Torneo completato — non è possibile {isEditing ? 'modificare' : 'inserire altre'} gare.</p>
            )}

            <fieldset disabled={disabled || saving} className="space-y-5">
                {isEditing && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="space-y-1.5 sm:col-span-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Ordine gara</span>
                            <input type="number" min="1" value={raceOrderInput} onChange={(e) => setRaceOrderInput(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5 text-sm text-slate-900 dark:text-foreground outline-none focus:border-blue-500" />
                        </label>
                        <label className="space-y-1.5 sm:col-span-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-muted-foreground">Nome gara</span>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Gara ${raceOrderInput}`}
                                className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5 text-sm text-slate-900 dark:text-foreground outline-none focus:border-blue-500" />
                        </label>
                    </div>
                )}

                {/* Effetti Master in sospeso su una pista — proposti alla prima gara che coinvolge il bersaglio */}
                {pendingCircuitEffects.length > 0 && (
                    <div className="rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 space-y-2">
                        {pendingCircuitEffects.map((e) => {
                            const imposedCircuit = circuits.find((c) => c.id === e.imposed_circuit_id)
                            return (
                                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                                        <Shield size={12} className="shrink-0" />
                                        Pista imposta da Carta Master di <strong>{e.owner_nickname}</strong> su{' '}
                                        <strong>{e.target_nickname}</strong>: {imposedCircuit?.name ?? `#${e.imposed_circuit_id}`}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setCircuitId(String(e.imposed_circuit_id)); setErrors([]) }}
                                        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-amber-400"
                                    >
                                        Applica
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}

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
                            disabled={disabled}
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
                            {placed.map((p, idx) => {
                                const pendingCharacterEffect = pendingCharacterEffectsByTarget.get(p.id)
                                return (
                                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <ClickRankRow
                                            player={p}
                                            pos={idx}
                                            total={participants.length}
                                            complete={order.length === participants.length}
                                            onToggle={toggleRank}
                                            disabled={disabled}
                                        />
                                        {pendingCharacterEffect && (
                                            <button
                                                type="button"
                                                onClick={() => setPlayerCharacter(p.id, pendingCharacterEffect.imposed_character_id)}
                                                className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 pl-1"
                                            >
                                                <Shield size={11} className="shrink-0" />
                                                PG imposto da Carta Master di {pendingCharacterEffect.owner_nickname}: {characters.find((c) => c.id === pendingCharacterEffect.imposed_character_id)?.name ?? `#${pendingCharacterEffect.imposed_character_id}`} — applica
                                            </button>
                                        )}
                                    </div>
                                    {/* Su mobile, personaggio + punti in riga propria sotto al rank
                                    row invece che sulla stessa riga (shrink-0, non si comprimono):
                                    da sm in su `sm:contents` li fa tornare figli diretti della riga
                                    padre, ripristinando il layout affiancato originale. */}
                                    <div className="flex items-center justify-end gap-2 sm:contents">
                                        {characters.length > 0 && (
                                            <CharacterPicker
                                                characters={characters}
                                                value={charactersByPlayer[p.id] ?? ''}
                                                onChange={(id) => setPlayerCharacter(p.id, id)}
                                                disabled={disabled}
                                            />
                                        )}
                                        {punti && (
                                            <div className="flex flex-col items-center w-8 shrink-0">
                                                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 dark:text-muted-foreground leading-none">pt</span>
                                                <span className="text-sm font-black text-slate-900 dark:text-foreground leading-tight">{punti[idx] ?? '—'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    )}

                    {pool.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
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
                                    disabled={disabled}
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

            {/* Submit */}
            <button
                type="submit"
                disabled={disabled || saving}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-500 hover:bg-blue-400 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3.5 text-sm font-black uppercase tracking-widest text-white transition active:scale-[0.98]"
            >
                {saving
                    ? <><Loader2 size={15} className="animate-spin" /> Salvataggio...</>
                    : isEditing
                        ? <><Trophy size={15} /> Salva modifiche</>
                        : <><Trophy size={15} /> Salva gara {nextRaceOrder}</>
                }
            </button>
        </form>
    )
}

export default ClassicRaceForm
