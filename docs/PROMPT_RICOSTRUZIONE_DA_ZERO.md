# Prompt di ricostruzione — "Lega Mario Kart"

> Dai questo prompt a un agente/sviluppatore che parte da una cartella vuota.
> Descrive COSA costruire e PERCHÉ è fatto in un certo modo — non è codice da
> copiare, ma una specifica sufficientemente dettagliata da ricreare la stessa
> architettura, le stesse regole di dominio e gli stessi trade-off.

---

## 0. Contesto e obiettivo

Costruisci "Lega Mario Kart": un'applicazione web per tracciare i tornei di una
lega amatoriale di Mario Kart (attualmente Mario Kart DS e Mario Kart 8
Deluxe, ma il modello dati deve restare generico su più giochi). Non è solo
uno scoreboard: include un meta-game di "carte potere" che si vincono
pronosticando gli esiti dei tornei ("schedine"), un sistema di badge/tier per
giocatore, e una modalità torneo "a gironi" abbastanza elaborata (gironi →
semifinali opzionali → finale + finale di consolazione).

Stack: **FastAPI (Python) + PostgreSQL** sul backend, **React 19 + Vite +
Tailwind CSS v4** sul frontend, **Socket.IO** per un singolo evento realtime
(la celebrazione di fine torneo). Niente framework SSR: è una SPA pura con
client-side routing (react-router-dom v7).

Tieni a mente due vincoli di prodotto che guidano molte scelte tecniche:
- **Niente infrastruttura pesante.** Non c'è Redis, non c'è coda di job, non
  c'è Alembic: le migrazioni sono funzioni Python idempotenti eseguite a ogni
  avvio del backend. Il progetto deve restare deployabile da una persona sola
  su hosting economico (Railway-style).
- **Il dominio ha due "formati torneo" paralleli che quasi non condividono
  codice.** Ogni volta che implementi una feature legata ai tornei, chiediti
  esplicitamente: "come si comporta in formato classic? E in formato a
  gironi?" — sono deliberatamente due implementazioni quasi duplicate (vedi
  §3), non un'astrazione comune forzata a posteriori.

---

## 1. Stack e struttura cartelle

### Backend (`app/`)

```
app/
├── main.py                  FastAPI app + Socket.IO ASGI wrapper, mount router, CORS/GZip
├── core/
│   ├── config.py             env vars (DB connection string, SECRET_KEY, credenziali superadmin default)
│   ├── db.py                 SQLAlchemy engine + SessionLocal + get_db() dependency
│   ├── security.py           auth "fatta a mano" (vedi §5) — niente librerie JWT/passlib
│   ├── bootstrap.py           TUTTE le migrazioni + seed, eseguite a ogni avvio (vedi §8)
│   ├── timezone.py            now_rome() — timezone di riferimento unico per created_at ovunque
│   ├── media.py / image_optim.py   immagini base64 in DB + endpoint di serving + ottimizzazione
├── models/{tornei,utenti,schedine,cards}/models.py   SQLAlchemy ORM, Base condivisa, re-esportati da models/__init__.py
├── controllers/{tornei,utenti,schedine,cards}/*.py    FastAPI APIRouter, solo parsing + delega a services + eccezioni→HTTP
│   └── */schemas/*.py         Pydantic request/response
├── services/{tornei,utenti,schedine,cards}/*.py       LOGICA VERA — tutta qui, mai nei controller
├── realtime/manager.py        Socket.IO AsyncServer, rooms per-user, evento broadcast
├── data/                      dati statici: circuiti, personaggi, tabelle punteggio (vedi §9)
└── Scripts/                   script one-off (seed, backfill) — mai importati dall'app
```

Convenzione: `app.models` re-esporta tutto, quindi il codice applicativo fa
`from app.models import Tournament, User, ...` senza mai importare i
sottomoduli per dominio direttamente. Stessa cosa per gli import
"lazy"/locali dentro le funzioni quando serve incrociare `services/tornei`
con `services/schedine` (evita cicli di import).

### Frontend (`frontend/src/`)

