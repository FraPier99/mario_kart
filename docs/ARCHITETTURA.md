# Architettura del Progetto

```
PROGETTO_KART/
├── app/              # Backend — Python FastAPI + SQLAlchemy
├── frontend/         # Frontend — React 19 + Vite + Tailwind v4
├── docs/             # Documentazione
├── scripts/          # Utility script
├── venv/             # Virtual environment Python
├── start.ps1         # Launcher backend + frontend
└── README.md
```

---

## Backend (`app/`)

### Stack
- **Python** 3.12+ / **FastAPI** / **Uvicorn**
- **SQLAlchemy** 2.0 (ORM) + **psycopg2** (PostgreSQL driver)
- **PostgreSQL** su `localhost:5432` (db: `kart`)
- **Auth**: HMAC-SHA256 token + PBKDF2 password hashing

### Architettura a strati (per dominio)

```
┌──────────────────────────────────────────────┐
│  controllers/  — FastAPI APIRouter + schemas  │
├──────────────────────────────────────────────┤
│  services/     — Business logic + query DB    │
├──────────────────────────────────────────────┤
│  models/       — SQLAlchemy ORM models        │
├──────────────────────────────────────────────┤
│  data/         — Seed data (circuits, chars)  │
└──────────────────────────────────────────────┘
```

### Domini

| Dominio | Modelli | Controller | Service |
|---------|---------|------------|---------|
| `tornei` | Tournament, Race, Result, Game, Character, Circuit, TournamentPlayer, PlayoffHistory, Prediction | `controllers/tornei/` (6 router) | `services/tornei/` (7 service) |
| `utenti` | Player, User, Notification, AuditLog, TempPassword, TournamentPhoto, PhotoComment, Challenge | `controllers/utenti/` (5 router) | `services/utenti/` (6 service) |
| `schedine` | SchedinaTorneo, SchedinaTorneoGroupStage, PremioTorneo | `controllers/schedine/` (2 router) | `services/schedine/` (2 service) |
| `cards` | UserInventory | `controllers/cards/inventory.py` | `services/cards/inventory.py` |

### Core

