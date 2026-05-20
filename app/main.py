from fastapi import FastAPI, Depends, HTTPException as HTT, status
from fastapi.middleware.cors import CORSMiddleware
from db.db import engine, get_db
from model import Base
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text

from sqlalchemy.exc import IntegrityError

# import for games
from schemas.games import CreateGame, GameResponse, UpdateGame
from crud.games import create_game, delete_game, get_game, update_game, get_all_games

# import for players
from schemas.players import CreatePlayer, PlayerResponse, UpdatePlayer
from crud.players import (
    get_players,
    get_all_players,
    create_player,
    delete_player,
    get_player,
    update_player,
)

# import characters
from schemas.characters import CharacterResponse
from crud.characters import get_characters, get_character
from schemas.circuits import CircuitResponse
from crud.circuits import get_all_circuits

# import for tournaments
from model import Tournament
from schemas.tournaments import CreateTournament, TournamentResponse, UpdateTournament
from crud.tournaments import (
    create_tournament,
    getAllTournaments,
    get_tournament,
    update_tournament,
    tournament_delete,
)

# import for races
from schemas.races import CreateRace, RaceResponse, UpdateRace
from crud.races import get_races, get_race, delete_race, create_race, update_race
from crud.circuits import get_circuit_by_id, create_circuit
from data.circuits import all_circuits as SERVER_CIRCUITS
from model import Race

# import results
from schemas.results import CreateResult, ResultResponse, UpdateResult
from crud.results import get_results, get_result, create_result, update_result


from sqlalchemy.exc import IntegrityError


from schemas.stats import LeaderBoardResponse
from crud.stats import get_leaderboard as fetch_leaderboard


# Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def ensure_player_img_url_column():
    inspector = inspect(engine)
    player_columns = {column_info["name"] for column_info in inspector.get_columns("players")}

    if "img_url" not in player_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE players ADD COLUMN img_url TEXT"))


ensure_player_img_url_column()


def ensure_character_img_url_column():
    inspector = inspect(engine)
    character_columns = {column_info["name"] for column_info in inspector.get_columns("characters")}

    if "img_url" not in character_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE characters ADD COLUMN img_url TEXT"))


ensure_character_img_url_column()


def seed_circuits():
    """Seed circuits if table is empty, and fix wrong game_ids."""
    from data.circuits import all_circuits as SEED_CIRCUITS

    with engine.begin() as connection:
        result = connection.execute(text("SELECT COUNT(*) FROM circuits"))
        count = result.scalar()

        if count == 0:
            for c in SEED_CIRCUITS:
                connection.execute(
                    text("INSERT INTO circuits (name, description, game_id) VALUES (:name, :description, :game_id)"),
                    {"name": c["name"], "description": c["description"], "game_id": c["game_id"]}
                )
        else:
            connection.execute(text("UPDATE circuits SET game_id = 1 WHERE game_id != 1"))


seed_circuits()


tags_metadata = [
    {"name": "General", "description": "Endpoint di servizio e stato applicazione."},
    {"name": "Players", "description": "CRUD dei giocatori."},
    {"name": "Characters", "description": "Lettura dei personaggi disponibili per i giocatori."},
    {"name": "Games", "description": "CRUD dei giochi."},
    {"name": "Tournaments", "description": "CRUD dei tornei e classifica."},
    {"name": "Races", "description": "CRUD delle gare."},
    {"name": "Results", "description": "CRUD dei risultati."},
]

app = FastAPI(title="Lega Kart API", openapi_tags=tags_metadata)

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["General"])
def get_root():
    return {"message": "homeee"}


@app.get("/players", response_model=list[PlayerResponse], tags=["Players"])
def all_players(db: Session = Depends(get_db)):
    players = get_all_players(db)
    return players


@app.post("/players", status_code=201, response_model=PlayerResponse, tags=["Players"])
def insert_player(player: CreatePlayer, db: Session = Depends(get_db)):

    try:
        new_player = create_player(db, player)
        return new_player

    except IntegrityError as e:
        db.rollback()
        raise (HTT(status_code=400, detail="Nickname already exists"))


@app.delete("/players/{player_id}", tags=["Players"])
def delete_player_by_id(player_id: int, db: Session = Depends(get_db)):

    deleted_player = delete_player(db, player_id)

    if not deleted_player:
        raise (HTT(status_code=404, detail="Player not found"))

    return {"message": "player deleted successfully"}


@app.get("/players/{player_id}", response_model=PlayerResponse, tags=["Players"])
def get_player_by_id(player_id: int, db: Session = Depends(get_db)):

    player = get_player(db, player_id)

    if not player:
        raise (
            HTT(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"player with id {player_id}  not found",
            )
        )

    return player


