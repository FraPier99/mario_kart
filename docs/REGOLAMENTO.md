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

Dipende dal gioco:

- **Mario Kart DS** (`game_id=1`): ogni giocatore sceglie i propri circuiti tra quelli disponibili. I circuiti scelti si **esauriscono** (non più selezionabili da altri); i rimanenti vengono **sorteggiati random** tra quelli non ancora utilizzati; se tutti i circuiti vengono esauriti prima della fine, si **resetta** il pool.
- **Mario Kart 8 Deluxe** (`game_id=2`): la pista è **sempre sorteggiata automaticamente** a ogni gara, senza alcuna scelta manuale — stessa regola dei tornei a gironi (vedi 3a). L'unico modo per scegliere deliberatamente una pista è la **Carta Master**, effetto "Annulla pista" (vedi 7a): in questo contesto il suo significato pratico diventa "il possessore sceglie lui stesso la pista al posto del sorteggio", non "annulla la scelta di un avversario" (che in un contesto random non esiste).

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

Questi sono i **punti-gara**: sommati su tutte le gare del torneo determinano il vincitore/podio **di quel singolo torneo**. Sono un concetto diverso dai **Punti Campionato** (vedi sezione 11): quelli si ottengono in base alla posizione **finale** raggiunta a fine torneo e sono sempre gli stessi indipendentemente da quanti partecipanti c'erano — servono per la classifica generale che somma i risultati di più tornei nel tempo, non per decidere chi vince il singolo torneo.

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
- Il numero di gare per fase viene **deciso insieme** all'inizio del torneo — valori di riferimento: **8 gare per girone e per semifinale** (100cc), **12 gare in Finale** (150cc), **8 gare in Finalina** (campo "Finalina" nella Configurazione fasi, di default come Gironi/Semifinali). Sono numeri organizzativi, non un tetto imposto dal sistema: si può crearne di più o di meno
- Le piste sono **sempre sorteggiate automaticamente** a ogni gara, in ogni fase (Gironi, Semifinali, Finale, Finalina) e per qualunque gioco — nessuna scelta manuale. L'unico modo per scegliere deliberatamente una pista è la Carta Master, effetto "Annulla pista" (vedi 2b e 7a)
- I circuiti sono **indipendenti per ogni girone**: lo stesso circuito può essere usato in gironi diversi
- A ogni nuova fase i circuiti vengono **resettati** (ri-disponibili per tutti i gironi/batterie della fase successiva, anche se già usati in una fase precedente)
- Punteggio per ogni gara: stessa tabella dinamica della Classifica Unica (2c), in base al numero di piloti **effettivamente in gara** in quel girone/batteria specifica — girone da 4: `[5, 3, 2, 1]`; girone da 3: `[4, 2, 1]`

### 3b. Qualificazione

I **primi 2 classificati** di ciascun girone avanzano alla fase successiva.

In caso di parità nel girone, l'ordine è determinato da:
1. **Vittorie di gara** (numero di primi posti)
2. **Podi** (piazzamenti entro il 3° posto)
3. **Spareggio** — al meglio (primo a 2 vittorie) su piste scelte a caso tra quelle non utilizzate nel girone

### 3c. Fase 2 — Semifinali e Finale

- Se i qualificati (top 2 per girone) sono **≤ 4**: si passa direttamente alla Finale (gruppo "top", Final 4) + Consolazione/"Finalina" (gruppo "bottom")
- Se i qualificati sono **> 4**: vengono generate **Semifinali** (batterie S1, S2, ..., massimo 4 per batteria) prima della Finale. Per scegliere i 4 finalisti tra più batterie: prima i vincitori di ogni batteria, poi i migliori "secondi" per punti, fino a riempire i 4 posti
- **La dimensione del girone non cambia la regola di qualificazione**: "i primi 2 di ogni girone" vale identico sia per un girone da 4 sia per uno da 3 — cambia solo quanti punti valgono le gare in quel girone (3a), non chi si qualifica. Esempio con gironi misti: **10 giocatori → 1 girone da 4 + 2 gironi da 3** (`[4, 3, 3]`) → 2 qualificati da ciascuno = **6 qualificati** in totale, esattamente come nell'esempio a 9 giocatori sotto → essendo &gt; 4, si passa comunque dalle Semifinali
- **Chi viene eliminato in semifinale** (qualificato dal girone ma escluso dal Final 4) **si unisce ai 3°/4° classificati dei gironi nella Finalina**, invece di restare senza piazzamento — ma **su una gara separata e di livello superiore**, non mescolato con loro (vedi punto sotto).
- **Esempio con 9 giocatori — chi vince il titolo di Finalina? Vince il 5° posto, mai il 7°**, anche se il 7° ha vinto la propria gara. In dettaglio:
  - Gironi (3 gironi da 3): il 3° di ciascun girone (1 a girone) non si qualifica alla semifinale → **3 "perdenti dei gironi"**.
  - Semifinale (2 batterie da 3): il 3° di ciascuna batteria (1 a batteria) non si qualifica alla Finale → **2 "perdenti di semifinale"**.
  - Questi due gruppi giocano **due gare separate**, mai un'unica gara da 3+2=5 (il vincolo di massimo 4 a gara vale sempre qui come ovunque): **Gara A** = i 2 perdenti di semifinale, per il 5°-6° posto; **Gara B** = i 3 perdenti dei gironi, per il 7°-8°-9° posto.
  - Il livello conta più del punteggio: chi arriva dalla semifinale ha comunque fatto meglio di chi è uscito subito ai gironi, quindi gioca sempre per le posizioni più alte (Gara A prima di Gara B) — i due gruppi non si mescolano mai nella stessa gara, indipendentemente dai punti fatti. Per questo **il titolo di Finalina va sempre al vincitore della Gara A**, non a quello della Gara B.
  - "Finalina da 5" indica quindi il **totale di teste** coinvolte nella fase (3+2), mai il numero di giocatori in campo insieme in una gara.
