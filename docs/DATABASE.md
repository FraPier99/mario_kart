# Schema dati — Lega di Gaming

Tutte le tabelle sono modelli SQLAlchemy che condividono un'unica `Base`
(`app/models/base.py`). I modelli sono organizzati per dominio sotto `app/models/`,
ma le relazioni (`relationship(...)`) usano riferimenti a stringa e quindi
funzionano normalmente fra domini diversi: l'unico requisito è che ogni modulo
venga importato (cosa che fa `app/models/__init__.py`) prima di eseguire query.

## Dominio `utenti` — `app/models/utenti/models.py`

| Tabella | Modello | Descrizione |
|---|---|---|
| `players` | `Player` | Anagrafica giocatore (nome, nickname univoco, foto, personaggio preferito). |
| `users` | `User` | Account di accesso: ruolo (`user`/`admin`/`superadmin`), credenziali, monete virtuali, collegamento opzionale 1:1 a `Player`. |
| `tournament_photos` | `TournamentPhoto` | Foto caricate nella galleria di un torneo. |
| `photo_comments` | `PhotoComment` | Commenti alle foto della galleria. |
| `notifications` | `Notification` | Notifiche utente (menzioni, schedine in scadenza, eventi torneo, ...). |
| `challenges` | `Challenge` | Sfide dirette fra utenti (mittente/destinatario, stato, messaggio). |
| `audit_log` | `AuditLog` | Log delle azioni amministrative (chi ha fatto cosa, su quale entità). |
| `temp_passwords` | `TempPassword` | Password temporanee generate dagli admin, con scadenza. |
| `user_game_ownership` | `UserGameOwnership` | Quantità auto-dichiarata di copie possedute di un gioco (`quantity`, per `game_id`), modificabile in ogni momento dall'utente stesso. |
| `user_console_ownership` | `UserConsoleOwnership` | Quantità di unità possedute per console, chiave fissa da un elenco Python (`app/data/consoles.py`, solo linea handheld Nintendo da DS a Switch 2). |
| `user_r4_devices` | `UserR4Device` | Quantità di dispositivi R4 compatibili posseduti, per tipo di device (famiglia DS) — pertinente solo se l'utente possiede Mario Kart DS (`game_id=1`). |

`User.player_id` è una FK opzionale e univoca verso `players.id`: un account può
non essere collegato a un giocatore (es. superadmin) e un giocatore può non avere
ancora un account.

`User.ownership_declared_at` è `NULL` finché l'utente non ha mai salvato la
sezione "Possiedi" del proprio profilo almeno una volta (anche con tutte le
quantità a zero) — usato per decidere se mostrare il banner di sollecito, non per
sapere se i dati sono vuoti.

## Dominio `tornei` — `app/models/tornei/models.py`

| Tabella | Modello | Descrizione |
|---|---|---|
| `games` | `Game` | Titolo (es. Mario Kart 8 Deluxe): contenitore di personaggi, circuiti e tornei. |
| `characters` | `Character` | Personaggi giocabili, univoci per `(name, game_id)`. |
| `circuits` | `Circuit` | Piste, univoche per `(name, game_id)`. |
| `tournaments` | `Tournament` | Torneo: gioco, formato (`classic`/`group_stage`), stato, vincitore, deadline schedina, chiusura anticipata schedine (`schedine_locked`), dati di formato (`format_data` JSON), Duello, ecc. |
| `tournament_players` | `TournamentPlayer` | Tabella ponte N:N fra `tournaments` e `players` (partecipanti). |
| `playoff_history` | `PlayoffHistory` | Storico spareggi diretti fra due giocatori. |
| `player_game_participation` | `PlayerGameParticipation` | Costanza di partecipazione per `(player_id, game_id)`: tornei consecutivi giocati/saltati (`current_streak`/`tournaments_missed_in_a_row`), usata dal badge "Costanza" e dal promemoria di rientro (`participation_nudge`). Aggiornata da `_sync_participation_tracking` in `create_tournament`, solo per tornei non amichevoli. |
| `races` | `Race` | Singola gara di un torneo: pista, ordine, e per i tornei a gironi `phase` (`group`/`finals`) e `group_name`. |
| `results` | `Result` | Risultato di un giocatore in una gara: posizione, punti, personaggio usato. |
| `predictions` | `Prediction` | Pronostico semplice "vincitore torneo" con puntata in monete virtuali (sistema di engagement separato dalle schedine). |

`Tournament.game_id` è obbligatoria: ogni torneo appartiene a un solo gioco. Questo
vincolo è alla base della regola "le carte si possono usare solo su tornei dello
stesso gioco" (vedi [`REGOLAMENTO.md`](REGOLAMENTO.md)).

`Tournament.format_data` (JSON) contiene la configurazione specifica del formato,
ad es. per `group_stage`: `{"groups": {"1": [player_id, ...], "2": [...], ...}}`
con un numero di gironi calcolato dinamicamente in base al numero di partecipanti
(`compute_group_layout`, in `app/services/tornei/tournaments.py`).

`Circuit.game_id` e `Tournament.game_id` sono entrambe FK indipendenti verso
`games.id`: non c'è una FK diretta `Race → Game`, quindi le statistiche
aggregate per gioco (`app/services/tornei/stats.py`, testa a testa fra
giocatori e classifiche per circuito) filtrano `Race` passando per
`Race.tournament_id → Tournament.game_id`, escludendo sempre le gare di
duello/spareggio (`Race.is_duello`).

## Dominio `schedine` — `app/models/schedine/models.py`

