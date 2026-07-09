# QA Report — Tournament / Schedina Lifecycle (Classic & Group Stage)

> **Update (2026-06-14, post-QA)**: Bugs **1**, **2** and **4** below have been
> **fixed** in this session:
> - Bug 1 (critical FK crash): `settle_deluxe_schedine` no longer passes
>   `source_schedina_id` to `grant_card` (`app/services/schedine/schedine_deluxe.py`).
>   Re-verified end-to-end on tournament 45 (reset + re-settled from scratch):
>   `status="ok"`, both ex-aequo users got `PremioTorneo` + `master` cards with
>   `source_schedina_id=NULL`, no crash.
> - Bug 2 (REGOLAMENTO mismatch): `REGOLAMENTO.md` §1 "A Gironi" rewritten to
>   match `compute_group_layout`/`MIN_GROUP_STAGE_PLAYERS=8`/`MAX_GROUP_SIZE=4`
>   (no more "girone unico" claim; corrected examples for 8/10/11/12/17 players).
> - Bug 4 (no already_settled short-circuit): `settle_deluxe_schedine` now
>   checks `existing_prize` up front and returns `status="already_settled"`
>   immediately, mirroring the classic path. Re-verified: calling it again on
>   tournament 45/48 returns `"already_settled"` without touching any rows.
>
> Bug 3 (unscoreable Classifica Finale positions beyond `FINAL_SLOTS=4`) and
> Info 5 (pre-existing orphaned cards for user 10) are left as documented
> findings — both are minor/non-blocking and out of scope for this session.
>
> **Update (2026-07-09)**: Bug 3 has also since been fixed (commit `624caeb`,
> "Schedine: form a click-in-sequenza e fix stato compilazione") —
> `frontend/src/pages/SchedinaGroupForm.jsx:160` now caps the predicted final
> ranking at `nFinal = Math.min(4, allParticipants.length)`, so users can no
> longer predict unscoreable positions beyond `FINAL_SLOTS`. Info 5 required
> no action per the original finding. **All bugs in this report are now
> resolved**; kept for historical reference only.

Date: 2026-06-14
Scope: End-to-end exercise of the tournament + schedina lifecycle for both
`classic` and `group_stage` formats, via direct service-layer calls against the
dev Postgres `kart` DB. Scripts used: `qa_setup_users.py`, `qa_scenario1.py`
... `qa_scenario6_resettle.py` (left in project root for reference).

## Summary

5 scenarios run (4 completed end-to-end, 1 blocked by a critical bug and
completed via a QA-only workaround). Overall verdict: **the classic-format
settlement/scoring/ex-aequo logic is solid and matches REGOLAMENTO.md
precisely**. The **group-stage settlement path (`settle_deluxe_schedine`) is
broken by a critical FK bug and will crash on every real-world settlement**
unless the QA workaround (skip `source_schedina_id`) is applied. Once that
crash is bypassed, the rest of the group-stage scoring/ex-aequo/tie-break/
spareggio logic also works correctly and matches REGOLAMENTO.md. A significant
discrepancy between REGOLAMENTO.md's stated group-layout rules and the actual
`compute_group_layout`/`MIN_GROUP_STAGE_PLAYERS` implementation was also found.

| # | Severity  | Issue |
|---|-----------|-------|
| 1 | Critical  | `settle_deluxe_schedine` crashes (FK violation) on every Carta Master grant |
| 2 | Major     | REGOLAMENTO.md vs `compute_group_layout`/`MIN_GROUP_STAGE_PLAYERS` mismatch (no "girone unico" path exists) |
| 3 | Minor     | Group-stage "Classifica Finale" prediction can include players who can never appear in `actual_classifica_finale` (unscoreable positions) |
| 4 | Minor     | `settle_deluxe_schedine` has no "already_settled" short-circuit (re-settles/recomputes every call, unlike classic) |
| 5 | Info      | Pre-existing `master` cards with `source_tournament_id=NULL` found in `user_inventory` for user 10 (not caused by this QA run, but worth a look) |

---

## Test scenarios run

### Scenario 1 — Classic tournament, full flow (tournament_id = 43, `qa_classic_basic`)
- Format `classic`, game_id=1, n_players=4 (participants: players 1, 3, 13, 14),
  n_races overridden to 3 via `update_tournament`.
