import asyncio

import socketio
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.bootstrap import bootstrap_database
from app.realtime.manager import get_sio, init_loop

sio = get_sio()
from app.controllers.utenti.auth import router as auth_router
from app.controllers.tornei.characters import router as characters_router
from app.controllers.tornei.circuits import router as circuits_router
from app.controllers.tornei.games import router as games_router
from app.controllers.utenti.players import router as players_router
from app.controllers.tornei.races import router as races_router
from app.controllers.tornei.results import router as results_router
from app.controllers.schedine.schedine import router as schedine_router
from app.controllers.cards.inventory import router as inventory_router
from app.controllers.tornei.tournaments import router as tournaments_router
from app.controllers.utenti.gallery import router as gallery_router
from app.controllers.utenti.notifications import router as notifications_router
from app.controllers.utenti.audit_log import router as audit_log_router
from app.controllers.schedine.schedine_deluxe import router as schedine_deluxe_router


tags_metadata = [
    {"name": "General", "description": "Endpoint di servizio e stato applicazione."},
    {"name": "Auth", "description": "Login, profilo e utenti."},
    {"name": "Players", "description": "CRUD dei giocatori."},
    {
        "name": "Characters",
        "description": "Lettura dei personaggi disponibili per i giocatori.",
    },
    {"name": "Games", "description": "CRUD dei giochi."},
    {"name": "Tournaments", "description": "CRUD dei tornei e classifica."},
    {"name": "Races", "description": "CRUD delle gare."},
    {"name": "Results", "description": "CRUD dei risultati."},
    {"name": "Circuits", "description": "Lettura dei circuiti disponibili."},
    {"name": "Schedine", "description": "Schedina a punti fissi e premi torneo."},
    {"name": "Inventory", "description": "Carte potere e consumi dal vivo."},
    {"name": "Gallery", "description": "Foto tornei dal vivo e sistema commenti."},
    {"name": "Notifications", "description": "Notifiche di menzione e attività."},
    {"name": "AuditLog", "description": "Log delle azioni amministrative."},
    {
        "name": "SchedineDeluxe",
        "description": "Schedine per tornei Mario Kart 8 Deluxe (gironi 4v4).",
    },
]


app = FastAPI(title="Lega Kart API", openapi_tags=tags_metadata)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    init_loop(asyncio.get_running_loop())
    bootstrap_database()


@app.get("/", tags=["General"])
def get_root():
    return {"message": "homeee"}


app.include_router(players_router)
app.include_router(auth_router)
app.include_router(characters_router)
app.include_router(games_router)
app.include_router(tournaments_router)
app.include_router(races_router)
app.include_router(results_router)
app.include_router(circuits_router)
app.include_router(schedine_router)
app.include_router(inventory_router)
# Galleria disattivata temporaneamente: foto base64 troppo pesanti, in attesa
# di ricomprimere i dati esistenti e/o spostare anche queste su URL dedicati
# (stesso trattamento gia' fatto per gli avatar). Ri-abilitare rimuovendo
# questo commento quando il problema di peso e' risolto.
# app.include_router(gallery_router)
app.include_router(notifications_router)
app.include_router(audit_log_router)
app.include_router(schedine_deluxe_router)

# Combined ASGI app: Socket.IO on /socket.io/, everything else → FastAPI
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
