Backend (app)
==============

Overview
- Backend FastAPI: implementa modelli SQLAlchemy, CRUD e router per tornei, gare, risultati e giocatori.

Prerequisiti
- Python 3.10+ (virtualenv consigliato)

Installazione
1. Creare e attivare l'ambiente virtuale:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Installare dipendenze:

```powershell
pip install -r requirements.txt
```

Avvio in sviluppo

```powershell
uvicorn app.main:app --reload --port 8000
```

File e cartelle principali
- `app/main.py` — entrypoint FastAPI
- `app/core/bootstrap.py` — inizializzazioni DB, migrazioni leggeri (es. aggiunta colonna `status`)
- `app/model.py` — modelli SQLAlchemy
- `app/crud/` — logica DB riutilizzabile
- `app/routers/` — endpoint REST (es. `tournaments.py`)
- `app/schemas/` — Pydantic request/response

Endpoint utili
- Consulta i router in `app/routers/` per la lista completa. In particolare:
  - `GET /tournaments/{id}/leaderboard` — leaderboard
  - `POST /tournaments/{id}/playoff` — endpoint per spareggio best-of-3 (frontend usa `tournamentsApi.playoff`)

Note operative
- Alcune colonne vengono normalizzate a runtime in `bootstrap` per database legacy.
- Se cambi schema o aggiungi tabelle, aggiorna i backup e considera una migrazione vera (Alembic o simile).