- 4 schedine submitted (users 10, 9, 11, 12) while `status="da_svolgere"`.
- 3 races created (each create_race auto-locked schedine and flipped status to
  `in_corso`, as expected).
- Results entered for all 3 races; leaderboard: player 1 = 13 pts (winner),
  player 3 = 11, player 13 = 5, player 14 = 4.
- `update_tournament(status="concluso", winner_id=1)` → auto-triggered
  `settle_tournament_schedine`.
- Result: schedina 16 (user 10) and schedina 18 (user 11) both landed on
  total_points=15, tie_breaker_distance=8 (an organic ex-aequo). Both got
  `PremioTorneo` rows (ids 5, 6) and `master` cards. `vincitore_schedina_id=10`
  (deterministic, lowest `created_at`/id). Last place (player 14, user 12) got
  `blue_shell`.

### Scenario 2 — Classic tournament, engineered ex-aequo (tournament_id = 44, `qa_classic_exaequo`)
- Same setup as Scenario 1 (players 1,3,13,14; n_players=4, n_races=3).
- Two schedine (users 9 and 12) submitted with **literally identical**
  predictions (`classifica_ordinata=[1,3,13,14]`, streak=1, duello pick =
  duello_player_a, spareggio=13).
- After settlement: both schedine scored total_points=18, tie_breaker_distance=0
  (perfect tie). Both received `PremioTorneo` rows (ids 7, 8) and `master` cards.
  `vincitore_schedina_id=9` (schedina 20 was created marginally earlier than
  schedina 21, both same millisecond — `created_at`/`id` tiebreak picked the
  lower id, deterministic). Last place (player 14, user 12) also received
  `blue_shell` — same user got both cards for this tournament, which is correct
  (one card per category, both earned independently).

### Scenario 3 — Group-stage, n_players=8 (tournament_id = 45, `qa_groupstage_8`)
- Format `group_stage`, game_id=2, n_players=8 (participants: players
  1,2,3,4,5,6,7,9). `compute_group_layout(8) = [4, 4]` → 2 groups of 4
  (see Bug #2 — REGOLAMENTO says 6-8 players should be a single group).
- `seed_group_stage` → Group 1 = [6,5,2,3], Group 2 = [7,1,4,9].
- 3 schedine submitted (users 11, 12 — identical predictions for ex-aequo
  test; user 13 — different prediction) while `status="da_svolgere"`.
- 1 group race per girone (4 results each); `generate_group_stage_finals`
  correctly produced `needs_semifinal=False` (qualified = 4 ≤ FINAL_SLOTS),
  `top=[6,5,7,1]`, `bottom=[2,3,4,9]`.
- 1 "finals/top" race + 1 "finals/bottom" race, results entered.
- `actual_finalisti=[1,5,6,7]`, `actual_classifica_finale=[6,5,7,1]`,
  top-two gap = 2. winner_id = 6.
- `update_tournament(status="concluso", winner_id=6)` succeeded (this path does
  NOT call the deluxe settle, only classic — see code at
  `app/services/tornei/tournaments.py:333-338`, `should_settle_schedine` only
  calls `settle_tournament_schedine`, never `settle_deluxe_schedine`).
- **`settle_deluxe_schedine(db, 45)` crashed** with
  `psycopg2.errors.ForeignKeyViolation` on `user_inventory_source_schedina_id_fkey`
  — see Bug #1. Re-run with the QA workaround (monkeypatched `grant_card` to
  drop `source_schedina_id`) succeeded: schedine 1 & 2 (users 11, 12 — identical
  predictions) both scored 24/24 with tiebreak 0/0 (4/4 finalisti correct = 12pt,
  4/4 classifica positions correct = 12pt), both got `PremioTorneo` + `master`.
  `vincitore_schedina_id=11` (deterministic). Schedina 3 (user 13) scored 15
  (4 finalisti correct = 12, 0 classifica correct, duello correct = +3).
  Last place = player 9 (no linked user account → no `blue_shell` granted,
  correctly skipped per the `if player and player.user_account` guard).

