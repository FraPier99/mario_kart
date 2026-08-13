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
- Il torneo **non si conclude mai automaticamente**: una volta risolti tutti i duelli rilevati (anche quelli sulle posizioni più basse, che non decidono il vincitore ma decidono la classifica finale), è l'admin a dover premere "Decreta Vincitore" — un controllo automatico blocca il pulsante se resta qualche duello da risolvere

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

### 3c. Fase 2 — Semifinali e Finale

- Se i qualificati (top 2 per girone) sono **≤ 4**: si passa direttamente alla Finale (gruppo "top", Final 4) + Consolazione/"Finalina" (gruppo "bottom")
- Se i qualificati sono **> 4**: vengono generate **Semifinali** (batterie S1, S2, ..., massimo 4 per batteria) prima della Finale. Per scegliere i 4 finalisti tra più batterie: prima i vincitori di ogni batteria, poi i migliori "secondi" per punti, fino a riempire i 4 posti
- **Chi viene eliminato in semifinale** (qualificato dal girone ma escluso dal Final 4) **si unisce ai 3°/4° classificati dei gironi nella Finalina**, invece di restare senza piazzamento. Esempio: 9 giocatori → 3 gironi da 3 → 6 qualificati → semifinale in 2 batterie da 3 → Finale prende i migliori 4, gli altri 2 si uniscono ai 3 esclusi dai gironi → **Finalina da 5**
- **Se la Finalina supera i 4 giocatori** (vincolo schermo, come i gironi): viene divisa in batterie "B1", "B2", ... **per livello di merito**, non a caso. Chi è stato eliminato in semifinale (ha comunque superato il proprio girone) gioca sempre per le posizioni più alte della Finalina; chi è uscito direttamente ai gironi gioca per quelle più basse. I due gruppi non si mescolano mai nella stessa batteria, anche se un escluso dai gironi ha fatto più punti di un eliminato in semifinale. L'ordine finale all'interno di ciascun livello si stabilisce per punti (stesso criterio della semifinale), e i livelli si concatenano dal migliore al peggiore. Esempio: con 9 giocatori la Finalina da 5 ha B1 = i 2 eliminati in semifinale (posti 5°-6°) e B2 = i 3 esclusi dai gironi (posti 7°-8°-9°)
- La classifica della Finale riparte da zero (indipendente dai gironi)

### 3d. Duelli

