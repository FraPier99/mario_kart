from db.db import get_db
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from schemas.games import GameResponse,UpdateGame,CreateGame
from schemas.players import CreatePlayer,PlayerResponse,UpdatePlayer

from  model import Player,Game


def get_players(db: Session): 
    return db.query(Player).all()



def create_player(db: Session, players_data : CreatePlayer): 



        new_player = Player(
          **players_data.model_dump()
        )

        db.add(new_player)
        db.commit()
        db.refresh(new_player)

        return new_player


def delete_player(db:Session,player_id: int ): 
      
      player = db.query(Player).filter(Player.id == player_id).first()

      if not player:
            
            return None 
      
      db.delete(player)
      db.commit()
     

      return player 
      

      
def get_player(db:Session,player_id:int): 
      player = db.query(Player).filter(Player.id == player_id ).first()

      if not player: 
            return None 
      
      return player 



      
def update_player(db:Session,player_data: UpdatePlayer,player_id: int): 


      player = db.query(Player).filter(Player.id ==  player_id).first()


      if not player: 
            return None
      
      # creo un nuovo oggetto Player con i dati aggiornati, escludendo i campi non impostati da schema a dizionario 
      #exlude_unset=True esclude i campi che non sono stati impostati nell'istanza di UpdatePlayer

      update_data = player_data.model_dump(exclude_unset=True)


      for key,value in update_data.items(): 
            setattr(player,key,value)
      
           
      db.commit()
      db.refresh(player)

      return player










