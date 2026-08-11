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
| `tornei` | Tournament, Race, Result, Game, Character, Circuit, TournamentPlayer, PlayoffHistory, Prediction | `controllers/tornei/` (7 router, incluso `stats.py` per le statistiche aggregate) | `services/tornei/` (7 service, `stats.py` copre leaderboard + testa a testa + statistiche circuito) |
| `utenti` | Player, User, Notification, AuditLog, TempPassword, TournamentPhoto, PhotoComment, Challenge, UserGameOwnership, UserConsoleOwnership, UserR4Device, SiteContentImage | `controllers/utenti/` (7 router, incluso `content_images.py` per le immagini di contenuto statico caricabili dal superadmin, es. pagina `/faq`) | `services/utenti/` (7 service) |
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

- **Nessun Alembic**: le migration sono `ALTER TABLE`/`CREATE TABLE IF NOT EXISTS` via `ensure_*` functions in `bootstrap.py`
- **25 tabelle** in 4 domini (vedi [DATABASE.md](DATABASE.md))
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
│   └── AppRouter.jsx           # route definitions
│
├── pages/                      # 24 pagine
│   ├── Home.jsx                # Landing + leaderboard globale
│   ├── TournamentDetail.jsx    # Dettaglio torneo (admin + user view)
│   ├── Stats.jsx                # Classifica globale
│   ├── Schedina*.jsx            # Compilazione/visualizzazione schedine
│   ├── Faq.jsx                  # FAQ/documentazione ufficiale a sidebar (La Lega, Tornei, Badge, Schedina, Card)
│   └── ...
│
├── components/                 # 57 componenti riutilizzabili
│   ├── tournaments/            # 24 componenti torneo (GroupPlancia, RaceCreator, ...)
│   ├── stats/                  # LeaderboardTable, PodiumSteps, CircuitRankingTable
│   ├── common/                 # ApiBanner, ConfirmModal, PortalSelect, PlayerLink (nome giocatore → profilo, riusabile ovunque), EditableContentImage (slot immagine caricabile dal superadmin), ...
│   ├── community/               # PlayerBadge, RoleBadge, PlayerTournamentHistory
│   ├── layout/                 # Navbar, AppLayout, Header, Hero
│   ├── ui/                     # Shadcn-style: button, card, dialog, table
│   ├── cards/                  # PowerCard
│   ├── superadmin/             # DatabaseTab
│   └── history/                # TournamentHistoryCard
│
├── context/                    # 3 React Context
│   ├── AuthContext.jsx         # Auth state
│   ├── AppDataContext.jsx      # Dati globali + logica classifiche + lista community users (per PlayerLink/useCommunityUserNav)
│   └── ThemeContext.jsx        # Tema dark/light
│
├── hooks/                      # custom hooks (es. useCommunityUserNav — link/navigazione al profilo pubblico)
├── services/
│   └── apiClient.js            # Axios + tutte le API definitions
└── lib/                        # Utility: constants, groupStage helpers, playerBadges/roleBadges, utils
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
- `tournamentsApi`, `racesApi`, `resultsApi`, `statsApi` (leaderboard, testa a testa, statistiche circuito, badge giocatore)
- `playersApi`, `authApi`, `notificationsApi`, `ownershipApi`, `contentImagesApi` (immagini di contenuto statico, es. `/faq`)
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

### Tabelle principali (25 totali)

| Gruppo | Tabelle |
|--------|---------|
| **Gioco** | `games`, `characters`, `circuits` |
| **Tornei** | `tournaments`, `tournament_players`, `races`, `results`, `playoff_history`, `predictions` |
| **Utenti** | `players`, `users`, `tournament_photos`, `photo_comments`, `notifications`, `challenges`, `audit_log`, `temp_passwords`, `user_game_ownership`, `user_console_ownership`, `user_r4_devices`, `site_content_images` |
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
Backend:  uvicorn app.main:socket_app --reload --port 8000
Frontend: npm run dev (porta 5173)
```

All'avvio, `main.py` chiama `bootstrap_database()` che:
1. Crea tutte le tabelle (`Base.metadata.create_all`)
2. Esegue le funzioni `ensure_*` di migrazione (35 al momento)
3. Seed circuiti MKDS se vuoti
4. Crea superadmin di default se non esiste

---

## Vedi anche

- [DATABASE.md](DATABASE.md) — Schema completo delle tabelle
- [CLASSIFICA.md](CLASSIFICA.md) — Sistema di classifiche e Placement Index
- [REGOLAMENTO.md](REGOLAMENTO.md) — Regole torneo, schedine e carte potere (documentazione tecnica)
- [TOURNAMENT_TRACKER_RULES.md](../TOURNAMENT_TRACKER_RULES.md) — sintesi delle regole effettivamente applicate dal backend, con puntatori al codice
- `/faq` (in-app) — FAQ/documentazione ufficiale della Lega player-facing (La Lega, Tornei, Badge, Schedina, Card), a sidebar
- [QA_REPORT.md](QA_REPORT.md) — Report test end-to-end