- **Qualificazione (Gironi/Semifinali)**: pareggio al posto di qualificazione → spareggio **al meglio, primo a 2 vittorie** (vedi 3b). Le gare di spareggio non assegnano punti alla classifica del girone (sono escluse dalle statistiche)
- **Ultimo posto Finale tra batterie di semifinale diverse**: i candidati di batterie diverse non si sono mai affrontati direttamente (gare separate). Se il confronto per punti/vittorie/podi sull'ultimo posto disponibile è in **parità esatta** tra giocatori di batterie diverse, si gioca uno spareggio dedicato invece di scegliere arbitrariamente. Se non c'è parità esatta, vince chi ha più punti (è l'unico confronto possibile tra batterie che non si sono mai incontrate)
- **Podio di Finale** (1°/2°, 3°/4° posto generale): stesso meccanismo del Duello classic (2d) — **primo a 3 vittorie**, qualunque sia il numero di pareggiati
- **Podio di Consolazione/"Finalina"** (5°/6°, 7°/8° posto generale, e oltre se la Finalina è più numerosa): stesso meccanismo, ma **completamente separato** da quello della Finale (group_name dedicati) — un pareggio in Consolazione non interferisce con un pareggio (magari già risolto) della Finale, e viceversa
- In tutti i casi, i circuiti vengono **sorteggiati random** tra quelli disponibili per quel girone/fase
- Il torneo **non si conclude mai automaticamente**: risolti i duelli di Finale e Consolazione, l'admin deve comunque premere "Decreta Vincitore" (bloccato se resta un duello da risolvere)

### 3e. Carte Potere

Vedi sezione 7 per gli effetti e i limiti d'uso — valgono identici per entrambi i formati.

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

## 6. Badge Giocatore

Ogni giocatore ha un badge di livello **per ogni gioco** (`game_id`), calcolato sui soli **tornei conclusi** a cui ha partecipato — un torneo in corso non conta finché non è decretato un vincitore. Dal più al meno esclusivo:

| Badge | Come si ottiene |
|---|---|
| **LEGGENDA** | ha vinto **tutti** i tornei conclusi di quel gioco a cui ha partecipato, oppure ha vinto almeno **3 tornei** di quel gioco (qualunque sia la percentuale) |
| **CAMPIONE** | ha vinto almeno un torneo concluso di quel gioco |
| **VETERANO** | non ha mai vinto, ma è arrivato sul podio (primi 3 posti) in almeno metà dei tornei conclusi giocati |
| **OUTSIDER** | non ha mai vinto, ha fatto almeno un podio, ma meno spesso della metà dei tornei giocati |
| **ESORDIENTE** | ha giocato almeno un torneo concluso ma non è mai arrivato sul podio |
| **SFIDANTE** | non ha ancora giocato un torneo concluso di quel gioco |

Il badge di un gioco non influenza quello di un altro: si può essere Leggenda su un gioco e Sfidante su un altro.

---

## 7. Carte Potere

Assegnate automaticamente alla chiusura delle schedine: **Carta Master** al/i vincitore/i della schedina (anche in caso di parità), **Guscio Blu** all'ultimo classificato (e al penultimo, con 7+ partecipanti).

### 7a. Carta Master — 1 uso, tre effetti a scelta

Chi la possiede sceglie **uno** dei tre effetti al momento dell'uso:

1. **Annulla pista** — invalida la pista scelta da un **avversario** per la sua prossima gara e la sostituisce con quella scelta dal possessore della carta
2. **Impone personaggio** — obbliga un **avversario** a usare, per una gara, il personaggio scelto dal possessore della carta
3. **Gara extra** — aggiunge una gara a fine torneo (nessun bersaglio)

Gli effetti 1 e 2 possono essere dichiarati **prima ancora che la gara che devono influenzare esista**: l'admin registra l'effetto (bersaglio + pista/personaggio imposto) e resta "in sospeso" finché non viene creata la prossima gara che coinvolge quel bersaglio, momento in cui viene applicato e la carta risulta consumata.

### 7b. Guscio Blu — fino a 3 usi nello stesso torneo, un solo effetto

Effetto: **tutti i giocatori tranne chi usa la carta restano fermi per un giro** — chi la usa parte con un giro pieno di vantaggio, gli altri partono quando il primo inizia il secondo giro. È una regola di gioco dal vivo: il tracker si limita a registrare l'uso collegandolo alla gara.

Il Guscio Blu può essere usato **fino a 3 volte nello stesso torneo**. Una volta usato per la prima volta ("attivato") in un torneo, gli usi restanti restano vincolati a **quello stesso torneo** — non possono essere risparmiati per un torneo successivo.

### 7c. Limiti generali

- Le Card non possono essere usate nelle gare di spareggio/duello
- Le carte vinte in un gioco non possono essere usate in un altro gioco

---

## 8. Note di compatibilità

- Il campo `vittima_del_caos_id` è ancora presente nello schema della schedina classic per compatibilità, ma **non genera punteggio**.
- La tabella `schedine_torneo_deluxe` ospita le schedine del formato a gironi: il nome è mantenuto per compatibilità.

---

## 9. Penalità e Bonus

Disciplina i provvedimenti in punti applicabili ai partecipanti in caso di ritardi, assenze, abbandoni, comportamenti scorretti o contributi all'organizzazione. Applicati come rettifica punti manuale (vedi sezione "Rettifiche punti" della classifica torneo), con motivo sempre visibile.

- **Ritardo** senza motivazione valida: **-5 punti** sul torneo in questione.
- **Assenza ingiustificata**: esclusione dal torneo successivo. Al 3° provvedimento di questo tipo: **ban dalla Lega**.
- **Abbandono anticipato** ingiustificato: richiamo ufficiale. Al 3° richiamo: **ban dalla Lega**.
- **Comportamento offensivo o antisportivo**: **-20 punti**; nei casi gravi anche esclusione immediata dal torneo in corso + richiamo ufficiale, fino al ban nei casi più gravi.
- **Bonus Fair Play** (comportamento particolarmente corretto e sportivo): **+5 punti**, a discrezione dell'organizzazione.
- **Bonus aiuto organizzativo**: **+2 punti**, in base al contributo effettivo.
- **Motivazione valida**: circostanze personali/familiari/lavorative/di salute o impreviste che rendano ragionevolmente impossibile rispettare gli impegni presi — valutate dall'organizzazione.
- Penalità e richiami sono registrati nello storico disciplinare del partecipante; la recidività pesa sui provvedimenti successivi. Casi non previsti sono valutati caso per caso dall'organizzazione.