- **Se un singolo gruppo di perdenti supera i 4 giocatori** (es. con 11-12 partecipanti): si divide a sua volta in più batterie (`B1`, `B2`, ... invece di una singola gara), sempre rispettando il vincolo di 4 a gara, senza mai mescolarsi con l'altro gruppo di perdenti.
- **Numero di gare della Finalina**: come per Gironi/Semifinali/Finale, è un valore di riferimento configurabile per il torneo (campo "Finalina" nella Configurazione fasi, default 8 se lasciato vuoto) — puramente informativo, decidibile di comune accordo tra i giocatori coinvolti e l'admin prima che la fase inizi, non un tetto imposto dal sistema
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

### 7a. Carta Master — 1 uso, quattro effetti a scelta

Chi la possiede sceglie **uno** dei quattro effetti al momento dell'uso:

1. **Annulla pista** — invalida la pista scelta da un **avversario** per la sua prossima gara e la sostituisce con quella scelta dal possessore della carta. Nei contesti dove la pista è sempre a sorteggio (Mario Kart 8 Deluxe classifica unica, e qualunque torneo a gironi — vedi 2b/3a), il significato pratico diventa: **il possessore sceglie lui stesso la pista al posto del sorteggio automatico**, l'unico modo per farlo in quei contesti
2. **Impone personaggio e/o setup** — obbliga un **avversario** a usare, per una gara, il personaggio **e/o il setup** (kart, ruote, aliante) scelto dal possessore della carta. Il sistema storicizza solo che l'effetto è stato usato (e il personaggio imposto, se registrato) — la scelta effettiva del setup si concorda e applica dal vivo, non è tracciata come dato separato
3. **Immunità dal Guscio Blu** — rende chi la usa immune agli effetti di un Guscio Blu avversario per una gara (nessun bersaglio: protegge sé stessi). Come tutti gli effetti carta, è una regola applicata dal vivo: il sistema ne registra solo l'uso
4. **Gara extra** — aggiunge una gara a fine torneo (nessun bersaglio)

Gli effetti 1 e 2 possono essere dichiarati **prima ancora che la gara che devono influenzare esista**: l'admin registra l'effetto (bersaglio + pista/personaggio imposto) e resta "in sospeso" finché non viene creata la prossima gara che coinvolge quel bersaglio, momento in cui viene applicato e la carta risulta consumata.

### 7b. Guscio Blu — usi variabili per formato, un solo effetto

Effetto: **tutti i giocatori tranne chi usa la carta restano fermi per un giro** — chi la usa parte con un giro pieno di vantaggio, gli altri partono quando il primo inizia il secondo giro. È una regola di gioco dal vivo: il tracker si limita a registrare l'uso collegandolo alla gara.

Il Guscio Blu può essere usato:
- **fino a 3 volte** nello stesso torneo a **Classifica Unica**;
- **1 sola volta** nei tornei **a Gironi** — il campo ridotto per girone/batteria rende l'effetto proporzionalmente più impattante, da qui il limite più stretto.

Una volta usato per la prima volta ("attivato") in un torneo, gli usi restanti restano vincolati a **quello stesso torneo** — non possono essere risparmiati per un torneo successivo. **Non è utilizzabile nelle gare di Semifinale** (oltre agli spareggi, già vietati per ogni carta — vedi 7c): la Carta Master resta invece utilizzabile in Semifinale.

### 7c. Limiti generali