```
src/
├── pages/                  un componente per route (vedi tabella §7)
├── components/
│   ├── ui/                  primitive shadcn-style (button, card, dialog, table)
│   ├── common/                pezzi riusabili trasversali (avatar, tooltip circuito, command palette, overlay celebrazione...)
│   ├── layout/                 header/navbar/hero/feed attività
│   ├── tournaments/           il gruppo più grosso — tutto ciò che serve alla pagina torneo
│   ├── admin/ / superadmin/   tab dei due pannelli di gestione
│   ├── community/              profilo pubblico, badge
│   ├── stats/                   tabelle/podi statistiche
│   └── cards/                   la carta potere animata
├── context/                  AuthContext, AppDataContext (standings client-side), NotificationsContext, SocketContext, ThemeContext, CelebrationContext, UISoundContext
├── hooks/                    useCommunityUserNav, useTournamentCards, ...
├── lib/                      logica di dominio client-side pura (vedi §7 nota finale)
├── services/apiClient.js     TUTTE le chiamate HTTP, un modulo per dominio (tournamentsApi, schedineApi, schedineDeluxeApi, inventoryApi, statsApi, ...)
└── Router/AppRouter.jsx      routing + guard RequireAuth
```

---

## 2. Modello dati

Costruisci queste tabelle (nomi indicativi, adatta al tuo ORM). Per ognuna,
le colonne "di dominio" contano più del tipo esatto — segnalo dove un
constraint o una scelta di modellazione è importante.

**Identità/utenti**
- `players` — anagrafica giocatore: nome, **nickname univoco**, avatar,
  foto "da campione" (mostrata quando vince), bio, colore accento,
  personaggio preferito (FK a characters).
- `users` — account di login: username univoco, password hash, **role**
  (stringa libera validata in app, non enum DB: `user`/`admin`/`superadmin`),
  `is_active`, `must_change_password` (forza il cambio password al primo
  accesso), `player_id` FK **nullable e univoca** (un superadmin non ha mai
  un Player collegato — non gioca).
- `temp_passwords` — password temporanee generate dal superadmin per reset,
  con scadenza.
- `audit_log` — traccia azioni amministrative sensibili (attore, azione,
  target, descrizione libera).
- `notifications` — `type` libero (mention, tournament_ended,
  schedina_pending, schedina_winner, card_granted, card_revoked,
  comment_reply...), riferimenti opzionali a utente/foto/torneo sorgente,
  `is_read`. **Retention breve** (poche ore) con pulizia opportunistica a
  ogni lettura, nessuno scheduler.
- `user_game_ownership` / `user_console_ownership` / `user_r4_devices` —
  auto-dichiarazione di cosa possiede ogni utente (giochi, console,
  flashcart R4 — questi ultimi ammessi solo se l'utente dichiara di
  possedere il gioco DS).
- `site_content_images` — tabella generica "slot immagine per chiave
  stringa", per contenuti statici editabili dal superadmin senza bisogno di
  migrazioni ogni volta (es. la foto storica nella pagina FAQ).
- `overlay_texts` — testi dell'overlay di celebrazione, chiave per gioco,
  editabili dal superadmin, con fallback statico bundlato nel frontend se
  l'API non risponde.

**Tornei**
- `games` — cataloghi giochi (Mario Kart DS, MK8 Deluxe, ...).
- `consoles` — catalogo console con flag "compatibile R4".
- `characters` / `circuits` — per gioco (`UniqueConstraint(name, game_id)`),
  i circuiti hanno un flag `requires_pass` per i DLC a pagamento.
- `tournaments` — la tabella centrale. Campi chiave:
  - `tournament_format`: `"classic"` oppure `"group_stage"` — **questo
    singolo campo decide quale metà del codice si attiva ovunque**.
  - `status`: `da_svolgere → in_corso → concluso` (stati testuali, non
    enum DB).
  - `is_friendly`: bool immutabile — un torneo amichevole non genera
    schedine, non genera carte, non entra nelle statistiche/badge.
  - `format_data`: **JSON libero** che contiene la composizione dei gironi,
    dei finalisti, ecc. — usalo come "estensione senza migrazione" per dati
    strutturati specifici del formato group_stage.
  - `winner_id`, `duello_player_a_id`/`_b_id` (per lo spareggio a duello),
    `deadline_lock`/`schedine_locked` (chiusura schedine), `celebration_text`
    (JSON congelato al momento della decretazione, per poter ri-mostrare la
    stessa celebrazione anche a distanza di tempo).
- `tournament_players` — join table con `withdrawn`/`withdrawn_at`: un
  giocatore può ritirarsi a torneo iniziato, ma i risultati già registrati
  restano validi (non li cancelli retroattivamente).
