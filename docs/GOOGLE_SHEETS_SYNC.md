# Sincronizzazione Possessi → Google Sheets

> **Documento di riferimento — integrazione non ancora implementata.**
> Nessun codice, dipendenza o variabile d'ambiente descritti qui esiste
> ancora nel repository: questo file serve a partire già pronti quando si
> deciderà di implementarla in una sessione dedicata.

## Obiettivo

Tenere un Google Sheet sincronizzato con i dati della sezione Possessi
(`GET /ownership/all`, la stessa fonte usata da
`frontend/src/components/admin/PossessiTab.jsx`): una riga per utente con i
dati grezzi (giochi posseduti, console, dispositivi R4). Il foglio si
aggiorna automaticamente ogni volta che un utente compila o modifica i
propri possessi (`PUT /ownership/me`, servito da `replace_my_ownership` in
`app/services/utenti/ownership.py`).

Il backend scrive solo **dati grezzi** — report, grafici e tabelle pivot si
costruiscono direttamente dentro Google Sheets con formule/pivot table
sopra questi dati, non li calcola il backend.

## Approccio scelto: Service Account + Google Sheets API

Libreria Python `gspread` + `google-auth`, chiamata diretta dal backend
FastAPI esistente — più robusto e integrato di un Apps Script Web App
esterno (nessun URL "segreto" da proteggere, autenticazione OAuth standard
lato Google).

## Passi di configurazione (fuori da questo repository)

1. Creare (o selezionare) un progetto su [Google Cloud
   Console](https://console.cloud.google.com/).
2. Abilitare **Google Sheets API** per quel progetto (menu "API e
   servizi" → "Libreria").
3. Creare una **Service Account** dedicata (es.
   `lega-kart-sheets-sync@<project-id>.iam.gserviceaccount.com`), ruolo
   base (non serve alcun ruolo IAM particolare a livello di progetto — i
   permessi sul foglio si danno separatamente al punto 5).
4. Generare una **chiave JSON** per la Service Account e scaricarla.
   File sensibile: **non va mai committato** nel repository né condiviso
   in chiaro.
5. Creare il Google Sheet di destinazione e **condividerlo in modifica**
   con l'indirizzo email della Service Account (esattamente come si
   condivide con una persona, incollando la sua email nel dialogo
   "Condividi").
6. Copiare l'**ID del foglio** dall'URL (`https://docs.google.com/spreadsheets/d/<ID>/edit`)
   per la configurazione.

## Dove andranno le credenziali (quando si implementerà)

Nuove variabili in `.env`, lette da `app/core/config.py` (che oggi gestisce
solo `SECRET_KEY`, `DATABASE_URL`, ecc. — vedi quel file per il pattern da
seguire):

- `GOOGLE_SHEETS_CREDENTIALS_PATH` — percorso al file JSON della Service
  Account (oppure il contenuto JSON stesso in una variabile, se il deploy
  non permette di montare file extra).
- `GOOGLE_SHEETS_SPREADSHEET_ID` — ID del foglio copiato al punto 6.

Mai in chiaro nel codice o nel repository (stesso trattamento già riservato
a `SECRET_KEY`).

## Dove andrebbe il codice (quando si implementerà)

- Nuova funzione, ad es. `sync_ownership_to_sheet(db)`, in
  `app/services/utenti/ownership.py` — riusa la stessa query/shape già
  usata da `get_all_ownership` (quella dietro `GET /ownership/all`):
  `user_id`, `username`, `player_nickname`, `games[]` (per ogni gioco:
  `game_id`, `game_name`, `quantity`), `consoles[]`, `r4_devices[]`,
  `has_declared`.
- Richiamata da `replace_my_ownership` **dopo** il commit della modifica
  dell'utente, così il foglio riflette sempre l'ultimo stato salvato.
- **Gestione errori "best-effort"**: se Google Sheets non risponde o dà
  errore, il salvataggio dei possessi dell'utente **non deve fallire** —
  va solo loggato/segnalato (stesso principio già usato altrove nel
  progetto per notifiche non bloccanti). Da progettare nel dettaglio in
  sede di implementazione (retry? coda? semplice log?).
- Nuova dipendenza da aggiungere a `app/requirements.txt`: `gspread`,
  `google-auth`.

## Schema del foglio previsto

Un foglio "Dati" con una riga per utente, colonne: Utente, Stato
(dichiarato/non compilato), una colonna per ogni gioco (quantità), Console
(elenco), R4 compatibile (elenco) — stessa forma già visibile nella tabella
di `PossessiTab.jsx`. Eventuali fogli "Report"/pivot vanno costruiti sopra
questo foglio "Dati" direttamente in Google Sheets, non dal backend.
