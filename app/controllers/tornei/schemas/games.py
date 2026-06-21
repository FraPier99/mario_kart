from pydantic import BaseModel,Field,StringConstraints

from typing import Optional,Annotated

NormalizeStr  = Annotated[str,StringConstraints(strip_whitespace=True,to_lower=True)]

class CreateGame(BaseModel): 
    name: NormalizeStr 
    description: NormalizeStr



class GameResponse(BaseModel): 
    id: int 
    name: Optional[NormalizeStr] = None
    description:  Optional[NormalizeStr] = None
     
    #per far capire a pydantic che deve convertire l'istanza del modello SQLAlchemy in un dizionario
    model_config = {"from_attributes": True}


class UpdateGame(BaseModel): 
    name : Optional[NormalizeStr] = None
    description : Optional[NormalizeStr] = None

    #qui non è necessario specificare 
    # from_attributes perché non stiamo
    #  restituendo un'istanza del modello SQLAlchemy, 
    # ma solo un dizionario con i campi aggiornati.
    #  Tuttavia, se si desidera utilizzare UpdateGame anche 
    # come risposta per le operazioni di aggiornamento, allora è necessario specificare from_attributes anche qui.
    model_config = {'from_attributes' : True}
        