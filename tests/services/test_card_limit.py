"""
Limiti d'uso delle Card (app/controllers/cards/inventory.py): ogni carta ha
un numero di usi proprio (`uses_remaining`/`max_uses` — Master 1, Guscio Blu
3, vedi CARD_META in app/services/cards/inventory.py), verificato da
_check_card_available. Una carta parzialmente usata resta vincolata al
torneo in cui è stata attivata per la prima volta (_check_activation_tournament).
Sostituisce il vecchio _check_player_card_limit ("1 card totale per torneo,
indipendente dal tipo"), decaduto con l'introduzione degli usi multipli.
"""

import pytest
from fastapi import HTTPException

from app.controllers.cards.inventory import (
    _check_activation_tournament,
    _check_card_available,
)
from app.controllers.tornei.schemas.races import CreateRace
from app.services.cards.inventory import consume_inventory_item, grant_card
from app.services.tornei.races import create_race
from tests.factories import (
    get_game,
    get_superadmin,
    make_classic_tournament,
    make_players_and_users,
)


def _make_tournament_with_race(db, prefix):
    players, users = make_players_and_users(db, 2, prefix=prefix)
    pids = [p.id for p in players]
    superadmin = get_superadmin(db)
    tournament = make_classic_tournament(db, f"{prefix}_torneo", pids, superadmin.id)

    game = get_game(db)
    from app.models import Circuit

    circuit = db.query(Circuit).filter(Circuit.game_id == game.id).first()
    race = create_race(
        db,
        CreateRace(
            name="Gara 1", race_order=1, tournament_id=tournament.id, circuit_id=circuit.id
        ),
    )
    return tournament, players, users, race


def test_fresh_card_is_available(db):
    tournament, players, users, race = _make_tournament_with_race(db, "cardlimit1")
    item = grant_card(db, users[0].id, "master", source_tournament_id=tournament.id)
    # Carta appena assegnata, nessun uso ancora registrato: non deve alzare.
    _check_card_available(item)


def test_master_card_exhausted_after_single_use(db):
    tournament, players, users, race = _make_tournament_with_race(db, "cardlimit2")
    item = grant_card(db, users[0].id, "master", source_tournament_id=tournament.id)
    item = consume_inventory_item(db, item.id, users[0].id, race_id=race.id)
    db.flush()

    assert item.uses_remaining == 0
    with pytest.raises(HTTPException) as exc_info:
        _check_card_available(item)
    assert exc_info.value.status_code == 422


def test_blue_shell_allows_up_to_three_uses(db):
    tournament, players, users, race = _make_tournament_with_race(db, "cardlimit3")
    item = grant_card(db, users[0].id, "blue_shell", source_tournament_id=tournament.id)

    for _ in range(3):
        _check_card_available(item)
        item = consume_inventory_item(
            db, item.id, users[0].id, tournament_id=tournament.id, race_id=race.id
        )
        db.flush()

    assert item.uses_remaining == 0
    with pytest.raises(HTTPException) as exc_info:
        _check_card_available(item)
    assert exc_info.value.status_code == 422


def test_blue_shell_locks_remaining_uses_to_activation_tournament(db):
    tournament, players, users, race = _make_tournament_with_race(db, "cardlimit4")
    other_tournament, _, _, other_race = _make_tournament_with_race(db, "cardlimit4b")
    item = grant_card(db, users[0].id, "blue_shell", source_tournament_id=tournament.id)

    # Primo uso: attiva la carta su `tournament`.
    item = consume_inventory_item(
        db, item.id, users[0].id, tournament_id=tournament.id, race_id=race.id
    )
    db.flush()
    assert item.uses_remaining == 2

    # Un uso residuo nello STESSO torneo è consentito.
    _check_activation_tournament(db, item, tournament.id)

    # Un uso residuo in un torneo DIVERSO è bloccato.
    with pytest.raises(HTTPException) as exc_info:
        _check_activation_tournament(db, item, other_tournament.id)
    assert exc_info.value.status_code == 422


def test_card_limit_does_not_block_other_players(db):
    tournament, players, users, race = _make_tournament_with_race(db, "cardlimit5")
    item = grant_card(db, users[0].id, "master", source_tournament_id=tournament.id)
    consume_inventory_item(db, item.id, users[0].id, race_id=race.id)
    db.flush()

    # users[1] ha la propria carta indipendente, non tocca quella di users[0].
    other_item = grant_card(db, users[1].id, "master", source_tournament_id=tournament.id)
    _check_card_available(other_item)
