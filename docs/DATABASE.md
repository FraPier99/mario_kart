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
| `user_inventory` | `UserInventory` | Power card inventory per user: type (`master`/`blue_shell`), source tournament/schedina, consumption status, race/phase/group where used. |

`UserInventory.source_tournament_id` records which tournament the card was won in
(hence which game, via `source_tournament.game_id`) — used at runtime to enforce
the constraint "card only usable in tournaments of the same game"
(`_check_game_compatibility` in `app/controllers/cards/inventory.py`).

Additional consumption columns:
- `consumed_in_race_id` → the specific race the card was used in (FK to `races`)
- `consumed_in_phase` → `"group"`, `"semifinal"`, or `"finals"` (for group-stage tournaments where no specific race is targeted)
- `consumed_in_group_name` → the group/battery name (e.g. `"1"`, `"top"`, `"bottom"`)
- `consumed_effect` → textual description of the effect applied (e.g. `"proteggi_posizione"`, `"custom"`)
- `consumed_at` → timestamp of consumption

These phase/group columns are populated automatically when the card is used with
a `race_id` (derived from the race's phase/group_name), or can be set explicitly
via the admin interface (`AdminUseItemRequest.phase` / `.group_name`).

Admin-grant tracking columns:
- `game_id` → which game's pool the card belongs to (FK to `games`)
- `granted_by_admin` → `True` if the card was manually granted by an admin (vs. won via schedina)
- `admin_note` → mandatory note explaining why an admin granted the card
- `granted_by_user_id` → which admin user granted it (FK to `users`)

**Usage limit**: regardless of `card_type` or `tournament.tournament_format`, a
player may consume **at most 1 card in total per tournament** — enforced by
`_check_player_card_limit` in `app/controllers/cards/inventory.py` (see
[`REGOLAMENTO.md`](REGOLAMENTO.md) §3e).

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