@app.put("/players/{player_id}", response_model=PlayerResponse, tags=["Players"])
def update_player_by_id(
    player_id: int, player: UpdatePlayer, db: Session = Depends(get_db)
):

    try:
        updated_player = update_player(db, player, player_id)

        if not updated_player:
            raise (HTT(status_code=404, detail=f"player with id {player_id} not found"))

        return updated_player

    except IntegrityError as e:
        db.rollback()
        raise HTT(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This nickname already exists or the ID is not valid",
        )


@app.get("/characters", response_model=list[CharacterResponse], tags=["Characters"])
def all_characters(db: Session = Depends(get_db)):
    return get_characters(db)


@app.get("/characters/{character_id}", response_model=CharacterResponse, tags=["Characters"])
def get_character_by_id(character_id: int, db: Session = Depends(get_db)):
    character = get_character(db, character_id)

    if not character:
        raise HTT(status_code=status.HTTP_404_NOT_FOUND, detail=f"Character with id {character_id} not found")

    return character


# Game endpoints


@app.post("/games", response_model=GameResponse, status_code=201, tags=["Games"])
def insert_game(gameData: CreateGame, db: Session = Depends(get_db)):

    try:
        game = create_game(db, gameData)
        return game

    except IntegrityError as i:
        db.rollback()
        raise (
            HTT(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Game with this name already exists",
            )
        )


@app.get("/games/{game_id}", response_model=GameResponse, tags=["Games"])
def get_game_by_id(game_id: int, db: Session = Depends(get_db)):

    game = get_game(db, game_id)

    if not game:
        raise (
            HTT(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with id {game_id} not found",
            )
        )

    return game


@app.put("/games/{game_id}", response_model=GameResponse, tags=["Games"])
def update_game_by_id(
    game_id: int, gameData: UpdateGame, db: Session = Depends(get_db)
):

    try:
        game = update_game(db, gameData, game_id)

        if not game:
            raise (
                HTT(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Game with id {game_id} not found",
                )
            )

        return game
    except IntegrityError:
        db.rollback()
        raise (
            HTT(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Game with this name already exists",
            )
        )


@app.get("/games", response_model=list[GameResponse], tags=["Games"])
def get_games(db: Session = Depends(get_db)):

    games = get_all_games(db)

    return games


@app.delete("/games/{game_id}", tags=["Games"])
def delete_game_by_id(game_id: int, db: Session = Depends(get_db)):

    game = delete_game(db, game_id)

    if not game:
        raise (
            HTT(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Game with id {game_id} not found",
            )
        )

    return {"message": "Game deleted successfully"}


# Tournament


@app.get("/tournaments", response_model=list[TournamentResponse], tags=["Tournaments"])
def get_all_tournaments(db: Session = Depends(get_db)):
    tournaments = getAllTournaments(db)

    return tournaments


@app.post("/tournaments", response_model=TournamentResponse, status_code=201, tags=["Tournaments"])
def insert_tournament(tmentData: CreateTournament, db: Session = Depends(get_db)):

    try:
        new_t = create_tournament(db, tmentData)
        return new_t

    except IntegrityError:
        db.rollback()
        raise (
            HTT(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tournament with this name already exists",
            )
        )


@app.put("/tournaments/{tournament_id}", response_model=TournamentResponse, tags=["Tournaments"])
def update_t_by_id(
    tournament_id: int, tmentData: UpdateTournament, db: Session = Depends(get_db)
):

    try:
        new_t = update_tournament(db, tmentData, tournament_id)

        if not new_t:
            raise (
                HTT(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tournament with id {tournament_id} not found",
                )
            )

        return new_t

    except IntegrityError:
        db.rollback()

        raise (
            HTT(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tournament with this name already exists",
            )
        )


@app.delete("/tournaments/{tournament_id}", response_model=TournamentResponse, tags=["Tournaments"])
def delete_tournament_by_id(tournament_id: int, db: Session = Depends(get_db)):

    t = tournament_delete(db, tournament_id)

    if not t:
        raise (
            HTT(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tournament with id {tournament_id} not found",
            )
        )

    return t


@app.get("/tournaments/{tournament_id}", response_model=TournamentResponse, tags=["Tournaments"])
def get_tournament_by_id(tournament_id: int, db: Session = Depends(get_db)):

    t = get_tournament(db, tournament_id)

    if not t:
        raise (
            HTT(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tournament with id {tournament_id} not found",
            )
        )

    return t


# races


@app.get("/races", response_model=list[RaceResponse], tags=["Races"])
def all_races(db: Session = Depends(get_db)):

    races = get_races(db)

    return races


@app.get("/circuits", response_model=list[CircuitResponse], tags=["Races"])
def list_circuits(db: Session = Depends(get_db)):
    return get_all_circuits(db)


@app.get("/races/{race_id}", response_model=RaceResponse, tags=["Races"])
def get_race_by_id(race_id: int, db: Session = Depends(get_db)):

    race = get_race(db, race_id)

    if not race:
        raise (
            HTT(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Race with id {race_id} not found",
            )
        )
    return race


