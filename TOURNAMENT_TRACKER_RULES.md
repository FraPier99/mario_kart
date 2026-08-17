# Tournament Tracker — Regole di riferimento

Documento di sintesi: raccoglie in un unico posto le regole che il backend
**applica davvero** (non solo quelle "di carta"), per evitare disallineamenti
tra codice, DB e regolamento. Per il dettaglio completo vedi
[`docs/REGOLAMENTO.md`](docs/REGOLAMENTO.md), [`docs/DATABASE.md`](docs/DATABASE.md),
[`docs/ARCHITETTURA.md`](docs/ARCHITETTURA.md) e [`docs/CLASSIFICA.md`](docs/CLASSIFICA.md).

---

## 1. Due formati di torneo, un solo motore di regole

`Tournament.tournament_format` ∈ `{"classic", "group_stage"}`. Le regole che
**devono valere a prescindere dal formato** (uniformi):

| Regola | Classic | Group Stage |
|---|---|---|
| Carte Potere: usi per carta | Master **1 uso**, Guscio Blu **fino a 3 usi** (`item.uses_remaining`, stesso limite in entrambi i formati) |
| Card non usabili su gare di spareggio | ✅ | ✅ |
| Card usabile solo su torneo dello stesso gioco di provenienza | ✅ | ✅ |
| Una sola schedina per torneo per utente | ✅ (`schedine_torneo`) | ✅ (`schedine_torneo_deluxe`) |
| Punteggio schedina: ogni pronostico esatto | **+3 pt** (`PUNTI_PRONOSTICO`) | **+3 pt** |
| Ritiro giocatore (risultati pregressi validi) | ✅ | ✅ |

Le regole che **cambiano** in base al formato sono quelle legate alla
struttura della classifica (gironi vs unica) — vedi sezioni 3 e 4.

> ⚠️ **Nota storica**: il vecchio limite era "1 carta totale per torneo,
> qualunque sia il tipo di carta" (`_check_player_card_limit`). Con
> l'introduzione del Guscio Blu a 3 usi il limite cross-tipo è stato
> abbandonato: ora ogni carta ha un `max_uses`/`uses_remaining` proprio
> (Master 1, Guscio Blu 3, configurabile in `CARD_META` —
> `app/services/cards/inventory.py`), verificato da
> `_check_activation_tournament` (`app/controllers/cards/inventory.py`), che
> vincola gli usi residui di una carta parzialmente usata al **primo torneo**
> in cui è stata attivata.

---

## 2. Schedine: due tipologie, stesso motore di punteggio

| | Schedina Classic (`schedine_torneo`) | Schedina Gironi (`schedine_torneo_deluxe`) |
|---|---|---|
| Tabella | `schedine_torneo` | `schedine_torneo_deluxe` (nome storico) |
| Pronostici | Classifica generale, Maggior Streak, Il Duello, Spareggio (tiebreaker) | Finalisti, Classifica Finale, Vincitori Gironi, Il Duello, Spareggio (tiebreaker) |
| Punti per pronostico esatto | +3 | +3 |
| Vincolo unicità | `(user_id, tournament_id)` | `(user_id, tournament_id)` |
| Chiusura | Deadline o avvio torneo (il primo dei due) — nessun automatismo oltre a questo, l'admin può chiudere prima | idem |

Quale tabella si usa per un torneo è deciso **automaticamente** da
`tournament.tournament_format` — l'utente non scende a un solo schema misto:
i due tipi di schedina hanno colonne diverse perché i pronostici sensati
sono diversi (es. "Finalisti" non ha senso in classic, "Maggior Streak" non
ha senso a gironi).

---

## 3. Spareggi e Duelli — chi si scontra e come

Due meccanismi distinti, da non confondere:

### 3a. Duello podio (fine torneo) — `classic` e Finale `group_stage`

A fine gare, il backend (`get_classic_podium_ties` /
`get_finals_podium_ties` in `app/services/tornei/tournaments.py`) scandisce
**tutta la classifica**, non solo il podio, e individua ogni blocco di
posizioni consecutive in parità (punti → vittorie → podi) — a qualunque
posizione (1°/2°, 3°/4°, 5°/6°…) e con qualunque numero di pareggiati (2, 3, 4+).

Ogni blocco si risolve con **lo stesso meccanismo**: `_resolve_podium_tie` →
`_first_to_n_order`, **primo a 3 vittorie** di gara secca (a parità di
vittorie tra i non vincitori, ordinamento per punti totali accumulati nelle
gare di duello). Non esiste più distinzione "best-of-3 solo per il 1°/2°
posto vs. gara secca per il resto": il formato del duello è identico per
ogni blocco in parità.

