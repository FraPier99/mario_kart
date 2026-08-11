# CLAUDE.md — Backend (app/)

Guidance for Claude Code when working in `app/`. See root `CLAUDE.md` for cross-cutting architecture (the classic vs group_stage fork, known gotchas).

## Commands

```powershell
.\venv\Scripts\Activate.ps1
uvicorn app.main:socket_app --reload --port 8000
```

No test suite, no linter, no Alembic configured for this backend. Validate changes with `python -c "import ast; ast.parse(open('app/path/to/file.py').read())"` for a quick syntax check, and exercise endpoints manually (or via the running frontend) — there is no automated regression net here.

## Layout (by domain, three layers each)

```
controllers/{tornei,schedine,utenti,cards}/   FastAPI APIRouter + handlers; schemas/ subfolder has Pydantic request/response models
services/{tornei,schedine,utenti,cards}/      business logic + DB queries (the actual logic lives here, not in controllers)
models/{tornei,schedine,utenti,cards}/        SQLAlchemy ORM models, all sharing Base from app.models.base
core/                                          config, DB session (engine/SessionLocal in core/db.py), auth (core/security.py), bootstrap.py
data/                                          seed data (circuits, characters, punteggi.py scoring tables)
Scripts/                                       one-off scripts (test-data seeding, etc.) — not imported by the app
```

`app.models` re-exports every domain's ORM classes, so application code imports `from app.models import Tournament, User, ...` rather than reaching into the per-domain submodule.

## Key business logic entry points

- **Tournament lifecycle**: `services/tornei/tournaments.py` — by far the largest file. Tournament CRUD, group layout (`compute_group_layout`), girone/semifinal seeding and advancement (`seed_group_stage`, `_advance_top_n`, `_group_standings`), all tie-break detection/resolution (`_all_tied_blocks`, `_resolve_podium_tie`, `_first_to_n_order`, `get_classic_podium_ties`, `get_finals_podium_ties`, `get_consolation_podium_ties`). Finalization is never automatic — it's always triggered by the admin via `update_tournament`/`set_tournament_playoff_winner`, fronted by the "Decreta Vincitore" button (`WinnerFinalizeCard.jsx`).
- **Results**: `services/tornei/results.py` — `create_result`/`update_result` just persist a `Result` and recompute points from `app/data/punteggi.py`'s `PUNTEGGI_CONFIG[n_players][position-1]`; they don't trigger any finalization.
- **Schedine settlement**: `services/schedine/schedine.py` (classic) and `schedine_deluxe.py` (group_stage) — both `settle_*` functions score every open schedina, grant the Master card to the schedina winner (and ties), grant the Blue Shell to the actual last (and, with 7+ players, second-to-last) finisher, create `PremioTorneo` rows, and send notifications. They are *not* auto-invoked by SQLAlchemy events — every caller (`update_tournament`, `set_tournament_playoff_winner`) must explicitly dispatch to the format-correct settle function.
- **Cards**: `services/cards/inventory.py` (`grant_card`, `record_card_usage`, `resolve_pending_card_usage`, `get_pending_card_usages`) + `controllers/cards/inventory.py` (`_check_card_available`, `_check_activation_tournament`, `_check_game_compatibility`, `_check_not_duello_race` — the rules gating card use). `UserInventory` is one row per card *grant*; `CardUsageLog` is one row per individual *use* (Blue Shell can have up to 3). A `CardUsageLog` with `race_id = NULL` is a Master effect (ban_pista/imponi_personaggio) declared before its target race exists — resolved later via `resolve_pending_card_usage`.
- **Auth/roles**: `core/security.py` — `get_current_user()`, `require_roles("admin", "superadmin")` as FastAPI dependencies. Superadmin accounts never have a linked `Player` and are excluded from tournament participation everywhere (`_get_superadmin_player_ids`/`_reject_superadmin_participants` in tournaments.py).
- **Statistiche aggregate**: `services/tornei/stats.py` + `controllers/tornei/stats.py` (`/stats/*`) — leaderboard per torneo, confronto testa a testa fra due giocatori filtrato per `game_id` (self-join su `Result` sullo stesso `race_id`), classifiche aggregate per circuito (lista leggera + dettaglio con ranking completo, per il fetch lazy on-expand del frontend), e badge giocatore per gioco (`get_player_game_badge`/`get_player_badges`, tier `BADGE_TIER_RANK`). Il calcolo dei badge usa `Tournament.winner_id` per il 1° posto (fonte già ufficiale per classic/group_stage) ma richiama `get_classic_final_classifica`/`get_group_stage_overall_classifica` (`services/tornei/tournaments.py`) per rilevare 2°/3° posto, dato che non esiste un campo persistito per il podio — solo sui tornei conclusi (`Tournament.winner_id.isnot(None)`). Le query di circuito/head-to-head escludono sempre `Race.is_duello.is_(True)`, come `get_leaderboard`. Tutte le route di questo controller sono pubbliche (nessun `Depends(get_current_user)`), come le altre GET di sola lettura in `circuits.py`/`results.py`/`tournaments.py`.
- **Game/console ownership**: `services/utenti/ownership.py` — self-service, any authenticated user declares which games/consoles they own and (only if they own Mario Kart DS, `game_id=1`) which devices they run an R4 flashcart on. `replace_my_ownership` uses full-replace semantics on `PUT` (deletes and re-inserts every console/R4 row) rather than the incremental CRUD used elsewhere in this codebase — deliberate, since these are just tags with no history/audit requirement.
- **Static content images**: `services/utenti/content_images.py` + `controllers/utenti/content_images.py` (`/content-images/*`) — generic key→image slots (`SiteContentImage`, one row per `key`) for superadmin-editable static content (e.g. the founding photo on the frontend `/faq` page), same base64-in-DB + `to_image_url`/`optimize_image_data_url` pattern as `Player.champion_photo`. Adding a new image slot anywhere in the frontend needs no backend change — just a new `key` string.

## Conventions worth following

- Business logic goes in `services/`, never in `controllers/` handlers beyond translating exceptions to `HTTPException`.
- `ValueError` raised from a service is the convention for "expected" failures (bad input, invalid state transition) — controllers catch it and return 400.
- Lazy/local imports (`from app.models import X` inside a function body) are used throughout to dodge circular imports between `services/tornei` and `services/schedine` — follow the existing pattern rather than hoisting to module level when adding cross-domain calls.
- When deleting a Tournament, always go through `tournament_delete` (`services/tornei/tournaments.py`) — it correctly nulls/cascades every dependent table (races, results, schedine, cards, premi, notifications, photos). Never `db.delete(tournament)` directly.