@app.delete("/races/{race_id}", tags=["Races"])
def delete_race_by_id(race_id: int, db: Session = Depends(get_db)):

    deleted_race = delete_race(db, race_id)

    if not deleted_race:
        raise (HTT(status_code=status.HTTP_404_NOT_FOUND, detail="race not found"))
    return {"message": "Race deleted successfully"}


@app.post("/races", response_model=RaceResponse, status_code=201, tags=["Races"])
def insert_race(raceData: CreateRace, db: Session = Depends(get_db)):

    try:
        # validate referenced tournament exists
        from crud.tournaments import get_tournament

        tournament = get_tournament(db, raceData.tournament_id)
        if not tournament:
            raise (
                HTT(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tournament with id {raceData.tournament_id} not found",
                )
            )

        # prevent using the same circuit twice in the same tournament
        existing_race = db.query(Race).filter(
            Race.tournament_id == raceData.tournament_id,
            Race.circuit_id == raceData.circuit_id
        ).first()
        if existing_race:
            raise (
                HTT(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Circuito già usato in questo torneo",
                )
            )

        # ensure circuit exists; frontend uses a static client-side list of circuits (ids 1..N)
        circuit = get_circuit_by_id(db, raceData.circuit_id)
        if not circuit:
            idx = int(raceData.circuit_id) - 1
            if 0 <= idx < len(SERVER_CIRCUITS):
                spec = SERVER_CIRCUITS[idx]
                circuit_payload = {
                    'id': int(raceData.circuit_id),
                    'name': spec.get('name'),
                    'description': spec.get('description'),
                    'game_id': tournament.game_id,
                }
                create_circuit(db, circuit_payload)
            else:
                raise (
                    HTT(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Circuit with id {raceData.circuit_id} not found and cannot be inferred",
                    )
                )

        race = create_race(db, raceData)
        return race

    except IntegrityError as e:
        db.rollback()
        # include DB error message to help debugging in dev; keep concise
        detail_msg = str(e.orig) if getattr(e, 'orig', None) else str(e)
        raise HTT(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Database integrity error: {detail_msg}")
    except ValueError as e:
        # e.g. invalid int conversion for ids
        raise HTT(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid numeric value: {str(e)}")


@app.put("/races/{race_id}", response_model=RaceResponse, tags=["Races"])
def update_race_by_id(
    race_id: int, raceData: UpdateRace, db: Session = Depends(get_db)
):

    try:
        race = update_race(db, raceData, race_id)

        if not race:
            raise (HTT(status_code=404, detail="Race not found"))

        return race

    except IntegrityError:
        db.rollback()
        raise (
            HTT(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid data or related entities not found",
            )
        )


# results endpoints


@app.get("/results", response_model=list[ResultResponse], tags=["Results"])
def all_results(db: Session = Depends(get_db)):

    results = get_results(db)

    return results


@app.get("/results/{result_id}", response_model=ResultResponse, tags=["Results"])
def get_result_by_id(result_id: int, db: Session = Depends(get_db)):

    result = get_result(db, result_id)

    if not result:
        raise (
            HTT(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Result with id {result_id} not found",
            )
        )
    return result


@app.post("/results", response_model=ResultResponse, status_code=201, tags=["Results"])
def insert_result(resultData: CreateResult, db: Session = Depends(get_db)):

    try:
        result = create_result(db, resultData)

        if not result:
            raise (HTT(status_code=404, detail="Race not found"))

        return result

    except ValueError:
        raise HTT(status_code=400, detail="Invalid Position")
    except IntegrityError:
        db.rollback()
        raise HTT(status_code=400, detail="Invalid data ")


@app.put("/results/{result_id}", response_model=ResultResponse, tags=["Results"])
def update_result_by_id(
    result_id: int, resultData: UpdateResult, db: Session = Depends(get_db)
):

    try:
        result = update_result(db, resultData, result_id)

        if not result:
            raise (HTT(status_code=404, detail="Result not found"))

        return result

    except ValueError:
        raise HTT(status_code=400, detail="Invalid Position")
    except IntegrityError:
        db.rollback()
        raise HTT(status_code=400, detail="Invalid data ")


# @app.delete('/results/{result_id}')
# def delete_result_by_id(result_id: int,db: Session = Depends(get_db)):

#       deleted_result = delete_result(db,result_id)

#       if not deleted_result:

#             raise(HTT(status_code=status.HTTP_404_NOT_FOUND,
#                       detail ='Result not found'))
#       return {'message': 'Result deleted successfully'}


# classifica torneo


@app.get("/tournaments/{tournament_id}/leaderboard", tags=["Tournaments"])
def get_tournament_leaderboard(tournament_id: int, db: Session = Depends(get_db)):

    leaderboard = fetch_leaderboard(db, tournament_id)

    if not leaderboard:
        raise HTT(status_code=404, detail="No results for this tournament")

    return leaderboard