- `player_game_participation` — traccia, per coppia (player, gioco), sia
  uno **streak di partecipazione basato sul roster** (per capire chi manca
  da troppi tornei) sia uno **streak "giocato realmente"** distinto (per un
  badge di costanza) — sono concettualmente diversi e vanno tenuti separati:
  il primo conta anche i tornei a cui il giocatore era iscritto ma non ha
  giocato, il secondo no.
- `races` — una gara appartiene a una fase (`group`/`finals`) e a un
  "group_name" (nome del girone in fase 1, `top`/`bottom` in fase finale).
  Flag `is_duello` per le gare di spareggio (vanno **sempre** escluse da
  ogni statistica aggregata).
- `results` — posizione + punti per giocatore in una gara. **Due unique
  constraint** (una posizione non può ripetersi nella stessa gara, un
  giocatore non può avere due risultati nella stessa gara) — quella sulla
  posizione va dichiarata **DEFERRABLE INITIALLY DEFERRED**, perché un
  riordino dei risultati (drag&drop delle posizioni) fa più UPDATE dentro la
  stessa transazione che, valutati uno alla volta, violerebbero
  temporaneamente il vincolo.
- `point_adjustments` — rettifiche punti manuali con motivazione
  obbligatoria (solo superadmin), visibili pubblicamente per trasparenza.

**Schedine (pronostici)** — due tabelle quasi gemelle, mai unificate:
- Formato classic: previsione della classifica generale completa ordinata,
  chi avrà più vittorie in streak, un pronostico opzionale su chi subirà più
  sfortuna, l'esito del duello di spareggio (con opzione "pareggio"), e una
  stima numerica del **distacco esatto di punti fra 1° e 2°** (tie-breaker
  per chi ha totalizzato lo stesso punteggio di pronostico).
- Formato a gironi: previsione dei finalisti, della classifica finale, della
  classifica di **ciascun girone** (non solo il vincitore), più lo stesso
  meccanismo di duello e distacco 1°/2° del formato classic.
- Entrambe: `total_points` e `status` (`open`→`settled`) popolati solo al
  momento della liquidazione (mai calcolati "live" prima che il torneo sia
  concluso — vedi §3).
- `premi_torneo` — tabella **condivisa da entrambi i formati**: registra chi
  ha vinto la schedina di un torneo e con che premio. Punto di attenzione
  architetturale forte: qualunque query che fa JOIN da questa tabella verso
  "la" tabella schedina deve gestire **entrambi** i formati, altrimenti i
  premi dei tornei a gironi spariscono silenziosamente dalle query storiche
  — è una classe di bug reale che si è già verificata in questo progetto,
  progetta le query storiche fin dall'inizio con l'union esplicita fra i due
  formati.

**Carte potere**
- `user_inventory` — una riga per ogni carta *assegnata* a un utente:
  tipo (`master`/`blue_shell`), torneo/schedina di origine, `max_uses` e
  `uses_remaining` (1 per Master, 3 per Guscio Blu), flag "assegnata
  manualmente da admin" con nota.
- `card_usage_log` — una riga per ogni singolo *utilizzo* (il Guscio Blu può
  avere fino a 3 log per lo stesso item). Un log può avere `race_id = NULL`:
  significa "effetto dichiarato ma non ancora legato a una gara" (es. un
  admin dichiara "questa carta annulla la pista scelta da X" prima ancora
  che la gara esista) — va risolto/collegato quando la gara viene creata.

---

## 3. Regola di dominio più importante: il fork classic / group_stage

Progetta esplicitamente **due percorsi paralleli** per: creazione/gestione
torneo, inserimento risultati, calcolo classifica, risoluzione degli
spareggi, schedine, liquidazione premi. Non provare a unificarli sotto
un'astrazione comune: si è già tentato indirettamente nel tempo e il
risultato più manutenibile è stato tenerli separati, duplicando la logica ma
rendendo ogni percorso semplice da ragionare in isolamento. Quando aggiungi
una feature che tocca i tornei, implementala **due volte**, una per formato,
e documenta esplicitamente quali file sono "la versione classic" e quali "la
versione a gironi".

Regole di spareggio da replicare (sono la parte più delicata):
- Una parità di podio (posizione 1°/2°, o 3°/4°, o qualunque blocco pari
  merito) si risolve sempre con un mini-torneo **"primo a vincere 3 gare"**
  fra i giocatori in pareggio — stessa regola a prescindere dalla posizione
  o da quanti giocatori sono in parità.
