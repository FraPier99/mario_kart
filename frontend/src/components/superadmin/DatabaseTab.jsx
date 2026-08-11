import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Check, ChevronDown, ChevronUp, Edit2, ExternalLink,
    Flag, Plus, RefreshCw, Save, Trash2, X, Upload
} from 'lucide-react'
import { toast } from 'sonner'
import PlayerAvatar from '@/components/common/PlayerAvatar'
import { compressImage } from '@/lib/imageCompression'
import { playersApi, racesApi, resultsApi, schedineApi, getApiErrorMessage } from '@/services/apiClient'

const SectionHeader = ({ label, open, onToggle, badge, action }) => (
    <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-border">
        <button type="button" onClick={onToggle} className="flex items-center gap-2 text-left">
            {open ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
            <span className="text-xs font-black uppercase tracking-[0.35em] text-slate-700 dark:text-foreground">{label}</span>
            {badge != null && (
                <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[9px] font-black text-slate-500 dark:text-slate-300">{badge}</span>
            )}
        </button>
        {action}
    </div>
)

// ── Mini image picker (hides raw base64) ──────────────────────────
const MiniImagePicker = ({ value, onChange }) => {
    const ref = useRef(null)
    const isBase64 = value?.startsWith('data:')

    const processFile = async (file) => {
        if (!file?.type.startsWith('image/')) return
        try {
            onChange(await compressImage(file, { maxDimension: 800, quality: 0.82 }))
        } catch {
            toast.error('Impossibile leggere il file')
        }
    }

    return (
        <div className="flex items-center gap-2">
            {/* Circular preview / drop zone */}
            <div
                onClick={() => ref.current?.click()}
                className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-slate-300 dark:border-border transition hover:border-blue-400"
            >
                {value
                    ? <img src={value} alt="preview" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center">
                        <Upload size={10} className="text-slate-400" />
                      </div>
                }
            </div>

            {/* URL input — only shown when it's a URL (not base64) */}
            {!isBase64 && (
                <input
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                />
            )}

            {/* When base64: show "Immagine caricata" label + clear */}
            {isBase64 && (
                <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Immagine caricata
                </span>
            )}

            {value && (
                <button type="button" onClick={() => onChange('')}
                    className="rounded-lg p-1 text-slate-400 transition hover:text-rose-500">
                    <X size={12} />
                </button>
            )}

            <input ref={ref} type="file" accept="image/*" className="hidden"
                onChange={e => { processFile(e.target.files?.[0]); e.target.value = '' }} />
        </div>
    )
}

// ── Player inline editor ──────────────────────────────────────────

const PlayerRow = ({ player, onSaved, onDelete }) => {
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        nickname: player.nickname ?? '',
        first_name: player.first_name ?? '',
        last_name: player.last_name ?? '',
        img_url: player.img_url ?? '',
    })

    const reset = () => {
        setForm({ nickname: player.nickname ?? '', first_name: player.first_name ?? '', last_name: player.last_name ?? '', img_url: player.img_url ?? '' })
        setEditing(false)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await playersApi.update(player.id, {
                nickname: form.nickname.trim(),
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                img_url: form.img_url.trim() || null,
            })
            toast.success(`${form.nickname || player.nickname} aggiornato`)
            setEditing(false)
            onSaved()
        } catch (err) {
            toast.error('Salvataggio fallito', { description: getApiErrorMessage(err) })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted overflow-hidden">
            {/* Intestazione riga */}
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerAvatar src={player.img_url ?? undefined} name={player.nickname ?? ''} size="sm" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-foreground">{player.nickname}</p>
                        <p className="truncate text-[10px] capitalize text-slate-500 dark:text-muted-foreground">{player.first_name} {player.last_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setEditing(v => !v)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:text-blue-600 hover:border-blue-300 dark:hover:text-blue-400">
                        <Edit2 size={10} /> {editing ? 'Annulla' : 'Modifica'}
                    </button>
                    <button type="button" onClick={() => onDelete(player.id, player.nickname)}
                        className="rounded-lg bg-rose-600 p-1.5 text-white transition hover:bg-rose-500">
                        <Trash2 size={10} />
                    </button>
                </div>
            </div>

            {/* Form inline (collassabile) */}
            {editing && (
                <div className="border-t border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-3 space-y-2.5">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {[
                            { key: 'nickname', label: 'Nickname' },
                            { key: 'first_name', label: 'Nome' },
                            { key: 'last_name', label: 'Cognome' },
                        ].map(({ key, label }) => (
                            <label key={key} className="block space-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
                                <input
                                    value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
                                />
                            </label>
                        ))}
                        <div className="block space-y-0.5 sm:col-span-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Foto profilo</span>
                            <MiniImagePicker
                                value={form.img_url}
                                onChange={val => setForm(f => ({ ...f, img_url: val }))}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={reset}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition hover:bg-slate-100">
                            <X size={10} /> Annulla
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving}
                            className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-blue-500 disabled:opacity-60">
                            <Save size={10} /> {saving ? 'Salvo...' : 'Salva'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── DatabaseTab ───────────────────────────────────────────────────

export default function DatabaseTab({ players, tournaments, onRefresh, setConfirmModal }) {
    const [playerSection, setPlayerSection] = useState(true)
    const [raceSection, setRaceSection] = useState(true)
    const [schedineSection, setSchedineSection] = useState(false)

    // Races
    const [allRaces, setAllRaces] = useState([])
    const [allResults, setAllResults] = useState([])
    const [racesLoading, setRacesLoading] = useState(true)
    const [selectedTournamentId, setSelectedTournamentId] = useState('')

    // Schedine
    const [schedineData, setSchedineData] = useState(null)
    const [schedineLoading, setSchedineLoading] = useState(false)
    const [selectedSchedineTournId, setSelectedSchedineTournId] = useState('')

    // Player search
    const [playerSearch, setPlayerSearch] = useState('')

    useEffect(() => {
        Promise.all([racesApi.list(), resultsApi.list()])
            .then(([racesRes, resultsRes]) => {
                setAllRaces(racesRes.data ?? [])
                setAllResults(resultsRes.data ?? [])
            })
            .catch(() => {})
            .finally(() => setRacesLoading(false))
    }, [])

    const sortedTournaments = useMemo(() =>
        [...tournaments].sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0) || b.id - a.id),
        [tournaments]
    )

    const filteredPlayers = useMemo(() => {
        const q = playerSearch.toLowerCase().trim()
        if (!q) return players
        return players.filter(p =>
            (p.nickname ?? '').toLowerCase().includes(q) ||
            (p.first_name ?? '').toLowerCase().includes(q) ||
            (p.last_name ?? '').toLowerCase().includes(q)
        )
    }, [players, playerSearch])

    const resultCountByRaceId = useMemo(() => {
        const map = new Map()
        for (const r of allResults) {
            map.set(r.race_id, (map.get(r.race_id) ?? 0) + 1)
        }
        return map
    }, [allResults])

    const tournamentRaces = useMemo(() => {
        if (!selectedTournamentId) return []
        return allRaces
            .filter(r => String(r.tournament_id) === String(selectedTournamentId))
            .sort((a, b) => (a.race_number ?? a.id) - (b.race_number ?? b.id))
    }, [allRaces, selectedTournamentId])

    const loadSchedine = async (tournId) => {
        if (!tournId) return
        setSchedineLoading(true)
        try {
            const res = await schedineApi.tournamentOverview(tournId)
            setSchedineData(res.data)
        } catch { setSchedineData(null) }
        finally { setSchedineLoading(false) }
    }

    const handleDeleteRace = (raceId, label) => {
        setConfirmModal({
            open: true,
            title: 'Elimina gara',
            message: `Eliminare permanentemente la gara "${label}"? I risultati collegati saranno persi.`,
            confirmText: 'Elimina',
            confirmVariant: 'danger',
            onConfirm: async () => {
                setConfirmModal(p => ({ ...p, open: false }))
                try {
                    await racesApi.remove(raceId)
                    setAllRaces(rs => rs.filter(r => r.id !== raceId))
                    toast.success('Gara eliminata')
                    onRefresh()
                } catch (err) {
                    toast.error('Eliminazione fallita', { description: getApiErrorMessage(err) })
                }
            },
        })
    }

    const handleDeletePlayer = (playerId, nickname) => {
        setConfirmModal({
            open: true,
            title: 'Elimina giocatore',
            message: `Eliminare permanentemente "${nickname}"? Tutti i risultati e le statistiche collegati saranno persi.`,
            confirmText: 'Elimina',
            confirmVariant: 'danger',
            onConfirm: async () => {
                setConfirmModal(p => ({ ...p, open: false }))
                try {
                    await playersApi.remove(playerId)
                    toast.success(`${nickname} eliminato`)
                    onRefresh()
                } catch (err) {
                    toast.error('Eliminazione fallita', { description: getApiErrorMessage(err) })
                }
            },
        })
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/8 px-4 py-3 flex items-start gap-3">
                <span className="text-amber-500 text-lg leading-none">⚠️</span>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                    Modifiche qui agiscono <strong>direttamente sul database</strong>. Procedi con cautela. Le eliminazioni sono irreversibili.
                </p>
            </div>

            {/* ── GIOCATORI ── */}
            <div className="rounded-[2rem] border border-slate-200 dark:border-border bg-white dark:bg-card shadow-xl overflow-hidden">
                <SectionHeader
                    label="Giocatori"
                    open={playerSection}
                    onToggle={() => setPlayerSection(v => !v)}
                    badge={players.length}
                    action={
                        <Link to="/admin/players"
                            className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition hover:text-slate-900 dark:hover:text-foreground">
                            <Plus size={11} /> Aggiungi
                        </Link>
                    }
                />
                {playerSection && (
                    <div className="p-4 space-y-3">
                        <input
                            type="text"
                            placeholder="Cerca giocatore..."
                            value={playerSearch}
                            onChange={e => setPlayerSearch(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 transition"
                        />
                        <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
                            {filteredPlayers.map(p => (
                                <PlayerRow
                                    key={p.id}
                                    player={p}
                                    onSaved={onRefresh}
                                    onDelete={handleDeletePlayer}
                                />
                            ))}
                            {filteredPlayers.length === 0 && (
                                <p className="py-4 text-center text-sm text-slate-400">Nessun giocatore trovato.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── GARE PER TORNEO ── */}
            <div className="rounded-[2rem] border border-slate-200 dark:border-border bg-white dark:bg-card shadow-xl overflow-hidden">
                <SectionHeader
                    label="Gare per torneo"
                    open={raceSection}
                    onToggle={() => setRaceSection(v => !v)}
                    badge={tournamentRaces.length || undefined}
                />
                {raceSection && (
                    <div className="p-4 space-y-3">
                        <select
                            value={selectedTournamentId}
                            onChange={e => setSelectedTournamentId(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-foreground outline-none focus:border-amber-500 transition"
                        >
                            <option value="">Seleziona un torneo...</option>
                            {sortedTournaments.map(t => (
                                <option key={t.id} value={t.id}>{t.name} — {t.date ? new Date(t.date).toLocaleDateString('it-IT') : '?'}</option>
                            ))}
                        </select>

                        {selectedTournamentId && !racesLoading && (
                            <div>
                                {tournamentRaces.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-border py-6 text-center">
                                        <Flag size={20} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-sm text-slate-400">Nessuna gara registrata per questo torneo.</p>
                                        <Link to={`/tournaments/${selectedTournamentId}`}
                                            className="mt-2 inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 hover:underline">
                                            <ExternalLink size={11} /> Apri il torneo per aggiungere gare
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {tournamentRaces.map((race) => (
                                            <div key={race.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 py-2.5">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-900 dark:text-foreground">
                                                        Gara #{race.race_number ?? race.id} — {race.circuit_name ?? race.circuit?.name ?? `Circuito #${race.circuit_id}`}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 dark:text-muted-foreground">
                                                        {race.date ? new Date(race.date).toLocaleDateString('it-IT') : '—'} · {resultCountByRaceId.get(race.id) ?? 0} risultati
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Link to={`/tournaments/${selectedTournamentId}`}
                                                        className="rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:text-amber-500">
                                                        <ExternalLink size={10} />
                                                    </Link>
                                                    <button type="button"
                                                        onClick={() => handleDeleteRace(race.id, `Gara #${race.race_number ?? race.id}`)}
                                                        className="rounded-lg bg-rose-600 p-1.5 text-white transition hover:bg-rose-500">
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {racesLoading && <p className="text-sm text-slate-400 text-center py-4">Caricamento gare...</p>}
                    </div>
                )}
            </div>

            {/* ── SCHEDINE ── */}
            <div className="rounded-[2rem] border border-slate-200 dark:border-border bg-white dark:bg-card shadow-xl overflow-hidden">
                <SectionHeader
                    label="Schedine per torneo"
                    open={schedineSection}
                    onToggle={() => setSchedineSection(v => !v)}
                />
                {schedineSection && (
                    <div className="p-4 space-y-3">
                        <div className="flex gap-2">
                            <select
                                value={selectedSchedineTournId}
                                onChange={e => { setSelectedSchedineTournId(e.target.value); loadSchedine(e.target.value) }}
                                className="flex-1 rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-foreground outline-none focus:border-amber-500 transition"
                            >
                                <option value="">Seleziona un torneo...</option>
                                {sortedTournaments.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            {selectedSchedineTournId && (
                                <button type="button" onClick={() => loadSchedine(selectedSchedineTournId)}
                                    className="rounded-xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-muted px-3 text-slate-600 dark:text-slate-400 transition hover:text-slate-900 dark:hover:text-foreground">
                                    <RefreshCw size={13} />
                                </button>
                            )}
                        </div>

                        {schedineLoading && <p className="text-sm text-slate-400 text-center py-4">Caricamento...</p>}

                        {!schedineLoading && schedineData && (
                            <div className="space-y-2">
                                {/* Leaderboard */}
                                {schedineData.leaderboard?.length > 0 && (
                                    <div className="rounded-xl border border-slate-200 dark:border-border overflow-hidden">
                                        <p className="bg-slate-50 dark:bg-muted px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Classifica schedine</p>
                                        {schedineData.leaderboard.map((e, i) => (
                                            <div key={e.playerId ?? i} className="flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-100 dark:border-border">
                                                <span className="text-xs font-black text-slate-400">#{i+1}</span>
                                                <span className="flex-1 text-sm font-bold text-slate-900 dark:text-foreground">{e.nickname ?? e.username}</span>
                                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{e.points ?? 0} pt</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Partecipanti */}
                                {(schedineData.entries ?? schedineData.participants ?? []).length > 0 && (
                                    <div className="rounded-xl border border-slate-200 dark:border-border overflow-hidden">
                                        <p className="bg-slate-50 dark:bg-muted px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Schedine compilate</p>
                                        {(schedineData.entries ?? schedineData.participants).map((e, i) => (
                                            <div key={e.playerId ?? e.id ?? i} className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 dark:border-border">
                                                <Check size={11} className="text-emerald-500 shrink-0" />
                                                <span className="text-sm font-bold text-slate-700 dark:text-foreground">{e.nickname ?? e.username}</span>
                                                <span className="ml-auto text-[10px] font-black text-slate-400">{e.points ?? 0} pt</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!schedineData.leaderboard?.length && !(schedineData.entries ?? schedineData.participants ?? []).length && (
                                    <p className="text-center text-sm text-slate-400 py-4">Nessuna schedina per questo torneo.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
