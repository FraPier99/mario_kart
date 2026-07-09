import { useEffect, useState } from 'react'
import { getApiErrorMessage, inventoryApi, cardLog as cardLogUtil } from '@/services/apiClient'
import { findPlayerGroup } from '@/lib/groupStage'
import { toast } from 'sonner'

export const MASTER_EFFECTS = [
    { value: 'annulla_ritiro', label: 'Annulla ritiro' },
    { value: 'annulla_ammonizione', label: 'Annulla ammonizione' },
    { value: 'proteggi_posizione', label: 'Proteggi posizione in classifica' },
    { value: 'ripristina_risultato', label: 'Ripristina risultato gara' },
    { value: 'custom', label: 'Effetto personalizzato…' },
]
export const SHELL_EFFECTS = [
    { value: 'penalizzazione_pos', label: 'Penalizzazione −1 posizione' },
    { value: 'penalizzazione_partenza', label: 'Penalizzazione partenza arretrata' },
    { value: 'giro_extra', label: 'Giro extra di penalità' },
    { value: 'custom', label: 'Effetto personalizzato…' },
]

// Centralizza lo stato e la logica del meta-gioco "Carte Potere" per una
// pagina torneo — prima erano 13 useState + 3 handler sparsi in
// TournamentDetail.jsx, letti da 4 punti diversi (tab Carte player, timeline
// gare admin, sezione Carte admin, modale di registrazione uso). Estratto
// qui perché nessuno di quei consumer ha bisogno di sapere COME viene
// caricato/aggiornato lo stato, solo di leggerlo/invocare gli handler.
export const useTournamentCards = ({ tournamentId, tournamentStatus, tournamentParticipants, tournament, user }) => {
    const [inventory, setInventory] = useState([])
    const [localCardLog, setLocalCardLog] = useState([])
    const [showCardModal, setShowCardModal] = useState(false)
    const [selectedCard, setSelectedCard] = useState(null)
    const [cardEffectOption, setCardEffectOption] = useState('')
    const [cardEffectCustom, setCardEffectCustom] = useState('')
    const [cardTargetId, setCardTargetId] = useState('')
    const [cardEffectOwner, setCardEffectOwner] = useState('')
    const [cardRaceId, setCardRaceId] = useState('')
    const [usingCard, setUsingCard] = useState(false)
    const [availableCards, setAvailableCards] = useState({ master: 0, blue_shell: 0 })
    const [cardHolders, setCardHolders] = useState([])
    const [cardHistory, setCardHistory] = useState([])

    // Carica inventario, carte disponibili, holders e log al mount
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
        }
    }, [tournamentId])

    const openCardModal = (cardType) => {
        if (tournamentStatus !== 'in_corso') {
            toast.error('Le carte si possono usare solo quando il torneo è IN CORSO')
            return
        }
        setSelectedCard({ card_type: cardType, card_name: cardType === 'master' ? 'Carta Master' : 'Guscio Blu' })
        setCardEffectOption('')
        setCardEffectCustom('')
        setCardTargetId('')
        setCardEffectOwner('')
        setCardRaceId('')
        setShowCardModal(true)
    }

    // Players who own the currently selected card type
    const cardTypeHolders = selectedCard
        ? cardHolders.filter((h) =>
              selectedCard.card_type === 'master' ? h.master_count > 0 : h.blue_shell_count > 0
          )
        : []

    const handleUseCard = async () => {
        if (!selectedCard) return
        const isMaster = selectedCard.card_type === 'master'
        const effectLabel = cardEffectOption === 'custom'
            ? cardEffectCustom.trim()
            : (isMaster ? MASTER_EFFECTS : SHELL_EFFECTS).find((e) => e.value === cardEffectOption)?.label ?? cardEffectOption
        if (!effectLabel) { toast.error('Specifica l\'effetto della carta'); return }
        if (!cardEffectOwner) { toast.error('Seleziona il portatore della carta'); return }

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
                effect: effectLabel,
                target_nickname: targetNickname,
                used_by_nickname: ownerNickname,
                registered_by: user?.player?.nickname ?? user?.username ?? 'Admin',
                race_id: cardRaceId ? Number(cardRaceId) : null,
                group_name: ownerGroup?.groupName ?? null,
                phase: ownerGroup?.phase ?? null,
            }
            cardLogUtil.add(tournamentId, logEntry)
            setLocalCardLog(cardLogUtil.get(tournamentId))

            await inventoryApi.adminUse({
                player_id: Number(cardEffectOwner),
                card_type: selectedCard.card_type,
                effect: effectLabel,
                race_id: cardRaceId ? Number(cardRaceId) : null,
                phase: ownerGroup?.phase ?? null,
                group_name: ownerGroup?.groupName ?? null,
            })

            const fresh = await inventoryApi.tournamentAvailable(tournamentId)
            setAvailableCards(fresh.data ?? { master: 0, blue_shell: 0 })

            const history = await inventoryApi.tournamentHistory(tournamentId)
            setCardHistory(history.data ?? [])

            toast.success(`${selectedCard.card_name} consumata!`, {
                description: `${ownerNickname} → "${effectLabel}"${targetNickname ? ` contro ${targetNickname}` : ''}`,
            })
            setShowCardModal(false)
            setSelectedCard(null)
            setCardEffectOwner('')
            setCardRaceId('')
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
        cardEffectCustom, setCardEffectCustom,
        cardTargetId, setCardTargetId,
        cardEffectOwner, setCardEffectOwner,
        cardRaceId, setCardRaceId,
        usingCard,
        availableCards,
        cardHolders,
        cardHistory,
        cardTypeHolders,
        openCardModal,
        handleUseCard,
    }
}
