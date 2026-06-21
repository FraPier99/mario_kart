# Regolamento — Lega di Gaming

## 1. Formati torneo

Ogni torneo appartiene a un solo gioco (`Tournament.game_id`) ed è organizzato in uno di due formati (`Tournament.tournament_format`):

- **Classifica Unica** — tutti i partecipanti in un'unica classifica
- **A Gironi** (`group_stage`) — fase a gironi + fase finale

---

## 2. Classifica Unica

Tutti i partecipanti gareggiano insieme nello stesso insieme di gare; la classifica finale è la somma dei punti ottenuti in tutte le gare del torneo.

### 2a. Numero di gare

Il numero massimo di gare è **20**. Ogni partecipante sceglie un numero di circuiti pari a `n_gare / n_partecipanti` (arrotondato per eccesso).

**Esempio**: 7 partecipanti × 3 scelte ciascuno = 21 gare.

Se il conto è dispari, si decide insieme se aggiungere gare extra per pareggiare.

### 2b. Selezione circuiti

- Ogni giocatore sceglie i propri circuiti tra quelli disponibili
- I circuiti scelti si **esauriscono** (non più selezionabili da altri)
- I circuiti rimanenti vengono **sorteggiati random** tra quelli non ancora utilizzati
- Se tutti i circuiti vengono esauriti prima della fine, si **resetta** il pool

### 2c. Sistema di punteggio

I punti per ogni gara sono dinamici in base al numero di partecipanti (`n`):

| Posizione | Punti |
|-----------|-------|
| 1° | `n + 1` |
| 2° | `n - 1` |
| 3° | `n - 2` |
| 4° | `n - 3` |
| ... | ... |
| Ultimo | 1 |

**Esempio** con 8 partecipanti: `[9, 7, 6, 5, 4, 3, 2, 1]`
**Esempio** con 4 partecipanti: `[5, 3, 2, 1]`

### 2d. Spareggio — Duello di podio

Al termine delle gare regolari, il sistema confronta **l'intera classifica** (non solo il podio) e individua ogni blocco di posizioni consecutive in parità su punti/vittorie/podi — anche a **3 o più giocatori** in parità, e anche su **posizioni più basse** del podio (5°/6°, 7°/8°, ecc.), non solo 1°/2° e 3°/4°. Per **ciascun blocco**, qualunque sia la posizione o il numero di pareggiati, si attiva lo stesso meccanismo di **Duello**: una serie di gare secche, **primo a raggiungere 3 vittorie** (`first-to-n` con `n=3`). A parità di vittorie tra i non vincitori, si ordinano per punti totali accumulati nelle gare di duello.

Ogni gara di duello:
- Si corre su una **pista scelta a caso** tra quelle non ancora utilizzate
- Non assegna punti alla classifica generale (le gare di spareggio sono escluse dalle statistiche)
- Se tutti i circuiti sono già stati usati, il pool viene **resettato**
- I circuiti già usati nei duelli si considerano utilizzati
- Il torneo **si conclude automaticamente** (vincitore, schedine saldate, Card premio assegnate) solo quando **tutti** i duelli rilevati sono stati risolti — anche quelli sulle posizioni più basse, che non decidono il vincitore ma decidono la classifica finale

### 2e. Chiusura schedine

La schedina si compila fino a quando il torneo non inizia. Non esiste una deadline automatica: l'admin decide quando chiudere le schedine, previo avviso ai partecipanti.

---

## 3. A Gironi (`group_stage`)

Richiede **almeno 8 partecipanti**. Il sistema calcola automaticamente il numero di gironi bilanciati: il minor numero possibile, con **massimo 4 giocatori per girone** e scarto massimo di 1 tra gironi.

**Esempi**: 8 → gironi da 4, 4 | 10 → 4, 3, 3 | 11 → 4, 4, 3 | 12 → 4, 4, 4, 4 | 17 → 4, 4, 3, 3, 3

### 3a. Fase 1 — Gironi

- Ogni girone gioca le proprie gare indipendentemente dagli altri
- Il numero di gare per fase viene **deciso insieme** all'inizio del torneo
- I circuiti sono **indipendenti per ogni girone**: lo stesso circuito può essere usato in gironi diversi
- A ogni nuova fase i circuiti vengono **resettati** (ri-disponibili per tutti i gironi della fase successiva)
- Punteggio per ogni gara: `[5, 3, 2, 1]`

