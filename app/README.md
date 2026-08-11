Backend (app)
==============

Overview
- Backend FastAPI: gestisce tornei, schedine, carte potere e utenti per una lega di gaming Mario Kart.
- Codice organizzato **per dominio** (`tornei`, `schedine`, `utenti`, `cards`), ogni dominio a tre strati: `controllers/` → `services/` → `models/`. Vedi [`docs/ARCHITETTURA.md`](../docs/ARCHITETTURA.md) per la panoramica completa e [`app/CLAUDE.md`](CLAUDE.md) per le convenzioni interne.

Prerequisiti
- Python 3.12+ (virtualenv consigliato)
- PostgreSQL in locale (default `postgresql://postgres:gradino@localhost:5432/kart`, configurabile in `.env`)

Installazione

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Avvio in sviluppo

```powershell
uvicorn app.main:socket_app --reload --port 8000
```

Nota: l'entrypoint ASGI è `socket_app` (FastAPI + Socket.IO montati insieme in `app/main.py`), non `app`.

Struttura

```
app/
  controllers/{tornei,schedine,utenti,cards}/   FastAPI APIRouter + handler, schemi Pydantic in schemas/
  services/{tornei,schedine,utenti,cards}/      business logic + query DB
  models/{tornei,schedine,utenti,cards}/        modelli ORM SQLAlchemy (condividono Base da app.models.base)
  core/                                          config, sessione DB, sicurezza, bootstrap, ottimizzazione immagini
  data/                                          seed data (circuiti, personaggi, tabelle punteggio)
  Scripts/                                       script una tantum, non importati dall'app
```

`app.models` re-esporta tutte le classi ORM dei quattro domini: nel resto del backend si importa sempre `from app.models import Tournament, User, ...`, mai dal sottomodulo di dominio direttamente.

Endpoint utili
- Consulta i router in `app/controllers/*/` per la lista completa (uno per file, registrati in `app/main.py`).
- `GET /tournaments/{id}/leaderboard` — classifica di un torneo.
- `GET /stats/head-to-head`, `GET /stats/circuits`, `GET /stats/players/{id}/badges` — statistiche aggregate (vedi `controllers/tornei/stats.py`).
- `POST /tournaments/{id}/playoff` — spareggio diretto fra due giocatori (usato da `tournamentsApi.playoff` nel frontend).

Note operative
- **Nessun Alembic**: le migrazioni sono funzioni `ensure_*` in `app/core/bootstrap.py` (ALTER TABLE su colonne esistenti, CREATE TABLE IF NOT EXISTS per tabelle nuove), eseguite automaticamente a ogni avvio via `bootstrap_database()`.
- Per qualunque modifica di schema in produzione, esegui un backup del database prima.