### Scenario 4 — Group-stage, n_players=11, multi-group + semifinals (tournament_id = 48, `qa_groupstage_11c`)
- Format `group_stage`, game_id=2, n_players=11 (participants:
  1,2,3,4,5,6,7,9,10,15,16). `compute_group_layout(11) = [4,4,3]` → 3 groups.
  Group 1=[6,5,4,15], Group 2=[2,1,9,16], Group 3=[7,3,10].
- 3 schedine submitted before results: users 9 & 13 with identical predictions
  (finalisti = top2 of each group = 6 players; classifica_finale_ordinata = full
  permutation of those 6, as required by the schema), user 14 with a different
  finalisti order + `duello_pareggio=True`.
- 1 group race per girone; `generate_group_stage_finals` (1st call) correctly
  detected `qualificati=6 > FINAL_SLOTS(4)` → `needs_semifinal=True`,
  produced semifinal heats S1=[2,7,3], S2=[6,1,5] (winners-first distribution).
- `get_group_stage_ties` returned no ties at group stage and (after running the
  S1/S2 semifinal races, `phase="semifinal"`) no ties at semifinal stage either.
- 2nd call to `generate_group_stage_finals` correctly composed the Final 4 from
  semifinal results: `top=[2,6,1,7]`, `bottom=[4,15,9,16,10]`.
- finals "top" + "bottom" races run; `actual_finalisti=[1,2,6,7]`,
  `actual_classifica_finale=[2,6,1,7]`, top-two gap=2. winner_id=2.
