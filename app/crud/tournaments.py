from schemas.tournaments import CreateTournament,UpdateTournament
from model import Tournament
from sqlalchemy.orm import Session
from data.punteggi import setUpTournament

def create_tournament(db:Session,tmentData : CreateTournament):
    
    config  = setUpTournament(tmentData.n_players)

    data = tmentData.model_dump()
    data['n_races'] = config['gare']

    new_tournament = Tournament(**data)

    db.add(new_tournament)
    db.commit()
    db.refresh(new_tournament)

    return new_tournament

def getAllTournaments(db:Session):
    
    return db.query(Tournament).all()

def get_tournament(db:Session,tournament_id: int):
    
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()

    if not t: 
        return None 
    
    return t 
    

def update_tournament(db:Session,tmentData : UpdateTournament,tournament_id:int):

    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()

    if not t: 
        return None 
    
    tUpdate = tmentData.model_dump(exclude_unset=True)

    for key,value in tUpdate.items():
        setattr(t,key,value)

    db.commit()
    db.refresh(t)

    return t 


def tournament_delete(db:Session,tournament_id:int): 

    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()

    if not t: 
        return None 
    
    db.delete(t)
    db.commit()

    return t