| File | Ruolo |
|------|-------|
| `core/config.py` | Lettura `.env` (DATABASE_URL, SECRET_KEY, ...) |
| `core/db.py` | Engine + SessionLocal + `get_db()` |
| `core/security.py` | Hash password, creazione/verifica token, `get_current_user()`, `require_roles()` |
| `core/bootstrap.py` | Creazione tabelle + migration `ALTER TABLE` + seed dati + superadmin (run all'avvio) |

### Database

- **Nessun Alembic**: le migration sono `ALTER TABLE` via `ensure_*` functions in `bootstrap.py`
- **20 tabelle** in 4 domini (vedi [DATABASE.md](DATABASE.md))
- Punteggi predefiniti in `data/punteggi.py` (per griglia 2–12 giocatori)

---

## Frontend (`frontend/src/`)

### Stack
- **React 19** / **Vite 8** / **Tailwind CSS 4**
- **react-router-dom v7** (SPA routing)
- **Material UI 9** (dialog, table, button)
- **Recharts** (grafici statistici)
- **Axios** (HTTP client)
- **dnd-kit** (drag & drop ordinamento schedine)
- **Sonner** (toast notification)
- **lucide-react** (icone)

### Struttura directory

```
src/
├── main.jsx                    # Entry point
├── App.jsx                     # Root: provider chain → route switch
├── Router/
│   └── AppRouter.jsx           # 18+ route definitions
│
├── pages/                      # 21 pagine
│   ├── Home.jsx                # Landing + leaderboard globale
│   ├── TournamentDetail.jsx    # Dettaglio torneo (admin + user view)
│   ├── Stats.jsx               # Classifica globale
│   ├── Schedina*.jsx           # Compilazione/visualizzazione schedine
│   └── ...
│
├── components/                 # 38 componenti riutilizzabili
│   ├── tournaments/            # 19 componenti torneo (GroupPlancia, RaceCreator, ...)
│   ├── stats/                  # LeaderboardTable
│   ├── common/                 # ApiBanner, ConfirmModal, PortalSelect, ...
│   ├── layout/                 # Navbar, AppLayout, Header, Hero
│   ├── ui/                     # Shadcn-style: button, card, dialog, table
│   ├── cards/                  # PowerCard
│   ├── superadmin/             # DatabaseTab
│   └── history/                # TournamentHistoryCard
│
├── context/                    # 3 React Context
│   ├── AuthContext.jsx         # Auth state
│   ├── AppDataContext.jsx      # Dati globali + logica classifiche
│   └── ThemeContext.jsx        # Tema dark/light
│
├── hooks/                      # 4 custom hooks
├── services/
│   └── apiClient.js            # Axios + tutte le API definitions
└── lib/                        # Utility: constants, groupStage helpers, utils
```

### Flusso dati

```
Backend API (JSON)  ←→  apiClient.js (Axios)  ←→  AppDataContext (useMemo)
                                                          ↓
                                              Pagine / Componenti
                                              LeaderboardTable, GroupPlancia, ...
```

Le classifiche sono calcolate **client-side** in `AppDataContext.jsx`:
- `buildPlayerStats()` → stats globali (per leaderboard homepage)
- `buildTournamentDetails()` → standings per-torneo (con placementIndex)

### API Client (`services/apiClient.js`)

Tutte le chiamate API sono organizzate per dominio:
- `tournamentsApi`, `racesApi`, `resultsApi`
- `playersApi`, `authApi`, `notificationsApi`
- `schedineApi`, `schedineDeluxeApi`
- `inventoryApi`, `galleryApi`, `auditApi`

Ogni funzione chiama il backend FastAPI e restituisce Promise axios.

---

## Database

### Connessione
```
postgresql://postgres:gradino@localhost:5432/kart
```
Configurata in `.env` → `core/config.py`.

### Tabelle principali (20 totali)

| Gruppo | Tabelle |
|--------|---------|
| **Gioco** | `games`, `characters`, `circuits` |
| **Tornei** | `tournaments`, `tournament_players`, `races`, `results`, `playoff_history`, `predictions` |
| **Utenti** | `players`, `users`, `tournament_photos`, `photo_comments`, `notifications`, `challenges`, `audit_log`, `temp_passwords` |
| **Schedine** | `schedine_torneo`, `schedine_torneo_deluxe`, `premi_torneo` |
| **Carte** | `user_inventory` |

### Dettaglio colonne critiche

**Tournament** (`tournaments`)
| Colonna | Tipo | Note |
|---------|------|------|
| `format_data` | JSON | Configurazione gironi: `{"groups": {...}, "semifinals": {...}, "finals": {...}}` |
| `status` | TEXT | `da_svolgere` / `in_corso` / `concluso` |
| `tournament_format` | TEXT | `classic` / `group_stage` |
| `schedine_locked` | BOOL | Schedine chiuse |
| `duello_player_one/player_two_id` | INT | Giocatori del duello schedina |
| `winner_id` | INT | Vincitore (FK players) |

**UserInventory** (`user_inventory`)
| Colonna | Tipo | Note |
|---------|------|------|
| `card_type` | TEXT | `master` / `blue_shell` |
| `is_consumed` | BOOL | Flag consumo |
| `consumed_in_race_id` | INT FK | Gara in cui usata |
| `consumed_in_phase` | TEXT | `group` / `semifinal` / `finals` |
| `consumed_in_group_name` | TEXT | Nome girone/batteria |
| `consumed_effect` | TEXT | Effetto applicato |
| `source_tournament_id` | INT FK | Torneo di provenienza |

**Race** (`races`)
| Colonna | Tipo | Note |
|---------|------|------|
| `phase` | TEXT | `group` / `semifinal` / `finals` (solo group_stage) |
| `group_name` | TEXT | Nome girone/batteria (solo group_stage) |
| `is_duello` | BOOL | Gara di spareggio (esclusa da statistiche) |
| `circuit_id` | INT FK | Pista |
| `race_order` | INT | Ordinale nel torneo |

**Result** (`results`)
| Colonna | Tipo | Note |
|---------|------|------|
| `position` | INT | Posizione in gara |
| `points` | INT | Punti assegnati (da `PUNTEGGI_CONFIG[n_players][position-1]`) |
| `character_id` | INT FK | Personaggio usato |

---

## Startup

`start.ps1` avvia in due finestre PowerShell separate:
```
Backend:  uvicorn app.main:app --reload --port 8000
Frontend: npm run dev (porta 5173)
```

All'avvio, `main.py` chiama `bootstrap_database()` che:
1. Crea tutte le tabelle (`Base.metadata.create_all`)
2. Esegue ~30 `ensure_*` migration functions
3. Seed circuiti MKDS se vuoti
4. Crea superadmin di default se non esiste

---

## Vedi anche

- [DATABASE.md](DATABASE.md) — Schema completo delle tabelle
- [CLASSIFICA.md](CLASSIFICA.md) — Sistema di classifiche e Placement Index
- [REGOLAMENTO.md](REGOLAMENTO.md) — Regole torneo, schedine e carte potere
- [QA_REPORT.md](QA_REPORT.md) — Report test end-to-end
