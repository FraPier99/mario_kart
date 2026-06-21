from sqlalchemy import case, func
from sqlalchemy.orm import Session
from app.models import Player, Race, Result


def get_leaderboard(db: Session, tournament_id: int):

    lederboard = (
        db.query(
            Player.id, Player.nickname, func.sum(Result.points).label("total_point")
        )
        .join(Result, Result.player_id == Player.id)
        .join(Race, Race.id == Result.race_id)
        .filter(Race.tournament_id == tournament_id, Race.is_duello.is_(False))
        .group_by(Player.id, Player.nickname)
        .order_by(
            func.sum(Result.points).desc(),
            func.sum(case((Result.position == 1, 1), else_=0)).desc(),
            func.sum(case((Result.position <= 3, 1), else_=0)).desc(),
            Player.nickname.asc(),
        )
        .all()
    )
    return lederboard
