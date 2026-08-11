import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage, inventoryApi, tournamentsApi, cardLog as cardLogUtil } from '@/services/apiClient'
import { findPlayerGroup } from '@/lib/groupStage'
import { toast } from 'sonner'

// Tre effetti Master, ciascuno su un AVVERSARIO (bersaglio scelto dal
// possessore della carta) tranne "gara_extra" che non ne ha bisogno:
//   - ban_pista/imponi_personaggio riguardano una gara che potrebbe non
//     esistere ancora (creazione gara+risultati è un unico salvataggio, vedi
//     ClassicRaceForm) — needsRace è false apposta: si dichiarano "in
//     sospeso" (nessuna gara scelta qui) e vengono proposti/risolti alla
//     prossima gara che coinvolge il bersaglio.
//   - ferma_tutti (Guscio Blu) è invece retroattivo su una gara già
//     giocata dal vivo: needsRace resta true, si sceglie tra le gare esistenti.
export const MASTER_EFFECTS = [
    { value: 'ban_pista', label: 'Annulla la pista scelta da un avversario e impone la propria', needsTarget: true, needsCircuit: true },
    { value: 'imponi_personaggio', label: 'Impone un personaggio a un avversario per una gara', needsTarget: true, needsCharacter: true },
    { value: 'gara_extra', label: 'Aggiunge una gara a fine torneo', needsTarget: false },
]
export const SHELL_EFFECTS = [
    { value: 'ferma_tutti', label: 'Tutti fermi per un giro — chi la usa parte con un giro di vantaggio', needsRace: true },
]

