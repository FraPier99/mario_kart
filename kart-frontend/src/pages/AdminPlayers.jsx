import { useMemo, useState } from 'react'
import { Database, PencilLine, Plus, RotateCcw, Search, Trash2, UserSquare2, WandSparkles, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

import ApiBanner from '@/components/common/ApiBanner'
import { useAppData } from '@/context/AppDataContext'
import { buildAvatarPlaceholder } from '@/lib/placeholders'
import { getApiErrorMessage, playersApi } from '@/services/apiClient'

const CATALOG_PAGE_SIZE = 12

const emptyForm = {
  first_name: '',
  last_name: '',
  nickname: '',
  favorite_character_id: '',
}

const resolveImage = (player) => {
  if (player?.img_url && player.img_url.trim().length > 0) {
    return player.img_url.trim()
  }

  return buildAvatarPlaceholder(player?.nickname ?? 'player')
}

const resolveCharacterLabel = (character) => {
  if (!character) return 'Nessun pg preferito'

  return `${character.name} #${character.id}`
}

const resolveCharacterImage = (character) => {
  if (character?.img_url && character.img_url.trim().length > 0) {
    return character.img_url.trim()
  }

  return buildAvatarPlaceholder(character?.name ?? 'character')
}

export default function AdminPlayers() {
  const { players, characters, charactersById, games, gamesById, loading, errorMessage, refresh } = useAppData()
  const [form, setForm] = useState(emptyForm)
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogVisibleCount, setCatalogVisibleCount] = useState(CATALOG_PAGE_SIZE)
  const [characterSelectSearch, setCharacterSelectSearch] = useState('')
  const [catalogGameFilter, setCatalogGameFilter] = useState('')

  const sortedPlayers = useMemo(() => {
    return players.slice().sort((left, right) => left.nickname.localeCompare(right.nickname))
  }, [players])

  const characterOptions = useMemo(() => {
    return characters.slice().sort((left, right) => left.name.localeCompare(right.name))
  }, [characters])

  const filteredCharacterSelectOptions = useMemo(() => {
    if (!characterSelectSearch.trim()) return characterOptions
    const term = characterSelectSearch.toLowerCase()
    return characterOptions.filter((c) => c.name.toLowerCase().includes(term))
  }, [characterOptions, characterSelectSearch])

  const filteredCatalogCharacters = useMemo(() => {
    let result = characterOptions
    if (catalogGameFilter) {
      result = result.filter((c) => c.game_id === Number(catalogGameFilter))
    }
    if (catalogSearch.trim()) {
      const term = catalogSearch.toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(term))
    }
    return result
  }, [characterOptions, catalogSearch, catalogGameFilter])

  const visibleCatalogCharacters = filteredCatalogCharacters.slice(0, catalogVisibleCount)
  const hasMoreCatalog = catalogVisibleCount < filteredCatalogCharacters.length

  const startEdit = (player) => {
    setSelectedPlayerId(player.id)
    setForm({
      first_name: player.first_name ?? '',
      last_name: player.last_name ?? '',
      nickname: player.nickname ?? '',
      img_url: player.img_url ?? '',
      favorite_character_id: player.favorite_character_id ? String(player.favorite_character_id) : '',
    })
    setSelectedFileName('')
  }

  const resetForm = () => {
    setSelectedPlayerId(null)
    setForm(emptyForm)
    setSelectedFileName('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      setSelectedFileName('')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const imageValue = typeof reader.result === 'string' ? reader.result : ''

      setForm((currentForm) => ({
        ...currentForm,
        img_url: imageValue,
      }))
      setSelectedFileName(file.name)
    }

    reader.onerror = () => {
      toast.error('Impossibile leggere il file selezionato')
    }

    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      nickname: form.nickname.trim(),
      img_url: form.img_url.trim().length > 0 ? form.img_url.trim() : null,
      favorite_character_id: form.favorite_character_id ? Number(form.favorite_character_id) : null,
    }

    try {
      if (selectedPlayerId) {
        await playersApi.update(selectedPlayerId, payload)
        toast.success('Giocatore aggiornato')
      }
      else {
        await playersApi.create(payload)
        toast.success('Giocatore creato')
      }

      await refresh()
      resetForm()
    }
    catch (requestError) {
      toast.error('Salvataggio non riuscito', {
        description: getApiErrorMessage(requestError),
      })
    }
    finally {
      setSaving(false)
    }
  }

  const handleDelete = async (player) => {
    const shouldDelete = window.confirm(`Eliminare ${player.nickname}?`)

    if (!shouldDelete) {
      return
    }

    try {
      await playersApi.remove(player.id)
      toast.success('Giocatore eliminato')
      if (selectedPlayerId === player.id) {
        resetForm()
      }
      await refresh()
    }
    catch (requestError) {
      toast.error('Eliminazione non riuscita', {
        description: getApiErrorMessage(requestError),
      })
    }
  }

  const isEditing = Boolean(selectedPlayerId)

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
                <Database className="h-4 w-4" />
                Admin giocatori
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Gestione completa dei player e del pg preferito
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Qui puoi vedere i dati dei giocatori del database, inserirne di nuovi, modificare i campi e scegliere il personaggio preferito. Le immagini del pg preferito arrivano da <span className="font-semibold text-white">img_url</span> del character, con fallback automatico al placeholder.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Aggiorna dati
            </button>
          </div>
        </div>

        {errorMessage ? <ApiBanner message={errorMessage} onRetry={refresh} /> : null}

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="flex flex-col rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">Form player</p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {isEditing ? 'Modifica giocatore' : 'Nuovo giocatore'}
                </h2>
              </div>
              <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
                {isEditing ? <PencilLine className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
            </div>

            <form className="flex grow flex-col space-y-3" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium text-slate-300">
                  <span>Nome</span>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-emerald-400"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-300">
                  <span>Cognome</span>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-emerald-400"
                  />
                </label>
              </div>

              <label className="space-y-1.5 text-sm font-medium text-slate-300">
                <span>Nickname</span>
                <input
                  name="nickname"
                  value={form.nickname}
                  onChange={handleChange}
                  required
                  minLength={3}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-emerald-400"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium text-slate-300">
                <span>Seleziona immagine dal PC</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-slate-300 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-black file:text-white hover:file:bg-emerald-400"
                />
                <span className="block text-xs text-slate-500">
                  {selectedFileName ? `File selezionato: ${selectedFileName}` : 'Nessun file selezionato'}
                </span>
              </label>

              <label className="space-y-1.5 text-sm font-medium text-slate-300">
                <span>img_url</span>
                <input
                  name="img_url"
                  value={form.img_url}
                  onChange={handleChange}
                  placeholder="https://... oppure data URL generata dal file"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-emerald-400"
                />
              </label>

              {form.img_url ? (
                <div className="border border-white/10 bg-slate-950 p-3">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Anteprima immagine profilo</p>
                  <img
                    src={form.img_url}
                    alt="Anteprima giocatore"
                    className="h-32 w-full object-cover"
                  />
                </div>
              ) : null}

              <label className="space-y-1.5 text-sm font-medium text-slate-300">
                <span>PG preferito</span>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cerca personaggio..."
                    value={characterSelectSearch}
                    onChange={(e) => setCharacterSelectSearch(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-9 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  />
                </div>
                <select
                  name="favorite_character_id"
                  value={
                    filteredCharacterSelectOptions.some((c) => c.id === Number(form.favorite_character_id))
                      ? form.favorite_character_id
                      : ''
                  }
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-emerald-400"
                  size={Math.min(filteredCharacterSelectOptions.length + 1, 6)}
                >
                  <option value="">Nessuno</option>
                  {filteredCharacterSelectOptions.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name} {character.game_id ? `(${gamesById?.get(character.game_id)?.name ?? `game ${character.game_id}`})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Salvataggio...' : isEditing ? 'Aggiorna player' : 'Crea player'}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-white transition hover:bg-white/10"
                >
                  Reset
                </button>
              </div>
            </form>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/80 p-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                <WandSparkles className="h-4 w-4 text-emerald-300" />
                Nota tecnica
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-300">
                Le immagini del player restano gestite altrove, mentre il pg preferito usa <span className="font-semibold text-white">img_url</span> del character con fallback automatico al placeholder.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Database player</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Tutti i giocatori salvati</h2>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-2 text-sm font-bold text-slate-300">
                  {sortedPlayers.length} record
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-8 text-center text-slate-400">
                  Caricamento dati in corso...
                </div>
              ) : sortedPlayers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-8 text-center text-slate-400">
                  Nessun giocatore presente nel database.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  {/* Vista mobile: cards */}
                  <div className="divide-y divide-white/10 md:hidden">
                    {sortedPlayers.map((player) => {
                      const preferredCharacter = charactersById.get(player.favorite_character_id)

                      return (
                        <div key={player.id} className="bg-slate-900/60 p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveImage(player)}
                              alt={`${player.first_name} ${player.last_name}`}
                              className="h-12 w-12 shrink-0 border border-white/10 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="font-black text-white truncate">{player.first_name} {player.last_name}</p>
                              <p className="text-xs font-bold text-emerald-300">{player.nickname}</p>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ID {player.id}</p>
                            </div>
                          </div>
                          <div className="text-sm text-slate-300">
                            <img
                              src={resolveCharacterImage(preferredCharacter)}
                              alt={preferredCharacter?.name ?? 'Nessun pg preferito'}
                              className="h-10 w-10 border border-white/10 object-cover"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(player)}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200 transition hover:bg-emerald-400/20"
                            >
                              <PencilLine className="h-4 w-4" />
                              Modifica
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(player)}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-200 transition hover:bg-rose-400/20"
                            >
                              <Trash2 className="h-4 w-4" />
                              Elimina
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Vista desktop: tabella */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-300">
                      <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.22em] text-slate-400">
                        <tr>
                          <th className="px-4 py-4 font-black">Player</th>
                          <th className="px-4 py-4 font-black">Nickname</th>
                          <th className="px-4 py-4 font-black">PG preferito</th>
                          <th className="px-4 py-4 font-black text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 bg-slate-900/60">
                        {sortedPlayers.map((player) => {
                          const preferredCharacter = charactersById.get(player.favorite_character_id)

                          return (
                            <tr key={player.id} className="align-top transition hover:bg-white/5">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={resolveImage(player)}
                                    alt={`${player.first_name} ${player.last_name}`}
                                    className="h-12 w-12 shrink-0 border border-white/10 object-cover"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-black text-white truncate">{player.first_name} {player.last_name}</p>
                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ID {player.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-bold text-emerald-300">{player.nickname}</td>
                              <td className="px-4 py-4 text-sm text-slate-300">
                                <img
                                  src={resolveCharacterImage(preferredCharacter)}
                                  alt={preferredCharacter?.name ?? 'Nessun pg preferito'}
                                  className="h-10 w-10 border border-white/10 object-cover"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(player)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200 transition hover:bg-emerald-400/20"
                                  >
                                    <PencilLine className="h-4 w-4" />
                                    Modifica
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(player)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-200 transition hover:bg-rose-400/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Elimina
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Catalogo pg preferiti</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Character disponibili</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 text-sm font-bold text-slate-300">
                  <UserSquare2 className="h-4 w-4" />
                  {filteredCatalogCharacters.length} / {characters.length} character
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cerca personaggio per nome..."
                    value={catalogSearch}
                    onChange={(e) => { setCatalogSearch(e.target.value); setCatalogVisibleCount(CATALOG_PAGE_SIZE) }}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-9 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400 placeholder:text-slate-500"
                  />
                </div>
                <select
                  value={catalogGameFilter}
                  onChange={(e) => { setCatalogGameFilter(e.target.value); setCatalogVisibleCount(CATALOG_PAGE_SIZE) }}
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                >
                  <option value="">Tutti i giochi</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {filteredCatalogCharacters.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950 p-8 text-center text-slate-400">
                  {catalogSearch.trim() || catalogGameFilter ? 'Nessun character corrisponde ai filtri.' : 'Nessun character disponibile.'}
                </div>
              ) : (
                <>
                  <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
                    {visibleCatalogCharacters.map((character) => (
                      <div key={character.id} className="flex flex-col border border-white/10 bg-slate-950 p-2.5">
                        <img
                          src={resolveCharacterImage(character)}
                          alt={character.name}
                          className="mb-2 h-20 w-full shrink-0 object-cover"
                        />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-base font-black text-white">{character.name}</p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">ID {character.id}</p>
                          </div>
                          <div className="shrink-0 rounded-xl bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                            {gamesById?.get(character.game_id)?.name ?? `game ${character.game_id}`}
                          </div>
                        </div>
                        {character.description ? (
                          <p className="mt-2 text-xs leading-5 text-slate-300 line-clamp-2">{character.description}</p>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-slate-500">Descrizione non disponibile.</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {hasMoreCatalog && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setCatalogVisibleCount((c) => c + CATALOG_PAGE_SIZE)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-white/10"
                      >
                        <ChevronDown size={14} />
                        Mostra altri ({filteredCatalogCharacters.length - catalogVisibleCount} nascosti)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}