- `update_tournament(status="concluso", winner_id=2)` then
  `settle_deluxe_schedine(db, 48)` (again via the QA workaround for Bug #1).
  Schedine 7 & 8 (users 9, 13 — identical predictions) both scored 12/12 with
  tiebreak 1/1 (4/4 finalisti correct = 12pt; 0/6 classifica positions correct,
  since `actual_classifica_finale` only has 4 entries — see Bug #3; duello
  incorrect). Both got `PremioTorneo` + `master`. `vincitore_schedina_id=9`
  (deterministic, lower schedina id). Schedina 9 (user 14, `duello_pareggio=True`)
  scored 12 too but tiebreak=3 (not ex-aequo with the winners). Duello
  correctly evaluated as `pareggio` predicted but actual outcome was not a tie
  (`actual_duello_outcome` = player with higher total points) → `corretto=False`.
  Last place = player 16 (user 14's linked player) → `blue_shell` correctly
  granted to user 14.

### Scenario 5 — Group-stage qualification tie + Spareggio (tournament_id = 49, `qa_groupstage_ties`)
- Format `group_stage`, game_id=1, n_players=8 (participants: 1,2,3,4,5,6,7,9).
  Group 1=[3,2,5,6], Group 2=[1,7,4,9].
- 2 group races run in Girone 1, engineered so players 2 and 5 (positions 2-3)
  end up tied on `(punti_totali=13, vittorie=0, podi=2)`.
- `get_group_stage_ties` correctly returned `{'phase':'group','ties':{'1':[2,5]}}`.
- `generate_group_stage_finals` correctly **raised `ValueError`**: "Pareggio
  (punti, vittorie e podi) al posto di qualificazione in: girone 1. Registra
  uno Spareggio...".
- Resolved via a 1-on-1 "Spareggio" race (`phase="group"`, `group_name="1"`,
  unused circuit, only players 2 & 5 entered) per REGOLAMENTO.md §1
  ("Classifica di girone e Spareggio").
- After the spareggio: `get_group_stage_ties` returned `{}` (no ties), and
  `generate_group_stage_finals` succeeded:
  `top=[2,5,1,7]`, `bottom=[3,6,4,9]`.
- **Notable side-effect (not a bug, but worth documenting)**: the spareggio
  points are *cumulative* with the regular-group totals (per REGOLAMENTO: "Il
  risultato di questa gara si somma alla classifica del girone"). In this run
  the spareggio gave players 2 and 5 enough extra points (22, 20) to overtake
  player 3 (18 pts, who had the most race wins in the regular group games and
  was originally 1st in the girone, uninvolved in the tie). Player 3 was
  pushed to "bottom" as a result. This is the literal/correct application of
  the rule as written, but it means a 1v1 spareggio between 2nd/3rd-place
  players can retroactively demote the girone's actual 1st-place player. Flagging
  for product-owner awareness in case this isn't the intended UX.

This tournament was left `in_corso` (not concluded) since it was used purely to
exercise the tie/spareggio machinery.

### Scenario 6 — Idempotency / re-settlement check
- Re-ran `settle_deluxe_schedine(db, 48)` (already settled): returned
  `status="ok"` again (not `"already_settled"`), but `PremioTorneo`/
  `user_inventory` counts stayed at 2/3 (no duplicates) thanks to the
  `existing_prize` guard and `grant_card`'s dedup-by-`(user_id, card_type,
  source_tournament_id)`. See Bug #4 for the design inconsistency vs. the
  classic path.
- Re-ran `settle_tournament_schedine(db, 44)` (already settled): correctly
  returned `status="already_settled"` and made no DB changes.

---

## Bugs / issues found

### Bug 1 (CRITICAL) — `settle_deluxe_schedine` crashes with ForeignKeyViolation when granting Carta Master

- **File**: `app/services/schedine/schedine_deluxe.py:437-443`
- **Root cause**: `UserInventory.source_schedina_id` is defined with
  `ForeignKey("schedine_torneo.id")` (see
  `app/models/cards/models.py:29-31`) — i.e. it references the **classic**
  schedina table (`schedine_torneo`). But `settle_deluxe_schedine` passes
  `source_schedina_id=schedina_row.id`, where `schedina_row` is a
  `SchedinaTorneoGroupStage` instance whose `id` belongs to the
  **`schedine_torneo_deluxe`** table — a completely different ID space.
- **Observed**: Calling `settle_deluxe_schedine(db, tournament_id)` on any
  group_stage tournament with at least one schedina raises:
  ```
  psycopg2.errors.ForeignKeyViolation: ERRORE: la INSERT o l'UPDATE sulla tabella
  "user_inventory" viola il vincolo di chiave esterna "user_inventory_source_schedina_id_fkey"
  DETAIL: La chiave (source_schedina_id)=(1) non è presente nella tabella "schedine_torneo".
  ```
  This happened on the very first attempt (tournament 45, `SchedinaTorneoGroupStage.id=1`,
  which doesn't exist in `schedine_torneo`). It will fail in essentially every
  real deployment, **unless** by sheer coincidence the deluxe schedina's `id`
  happens to also exist as a row id in `schedine_torneo` (which would then
  silently attach the inventory item to the wrong/unrelated classic schedina —
  arguably worse).
- **Impact**: The entire group-stage tournament conclusion flow is broken.
  After this crash, the tournament itself was left in an inconsistent state:
  `status="concluso"`, `winner_id` set (because that part is done by
  `update_tournament`/the classic `settle_tournament_schedine`, which is a
  no-op here since the tournament has no classic schedine), but
  `vincitore_schedina_id=NULL`, all `SchedinaTorneoGroupStage` rows still
  `status="open"`/`total_points=0`, and **no `PremioTorneo` row created** — no
  Carta Master / Carta Guscio Blu ever awarded for group-stage tournaments.
- **Suggested fix**: Either (a) drop `source_schedina_id` from the `grant_card`
  call in `settle_deluxe_schedine` (the FK is nullable, so `None` is valid —
  this is the minimal fix and is what the QA workaround did), or (b) add a
  separate nullable FK column (e.g. `source_schedina_deluxe_id` →
  `schedine_torneo_deluxe.id`) on `UserInventory` if traceability to the
  specific deluxe schedina is desired, and have `grant_card`/`UserInventory`
  populate the correct column based on schedina type.
- **Recovery note for the existing dev DB**: tournament 45 (`qa_groupstage_8`)
  is currently `status="concluso"` with `vincitore_schedina_id=NULL` and 3
  `SchedinaTorneoGroupStage` rows still showing `status="open"`/
  `total_points=0` (the QA workaround settled it in a *separate* re-run using a
  monkeypatched `grant_card`, which DID succeed and create `PremioTorneo`
  rows 9/10 + master cards for users 11/12 — so tournament 45's schedine data
  in the DB right now is actually correctly settled via that workaround. Only
  the *first*, crashed attempt left transient garbage, which was rolled back).

### Bug 2 (MAJOR) — REGOLAMENTO.md group-layout rules do not match `compute_group_layout`/`MIN_GROUP_STAGE_PLAYERS`

- **Files**: `REGOLAMENTO.md:13-20` vs `app/services/tornei/tournaments.py:26-52`
- **REGOLAMENTO.md says**:
  > Richiede almeno 6 partecipanti... da 6 a 8 giocatori → girone unico; oltre 8
  > → il minor numero di gironi bilanciati possibile (massimo 8 giocatori per
  > girone...). Esempi: 7 → un girone da 7; 10 → due gironi da 5; 17 → gironi da
  > 6, 6, 5.
- **Actual code**:
  - `MIN_GROUP_STAGE_PLAYERS = 8` → `create_tournament`/`compute_group_layout`
    **reject** any group_stage tournament with `n_players < 8` (7, 6 both raise
    `ValueError`).
  - `MAX_GROUP_SIZE = 4` → `compute_group_layout(8) = [4, 4]` (two groups of 4),
    not "un girone unico" of 8 as REGOLAMENTO implies for the 6-8 range.
  - `compute_group_layout(10) = [4, 4, 2]`... actually verified:
    `divmod(10, ceil(10/4)=3) = (3,1)` → `[4,3,3]`, not "due gironi da 5" as
    REGOLAMENTO's example states.
  - `compute_group_layout(17)`: `ceil(17/4)=5`, `divmod(17,5)=(3,2)` →
    `[4,4,3,3,3]`, not "gironi da 6, 6, 5" as REGOLAMENTO's example states.
- **Impact**: There is currently **no n_players value that produces a single
  group ("girone unico")** as REGOLAMENTO.md describes — the QA task's request
  for a "single group variant" (n_players yielding one group) is therefore
  **not achievable** with the current implementation; the smallest possible
  group_stage tournament (n=8) already produces 2 groups of 4. Note that the
  `compute_group_layout` **docstring itself already documents the current
  `[4,4]`/`[4,3,3]`/`[4,4,3]` behavior correctly** (its examples for n=8,10,11
  match the verified output) — so the code and its docstring are internally
  consistent; it is specifically `REGOLAMENTO.md` (the player-facing rules
  doc) that is out of sync with both. This looks like documentation drift
  after `MAX_GROUP_SIZE` was lowered from 8 to 4 (and `MIN_GROUP_STAGE_PLAYERS`
  raised from 6 to 8) without updating REGOLAMENTO.md's prose/examples.
- **Suggested fix**: Decide on the intended behavior and align one side. If
  `MAX_GROUP_SIZE=4` (screen constraint of 4 players) is the real constraint,
  update REGOLAMENTO.md's prose and examples (6-8 → 2 groups, 10 → [4,3,3], 17
  → [4,4,3,3,3], etc.) to match `compute_group_layout`'s actual `divmod`-based
  algorithm. If "girone unico" for 6-8 players is the real intended rule, the
  code needs a special case for `n_players <= 8` (and `MIN_GROUP_STAGE_PLAYERS`
  should probably be 6, not 8, to match "richiede almeno 6 partecipanti").

### Bug 3 (MINOR) — Group-stage "Classifica Finale" prediction allows unscoreable positions when `finalisti_ids` > FINAL_SLOTS

- **Files**: `app/controllers/schedine/schemas/schedine_deluxe.py:8-19` (schema),
  `app/services/schedine/schedine_deluxe.py:212-235` (`_score_schedina_groupstage`)
- **Observed**: `SchedinaTorneoGroupStageCreate` requires
  `classifica_finale_ordinata` to be an exact permutation of `finalisti_ids`
  (min length 2, no upper bound). For multi-group tournaments where the total
  number of group-winners/runners-up exceeds `FINAL_SLOTS` (4) — e.g.
  Scenario 4's 3-group, 11-player tournament produced 6 "qualified" players —
  a user predicting all 6 as `finalisti_ids` is then forced by validation to
  also rank all 6 in `classifica_finale_ordinata`. But `_get_actual_classifica_finale`
  (and the real "top" final race) only ever has at most `FINAL_SLOTS=4`
  players. In `_score_schedina_groupstage`, `n = min(len(pred_classifica),
  len(actual_classifica_finale))` caps scoring at 4 positions — **positions 5
  and 6 of the prediction can mathematically never score points**, no matter
  what the user picks. Verified in Scenario 4: schedina 7/8/9 all had 6-entry
  `classifica_finale_ordinata`, and the breakdown's `posizioni` list correctly
  shows `correct=False` for all 6 (because `idx < n` is false for idx 4,5),
  but this is more a "wasted prediction" UX issue than a scoring bug — the
  flat-3pt model still works arithmetically.
- **Impact**: Not a crash, scores are still computed correctly, but the UI/UX
  for filling in `classifica_finale_ordinata` when `finalisti_ids` has >4
  entries is misleading — users will rank players 5 and 6 for no possible
  reward.
- **Suggested fix**: Either cap `finalisti_ids`/`classifica_finale_ordinata` at
  `FINAL_SLOTS` (4) in the schema/validation for group_stage tournaments where
  `qualificati > FINAL_SLOTS`, or clearly communicate in the UI that only the
  first 4 ranked positions are scoreable.

### Bug 4 (MINOR) — `settle_deluxe_schedine` lacks the "already_settled" short-circuit that `settle_tournament_schedine` has

- **Files**: `app/services/schedine/schedine_deluxe.py:346-481` vs
  `app/services/schedine/schedine.py:594-603`
- **Observed**: `settle_tournament_schedine` checks for an `existing_prize` up
  front and returns early with `status="already_settled"` without touching any
  rows. `settle_deluxe_schedine` only checks `existing_prize` to decide whether
  to (re-)create `PremioTorneo`/cards, but **unconditionally** re-runs the full
  scoring loop and overwrites `total_points`, `status="settled"`, and
  `settled_at=datetime.utcnow()` on every `SchedinaTorneoGroupStage` row, every
  time it's called (verified in Scenario 6 — `settled_at` would be bumped on
  every re-run even though `status` was already `"ok"`/already settled).
- **Impact**: Low — values recomputed are idempotent (same inputs → same
  outputs), and `PremioTorneo`/card counts don't change. But `settled_at`
  silently changes on every re-invocation, and the function does unnecessary
  work. If `settle_deluxe_schedine` were ever called from a request handler
  that could be invoked multiple times (e.g. retried due to the Bug #1 crash),
  this could cause confusing audit timestamps.
- **Suggested fix**: Mirror the classic path — check `existing_prize` first and
  short-circuit with a `status="already_settled"` response if found.

### Info 5 — Pre-existing orphaned `master` cards with `source_tournament_id=NULL` for user 10

- **Observed**: Before any QA activity, `user_inventory` already contained two
  `master` cards for user 10 (`gradino`) with `source_tournament_id=NULL`
  (ids 9 and 10, dated 2026-06-06 — clearly from earlier session/manual
  testing, not from this QA run). Not a bug introduced by this QA pass, and
  `grant_card`'s dedup key `(user_id, card_type, source_tournament_id)` means
  a `source_tournament_id=NULL` master card could theoretically be granted
  again with a different `None`... actually no — `None == None` matches in SQL
  via `IS NULL`? **Worth double-checking**: SQLAlchemy's `.filter(col ==
  None)` is translated to `IS NULL`, so a second `grant_card(db, 10, "master",
  source_tournament_id=None, ...)` call would find the *first* `NULL` row and
  return it without creating a duplicate — so this isn't a duplication risk
  going forward, just leftover test data from a prior session. Mentioned for
  completeness only; no action needed from this QA pass.

---

## Things that worked correctly

- **Classic tournament full lifecycle** (create → schedine → races/results →
  conclude → settle) worked end-to-end with no errors (Scenario 1).
- **Classic ex-aequo handling**: Two schedine with identical
  `total_points`/`tie_breaker_distance` both received `PremioTorneo` rows and
  `master` cards; `vincitore_schedina_id` was set deterministically to exactly
  one of them (Scenario 2).
- **Flat 3-point scoring** (`PUNTI_PRONOSTICO=3`) for classic schedine
  (`classifica_ordinata` positions, `maggiore_streak_vittorie_id`, `Duello`)
  matches REGOLAMENTO.md §2a precisely — verified against hand-computed
  expectations in Scenarios 1 & 2.
- **Carta Guscio Blu** correctly granted only to the real last-place
  player's linked user account, and correctly skipped when the last-place
  player has no linked user (Scenario 3, player 9).
- **`create_race` auto-locking**: creating the first race correctly set
  `schedine_locked=True` and flipped `status` from `da_svolgere` to
  `in_corso`, blocking further schedina submissions as documented.
- **Group-stage layout & phase machinery** (once the Bug #1 workaround is
  applied): `seed_group_stage`, `generate_group_stage_finals` (both the
  direct-to-finals and the semifinal-then-finals paths),
  `_get_actual_finalisti`, `_get_actual_classifica_finale`,
  `_get_top_two_points_gap`, `_resolve_duello_outcome` all produced correct,
  sane results across 4-player and 3-group/11-player tournaments (Scenarios 3
  & 4).
- **Group-stage scoring** (`_score_schedina_groupstage`): Finalisti (3pt each),
  Classifica Finale (3pt per correct position), Duello (incl. `Pareggio`
  handling) all matched hand-computed expectations, including ex-aequo
  detection and `vincitore_schedina_id` determinism (Scenario 4).
- **Group-stage tie detection & blocking**: `find_classifica_ties` /
  `get_group_stage_ties` correctly detected a 2-3 position tie
  (`punti_totali`, `vittorie`, `podi` all equal) and `generate_group_stage_finals`
  correctly refused to advance with a descriptive `ValueError` (Scenario 5).
- **Spareggio resolution**: A single 1v1 "gara secca" race
  (`phase="group"`, same `group_name`) correctly resolved the tie, and
  `generate_group_stage_finals` succeeded afterward with the spareggio points
  folded cumulatively into the girone classifica, per REGOLAMENTO.md (Scenario 5).
- **Idempotency / dedup**: `grant_card`'s `(user_id, card_type,
  source_tournament_id)` uniqueness check and `settle_tournament_schedine`'s
  `existing_prize` short-circuit both prevented duplicate
  `PremioTorneo`/inventory rows on re-settlement (Scenario 6).

---

## Cleanup notes (left for the user to decide)

QA tournaments created (all prefixed `qa_` after schema normalization, status
shown is final state at end of QA run):

| tournament_id | name | format | status | notes |
|---|---|---|---|---|
| 43 | qa_classic_basic | classic | concluso | settled correctly |
| 44 | qa_classic_exaequo | classic | concluso | settled correctly, engineered ex-aequo |
| 45 | qa_groupstage_8 | group_stage | concluso | settled via QA workaround for Bug #1 |
| 46 | qa_groupstage_11 | group_stage | da_svolgere/in_corso (partial) | **abandoned** — schedina validation error during setup left it partially seeded (groups assigned, no races/schedine). Stale artifact. |
| 47 | qa_groupstage_11b | group_stage | in_corso (partial) | **abandoned** — group races + mis-tagged "semifinal" races (created with `phase="group"` due to a QA script bug) exist. Stale artifact. |
| 48 | qa_groupstage_11c | group_stage | concluso | settled via QA workaround for Bug #1 — the "good" 11-player run |
| 49 | qa_groupstage_ties | group_stage | in_corso | left unconcluded; used only to exercise tie/spareggio logic |

QA users / players created:
- Players 13-16: `qa_player1`..`qa_player4`
- Users 11-14: `qa_user1`..`qa_user4` (password `qapassword123`), linked 1:1 to
  players 13-16 respectively.

`PremioTorneo` rows created by this QA run: ids 5-12 (tournaments 43, 44, 45, 48).

`UserInventory` cards granted by this QA run: `master`/`blue_shell` entries
with `source_tournament_id` in {43, 44, 45, 48} for users 9, 10, 11, 12, 13, 14.

QA helper scripts (`qa_*.py`) used to drive the scenarios above have been
removed from the project root after this report was finalized — the scenario
descriptions above capture the relevant setup/inputs for reproduction.

**Recommendation**: Fix Bug #1 first (it's a one-line/few-line fix and is
release-blocking for the group_stage feature), then re-run
`settle_deluxe_schedine` for tournament 45 to confirm it now works without the
monkeypatch (tournament 48 was already correctly settled via the workaround and
should not need re-running — its `PremioTorneo`/inventory rows are already
correct). Tournaments 46 and 47 are inert leftover artifacts and can be deleted
once the user confirms; they hold no schedine/results that matter.
