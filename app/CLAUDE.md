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
- **Cards**: `services/cards/inventory.py` (`grant_card`, `consume_inventory_item`) + `controllers/cards/inventory.py` (`_check_player_card_limit`, `_check_game_compatibility`, `_check_not_duello_race` — the three rules gating card use).
- **Auth/roles**: `core/security.py` — `get_current_user()`, `require_roles("admin", "superadmin")` as FastAPI dependencies. Superadmin accounts never have a linked `Player` and are excluded from tournament participation everywhere (`_get_superadmin_player_ids`/`_reject_superadmin_participants` in tournaments.py).

## Conventions worth following

- Business logic goes in `services/`, never in `controllers/` handlers beyond translating exceptions to `HTTPException`.
- `ValueError` raised from a service is the convention for "expected" failures (bad input, invalid state transition) — controllers catch it and return 400.
- Lazy/local imports (`from app.models import X` inside a function body) are used throughout to dodge circular imports between `services/tornei` and `services/schedine` — follow the existing pattern rather than hoisting to module level when adding cross-domain calls.
- When deleting a Tournament, always go through `tournament_delete` (`services/tornei/tournaments.py`) — it correctly nulls/cascades every dependent table (races, results, schedine, cards, premi, notifications, photos). Never `db.delete(tournament)` directly.
