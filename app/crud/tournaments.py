from schemas.tournaments import CreateTournament,UpdateTournament
from model import Tournament, TournamentPlayer
from sqlalchemy.orm import Session
from data.punteggi import setUpTournament

def create_tournament(db:Session,tmentData : CreateTournament):
    
    config  = setUpTournament(tmentData.n_players)

    data = tmentData.model_dump(exclude={'participant_ids'})
    data['n_races'] = config['gare']

    new_tournament = Tournament(**data)

    db.add(new_tournament)
    db.commit()
    db.refresh(new_tournament)

    for pid in tmentData.participant_ids:
        link = TournamentPlayer(tournament_id=new_tournament.id, player_id=pid)
        db.add(link)

    db.commit()
    db.refresh(new_tournament)

    _load_participants(db, new_tournament)
    return new_tournament

def getAllTournaments(db:Session):
    
    tournaments = db.query(Tournament).all()
    for t in tournaments:
        _load_participants(db, t)
    return tournaments

def get_tournament(db:Session,tournament_id: int):
    
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()

    if not t: 
        return None 
    
    _load_participants(db, t)
    return t 

def _load_participants(db: Session, tournament):
    from model import TournamentPlayer, Result, Race
    links = db.query(TournamentPlayer).filter(
        TournamentPlayer.tournament_id == tournament.id
    ).all()

    if links:
        tournament.participant_ids = [link.player_id for link in links]
        return

    # fallback for old tournaments: infer participants from results
    race_ids = [r.id for r in db.query(Race.id).filter(Race.tournament_id == tournament.id).all()]
    if not race_ids:
        tournament.participant_ids = []
        return

    result_players = db.query(Result.player_id).filter(Result.race_id.in_(race_ids)).distinct().all()
    tournament.participant_ids = [pid for (pid,) in result_players]
    

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






