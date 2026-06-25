import os

from dotenv import load_dotenv


load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY", "kart-secret-dev")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
DEFAULT_SUPERADMIN_USERNAME = os.getenv("DEFAULT_SUPERADMIN_USERNAME", "superadmin")
DEFAULT_SUPERADMIN_PASSWORD = os.getenv("DEFAULT_SUPERADMIN_PASSWORD", "superadmin123")

DATABASE_URL = os.getenv("DATABASE_URL")

# Dominio pubblico del backend, usato per costruire URL assoluti (es.
# /players/{id}/avatar) restituiti al frontend — backend e frontend vivono
# su domini diversi (Railway/Vercel), un path relativo non risolverebbe dal
# browser. Da impostare su Railway con il dominio reale del servizio.
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "http://localhost:8000")
