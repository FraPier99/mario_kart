from sqlalchemy import func
from sqlalchemy.orm import Session
from model import Result,Race,Player 


def get_leaderboard(db:Session,tournament_id:int): 

    lederboard = (db.query(Player.id,
                          Player.nickname,
                          func.sum(Result.points).label('total_point')
                          )
                          .join(Result,Result.player_id == Player.id)
                          .join(Race,Race.id == Result.race_id)
                          .filter(Race.tournament_id == tournament_id)
                          .group_by(Player.id,Player.nickname)
                          .order_by(func.sum(Result.points).desc())
                          .all()
                ) 
    return lederboard
                        
            
                          
    
    
