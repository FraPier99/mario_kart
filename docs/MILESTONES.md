# Traguardi (Milestones)

Pannello "Traguardi" mostrato nella Home, dentro la card "Ultimo torneo"
(`frontend/src/components/layout/Hero.jsx`), accanto a "Premi Torneo".
Segnala automaticamente ai partecipanti del torneo più recente eventuali
traguardi personali raggiunti in quel torneo — nessun inserimento manuale.

## Dove vive il codice

- `frontend/src/lib/milestones.js` — `detectTournamentMilestones(...)`, tutta
  la logica di rilevamento.
- `frontend/src/components/layout/TournamentMilestonesPanel.jsx` — solo
  rendering, raggruppa i badge per giocatore. Non renderizza nulla se
  l'array di traguardi è vuoto (nessuno stato vuoto forzato).
- Tutto calcolato **client-side** da dati già caricati in
  `AppDataContext.jsx` (`statsByPlayerId`, `detailedTournaments`, `games`).
  **Nessuna chiamata API dedicata.**

## Traguardi attuali

| Chiave | Condizione | Scope |
|---|---|---|
| `prima_partecipazione` | `statsByPlayerId.get(playerId).tournamentsPlayed === 1` | **Globale** (qualsiasi gioco/formato) |
| `debutto_gioco` | Il torneo corrente è il più vecchio (per data) tra i tornei con lo stesso `game_id` in cui il giocatore compare in `standings` | Per gioco (qualsiasi formato). Richiede `tournamentsPlayed > 1`, altrimenti è ridondante con `prima_partecipazione` |
| `prima_vittoria` | Il torneo corrente è il più vecchio con stesso `game_id` **e** `tournament_format` in cui `winner_id === playerId` | Per gioco + formato |
| `primo_podio` | Il torneo corrente è il più vecchio con stesso `game_id` **e** `tournament_format` in cui il giocatore è in `standings.slice(0, 3)` | Per gioco + formato, **solo tornei `classic`** |

Note importanti:
- "Per gioco + formato" significa che uno stesso giocatore può ricevere di
  nuovo `prima_vittoria`/`primo_podio` la prima volta che vince/fa podio in
  un gioco diverso, o nello stesso gioco ma nell'altro formato torneo
  (classic vs group_stage) — non è un contatore globale.
- `primo_podio` è escluso per i tornei `group_stage` perché
  `tournament.standings` non è la classifica ufficiale per quel formato
  (vedi il gotcha su `tournament.standings` nel `CLAUDE.md` di root) — usare
  l'ordine `standings` per determinare un podio storico su group_stage
  darebbe risultati inaffidabili.
- `detailedTournaments` è pre-ordinato per data decrescente
  (`sortTournamentByDate`, `AppDataContext.jsx`), quindi tutte le funzioni
  "trova il torneo più vecchio che soddisfa X" iterano in avanti e
  sovrascrivono il risultato ad ogni match — l'ultimo assegnato è il più
  vecchio.

## Punto di estensione

`findEarliestMatchingTournamentId(playerId, detailedTournaments, matchesScope, predicate)`
in `milestones.js` è la funzione generica riusata da tutti i traguardi
"primo torneo che soddisfa X" — per aggiungere un nuovo traguardo di questo
tipo, basta scrivere un nuovo `predicate` (e opzionalmente uno `scope`
diverso da `sameGameAndFormat`/`sameGame`).

## Idee valutate ma non implementate

- **Streak di vittorie consecutive** (2+ tornei vinti di fila, stesso
  gioco+formato) — richiede scorrere la cronologia ordinata per data e
  contare consecutività, più complesso dei traguardi "primo X".
- **Torneo anniversario** (5°, 10°, 20°... torneo giocato in totale) —
  traguardo di numero tondo su `statsByPlayerId.tournamentsPlayed`.
- **Traguardi da carte/schedine** (es. prima Carta Master vinta, prima
  schedina vinta) — i dati di `inventoryApi`/`schedineApi` non sono oggi
  caricati in `AppDataContext` (solo fetchati localmente da pagine come
  `Cards.jsx`); richiederebbero una nuova fetch per essere disponibili qui.

Se in futuro si aggiungono di questi traguardi, aggiornare questa tabella.
