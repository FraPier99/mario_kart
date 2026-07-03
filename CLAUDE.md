# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Mario Kart league tracker — FastAPI backend (`app/`) + React/Vite frontend (`frontend/`), PostgreSQL database. Manages tournaments, prediction slips ("schedine"), and a power-card meta-game. See `app/CLAUDE.md` and `frontend/CLAUDE.md` for stack-specific guidance; this file covers cross-cutting architecture.

## Running locally

```powershell
# Backend (from repo root)
.\venv\Scripts\Activate.ps1
uvicorn app.main:socket_app --reload --port 8000

# Frontend (from frontend/)
npm run dev
```

`start.ps1` launches both in separate PowerShell windows. DB connection string lives in `.env` → `app/core/config.py` (default `postgresql://postgres:gradino@localhost:5432/kart`). No Alembic — schema changes are `ALTER TABLE` migrations in `app/core/bootstrap.py`, run automatically on backend startup.

## The two tournament formats — the central fork in the codebase

`Tournament.tournament_format` is `"classic"` (single overall standings) or `"group_stage"` (flexible N-group bracket: Gironi → optional Semifinali → Finale/Consolazione). Nearly every domain has a format-aware branch:

- **Schedine** (prediction slips): two separate tables/services — `schedine_torneo`/`app/services/schedine/schedine.py` (classic) vs `schedine_torneo_deluxe`/`schedine_deluxe.py` (group_stage). Different prediction shapes (classic predicts full ranking + streak; group_stage predicts finalists + per-girone standings).
- **Tie-break duels**: classic uses `get_classic_podium_ties`; group_stage's Finale uses `get_finals_podium_ties`, its Consolazione/"Finalina" uses `get_consolation_podium_ties` (all in `app/services/tornei/tournaments.py`). Group-stage *qualification* ties (girone/semifinal cutoff) are a third, different mechanism: `_resolve_tie_with_spareggio` (first to 2 wins, races with `is_duello=true` and the same phase/group_name, excluded from group points). Tournaments are **never** auto-finalized when a duel resolves — finalization is always a manual step via the "Decreta Vincitore" button (`WinnerFinalizeCard.jsx` → `update_tournament`/`set_tournament_playoff_winner`), which checks for unresolved ties first.
- **Frontend**: `TournamentDetail.jsx` branches almost everything on `tournament.tournament_format` — group_stage delegates most of its UI to `GroupManagementSection.jsx` (admin) / `GroupPlancia.jsx` (standings).

When fixing a bug in one format's path, check whether the equivalent function exists for the other format — they're usually hand-duplicated, not shared, and easy to fix in only one place.

## Gotchas learned the hard way (read before touching these areas)

- **`Tournament.participant_ids` / `.withdrawn_player_ids` are not real columns.** They're attributes injected at runtime by `_load_participants(db, tournament)` in `app/services/tornei/tournaments.py`. Any endpoint that reads `tournament.participant_ids` without first calling `_load_participants` on that exact object will hit `AttributeError` (often swallowed silently by a frontend `.catch()`, producing a confusing empty list instead of an error). When in doubt, query `TournamentPlayer` directly instead.
- **Tie-break duel resolution is "first to 3 wins" for every tied block**, regardless of position or how many players are tied (1°/2°, 3°/4°, lower positions, 3-way ties). There is no separate "single race" mode for non-podium positions — `_resolve_podium_tie`/`_first_to_n_order` is the single mechanism. Frontend code that re-derives a duel's `group_name` from its position must match the backend's exact rule (`start position === 1` → `duello_podio_1_2`, `=== 3` → `duello_podio_3_4`, otherwise the dynamic `duello_podio_<start>_<end>`) — a looser `pos <= 2`/`pos <= 4` check will create races under the wrong `group_name` and the duel will never resolve.
- **`tournament.standings` (computed client-side in `AppDataContext.jsx`) sums every non-duello race for the whole tournament, ignoring phase/girone.** It's the correct "official classifica" only for `classic` tournaments. Never use it as a stand-in for a group_stage Finale's standings or any single girone's standings — see `PodiumDuelCard.jsx`'s `useClientFallback` prop, which is deliberately `false` for the Finale (`FinalsPodiumDuelCard.jsx`).
- **Card grants/schedina scoring must use the duel-resolved classifica**, not the raw points/wins/podiums ordering. `_get_leaderboard` in `app/services/schedine/schedine.py` ignores duel outcomes; `get_classic_final_classifica` (tournaments.py) does not. `_build_tournament_schedina_snapshot` and the Blue Shell grant both rely on the latter for classic tournaments.
- **Card usage limit is uniform across both formats**: max 1 card total per player per tournament, regardless of card type — enforced in `_check_player_card_limit` (`app/controllers/cards/inventory.py`).

## Where the rules are written down

`docs/REGOLAMENTO.md` (game rules), `docs/DATABASE.md` (schema), `docs/ARCHITETTURA.md` (directory layout), `docs/CLASSIFICA.md` (placement-index ranking math), `TOURNAMENT_TRACKER_RULES.md` (condensed cross-reference of the rules the backend *actually* enforces, with code pointers — keep this in sync when behavior changes). When you change tournament/schedina/card behavior, update the relevant doc(s) and the player-facing `frontend/src/pages/Regolamento.jsx` in the same change.