| Tabella | Modello | Descrizione |
|---|---|---|
| `schedine_torneo` | `SchedinaTorneo` | Schedina per i tornei in formato **classic**: pronostico di classifica completa, streak, "vittima del caos" (campo storico non più usato nel punteggio), Duello (con opzione Pareggio via `duello_pareggio`), Spareggio. |
| `schedine_torneo_deluxe` | `SchedinaTorneoGroupStage` | Schedina per i tornei in formato **group_stage**: pronostico di Finalisti, Classifica Finale, Duello (con opzione Pareggio via `duello_pareggio`), Spareggio (nome tabella mantenuto per compatibilità con dati pre-esistenti). |
| `premi_torneo` | `PremioTorneo` | Premio assegnato al vincitore della schedina di un torneo, da riscattare nel torneo successivo (Carta Master). |

Entrambi i tipi di schedina hanno un vincolo di unicità `(user_id, tournament_id)`:
un utente può compilare **una sola schedina per torneo**, nel formato corretto
per quel torneo (`tournament.tournament_format` decide quale tabella usare).

## Dominio `cards` — `app/models/cards/models.py`

| Tabella | Modello | Descrizione |
|---|---|---|
| Table | Model | Description |
|------|-------|-------------|
| `user_inventory` | `UserInventory` | Power card **grant** per user: type (`master`/`blue_shell`), source tournament/schedina, `max_uses`/`uses_remaining`, plus a flat "last use" mirror (race/phase/group/effect/target) for `/inventory/all` and `/inventory/public`. |
| `card_usage_log` | `CardUsageLog` | One row per individual **use** of a card (Master has at most 1, Blue Shell up to 3) — target player, imposed circuit/character, race, and who registered it. |

`UserInventory.source_tournament_id` records which tournament the card was won in
(hence which game, via `source_tournament.game_id`) — used at runtime to enforce
the constraint "card only usable in tournaments of the same game"
(`_check_game_compatibility` in `app/controllers/cards/inventory.py`).

`UserInventory.max_uses`/`uses_remaining` (default 1, set from `CARD_META` in
`app/services/cards/inventory.py` at grant time — Master 1, Blue Shell 3) replace
the old single `is_consumed` boolean as the source of truth for whether a card can
still be used; `is_consumed` is now derived (`uses_remaining <= 0`).
`UserInventory.target_player_id` mirrors the target of the most recent use.

`CardUsageLog` columns:
- `inventory_item_id` → the `UserInventory` grant this use belongs to
- `tournament_id` → denormalized for the "activation locks to one tournament" check
- `race_id` → the race the use applies to, **nullable**: `NULL` means the effect is
  declared but not yet linked to a race ("pending" — see below)
- `target_player_id` → the opponent this use targets (Master's `ban_pista`/`imponi_personaggio`)
- `imposed_circuit_id` / `imposed_character_id` → what's being imposed on the target
- `effect`, `used_at`, `used_by_user_id`

**Pending Master effects**: `ban_pista` (cancel an opponent's circuit choice and
impose the card holder's) and `imponi_personaggio` (force an opponent to use a
chosen character) can be declared before the race they affect exists — since
`ClassicRaceForm` creates a race and all its results in a single save, there's no
longer an empty-race window to attach the effect to at creation time. The effect is
recorded as a `CardUsageLog` with `race_id = NULL`; `ClassicRaceForm` fetches
pending effects for the tournament (`GET /inventory/tournament/{id}/pending-effects`)
and proposes them automatically on the next race involving the target, resolving
the log's `race_id` on save (`POST /inventory/card-usage/{id}/resolve`,
`resolve_pending_card_usage` in `app/services/cards/inventory.py`).

These phase/group columns are populated automatically when the card is used with
a `race_id` (derived from the race's phase/group_name), or can be set explicitly
via the admin interface (`AdminUseItemRequest.phase` / `.group_name`).

Admin-grant tracking columns:
- `game_id` → which game's pool the card belongs to (FK to `games`)
- `granted_by_admin` → `True` if the card was manually granted by an admin (vs. won via schedina)
- `admin_note` → mandatory note explaining why an admin granted the card
- `granted_by_user_id` → which admin user granted it (FK to `users`)

**Usage limit**: per-card, via `uses_remaining` (Master 1, Blue Shell up to 3) —
enforced by `_check_card_available` in `app/controllers/cards/inventory.py`. A
partially-used card is locked to whichever tournament it was first used in
(`_check_activation_tournament`, same file): its remaining uses cannot be spent in
a different tournament. See [`REGOLAMENTO.md`](REGOLAMENTO.md) §7.

## Relazioni cross-dominio degne di nota

- `User.schedine` / `User.premi_torneo` / `User.inventory_items` — un utente è il
  proprietario di schedine (dominio `schedine`), premi (`schedine`) e carte (`cards`).
- `Tournament.schedine`, `Tournament.premi_assegnati/premi_prossimi` — un torneo
  "classic" è collegato 1:N alle sue `SchedinaTorneo` e ai `PremioTorneo` assegnati
  o riscattabili al suo interno (i tornei `group_stage` referenziano le proprie
  schedine tramite `tournament_id` su `SchedinaTorneoGroupStage`, senza `back_populates`
  dedicato — la query passa sempre da `tournament_id`).
- `UserInventory.source_tournament` / `consumed_in_race` — collegano una carta al
  torneo di provenienza e alla gara in cui è stata consumata dal vivo.
- `UserGameOwnership.game_id` referenzia `games.id` (dominio `tornei`), quindi
  anche questa tabella — pur vivendo nel dominio `utenti` — è un collegamento
  cross-dominio come `UserInventory`.
