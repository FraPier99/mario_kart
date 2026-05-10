from sqlalchemy.orm  import Session 
from model import Race
from schemas.races import CreateRace ,UpdateRace


def get_races(db:Session): 
    return db.query(Race).all()


def create_race(db:Session,race_data: CreateRace): 

    new_race = Race(**race_data.model_dump())
    db.add(new_race)
    db.commit()
    db.refresh(new_race)

    return new_race 

def delete_race(db:Session,race_id:int): 

    race = db.query(Race).filter(Race.id == race_id).first()

    if not race: 
        return None 
    db.delete(race)
    db.commit()
    return race 


def get_race(db:Session,race_id:int): 

    race = db.query(Race).filter(Race.id == race_id).first()

    if not race: 
        return None 
   
    return race 



def update_race(db:Session,raceData : UpdateRace,race_id: int): 

    race = db.query(Race).filter(Race.id == race_id).first()

    if not race: 
        return None 
    
    update_race =  raceData.model_dump(exclude_unset=True)

    for  key,value in update_race.items(): 
        setattr(race,key,value)
        

    db.commit()
    db.refresh(race)

    return race