Il torneo **non si conclude mai automaticamente**, nemmeno quando tutti i
duelli rilevati sono risolti: la finalizzazione è sempre un passo manuale
dell'admin, tramite il pulsante "Decreta Vincitore" (`WinnerFinalizeCard.jsx`
→ `update_tournament`/`set_tournament_playoff_winner` in
`app/services/tornei/tournaments.py`), che imposta `winner_id`/
`status = "concluso"` e salda le schedine (rispettivamente
`settle_tournament_schedine` o `settle_deluxe_schedine`, con assegnazione
automatica delle Card premio) — ma solo dopo aver verificato che non resti
nessun duello/pareggio ancora da risolvere (`_has_unresolved_ties`), nel
qual caso il pulsante resta bloccato. Anche le posizioni basse contano: non
decidono il vincitore ma decidono la classifica finale (rilevante per i
pronostici di classifica completa).

Ogni duello usa un `group_name` dedicato: `duello_podio_1_2`, `duello_podio_3_4`,
oppure generato dinamicamente come `duello_podio_<inizio>_<fine>` per le
posizioni più basse (es. `duello_podio_5_6`) — questa generalizzazione vale
per `get_classic_podium_ties` (classic, scansiona tutta la classifica).

Per la Finale di `group_stage` la Final 4 ("top") e la Consolazione/"Finalina"
("bottom") sono invece **due classifiche fisse e indipendenti** (4 posti
ciascuna): `get_finals_podium_ties` calcola solo i pareggi 1°/2° e 3°/4° del
bracket "top" con `group_name` `finals_duello_podio_1_2`/`_3_4`;
`get_consolation_podium_ties` calcola lo stesso per il bracket "bottom" con
`group_name` **distinti** (`finals_duello_consolazione_1_2`/`_3_4`). I due
sistemi non condividono mai lo stato — un pareggio in Consolazione non viene
mai scambiato per un pareggio (magari già risolto) della Finale, e viceversa.
Solo i pareggi della Finale ("top") determinano `winner_id`/conclusione del
torneo; quelli di Consolazione servono solo a definire la classifica
generale combinata (vedi `get_group_stage_overall_classifica`).

### 3b. Spareggio qualificazione gironi (`group_stage`, fasi 1 e 2)

Per decidere chi avanza alla fase successiva da un girone/batteria/semifinale
in parità sul posto di qualificazione: spareggio **al meglio, primo a 2
vittorie** (`_resolve_tie_with_spareggio` → `_first_to_n_order` con `n=2`),
piste random. Le gare di spareggio sono `is_duello=True` e quindi escluse
dalla classifica/punti del girone (vedi `racesByPhaseGroup` in
`GroupPlancia.jsx`, che le filtra esplicitamente).