- Le gare di spareggio (`is_duello=true`) non contano MAI nelle statistiche
  normali, né nel calcolo della classifica "ufficiale" usata per punteggi
  carte/schedine.
- La finalizzazione del torneo (assegnazione vincitore, liquidazione
  schedine, distribuzione carte, notifica di fine torneo) **non è mai
  automatica**: è sempre un'azione esplicita dell'admin da un pulsante
  dedicato, che per prima cosa controlla che non ci siano spareggi ancora
  aperti.

---

## 4. Autenticazione e ruoli

Implementa un'autenticazione **volutamente senza librerie esterne** (niente
PyJWT, niente passlib) per restare leggeri:
- Password: derivazione PBKDF2-HMAC-SHA256 con salt casuale, molte
  iterazioni, confronto a tempo costante in verifica.
- Token: payload minimale (id utente, ruolo, scadenza) serializzato in JSON,
  codificato base64url, firmato con HMAC-SHA256 usando un secret di
  configurazione. Due segmenti `payload.firma` — **non è un JWT standard a
  tre parti**, è un formato proprietario più semplice, sufficiente perché
  non serve interoperabilità con altri sistemi.
- Tre ruoli soltanto: `user` (giocatore/pubblico registrato), `admin`
  (gestisce tornei), `superadmin` (gestisce utenti, catalogo, override di
  sistema). Nessuna gerarchia di permessi granulare — è deliberatamente
  semplice.
- Backend: una dependency factory `require_roles(*ruoli)` da applicare
  route per route.
- Frontend: un solo componente guard di routing che redirige al login se non
  autenticato, o alla dashboard se il ruolo non basta per quella route.
  Un overlay bloccante forza il cambio password al primo accesso prima di
  poter usare il resto dell'app.

---

## 5. Meta-game delle carte potere

Due carte, definite in un'unica fonte di verità lato backend (non
duplicarne la definizione in più posti):
- **Carta Master** (1 uso): al momento dell'uso, annulla la pista scelta da
  un avversario e impone la propria, oppure impone un personaggio a un
  avversario per una gara, oppure aggiunge una gara extra a fine torneo.
- **Carta Guscio Blu** (fino a 3 usi): ferma tutti gli altri per un giro,
  partendo con un giro di vantaggio.

Assegnazione automatica alla liquidazione della schedina di un torneo:
- Master → a chi ha totalizzato più punti pronostico (tutti gli ex aequo,
  stesso punteggio e stesso tie-breaker), esclusi i giocatori ritirati.
- Guscio Blu → agli ultimi due classificati del torneo appena concluso
  (meccanismo di riequilibrio verso chi è andato peggio).

Un admin deve poter anche assegnare/revocare carte manualmente con una nota
libera. Un effetto "Master" può essere dichiarato prima che la gara a cui si
applica esista ancora (stato "in sospeso"), e va collegato automaticamente
quando quella gara viene effettivamente creata.

---

## 6. Notifiche e realtime

Sistema ibrido, non full-realtime ovunque:
- **Polling** per le notifiche generiche (menzioni con `@nickname`,
  risposte ai commenti, promemoria schedina da compilare, carte
  assegnate/revocate) — un intervallo di qualche decina di secondi dal
  frontend, più un refresh quando la tab torna visibile, basta.
- **Socket.IO** solo per un evento specifico ad alto valore percepito: la
  celebrazione animata di fine torneo, trasmessa in tempo reale a tutti i
  client connessi (room per-utente, autenticazione via lo stesso token
  HMAC). Se il socket non si connette entro pochi secondi, il frontend deve
  ricadere su un polling di backup — mai lasciare l'utente senza sapere che
  un torneo è finito solo perché il websocket non è arrivato a buon fine.
  Alla riconnessione, se c'è una celebrazione recente non ancora vista
  (finestra di un paio di giorni), va ri-mostrata; oltre quella finestra va
  semplicemente marcata come letta senza disturbare l'utente.

---

## 7. Frontend — pagine e principi di design

