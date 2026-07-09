"""
_check_player_card_limit (app/controllers/cards/inventory.py) è la regola
"max 1 Card totale per torneo, indipendente dal tipo" documentata in
CLAUDE.md. È una funzione privata di un controller (non un service) ma niente
qui dipende da FastAPI/DB session iniettata via Depends — è chiamabile
direttamente, quindi la testiamo così invece di passare per HTTP.
"""

import pytest
from fastapi import HTTPException

from app.controllers.cards.inventory import _check_player_card_limit
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


def test_card_limit_allows_first_card_of_any_type(db):
    tournament, players, users, race = _make_tournament_with_race(db, "cardlimit1")
    # Nessuna card ancora consumata in questo torneo per questo utente: non deve alzare.
    _check_player_card_limit(db, users[0].id, tournament.id, race.id)


def test_card_limit_blocks_second_card_same_type(db):
    tournament, players, users, race = _make_tournament_with_race(db, "cardlimit2")
    item = grant_card(db, users[0].id, "master", source_tournament_id=tournament.id)
    consume_inventory_item(db, item.id, users[0].id, race_id=race.id)
    db.flush()

    with pytest.raises(HTTPException) as exc_info:
        _check_player_card_limit(db, users[0].id, tournament.id, race.id)
    assert exc_info.value.status_code == 422


def test_card_limit_blocks_second_card_different_type(db):
    """La regola è 1 Card TOTALE per torneo, non 1 per tipo: usare la Master
    non lascia comunque disponibile la Guscio Blu nello stesso torneo."""
    tournament, players, users, race = _make_tournament_with_race(db, "cardlimit3")
    master_item = grant_card(db, users[0].id, "master", source_tournament_id=tournament.id)
    consume_inventory_item(db, master_item.id, users[0].id, race_id=race.id)
    db.flush()

    grant_card(db, users[0].id, "blue_shell", source_tournament_id=tournament.id)

    with pytest.raises(HTTPException) as exc_info:
        _check_player_card_limit(db, users[0].id, tournament.id, race.id)
    assert exc_info.value.status_code == 422


def test_card_limit_does_not_block_other_players(db):
    tournament, players, users, race = _make_tournament_with_race(db, "cardlimit4")
    item = grant_card(db, users[0].id, "master", source_tournament_id=tournament.id)
    consume_inventory_item(db, item.id, users[0].id, race_id=race.id)
    db.flush()

    # users[1] non ha ancora usato nulla in questo torneo: non deve essere bloccato.
    _check_player_card_limit(db, users[1].id, tournament.id, race.id)
