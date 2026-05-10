from fastapi import FastAPI, Depends, HTTPException as HTT, status
from fastapi.middleware.cors import CORSMiddleware
from db.db import engine, get_db
from model import Base
from sqlalchemy.orm import Session

from sqlalchemy.exc import IntegrityError

# import for games
from schemas.games import CreateGame, GameResponse, UpdateGame
from crud.games import create_game, delete_game, get_game, update_game, get_all_games

# import for players
from schemas.players import CreatePlayer, PlayerResponse, UpdatePlayer
from crud.players import (
    get_players,
    create_player,
    delete_player,
    get_player,
    update_player,
)

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

# import results
from schemas.results import CreateResult, ResultResponse, UpdateResult
from crud.results import get_results, get_result, create_result, update_result


from sqlalchemy.exc import IntegrityError


from schemas.stats import LeaderBoardResponse
from crud.stats import get_leaderboard


# Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


app = FastAPI()

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


@app.get("/")
def get_root():
    return {"message": "homeee"}


@app.get("/players", response_model=list[PlayerResponse])
def all_players(db: Session = Depends(get_db)):
    players = get_players(db)
    return players


@app.post("/players", status_code=201, response_model=PlayerResponse)
def insert_player(player: CreatePlayer, db: Session = Depends(get_db)):

    try:
        new_player = create_player(db, player)
        return new_player

    except IntegrityError as e:
        db.rollback()
        raise (HTT(status_code=400, detail="Nickname already exists"))


@app.delete("/players/{player_id}")
def delete_player_by_id(player_id: int, db: Session = Depends(get_db)):

    deleted_player = delete_player(db, player_id)

    if not deleted_player:
        raise (HTT(status_code=404, detail="Player not found"))

    return {"message": "player deleted successfully"}


@app.get("/players/{player_id}", response_model=PlayerResponse)
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


@app.put("/players/{player_id}", response_model=PlayerResponse)
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
            detail="This nickname arleady exits or not valid ID",
        )

    except Exception as e:
        db.rollback()
        raise (
            HTT(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while updating the player",
            )
        )


# Game endpoints


@app.post("/games", response_model=GameResponse, status_code=201)
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


@app.get("/games/{game_id}", response_model=GameResponse)
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


@app.put("/games/{game_id}", response_model=GameResponse)
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


@app.get("/games", response_model=list[GameResponse])
def get_games(db: Session = Depends(get_db)):

    games = get_all_games(db)

    return games


@app.delete("/games/{game_id}")
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


@app.get("/tournaments", response_model=list[TournamentResponse])
def get_all_tournaments(db: Session = Depends(get_db)):
    tournaments = getAllTournaments(db)

    return tournaments


@app.post("/tournaments", response_model=TournamentResponse, status_code=201)
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


@app.put("/tournaments/{tournament_id}", response_model=TournamentResponse)
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


@app.delete("/tournaments/{tournament_id}", response_model=TournamentResponse)
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


@app.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
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


@app.get("/races", response_model=list[RaceResponse])
def all_races(db: Session = Depends(get_db)):

    races = get_races(db)

    return races


@app.get("/races/{race_id}", response_model=RaceResponse)
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


@app.delete("/races/{race_id}")
def delete_race_by_id(race_id: int, db: Session = Depends(get_db)):

    deleted_race = delete_race(db, race_id)

    if not deleted_race:
        raise (HTT(status_code=status.HTTP_404_NOT_FOUND, detail="race not found"))
    return {"message": "Race deleted successfully"}


@app.post("/races", response_model=RaceResponse, status_code=201)
def insert_race(raceData: CreateRace, db: Session = Depends(get_db)):

    try:
        race = create_race(db, raceData)
        return race

    except IntegrityError:
        db.rollback()

        raise (
            HTT(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid data or related entities not found",
            )
        )


@app.put("/races/{race_id}", response_model=RaceResponse)
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


@app.get("/results", response_model=list[ResultResponse])
def all_results(db: Session = Depends(get_db)):

    results = get_results(db)

    return results


@app.get("/results/{result_id}", response_model=ResultResponse)
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


@app.post("/results", response_model=ResultResponse, status_code=201)
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


@app.put("/results/{result_id}", response_model=ResultResponse)
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


@app.get("/tournaments/{tournament_id}/leaderboard")
def get_leaderboard(tournament_id: int, db: Session = Depends(get_db)):

    leaderboard = get_leaderboard(db, tournament_id)

    if not leaderboard:
        raise HTT(status_code=404, detail="No results for this tournament")

    return leaderboard