- Le Card non possono essere usate nelle gare di spareggio/duello
- Il Guscio Blu, in aggiunta, non può essere usato nelle gare di Semifinale (vedi 7b) — la Master non ha questa restrizione ulteriore
- Le carte vinte in un gioco non possono essere usate in un altro gioco

---

## 8. Tornei Amichevoli

Un torneo può essere marcato come **amichevole** (`Tournament.is_friendly`, deciso alla creazione, non modificabile in seguito) — in stile "fight club": si gioca per divertimento, senza niente in palio.

- Nessuna **Carta Potere**, nessuna **Schedina**
- Non contribuisce a **statistiche aggregate**, **Badge Giocatore** o classifiche di circuito/testa a testa, e non compare nello **storico tornei personale** del profilo giocatore
- Nessuna notifica di chiusura torneo a tutti i partecipanti
- Nessun "Decreta Vincitore": il torneo si chiude semplicemente portando lo stato su **Concluso**, senza un vincitore ufficiale
- Funziona in entrambi i formati (Classifica Unica, A Gironi) e con lo stesso minimo di partecipanti già previsto per ciascun formato — restano gare e classifica live come in un torneo normale

Per ora creabile solo dagli amministratori.

---

## 9. Note di compatibilità

- Il campo `vittima_del_caos_id` è ancora presente nello schema della schedina classic per compatibilità, ma **non genera punteggio**.
- La tabella `schedine_torneo_deluxe` ospita le schedine del formato a gironi: il nome è mantenuto per compatibilità.

---

## 10. Penalità e Bonus

Disciplina i provvedimenti in punti applicabili ai partecipanti in caso di ritardi, assenze, abbandoni, comportamenti scorretti o contributi all'organizzazione. Applicati come rettifica punti manuale (vedi sezione "Rettifiche punti" della classifica torneo), con motivo sempre visibile.

- **Ritardo** senza motivazione valida: **-5 punti** sul torneo in questione.
- **Assenza ingiustificata**: esclusione dal torneo successivo. Al 3° provvedimento di questo tipo: **ban dalla Lega**.
- **Abbandono anticipato** ingiustificato: richiamo ufficiale. Al 3° richiamo: **ban dalla Lega**.
- **Comportamento offensivo o antisportivo**: **-20 punti**; nei casi gravi anche esclusione immediata dal torneo in corso + richiamo ufficiale, fino al ban nei casi più gravi.
- **Bonus Fair Play** (comportamento particolarmente corretto e sportivo): **+5 punti**, a discrezione dell'organizzazione.
- **Bonus aiuto organizzativo**: **+2 punti**, in base al contributo effettivo.
- **Motivazione valida**: circostanze personali/familiari/lavorative/di salute o impreviste che rendano ragionevolmente impossibile rispettare gli impegni presi — valutate dall'organizzazione.
- Penalità e richiami sono registrati nello storico disciplinare del partecipante; la recidività pesa sui provvedimenti successivi. Casi non previsti sono valutati caso per caso dall'organizzazione.

---

## 11. Punti Campionato

Due sistemi di punteggio diversi coesistono, per due scopi diversi:

- **Punti-gara** (sezione 2c/3a): variabili in base al numero di partecipanti alla gara, sommati determinano il vincitore/podio **ufficiale di quel singolo torneo** — sono la fonte di verità per spareggi, badge, premi schedina e carte.
- **Punti Campionato**: **fissi per posizione finale**, sempre gli stessi indipendentemente da quanti partecipanti c'erano nel torneo — pensati per confrontare tornei di dimensioni diverse e sommarli nel tempo in un'unica classifica generale.

### Come si calcolano

Alla conclusione di un torneo non amichevole, ogni giocatore riceve punti campionato in base **solo** alla propria posizione finale (1°, 2°, 3°, ...) in quel torneo:

| Posizione | Punti | Posizione | Punti |
|---|---|---|---|
| 1° | 25 | 8° | 5 |
| 2° | 19 | 9° | 4 |
| 3° | 15 | 10° | 3 |
| 4° | 11 | 11° | 2 |
| 5° | 9 | 12° | 1 |
| 6° | 7 | 13°+ | 0 |
| 7° | 6 | | |

Un 1° posto vale sempre 25 punti campionato, sia in un torneo da 4 giocatori sia in uno da 12 — a differenza dei punti-gara, che scalano con la grandezza del campo. Un giocatore ritirato non riceve punti campionato per quel torneo; le posizioni dei restanti si comprimono senza lasciare "buchi" in classifica.

### Dove si vedono

I Punti Campionato sono il **criterio principale** della classifica generale (pagina Classifiche), seguiti da tornei vinti, Placement Index (media dei piazzamenti normalizzata), percentuale podi e gare giocate come ulteriori spareggi a parità.
