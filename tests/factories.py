"""
Helper per costruire dati di test riusando i service layer reali (stesso
approccio di app/Scripts/build_test_data.py) invece di inserire righe a mano —
così i test restano validi anche se le regole di validazione cambiano.
"""

from datetime import date, timedelta

from app.controllers.schedine.schemas.schedine import SchedinaCreate
from app.controllers.tornei.schemas.races import CreateRace
from app.controllers.tornei.schemas.results import CreateResult
from app.controllers.tornei.schemas.tournaments import CreateTournament
from app.controllers.utenti.schemas.auth import CreateUser
from app.controllers.utenti.schemas.players import CreatePlayer
from app.models import Character, Game, User
from app.services.tornei.races import create_race
from app.services.tornei.results import create_result
from app.services.tornei.tournaments import create_tournament
from app.services.utenti.players import create_player
from app.services.utenti.users import create_user

BASE_DATE = date.today() + timedelta(days=30)


def get_game(db) -> Game:
    return db.query(Game).filter(Game.name.ilike("%mario kart%")).first()


def get_superadmin(db) -> User:
    return db.query(User).filter(User.role == "superadmin").first()


def make_players_and_users(db, n: int, prefix: str = "t"):
    """Crea n player+user collegati 1:1, nickname univoci per test (prefix
    evita collisioni tra test diversi nello stesso DB)."""
    players, users = [], []
    for i in range(1, n + 1):
        nickname = f"{prefix}_player_{i}"
        p = create_player(
            db,
            CreatePlayer(first_name=f"Nome{i}", last_name=f"Cognome{i}", nickname=nickname),
        )
        u = create_user(
            db,
            CreateUser(
                username=f"{prefix}_user_{i}",
                password="test12345",
                role="user",
                player_id=p.id,
                is_active=True,
            ),
        )
        players.append(p)
        users.append(u)
    return players, users


def make_classic_tournament(db, name: str, player_ids: list[int], created_by_id: int, **kwargs):
    game = get_game(db)
    return create_tournament(
        db,
        CreateTournament(
            name=name,
            n_players=len(player_ids),
            date=BASE_DATE,
            game_id=game.id,
            participant_ids=player_ids,
            tournament_format="classic",
            **kwargs,
        ),
        created_by_id=created_by_id,
    )


def make_group_stage_tournament(db, name: str, player_ids: list[int], created_by_id: int, **kwargs):
    game = get_game(db)
    return create_tournament(
        db,
        CreateTournament(
            name=name,
            n_players=len(player_ids),
            date=BASE_DATE,
            game_id=game.id,
            participant_ids=player_ids,
            tournament_format="group_stage",
            **kwargs,
        ),
        created_by_id=created_by_id,
    )


def submit_classic_schedina(db, user_id: int, tournament_id: int, classifica_ordinata: list[int], **kwargs):
    from app.services.schedine.schedine import create_schedina

    payload = SchedinaCreate(
        tournament_id=tournament_id,
        classifica_ordinata=classifica_ordinata,
        maggiore_streak_vittorie_id=classifica_ordinata[0],
        duello_scelta_id=kwargs.pop("duello_scelta_id", None),
        duello_pareggio=kwargs.pop("duello_pareggio", False),
        spareggio_punti_vincitore=kwargs.pop("spareggio_punti_vincitore", 30),
        **kwargs,
    )
    return create_schedina(db, user_id, payload)


def submit_group_stage_schedina(db, user_id: int, tournament_id: int, finalisti_ids: list[int], classifiche_gironi: dict, **kwargs):
    from app.controllers.schedine.schemas.schedine_deluxe import (
        SchedinaTorneoGroupStageCreate,
    )
    from app.services.schedine.schedine_deluxe import create_schedina_deluxe

    payload = SchedinaTorneoGroupStageCreate(
        tournament_id=tournament_id,
        finalisti_ids=finalisti_ids,
        classifica_finale_ordinata=kwargs.pop("classifica_finale_ordinata", finalisti_ids),
        classifiche_gironi=classifiche_gironi,
        duello_scelta_id=kwargs.pop("duello_scelta_id", None),
        duello_pareggio=kwargs.pop("duello_pareggio", False),
        spareggio_distanza=kwargs.pop("spareggio_distanza", 10),
        **kwargs,
    )
    return create_schedina_deluxe(db, user_id, payload)


def run_race_with_positions(db, tournament, race_order: int, name: str, positions_map: dict, **race_kwargs):
    """positions_map: {player_id: position (1-indexed)}. Un solo circuito
    riusato per semplicità (i test non verificano rotazione circuiti)."""
    game = get_game(db)
    from app.models import Circuit

    circuit = (
        db.query(Circuit)
        .filter(Circuit.game_id == game.id)
        .offset((race_order - 1) % 5)
        .first()
    )
    race = create_race(
        db,
        CreateRace(
            name=name,
            race_order=race_order,
            tournament_id=tournament.id,
            circuit_id=circuit.id,
            **race_kwargs,
        ),
    )
    character = db.query(Character).filter(Character.game_id == game.id).first()
    for player_id, position in positions_map.items():
        create_result(
            db,
            CreateResult(
                race_id=race.id,
                player_id=player_id,
                character_id=character.id,
                position=position,
            ),
        )
    return race
