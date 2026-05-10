import os 
from dotenv import load_dotenv 
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


#importato le var ambiente 
load_dotenv()

#importo url db
DATABASE_URL = os.getenv('DATABASE_URL')

# creato engine db
engine = create_engine(DATABASE_URL)

# creo sessione utilizzando engine 
SessionLocal  = sessionmaker(bind=engine,autoflush=False,autocommit = False,
                             expire_on_commit=False)



#creo una funzione per restituire una sessione di sqlalchemu aka interagisco con il db 
def  get_db(): 
    db = SessionLocal()

    try:
        yield db
    finally: 
        db.close()









