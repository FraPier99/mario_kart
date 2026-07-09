"""
Copre il meccanismo di spareggio podio per tornei classic (CLAUDE.md:
"Tie-break duel resolution is first to 3 wins for every tied block,
regardless of position... There is no separate single race mode"):
get_classic_podium_ties (rilevamento + stato) e get_classic_final_classifica
(riordino della classifica ufficiale una volta risolto).
"""

from app.services.tornei.tournaments import (
    get_classic_final_classifica,
    get_classic_podium_ties,
)
from tests.factories import (
    get_superadmin,
    make_classic_tournament,
    make_players_and_users,
    run_race_with_positions,
)


def _make_4p_tournament_with_two_ties(db, prefix):
    """4 giocatori, 2 gare: p1/p2 scambiano 1°/2° posto (pareggio podio) e
    p3/p4 scambiano 3°/4° posto (pareggio "top4") — stesso trucco simmetrico
    di app/Scripts/build_test_data.py::create_tournament_duo_duelli."""
    players, users = make_players_and_users(db, 4, prefix=prefix)
    p1, p2, p3, p4 = [p.id for p in players]
    superadmin = get_superadmin(db)
    tournament = make_classic_tournament(
        db, f"{prefix}_torneo", [p1, p2, p3, p4], superadmin.id, n_races=2
    )
    run_race_with_positions(db, tournament, 1, "Gara 1", {p1: 1, p2: 2, p3: 3, p4: 4})
    run_race_with_positions(db, tournament, 2, "Gara 2", {p1: 2, p2: 1, p3: 4, p4: 3})
    return tournament, p1, p2, p3, p4


def test_top2_and_top4_ties_detected_before_any_duello(db):
    tournament, p1, p2, p3, p4 = _make_4p_tournament_with_two_ties(db, "cties")

    ties = get_classic_podium_ties(db, tournament.id)

    assert set(ties["top2"]["tied"]) == {p1, p2}
    assert ties["top2"]["order"] is None
    assert set(ties["top4"]["tied"]) == {p3, p4}
    assert ties["top4"]["order"] is None
    assert ties["others"] == []


def test_top2_tie_resolves_after_first_to_three_wins(db):
    tournament, p1, p2, p3, p4 = _make_4p_tournament_with_two_ties(db, "cresolve")

    # p1 vince 3 gare secche di spareggio contro p2: primo a 3 vittorie vince
    # (CLAUDE.md: "first to 3 wins" per ogni blocco pareggiato, non solo il podio).
    for i in range(3):
        run_race_with_positions(
            db, tournament, 10 + i, f"Spareggio 1/2 - {i + 1}", {p1: 1, p2: 2},
            is_duello=True, group_name="duello_podio_1_2",
        )

    ties = get_classic_podium_ties(db, tournament.id)
    assert ties["top2"]["order"] == [p1, p2]
    assert ties["top2"]["winner_id"] == p1
    # Il pareggio 3°/4° non è ancora stato toccato, resta irrisolto.
    assert ties["top4"]["order"] is None

    classifica = get_classic_final_classifica(db, tournament.id)
    assert classifica[0] == p1
    assert classifica[1] == p2


def test_top2_tie_not_resolved_before_reaching_three_wins(db):
    tournament, p1, p2, p3, p4 = _make_4p_tournament_with_two_ties(db, "cpartial")

    # Solo 2 vittorie su 3 necessarie: lo spareggio non deve risultare deciso.
    for i in range(2):
        run_race_with_positions(
            db, tournament, 10 + i, f"Spareggio 1/2 - {i + 1}", {p1: 1, p2: 2},
            is_duello=True, group_name="duello_podio_1_2",
        )

    ties = get_classic_podium_ties(db, tournament.id)
    assert ties["top2"]["order"] is None


def test_lower_block_tie_uses_dynamic_group_name(db):
    """Un pareggio che non è né 1°/2° né 3°/4° (qui: 4°/5° su 6 giocatori)
    deve finire in 'others' con group_name dinamico duello_podio_4_5, non
    essere silenziosamente ignorato o confuso col podio."""
    players, users = make_players_and_users(db, 6, prefix="lowtie")
    p1, p2, p3, p4, p5, p6 = [p.id for p in players]
    superadmin = get_superadmin(db)
    tournament = make_classic_tournament(
        db, "lowtie_torneo", [p1, p2, p3, p4, p5, p6], superadmin.id, n_races=2
    )
    # p1/p2/p3 e p6 hanno piazzamenti fissi e distinti; p4/p5 scambiano le
    # posizioni 4/5 tra le due gare → pareggiano su punti/vittorie(0)/podi(0).
    run_race_with_positions(
        db, tournament, 1, "Gara 1", {p1: 1, p2: 2, p3: 3, p4: 4, p5: 5, p6: 6}
    )
    run_race_with_positions(
        db, tournament, 2, "Gara 2", {p1: 1, p2: 2, p3: 3, p4: 5, p5: 4, p6: 6}
    )

    ties = get_classic_podium_ties(db, tournament.id)

    assert ties["top2"] is None
    assert ties["top4"] is None
    assert len(ties["others"]) == 1
    other = ties["others"][0]
    assert set(other["tied"]) == {p4, p5}
    assert other["group_name"] == "duello_podio_4_5"
    assert other["start_position"] == 4
    assert other["end_position"] == 5