Pagine principali da prevedere (route pubbliche dietro login, salvo
`/login`): home con feed attività, elenco giocatori, storico tornei,
compilazione/visualizzazione schedina (due varianti: classic e a gironi),
inventario carte, FAQ/regolamento, classifiche generali, confronto testa a
testa fra due giocatori, statistiche per circuito, profilo pubblico
community, hall of fame dei campioni, dashboard personale, pagina di
dettaglio torneo (che ospita sia la vista admin sia quella giocatore, molto
ramificata sul formato torneo), creazione torneo, pannello admin, pannello
superadmin.

Principi di design da rispettare:
- Palette e libreria componenti coerenti con un tema "Tailwind + shadcn"
  standard, ma con un **linguaggio visivo custom tipo "cartuccia/pista da
  corsa"**: bordi netti, ombre offset piatte (non sfocate, stile fumetto),
  un font display "chunky"/monospaziato per titoli ed etichette (distinto
  dal font body), badge/etichette sempre in maiuscolo con tracking largo.
- Supporto dark/light con toggle manuale esplicito (non solo preferenza di
  sistema).
- Un piccolo set di animazioni CSS dedicate al momento clou dell'app (la
  celebrazione di fine torneo e l'apertura di una carta potere vinta): sono
  investimento di prodotto voluto, non sovraingegnerizzazione — questa app
  vive di quel momento "wow".
- Gerarchia di navigazione: quando una pagina ha più livelli di tab annidati
  (es. la gestione di un torneo a gironi: tab principali → sotto-tab di
  fase → eventuale selettore interno), dai pesi visivi chiaramente diversi
  a ciascun livello (es. pillola piena e scura per il livello 1, semplice
  sottolineatura per il livello 2) — non usare mai lo stesso stile per due
  livelli di gerarchia diversi, si è già rivelata una causa concreta di
  confusione utente in questo progetto.

Metti nel frontend uno strato `lib/` di logica di dominio pura (calcolo
badge/tier giocatore, calcolo standing, riconoscimento del formato torneo,
mapping colori/etichette per i gruppi di gioco, ecc.) separato dai
componenti — molte regole di visualizzazione (es. "questo group_name è un
duello di spareggio, non un girone normale") vanno risolte in un unico posto
condiviso, mai reinventate componente per componente.

---

## 8. Niente Alembic: migrazioni come funzioni idempotenti

Non introdurre un sistema di migrazioni a versioni. Invece: una singola
funzione di bootstrap eseguita a ogni avvio del backend, che è una sequenza
ordinata cronologicamente di piccole funzioni `ensure_*`, ognuna delle quali:
1. controlla se la colonna/tabella che deve aggiungere esiste già
   (query sull'information_schema o equivalente);
2. se non esiste, esegue l'ALTER/CREATE necessario;
3. è sicura da rieseguire all'infinito senza effetti collaterali.

Questo tiene il progetto deployabile senza step manuali di migrazione, al
prezzo di un file di bootstrap che cresce nel tempo (è accettabile: è un
log leggibile della storia dello schema, non un problema da risolvere).

---

## 9. Dati seed

Prevedi dati statici versionati nel codice (non nel DB) per:
- Tabelle punteggio per numero di giocatori in gara (una tabella fissa per i
  casi comuni 4-8 giocatori, con una formula di fallback generica per numeri
  fuori da quel range).
- Catalogo circuiti per ciascun gioco supportato, con mapping verso una CDN
  di immagini esterna (non salvare le immagini dei circuiti in DB, solo
  l'URL).
- Catalogo personaggi per gioco, con classe di peso.
- Catalogo console/dispositivi con flag di compatibilità (es. quali console
  supportano un flashcart R4).

---

## 10. Cosa NON fare (vincoli espliciti)

- Non introdurre microservizi o code di messaggi: è un monolite FastAPI
  volutamente semplice.
- Non modellare i ruoli come enum a livello DB: restano stringhe validate
  in applicazione, per poter aggiungere/rinominare ruoli senza migrazione.
- Non forzare un'astrazione comune fra formato classic e formato a gironi
  "per DRY": mantienili come implementazioni parallele esplicite.
- Non salvare immagini pesanti come base64 in tabelle ad alto traffico di
  lettura (va bene per pochi slot statici tipo "foto storica", non per una
  galleria fotografica di massa — se in futuro serve una vera galleria,
  va ripensata su storage a URL, non su colonne base64).
- Non rendere automatica la finalizzazione di un torneo: deve restare
  sempre un'azione umana esplicita, con un controllo preventivo che non
  ci siano spareggi ancora da risolvere.
