"""
Copre il meccanismo di spareggio di QUALIFICAZIONE nei tornei a gironi
(girone/semifinale) — un meccanismo DIVERSO dagli spareggi podio classic
(vedi test_classic_podium_ties.py): CLAUDE.md lo chiama esplicitamente
"a third, different mechanism" — _resolve_tie_with_spareggio, primo a 2
vittorie (non 3), gare escluse dai punti ufficiali del girone.
"""

from app.services.tornei.tournaments import (
    get_group_stage_classifiche,
    get_group_stage_ties,
)
from tests.factories import (
    get_superadmin,
    make_group_stage_tournament,
    make_players_and_users,
    run_race_with_positions,
)


def _make_8p_group_stage_with_tie(db, prefix):
    """8 giocatori → 2 gironi da 4. Nel primo girone, il 2° e 3° classificato
    (proprio al confine di qualificazione, QUALIFY_PER_GROUP=2) pareggiano su
    punti/vittorie/podi scambiandosi le posizioni tra le due gare — stesso
    schema di docs/QA_REPORT.md Scenario 5."""
    players, users = make_players_and_users(db, 8, prefix=prefix)
    pids = [p.id for p in players]
    superadmin = get_superadmin(db)
    tournament = make_group_stage_tournament(db, f"{prefix}_torneo", pids, superadmin.id)
    db.refresh(tournament)
    groups = tournament.format_data["groups"]
    group_keys = sorted(groups.keys(), key=int)
    tie_gk, other_gk = group_keys[0], group_keys[1]

    p1, p2, p3, p4 = list(groups[tie_gk])
    run_race_with_positions(
        db, tournament, 1, f"Girone {tie_gk} - Gara 1", {p1: 1, p2: 2, p3: 3, p4: 4},
        phase="group", group_name=tie_gk,
    )
    run_race_with_positions(
        db, tournament, 2, f"Girone {tie_gk} - Gara 2", {p1: 1, p2: 3, p3: 2, p4: 4},
        phase="group", group_name=tie_gk,
    )

    # L'altro girone deve avere almeno una gara "pulita" (_group_standings
    # richiede una gara per OGNI girone, altrimenti solleva ValueError).
    other_players = list(groups[other_gk])
    positions = {pid: i + 1 for i, pid in enumerate(other_players)}
    run_race_with_positions(
        db, tournament, 3, f"Girone {other_gk}", positions,
        phase="group", group_name=other_gk,
    )

    return tournament, tie_gk, p1, p2, p3, p4


def test_group_stage_tie_at_qualification_cutoff_is_detected(db):
    tournament, tie_gk, p1, p2, p3, p4 = _make_8p_group_stage_with_tie(db, "gstie")

    ties = get_group_stage_ties(db, tournament.id)

    assert ties["phase"] == "group"
    assert set(ties["ties"][tie_gk]) == {p2, p3}


def test_group_stage_tie_resolves_after_first_to_two_wins(db):
    tournament, tie_gk, p1, p2, p3, p4 = _make_8p_group_stage_with_tie(db, "gsresolve")

    # p2 vince 2 gare secche di Spareggio contro p3: primo a 2 vittorie vince
    # (diverso dal "primo a 3" degli spareggi podio classic).
    for i in range(2):
        run_race_with_positions(
            db, tournament, 10 + i, f"Spareggio - {i + 1}", {p2: 1, p3: 2},
            phase="group", group_name=tie_gk, is_duello=True,
        )

    ties = get_group_stage_ties(db, tournament.id)
    assert ties["ties"] == {}

    classifiche = get_group_stage_classifiche(db, tournament.id)
    girone_order = classifiche["group"][tie_gk]
    # p1 non era parte del pareggio: resta 1° indipendentemente dall'esito.
    assert girone_order[0] == p1
    assert girone_order.index(p2) < girone_order.index(p3)


def test_group_stage_tie_not_resolved_before_reaching_two_wins(db):
    tournament, tie_gk, p1, p2, p3, p4 = _make_8p_group_stage_with_tie(db, "gspartial")

    run_race_with_positions(
        db, tournament, 10, "Spareggio - 1", {p2: 1, p3: 2},
        phase="group", group_name=tie_gk, is_duello=True,
    )

    ties = get_group_stage_ties(db, tournament.id)
    assert set(ties["ties"][tie_gk]) == {p2, p3}
