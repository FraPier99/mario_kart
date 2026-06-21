/**
 * TournamentResolutionNotes — Note automatiche che spiegano come gli spareggi
 * (gironi, semifinali, podio) hanno determinato l'ordine della classifica finale.
 *
 * Ogni nota è taggata con la fase a cui si riferisce ("group", "semifinal",
 * "finals", o null per i tornei classic). Passa `phaseFilter` per mostrare
 * solo le note di una fase specifica — es. sotto "Classifica Finale" di un
 * torneo a gironi ha senso vedere solo l'esito della Finale, non quello dei
 * gironi/semifinali (irrilevante in quel contesto).
 */
import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import { tournamentsApi } from '@/services/apiClient'

const TournamentResolutionNotes = ({ tournament, phaseFilter }) => {
    const [notes, setNotes] = useState([])

    useEffect(() => {
        let active = true
        tournamentsApi.resolutionNotes(tournament.id)
            .then((res) => { if (active) setNotes(res.data?.notes ?? []) })
            .catch(() => { if (active) setNotes([]) })
        return () => { active = false }
    }, [tournament.id, tournament.races, tournament.winner_id])

    const visibleNotes = phaseFilter ? notes.filter((n) => n.phase === phaseFilter) : notes
    if (visibleNotes.length === 0) return null

    return (
        <div className="rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-900/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <Info size={14} />
                <p className="text-xs font-black uppercase tracking-[0.3em]">Esiti spareggi</p>
            </div>
            <ul className="space-y-1.5">
                {visibleNotes.map((note, i) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-muted-foreground">{note.text}</li>
                ))}
            </ul>
        </div>
    )
}

export default TournamentResolutionNotes