### 3b. Qualificazione

I **primi 2 classificati** di ciascun girone avanzano alla fase successiva.

In caso di parità nel girone, l'ordine è determinato da:
1. **Vittorie di gara** (numero di primi posti)
2. **Podi** (piazzamenti entro il 3° posto)
3. **Spareggio** — al meglio (primo a 2 vittorie) su piste scelte a caso tra quelle non utilizzate nel girone

### 3c. Fase 2 — Finale

- Se i qualificati (top 2 per gruppo) sono **≤ 4**: si passa direttamente alla Finale (gruppo "top" per il podio) + Consolazione (gruppo "bottom")
- Se i qualificati sono **> 4**: vengono generate **Semifinali** prima della Finale
- La classifica della Finale riparte da zero (indipendente dai gironi)

### 3d. Duelli

- **Qualificazione (Gironi/Semifinali)**: pareggio al posto di qualificazione → spareggio **al meglio, primo a 2 vittorie** (vedi 3b). Le gare di spareggio non assegnano punti alla classifica del girone (sono escluse dalle statistiche)
- **Podio di Finale** (1°/2°, 3°/4° posto generale): stesso meccanismo del Duello classic (2d) — **primo a 3 vittorie**, qualunque sia il numero di pareggiati. Il torneo si conclude automaticamente solo a duello risolto.
- **Podio di Consolazione/"Finalina"** (5°/6°, 7°/8° posto generale): stesso meccanismo, ma **completamente separato** da quello della Finale (group_name dedicati) — un pareggio in Consolazione non interferisce con un pareggio (magari già risolto) della Finale, e viceversa.
- In tutti i casi, i circuiti vengono **sorteggiati random** tra quelli disponibili per quel girone/fase

### 3e. Carte Potere

- **Tutti i formati** (Classifica Unica e A Gironi): max **1 carta in totale** per giocatore per torneo, indipendentemente dal tipo di carta (Master o Guscio Blu) e dal formato del torneo
- Le Card non possono essere usate nelle gare di spareggio/duello
- Le carte vinte in un gioco non possono essere usate in un altro gioco

### 3f. Chiusura schedine

Stessa regola della Classifica Unica: nessuna deadline automatica, chiusura a discrezione dell'admin.

---

## 4. La Schedina

Prima dell'inizio di un torneo, ogni partecipante può compilare **una sola schedina**. Si chiude alla deadline o all'avvio del torneo, qualunque dei due avvenga prima.

**Regola fondamentale**: ogni pronostico indovinato assegna **esattamente 3 punti** (`PUNTI_PRONOSTICO = 3`), uniforme su tutti i formati.

### 4a. Schedina Classifica Unica

Pronostici:
1. **Classifica generale** — ordine completo di arrivo. Ogni posizione esatta: **+3 pt**
2. **Maggior Streak** — giocatore con più vittorie consecutive. Se corretto: **+3 pt**
3. **Il Duello** — testa a testa tra 2 giocatori scelti dall'admin. Se corretto: **+3 pt**
4. **Spareggio** — distanza punti tra 1° e 2° reale. Non assegna punti: criterio spareggio

### 4b. Schedina Gironi

Pronostici:
1. **Finalisti** — giocatori che accederanno alla Fase 2. Ogni finalista corretto: **+3 pt**
2. **Classifica Finale** — ordine del podio finale. Ogni posizione esatta: **+3 pt**
3. **Vincitori Gironi** — 1° classificato di ogni girone. Ogni vincitore indovinato: **+3 pt**
4. **Il Duello** — testa a testa basato sui punti nel girone: **+3 pt**
5. **Spareggio** — distanza punti tra 1° e 2° reale. Criterio spareggio

### 4c. Criterio spareggio schedina

A parità di punteggio:
1. Distanza minore dal valore reale del campo Spareggio
2. Orario di invio più antico

---

## 5. Giocatore Ritirato

Un amministratore può segnare un partecipante come ritirato. I risultati già registrati restano validi. Il giocatore viene escluso dalle gare successive. Il ritiro è reversibile.

---

## 6. Note di compatibilità

- Il campo `vittima_del_caos_id` è ancora presente nello schema della schedina classic per compatibilità, ma **non genera punteggio**.
- La tabella `schedine_torneo_deluxe` ospita le schedine del formato a gironi: il nome è mantenuto per compatibilità.
