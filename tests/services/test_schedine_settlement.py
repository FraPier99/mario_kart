"""
Copre settle_tournament_schedine (classic): l'unico dei due path (classic vs
group_stage — vedi tests/services/test_schedine_deluxe_settlement.py) che la
QA manuale (docs/QA_REPORT.md) aveva già trovato "solido". Il valore di questi
test è bloccare regressioni future sul percorso *funzionante*, non riscoprire
bug: ex-aequo perfetto → entrambi premiati, idempotenza su re-settlement,
Blue Shell all'ultimo classificato.
"""

from app.models import PremioTorneo, UserInventory
from app.services.schedine.schedine import settle_tournament_schedine
from app.services.tornei.tournaments import set_tournament_playoff_winner
from app.controllers.tornei.schemas.tournaments import TournamentPlayoffRequest
from tests.factories import (
    get_superadmin,
    make_classic_tournament,
    make_players_and_users,
    run_race_with_positions,
    submit_classic_schedina,
)


def _conclude_classic_tournament(db, players, users, prefix, n_races=3):
    superadmin = get_superadmin(db)
    pids = [p.id for p in players]
    tournament = make_classic_tournament(
        db, f"{prefix}_torneo", pids, superadmin.id, n_races=n_races
    )

    for u in users:
        submit_classic_schedina(db, u.id, tournament.id, list(pids))

    for race_order in range(1, n_races + 1):
        # ordine fisso: player[0] sempre 1°, ..., ultimo player sempre ultimo —
        # non ci interessa la competizione, solo che ci sia un ordine stabile
        # per verificare la classifica finale/il Blue Shell.
        positions = {p.id: i + 1 for i, p in enumerate(players)}
        run_race_with_positions(db, tournament, race_order, f"Gara {race_order}", positions)

    res, err = set_tournament_playoff_winner(
        db,
        tournament.id,
        TournamentPlayoffRequest(
            player_one_id=players[0].id, player_two_id=players[1].id, winner_id=players[0].id
        ),
    )
    assert err in (None, "ok"), err
    db.refresh(tournament)
    return tournament


def test_settle_classic_exaequo_grants_master_to_both_tied_schedine(db):
    players, users = make_players_and_users(db, 4, prefix="exaequo")
    # Due utenti compilano la stessa identica previsione: se il torneo finisce
    # esattamente in quell'ordine, entrambi ottengono lo stesso punteggio/
    # tie_breaker_distance ed è un ex-aequo "organico".
    pids = [p.id for p in players]
    superadmin = get_superadmin(db)
    tournament = make_classic_tournament(db, "exaequo_torneo", pids, superadmin.id, n_races=3)

    submit_classic_schedina(db, users[0].id, tournament.id, list(pids))
    submit_classic_schedina(db, users[1].id, tournament.id, list(pids))

    for race_order in range(1, 4):
        positions = {p.id: i + 1 for i, p in enumerate(players)}
        run_race_with_positions(db, tournament, race_order, f"Gara {race_order}", positions)

    res, err = set_tournament_playoff_winner(
        db,
        tournament.id,
        TournamentPlayoffRequest(
            player_one_id=players[0].id, player_two_id=players[1].id, winner_id=players[0].id
        ),
    )
    assert err in (None, "ok"), err

    premi = db.query(PremioTorneo).filter(PremioTorneo.torneo_sorgente_id == tournament.id).all()
    rewarded_user_ids = {p.user_id for p in premi}
    assert rewarded_user_ids == {users[0].id, users[1].id}

    master_cards = (
        db.query(UserInventory)
        .filter(
            UserInventory.source_tournament_id == tournament.id,
            UserInventory.card_type == "master",
        )
        .all()
    )
    assert {c.user_id for c in master_cards} == {users[0].id, users[1].id}


def test_settle_classic_grants_blue_shell_to_last_place(db):
    players, users = make_players_and_users(db, 4, prefix="lastplace")
    tournament = _conclude_classic_tournament(db, players, users, "lastplace")

    last_player = players[-1]
    last_user = users[-1]
    shells = (
        db.query(UserInventory)
        .filter(
            UserInventory.source_tournament_id == tournament.id,
            UserInventory.card_type == "blue_shell",
        )
        .all()
    )
    assert {c.user_id for c in shells} == {last_user.id}


def test_settle_classic_is_idempotent_on_resettlement(db):
    players, users = make_players_and_users(db, 4, prefix="idem")
    tournament = _conclude_classic_tournament(db, players, users, "idem")

    premi_before = db.query(PremioTorneo).filter(
        PremioTorneo.torneo_sorgente_id == tournament.id
    ).count()

    result = settle_tournament_schedine(db, tournament.id)

    assert result["status"] == "already_settled"
    premi_after = db.query(PremioTorneo).filter(
        PremioTorneo.torneo_sorgente_id == tournament.id
    ).count()
    assert premi_after == premi_before