**Caso particolare — ultimo posto Finale tra batterie di semifinale diverse**:
quando i qualificati alla Finale vanno scelti tra più batterie di semifinale
(`_advance_top_n`), i candidati di batterie diverse non si sono mai
affrontati direttamente (gare separate). Se il confronto per punti/vittorie/
podi sull'ultimo posto disponibile è in parità ESATTA tra giocatori di
batterie diverse, si gioca lo stesso spareggio (`finals_duello_ultimo_posto`,
phase `"finals"`) — non un criterio arbitrario. Se invece non c'è parità
esatta (uno ha più punti dell'altro, anche di poco), si avanza per punti
senza spareggio: è l'unico confronto possibile tra heat che non si sono mai
incontrate.

---

## 4. Torneo a gironi flessibile — chi avanza e perché

```
Fase 1 — Gironi (N gironi, calcolati da compute_group_layout)
   ↓  primi 2 di ogni girone
   │  criterio: punti → vittorie → podi → spareggio (primo a 2 vittorie)
   ↓
Qualificati ≤ 4 ?
   ├─ Sì → Fase 2: Finale (top) + Consolazione (bottom)
   └─ No → Fase 2: Semifinali (batterie S1, S2, ...)
              ↓  _advance_top_n: primi N qualificati per "livello"
              │  (1° di ogni batteria, poi i 2° migliori, ecc.)
              ↓
            Fase 3: Finale (top) + Consolazione (bottom, gironi + eliminati in semifinale)
```

Quando c'è una fase di semifinale, la Consolazione/"Finalina" finale non è
solo i 3°/4° dei gironi: si uniscono anche i qualificati dal girone che NON
rientrano nel Final 4 (eliminati in semifinale) — altrimenti resterebbero
senza piazzamento. Esempio concreto, 9 giocatori (3 gironi da 3): 6
qualificati → semifinale in 2 batterie da 3 → Finale prende i migliori 4,
gli altri 2 (eliminati in semifinale) si uniscono ai 3 esclusi dai gironi →
Finalina da 5.

Se la Finalina supera i 4 (vincolo schermo) viene divisa in batterie
"B1","B2",… **per livello di merito**, non a caso (`_build_consolation_tiers`):
tier 0 = eliminati in semifinale (hanno superato il girone), tier 1 = esclusi
direttamente dai gironi. I due tier non condividono mai una batteria, e in
classifica generale i tier si concatenano dal migliore al peggiore — chi è
uscito in semifinale resta sempre davanti a chi è uscito ai gironi, anche con
meno punti (`_consolation_classifica` fonde le batterie dentro ogni tier con
`_merge_consolation_heats`, poi concatena i tier). Esempio, Finalina da 5
(caso 9 giocatori): B1 = 2 eliminati in semifinale (5°-6°), B2 = 3 esclusi
dai gironi (7°-8°-9°).

- **Requisito minimo**: 8 partecipanti (`tournament_format = "group_stage"`)
- **Composizione gironi**: il minor numero di gironi possibile, max 4
  giocatori/girone, scarto massimo 1 tra gironi (es. 11 → 4,4,3)
- **Perché avanzi**: sempre e solo per **posizione nel proprio girone/batteria**
  (1° e 2°), mai per punteggio assoluto cross-girone — questo è ciò che rende
  il formato "flessibile" indipendente dal numero di gironi
- **Pareggio sulla soglia di qualificazione**: risolto da uno spareggio al
  meglio (primo a 2 vittorie) dedicato a quel girone/fase (non influisce
  sugli altri gironi); non assegna punti alla classifica del girone
- **Classifica di Finale**: riparte da zero, indipendente dai punti accumulati
  nei gironi — la Finale è un torneo nel torneo

La UI (`GroupPlancia.jsx` / `GroupCard`) mostra sempre la classifica **per
girone/fase**, non la classifica globale: un giocatore in gironi vede solo
il proprio girone, e dopo l'avanzamento solo la fase in cui si trova
(`findPlayerGroup` in `frontend/src/lib/groupStage.js`).

---

## 5. Riferimenti rapidi nel codice

| Cosa | Dove |
|---|---|
| Layout gironi (N bilanciati) | `compute_group_layout` — `app/services/tornei/tournaments.py` |
| Avanzamento qualificati > 4 | `_advance_top_n` — idem |
| Pareggi podio classic/finale | `get_classic_podium_ties`, `get_finals_podium_ties` — idem |
| Conclusione torneo (manuale, mai automatica) | `update_tournament`/`set_tournament_playoff_winner` + `_has_unresolved_ties` — idem |
| Limite usi carta + attivazione singolo torneo | `_check_card_available`, `_check_activation_tournament` — `app/controllers/cards/inventory.py` |
| Card non su gare di spareggio | `_check_not_duello_race` — idem |
| Effetti in sospeso (Master ban_pista/imponi_personaggio senza gara ancora creata) | `get_pending_card_usages`, `resolve_pending_card_usage` — `app/services/cards/inventory.py` |
| Punteggio gare (griglia dinamica) | `app/data/punteggi.py` (`PUNTEGGI_CONFIG`) |
| Punteggio schedine | `PUNTI_PRONOSTICO = 3` — `app/services/schedine/*` |
| Standings per-girone lato frontend | `GroupCard`, `computeGroupStandings` — `frontend/src/components/tournaments/GroupPlancia.jsx` |
| Torneo amichevole (flag, non un terzo formato) | `Tournament.is_friendly` — `app/models/tornei/models.py`; guardie in `update_tournament`/`set_tournament_playoff_winner`/`undo_last_playoff` (`app/services/tornei/tournaments.py`), `_check_not_friendly_tournament` (`app/controllers/cards/inventory.py`), `create_schedina`/`create_schedina_deluxe` (`app/services/schedine/*`), filtri in `app/services/tornei/stats.py` |

---

## 6. Torneo amichevole — ortogonale al formato, non un terzo tipo

`Tournament.is_friendly` è un flag booleano indipendente da
`tournament_format` (deciso alla creazione, immutabile dopo): un torneo
amichevole usa la stessa identica macchina gare/risultati/classifiche di un
torneo normale, in entrambi i formati — cambia solo cosa viene **disattivato**:

- **Niente** Carte Potere, Schedine, notifica di chiusura "torneo concluso"
  a tutti i partecipanti, assegnazione Carta Master/Guscio Blu
- **Niente** contributo a badge giocatore, leaderboard, classifiche di
  circuito/testa a testa (filtro `Tournament.is_friendly.is_(False)` nelle
  query aggregate cross-torneo di `stats.py` — **non** nel leaderboard
  del singolo torneo, che deve continuare a mostrare la propria classifica)
- **Nessun** "Decreta Vincitore": lo stato può avanzare direttamente a
  `concluso` dalla pipeline (`TournamentStatusManager`, prop
  `allowDirectConclusion`), senza passare per un vincitore ufficiale
- Creabile per ora solo da admin/superadmin (stessa gate di sempre su
  `POST /tournaments`) — apertura a utenti normali con approvazione admin è
  fuori scope, prevista in futuro
