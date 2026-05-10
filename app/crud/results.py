from sqlalchemy.orm import Session
from model import Race, Result
from schemas.results import CreateResult,UpdateResult
from sqlalchemy.exc import IntegrityError
from data.punteggi import PUNTEGGI_CONFIG
def get_results(db: Session): 
    return db.query(Race).all()


def get_result(db: Session,result_id: int):
    
    result = db.query(Race).filter(Race.id ==result_id).first()

    if not result: 
        return None 
    
    return result



def create_result(db:Session,resultData : CreateResult): 


    #cerco la gara a cui voglio aggiungere il risultato
    race = db.query(Race).filter(Race.id == resultData.id).first()


    #se la gara non esiste ritorno None
    if not race: 
        return None 
    

    #prendo il torneo a cui appartiene la gara
    tournament = race.tournament
    #prendo il numero totale di giocatori del torneo 
    total_player = tournament.total_player

    try : 
        #calcolo i punti in base alla posizione del risultato e al numero totale di giocatori del torneo
        points = PUNTEGGI_CONFIG[total_player][resultData.position-1]
    except IndexError : 
        raise ValueError('Invalid Position')
    
    new_result = Result(**resultData.model_dump(),points=points)


 


def update_result(db: Session,resultData : UpdateResult ,result_id: int): 

    result = db.query(Result).filter(Result.id == result_id).first()

    if not result:
        return None 
    
    update_data = resultData.model_dump(exclude_unset=True)

    for key,value in update_data.items(): 
        setattr(result,key,value)

    db.commit()
    db.refresh(result)

    return result


