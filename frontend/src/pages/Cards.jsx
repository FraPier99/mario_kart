import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '@/components/layout/AppLayout'
import PowerCard from '@/components/cards/PowerCard'
import { useAppData } from '@/context/AppDataContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { getProfileTheme } from '@/lib/profileTheme'
import { getApiErrorMessage, inventoryApi } from '@/services/apiClient'
import PlayerLink from '@/components/common/PlayerLink'

const formatDate = (value) => {
    if (!value) return 'data non disponibile'
    return new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Tabella compatta per una singola tipologia di carta all'interno di un
// gioco: niente più colonne "Tipo"/"Gioco" (già implicite nel raggruppamento).
const CardTypeTable = ({ label, accentClass, items }) => (
    <div className="px-5 py-4">
        <p className={`mb-2 text-[10px] font-black uppercase tracking-[0.3em] ${accentClass}`}>{label} · {items.length}</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-border">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-border">
                <thead className="bg-slate-50 dark:bg-muted">
                    <tr>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Giocatore</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Ottenuta</th>
                        <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Stato</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Consumo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-border dark:bg-card">
                    {items.map((item) => {
                        const isAvailable = !item.is_consumed
                        return (
                            <tr key={item.id}>
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        {item.user_img_url ? (
                                            <img src={item.user_img_url} alt={item.user_nickname} className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                                        ) : (
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-black text-slate-500 dark:text-slate-400">
                                                {(item.user_nickname ?? '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <PlayerLink userId={item.user_id} className="text-sm font-black text-slate-900 dark:text-foreground">{item.user_nickname ?? `#${item.user_id}`}</PlayerLink>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-foreground">
                                    {item.granted_by_admin ? (
                                        <span className="text-amber-600 dark:text-amber-400">✋ Assegnata da admin</span>
                                    ) : item.source_tournament_id ? (
                                        <Link to={`/schedina/${item.source_tournament_id}`} className="hover:underline underline-offset-2 text-slate-700 dark:text-foreground">
                                            {item.source_tournament_name ?? '—'}
                                        </Link>
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isAvailable ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        {isAvailable ? 'Disponibile' : 'Consumata'}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-muted-foreground max-w-40">
                                    {isAvailable ? (
                                        <span className="text-emerald-500">—</span>
                                    ) : (
                                        <>
                                            {item.consumed_at && formatDate(item.consumed_at)}
                                            {item.consumed_in_phase && <span className="block text-[10px] text-slate-400">Fase: {item.consumed_in_phase}</span>}
                                            {item.consumed_effect && <span className="block text-[10px] text-slate-400">{item.consumed_effect}</span>}
                                        </>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    </div>
)

const Cards = () => {
    const { user } = useAuth()
    const { dark } = useTheme()
    const { charactersById, tournaments, raceToTournamentId, gamesById } = useAppData()
    const theme = useMemo(() => getProfileTheme(user, charactersById, dark), [user, charactersById, dark])

    const isSuperadmin = user?.role === 'superadmin'

    const [inventory, setInventory] = useState([])
    const [publicInventory, setPublicInventory] = useState([])
    const [loading, setLoading] = useState(true)
    const [flippedCard, setFlippedCard] = useState(null)
    const [usingCardId, setUsingCardId] = useState(null)

    const activeLiveTournament = useMemo(() => tournaments.find(t => t.status === 'in_corso') ?? null, [tournaments])

    // Inventario globale raggruppato per gioco e poi per tipologia di carta,
    // così la tabella non è più un'unica lista lunghissima.
    const groupedPublicInventory = useMemo(() => {
        const byGame = new Map()
        for (const item of publicInventory) {
            const gameName = item.game_id && gamesById?.get(item.game_id)
                ? gamesById.get(item.game_id).name
                : (item.source_game_name ?? 'Gioco non specificato')
            if (!byGame.has(gameName)) byGame.set(gameName, { master: [], blue_shell: [] })
            const bucket = byGame.get(gameName)
            if (item.card_type === 'master') bucket.master.push(item)
            else bucket.blue_shell.push(item)
        }
        return Array.from(byGame.entries())
            .map(([gameName, types]) => ({ gameName, ...types, total: types.master.length + types.blue_shell.length }))
            .sort((a, b) => b.total - a.total || a.gameName.localeCompare(b.gameName))
    }, [publicInventory, gamesById])

    useEffect(() => {
        let active = true
        const load = async () => {
            setLoading(true)
            const requests = [inventoryApi.me(), inventoryApi.public()]
            const responses = await Promise.allSettled(requests)
            if (!active) return
            if (responses[0]?.status === 'fulfilled') {
                setInventory(responses[0].value.data ?? [])
            }
            if (responses[1]?.status === 'fulfilled') {
                setPublicInventory(responses[1].value.data ?? [])
            }
            setLoading(false)
        }
        load()
        return () => { active = false }
    }, [])

    const handleUseCard = async (itemId, cardName) => {
        if (!window.confirm(`Dichiarare l'uso di "${cardName}"? Avvisa l'organizzatore del torneo prima di procedere.`)) return
        setUsingCardId(itemId)
        try {
            await inventoryApi.use(itemId, {})
            toast.success(`Uso di "${cardName}" dichiarato! L'organizzatore registrerà l'effetto.`)
            const res = await inventoryApi.me()
            setInventory(res.data ?? [])
        } catch (err) {
            toast.error('Impossibile dichiarare l\'uso', { description: getApiErrorMessage(err) })
        } finally {
            setUsingCardId(null)
        }
    }

    if (loading) {
        return (
            <AppLayout>
                <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">
                    <div className="space-y-4">
                        <div className="h-32 animate-shimmer rounded-3xl bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
                        <div className="h-52 animate-shimmer rounded-3xl bg-linear-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
                    </div>
                </section>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <section className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">

                {/* HEADER */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className={`font-title text-[10px] tracking-wide ${theme.tailwind.text}`}>CARTE</p>
                            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground md:text-4xl">Carte Potere</h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-muted-foreground uppercase">
                                Inventario globale e personale delle carte potere
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {user?.player && (() => {
                            const favChar = user.player.favorite_character_id
                                ? charactersById?.get(user.player.favorite_character_id) ?? null
                                : null
                            return favChar ? (
                                <div className={`hidden md:flex items-center gap-2 rounded-2xl px-4 py-2 text-xs ${theme.tailwind.bgSoft} border ${theme.tailwind.border}`}>
                                    <Sparkles size={12} className={theme.tailwind.text} />
                                    <span className={`font-black uppercase tracking-wider ${theme.tailwind.textStrong}`}>{favChar.name}</span>
                                </div>
                            ) : null
                        })()}
                        <Link
                            to="/dashboard"
                            className="font-title rounded-xl border-2 border-slate-900 dark:border-white/20 bg-white px-4 py-3 text-[10px] tracking-wide text-slate-700 transition active:translate-y-px hover:border-slate-700 dark:bg-card dark:text-foreground"
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                        >
                            Il mio profilo
                        </Link>
                        <Link
                            to="/history"
                            className="font-title rounded-xl border-2 border-slate-900 dark:border-white/20 bg-white px-4 py-3 text-[10px] tracking-wide text-slate-700 transition active:translate-y-px hover:border-slate-700 dark:bg-card dark:text-foreground"
                            style={{ boxShadow: 'var(--circuit-shadow-sm)' }}
                        >
                            Storico tornei
                        </Link>
                    </div>
                </div>

                {/* Spiegazione visiva carte */}
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-border dark:bg-card">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                            <Zap size={14} />
                        </div>
                        <p className={`text-sm font-black uppercase tracking-[0.3em] ${theme.tailwind.text}`}>Carte Potere</p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <PowerCard type="master" mode="flip" flipped={flippedCard === 'master'} onFlip={() => setFlippedCard(flippedCard === 'master' ? null : 'master')} />
                        <PowerCard type="guscio" mode="flip" flipped={flippedCard === 'guscio'} onFlip={() => setFlippedCard(flippedCard === 'guscio' ? null : 'guscio')} />
                    </div>
                    <p className="mt-5 text-center text-[10px] text-slate-400 dark:text-slate-500">Le carte vengono attivate dall'organizzatore nella pagina di gestione del torneo. Una volta consumate non sono più recuperabili.</p>
                    <div className="mt-4 rounded-2xl border border-dashed border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 px-5 py-3 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">⚙️ Effetti in fase di definizione — potrebbero subire modifiche</p>
                    </div>
                </div>

                {/* Inventario globale — raggruppato per gioco, poi per tipologia di carta */}
                {publicInventory.length > 0 && (
                    <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-border dark:bg-card">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                            <div>
                                <p className={`text-xs font-black uppercase tracking-[0.35em] ${theme.tailwind.text}`}>Inventario globale</p>
                                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Tutte le Carte</h2>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-slate-700 dark:bg-muted dark:text-muted-foreground">
                                <Zap size={16} />
                                <span className="text-xs font-black uppercase tracking-[0.3em]">{publicInventory.length} carte totali</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {groupedPublicInventory.map(({ gameName, master, blue_shell, total }) => (
                                <details key={gameName} className="group rounded-3xl border border-slate-200 dark:border-border overflow-hidden" open={groupedPublicInventory.length === 1}>
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 dark:bg-muted px-5 py-3.5 select-none">
                                        <span className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-foreground">{gameName}</span>
                                        <span className="flex items-center gap-2">
                                            {master.length > 0 && (
                                                <span className="rounded-full bg-amber-100 dark:bg-amber-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                                    {master.length} Master
                                                </span>
                                            )}
                                            {blue_shell.length > 0 && (
                                                <span className="rounded-full bg-cyan-100 dark:bg-cyan-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                                                    {blue_shell.length} Guscio Blu
                                                </span>
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{total} totali</span>
                                        </span>
                                    </summary>

                                    <div className="divide-y divide-slate-200 dark:divide-border">
                                        {master.length > 0 && (
                                            <CardTypeTable label="Master" accentClass="text-amber-600 dark:text-amber-400" items={master} />
                                        )}
                                        {blue_shell.length > 0 && (
                                            <CardTypeTable label="Guscio Blu" accentClass="text-cyan-600 dark:text-cyan-400" items={blue_shell} />
                                        )}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                )}

                {/* Inventario personale */}
                {!isSuperadmin && (
                    <div className="mt-5 space-y-5">
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl dark:border-border dark:bg-card">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className={`text-xs font-black uppercase tracking-[0.35em] ${theme.tailwind.text}`}>Il mio inventario</p>
                                    <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-foreground">Le Mie Carte</h2>
                                    <p className="mt-2 max-w-lg text-sm text-slate-500 dark:text-muted-foreground">
                                        Carte Master e Guscio Blu vinte con le schedine. L'organizzatore le attiva nella pagina del torneo.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 text-center">
                                        <p className="text-lg font-black text-amber-700 dark:text-amber-300">{inventory.filter((c) => !c.is_consumed).length}</p>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-500">Disponibili</p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-4 py-2 text-center">
                                        <p className="text-lg font-black text-slate-500 dark:text-muted-foreground">{inventory.filter((c) => c.is_consumed).length}</p>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Consumate</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {inventory.filter((item) => !item.is_consumed).length === 0 ? (
                            <div className="rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10 p-10 text-center">
                                <Zap size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
                                <p className="mt-4 text-sm font-black uppercase tracking-wider text-slate-500 dark:text-muted-foreground">Nessuna carta disponibile</p>
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Vinci le schedine per ottenere carte Master e Guscio Blu!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeLiveTournament && (
                                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                            Torneo in corso: <span className="normal-case">{activeLiveTournament.name}</span> — le carte sono attive!
                                        </p>
                                    </div>
                                )}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {inventory.filter((item) => !item.is_consumed).map((item) => {
                                        const srcTournament = item.source_tournament_id ? tournaments.find(t => t.id === item.source_tournament_id) : null
                                        const isLive = Boolean(activeLiveTournament)
                                        const gameName = item.game_id && gamesById?.get(item.game_id) ? gamesById.get(item.game_id).name : item.source_game_name
                                        return (
                                            <div key={item.id} className="space-y-2">
                                                <PowerCard
                                                    type={item.card_type}
                                                    mode="card"
                                                    customTitle={item.card_name}
                                                    sourceTournamentId={srcTournament ? item.source_tournament_id : undefined}
                                                    sourceTournamentName={srcTournament?.name}
                                                    sourceGameName={gameName}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleUseCard(item.id, item.card_name)}
                                                    disabled={!isLive || usingCardId === item.id}
                                                    className={`w-full rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition ${isLive ? (item.card_type === 'master' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20' : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/20') : 'bg-slate-100 dark:bg-muted text-slate-400 dark:text-slate-500 cursor-not-allowed'}`}
                                                >
                                                    {usingCardId === item.id ? 'Registrazione...' : isLive ? '⚡ Dichiara Uso Live' : '🔒 Torneo non in corso'}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                                {inventory.filter((item) => item.is_consumed).length > 0 && (
                                    <details className="rounded-[2rem] border border-slate-200 dark:border-border bg-white dark:bg-card p-5 shadow-sm">
                                        <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 select-none">
                                            Storico carte consumate ({inventory.filter((item) => item.is_consumed).length})
                                        </summary>
                                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {inventory.filter((item) => item.is_consumed).map((item) => {
                                                const consumedTournamentId = item.consumed_in_race_id ? raceToTournamentId.get(item.consumed_in_race_id) : null
                                                const consumedTournament = consumedTournamentId ? tournaments.find(t => t.id === consumedTournamentId) : null
                                                const gameName = item.game_id && gamesById?.get(item.game_id) ? gamesById.get(item.game_id).name : null
                                                return (
                                                    <PowerCard
                                                        key={item.id}
                                                        type={item.card_type}
                                                        mode="mini"
                                                        consumed
                                                        customTitle={item.card_name}
                                                        sourceTournamentName={item.source_tournament_name}
                                                        sourceGameName={gameName ?? item.source_game_name}
                                                        consumedAt={item.consumed_at}
                                                        consumedInRaceId={item.consumed_in_race_id}
                                                        consumedEffect={item.consumed_effect}
                                                        consumedTournamentName={consumedTournament?.name}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </details>
                                )}
                    </div>
                )}

            </section>
        </AppLayout>
    )
}

export default Cards
