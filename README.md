PROGETTO_KART — Lega di Gaming
==============================

Breve panoramica
- Manager per tornei di Mario Kart (FastAPI backend + React/Vite frontend).
- Backend: codice in `app/`, organizzato per dominio in `controllers/`, `services/`, `models/` (vedi sotto).
- Frontend: codice in `frontend/src` (React, Vite, Tailwind CSS).

Documentazione
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema dati, domini e relazioni fra le tabelle.
- [`docs/REGOLAMENTO.md`](docs/REGOLAMENTO.md) — regole di gioco: formati torneo, schedine, punteggi, carte potere, badge.
- [`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md) — panoramica stack, struttura directory backend/frontend, flusso dati.
- [`docs/CLASSIFICA.md`](docs/CLASSIFICA.md) — sistema di classifiche e Placement Index.
- [`TOURNAMENT_TRACKER_RULES.md`](TOURNAMENT_TRACKER_RULES.md) — sintesi delle regole effettivamente applicate dal backend, con puntatori al codice.
- `/faq` (in-app) — FAQ/documentazione ufficiale della Lega, player-facing: La Lega, Tornei, Badge, Schedina, Card.

Prerequisiti
- Python 3.10+ (virtualenv o venv consigliato)
- Node.js 16+/npm o Yarn

Setup rapido (root)
1. Backend
   - Apri PowerShell, crea/attiva virtualenv e installa dipendenze:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r app/requirements.txt
```

   - Avvia il server (sviluppo):

```powershell
uvicorn app.main:socket_app --reload --port 8000
```

2. Frontend
   - Dalla cartella `frontend`:

```bash
npm install
npm run dev
```

Struttura del backend (`app/`)
Il codice è organizzato per **dominio** (`tornei`, `schedine`, `utenti`, `cards`), e ogni dominio è suddiviso in tre livelli:

```
app/
  controllers/{tornei,schedine,utenti,cards}/   endpoint FastAPI (APIRouter + handler) e schemi Pydantic (sottocartella schemas/)
  services/{tornei,schedine,utenti,cards}/      logica di business e accesso al DB (ex "crud")
  models/{tornei,schedine,utenti,cards}/        modelli ORM SQLAlchemy (condividono Base da app.models.base)
  core/                                         configurazione, sessione DB, sicurezza, bootstrap
  data/                                         dataset di seed (circuiti, personaggi, punteggi)
  Scripts/                                      script una tantum (seeding, migrazioni manuali)
```

Esempio: tutto ciò che riguarda i tornei classici si trova in
`controllers/tornei/tournaments.py` (rotte), `services/tornei/tournaments.py` (logica) e
`models/tornei/models.py` (tabelle `Tournament`, `Race`, `Result`, ...).

`app.models` re-esporta tutte le classi ORM dei quattro domini, quindi nel resto del
backend si importa sempre con `from app.models import Tournament, User, ...`.

Punti rapidi di interesse
- Backend entry: `app/main.py` (registrazione router) e `app/core/bootstrap.py` (init DB/superadmin).
- Rotte tornei: `app/controllers/tornei/tournaments.py`.
- Rotte schedine: `app/controllers/schedine/schedine.py` e `schedine_deluxe.py`.
- Modelli/ORM: `app/models/` (vedi [`DATABASE.md`](DATABASE.md)).
- Frontend entry: `frontend/src/main.jsx`, routing in `frontend/src/Router`.
- Podio e overlay: `frontend/src/pages/TournamentDetail.jsx` e animazioni globali in `frontend/src/index.css`.

Note
- Se usi Windows PowerShell, lo script `start.ps1` in root può contenere helper; verifica contenuto prima dell'uso.
- Per qualunque modifica DB in produzione, esegui backup prima.