// Centralizza lo stato e la logica del meta-gioco "Carte Potere" per una
// pagina torneo — prima erano 13 useState + 3 handler sparsi in
// TournamentDetail.jsx, letti da 4 punti diversi (tab Carte player, timeline
// gare admin, sezione Carte admin, modale di registrazione uso). Estratto
// qui perché nessuno di quei consumer ha bisogno di sapere COME viene
// caricato/aggiornato lo stato, solo di leggerlo/invocare gli handler.
export const useTournamentCards = ({ tournamentId, tournamentStatus, tournamentParticipants, tournament, user, refresh }) => {
    const [inventory, setInventory] = useState([])
    const [localCardLog, setLocalCardLog] = useState([])
    const [showCardModal, setShowCardModal] = useState(false)
    const [selectedCard, setSelectedCard] = useState(null)
    const [cardEffectOption, setCardEffectOption] = useState('')
    const [cardTargetId, setCardTargetId] = useState('')
    const [cardEffectOwner, setCardEffectOwner] = useState('')
    const [cardRaceId, setCardRaceId] = useState('')
    const [cardImposedCircuitId, setCardImposedCircuitId] = useState('')
    const [cardImposedCharacterId, setCardImposedCharacterId] = useState('')
    const [usingCard, setUsingCard] = useState(false)
    const [availableCards, setAvailableCards] = useState({ master: 0, blue_shell: 0 })
    const [cardHolders, setCardHolders] = useState([])
    const [cardHistory, setCardHistory] = useState([])
    const [pendingEffects, setPendingEffects] = useState([])

    const refreshPendingEffects = useCallback(() => {
        if (!tournamentId) return
        inventoryApi.tournamentPendingEffects(tournamentId).then((res) => {
            setPendingEffects(res.data ?? [])
        }).catch(() => {})
    }, [tournamentId])

    // Carica inventario, carte disponibili, holders, log ed effetti in sospeso al mount
    useEffect(() => {
        inventoryApi.me().then((res) => setInventory(res.data ?? [])).catch(() => {})
        if (tournamentId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocalCardLog(cardLogUtil.get(tournamentId))
            inventoryApi.tournamentAvailable(tournamentId).then((res) => {
                setAvailableCards(res.data ?? { master: 0, blue_shell: 0 })
            }).catch(() => {})
            inventoryApi.tournamentHolders(tournamentId).then((res) => {
                setCardHolders(res.data ?? [])
            }).catch(() => {})
            inventoryApi.tournamentHistory(tournamentId).then((res) => {
                setCardHistory(res.data ?? [])
            }).catch(() => {})
            refreshPendingEffects()
        }
    }, [tournamentId, refreshPendingEffects])

    const openCardModal = (cardType) => {
        if (tournamentStatus !== 'in_corso') {
            toast.error('Le carte si possono usare solo quando il torneo è IN CORSO')
            return
        }
        setSelectedCard({ card_type: cardType, card_name: cardType === 'master' ? 'Carta Master' : 'Guscio Blu' })
        // Il Guscio Blu ha un solo effetto possibile: si preseleziona da solo.
        setCardEffectOption(cardType === 'blue_shell' ? SHELL_EFFECTS[0].value : '')
        setCardTargetId('')
        setCardEffectOwner('')
        setCardRaceId('')
        setCardImposedCircuitId('')
        setCardImposedCharacterId('')
        setShowCardModal(true)
    }

    // Players who own the currently selected card type
    const cardTypeHolders = selectedCard
        ? cardHolders.filter((h) =>
              selectedCard.card_type === 'master' ? h.master_count > 0 : h.blue_shell_count > 0
          )
        : []

    const selectedEffectDef = selectedCard
        ? (selectedCard.card_type === 'master' ? MASTER_EFFECTS : SHELL_EFFECTS).find((e) => e.value === cardEffectOption)
        : null

    const handleUseCard = async () => {
        if (!selectedCard || !selectedEffectDef) return
        if (!cardEffectOwner) { toast.error('Seleziona il portatore della carta'); return }
        if (selectedEffectDef.needsTarget && !cardTargetId) { toast.error('Seleziona il giocatore bersaglio'); return }
        if (selectedEffectDef.needsCircuit && !cardImposedCircuitId) { toast.error('Seleziona la pista imposta'); return }
        if (selectedEffectDef.needsCharacter && !cardImposedCharacterId) { toast.error('Seleziona il personaggio imposto'); return }
        if (selectedEffectDef.needsRace && !cardRaceId) { toast.error('Seleziona la gara'); return }

        const targetPlayer = tournamentParticipants.find((p) => String(p.id) === String(cardTargetId))
        const targetNickname = targetPlayer?.nickname ?? null
        const ownerPlayer = tournamentParticipants.find((p) => String(p.id) === String(cardEffectOwner))
        const ownerNickname = ownerPlayer?.nickname ?? `#${cardEffectOwner}`

        const ownerGroup = tournament.tournament_format === 'group_stage'
            ? findPlayerGroup(tournament.format_data, Number(cardEffectOwner))
            : null

        setUsingCard(true)
        try {
            const logEntry = {
                card_type: selectedCard.card_type,
                card_name: selectedCard.card_name,
                effect: selectedEffectDef.label,
                target_nickname: targetNickname,
                used_by_nickname: ownerNickname,
                registered_by: user?.player?.nickname ?? user?.username ?? 'Admin',
                race_id: selectedEffectDef.needsRace && cardRaceId ? Number(cardRaceId) : null,
                group_name: ownerGroup?.groupName ?? null,
                phase: ownerGroup?.phase ?? null,
            }
            cardLogUtil.add(tournamentId, logEntry)
            setLocalCardLog(cardLogUtil.get(tournamentId))

            await inventoryApi.adminUse({
                player_id: Number(cardEffectOwner),
                card_type: selectedCard.card_type,
                tournament_id: tournament.id,
                effect: selectedEffectDef.label,
                race_id: selectedEffectDef.needsRace ? Number(cardRaceId) : null,
                target_player_id: selectedEffectDef.needsTarget ? Number(cardTargetId) : null,
                imposed_circuit_id: selectedEffectDef.needsCircuit ? Number(cardImposedCircuitId) : null,
                imposed_character_id: selectedEffectDef.needsCharacter ? Number(cardImposedCharacterId) : null,
                phase: ownerGroup?.phase ?? null,
                group_name: ownerGroup?.groupName ?? null,
            })

            // "Gara extra": si applica subito, non serve una gara/bersaglio —
            // aumenta il numero di gare previste del torneo.
            if (cardEffectOption === 'gara_extra') {
                await tournamentsApi.update(tournament.id, { n_races: (tournament.n_races ?? 0) + 1 })
                await refresh?.()
            }

            const fresh = await inventoryApi.tournamentAvailable(tournamentId)
            setAvailableCards(fresh.data ?? { master: 0, blue_shell: 0 })

            const history = await inventoryApi.tournamentHistory(tournamentId)
            setCardHistory(history.data ?? [])

            refreshPendingEffects()

            toast.success(`${selectedCard.card_name} consumata!`, {
                description: `${ownerNickname} → "${selectedEffectDef.label}"${targetNickname ? ` contro ${targetNickname}` : ''}`,
            })
            setShowCardModal(false)
            setSelectedCard(null)
            setCardEffectOwner('')
            setCardRaceId('')
            setCardImposedCircuitId('')
            setCardImposedCharacterId('')
        } catch (err) {
            toast.error('Impossibile registrare l\'uso', { description: getApiErrorMessage(err) })
        } finally {
            setUsingCard(false)
        }
    }

    return {
        inventory,
        localCardLog,
        showCardModal, setShowCardModal,
        selectedCard, setSelectedCard,
        cardEffectOption, setCardEffectOption,
        cardTargetId, setCardTargetId,
        cardEffectOwner, setCardEffectOwner,
        cardRaceId, setCardRaceId,
        cardImposedCircuitId, setCardImposedCircuitId,
        cardImposedCharacterId, setCardImposedCharacterId,
        selectedEffectDef,
        usingCard,
        availableCards,
        cardHolders,
        cardHistory,
        cardTypeHolders,
        pendingEffects,
        refreshPendingEffects,
        openCardModal,
        handleUseCard,
    }
}
