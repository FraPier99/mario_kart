# Sistema di Classifica

Il sistema di classifica usa **Placement Index** come metrica principale al posto dei punti assoluti. Questo garantisce confronti equi tra tornei con diverso numero di gare, diversa dimensione delle griglie e diversi formati (classic, group stage, duello).

---

## Classifica Globale (Homepage / Stats)

Ordinamento della leaderboard generale:

1. **Tornei vinti** — criterio principale
2. **Placement Index %** — media dei piazzamenti normalizzati
3. **Podium Rate %** — percentuale di podi
4. **Gare giocate** — più esperienza = vantaggio
5. **Nickname** — ordine alfabetico

### Placement Index

Ogni gara viene convertita in un punteggio normalizzato 0–100%:

```
placementIndex = (n_giocatori_gara - posizione) / (n_giocatori_gara - 1) × 100
```

| Posizione | Griglia 4 | Griglia 8 | Griglia 12 |
|-----------|-----------|-----------|------------|
| 1° | 100% | 100% | 100% |
| 2° | 66% | 86% | 91% |
| 3° | 33% | 71% | 82% |
| 4° | 0% | 57% | 73% |
| 5° | — | 43% | 64% |
| Ultimo | 0% | 0% | 0% |

Il Placement Index del torneo è la media dei placementIndex di tutte le gare a cui il giocatore ha partecipato (escluse gare di spareggio/duello).

**Vantaggio**: confronta equamente un 2° posto in un girone da 8 (86%) con un 2° posto in una finale da 4 (66%).

---

## Classifica Per-Torneo

Ordinamento della classifica interna di un torneo:

1. **Vincitore** (se il torneo è concluso)
2. **Placement Index %** — media piazzamenti normalizzati
3. **Win Rate %** — percentuale gare vinte
4. **Podium Rate %** — percentuale podi
5. **Posizione media** — più bassa = meglio
6. **Spareggio (duello)** — miglior posizione in gare di spareggio
7. **Nickname** — ordine alfabetico

### Formati Supportati

| Formato | Come funziona |
|---------|---------------|
| **Classic** | Classifica unica. Tutti i giocatori corrono lo stesso numero di gare con la stessa griglia. |
| **Group Stage** | Classifiche separate per fase (Gironi → Semifinali → Finali). Ogni fase ha la propria griglia e il placementIndex normalizza automaticamente le differenze. |
| **Duello / Spareggio** | Le gare di spareggio (is_duello) sono escluse dal calcolo delle statistiche. Servono solo come tiebreaker finale. |

### Classifiche nei Tornei a Gironi

- **Fase 1 (Gironi)**: ogni girone ha la propria classifica calcolata con placementIndex
- **Fase 2 (Semifinali)**: classifica per ogni batteria di semifinale
- **Fase 3 (Finali)**: classifica separata per Finale (top) e Consolazione (bottom)
- **Classifica Finale**: disponibile solo a torneo concluso, mostra l'ordine definitivo

---

## Altre Metriche

| Metrica | Formula | Note |
|---------|---------|------|
| **Win Rate %** | `gareVinte / gareGiocate × 100` | Percentuale di gare vinte |
| **Podium Rate %** | `podi / gareGiocate × 100` | Percentuale di arrivi a podio (1°–3°) |
| **Posizione Media** | `sommaPosizioni / gareGiocate` | Media aritmetica delle posizioni |
| **Efficienza Media %** | `media(puntiGiocatore / puntiVincitore × 100)` per ogni torneo | Quanto sei stato vicino al campione |
| **Punti** | Somma punti assoluti | Solo informativo, non ordina la classifica |

---

## Perché non i punti assoluti?

I punti assoluti non sono confrontabili tra tornei diversi perché:

1. **Griglie variabili**: un 1° posto in una gara da 8 vale 9 punti, in una da 4 vale 5 punti
2. **Gare variabili**: un torneo da 20 gare produce molti più punti di uno da 10
3. **Formati misti**: nei tornei a gironi, le fasi finali hanno griglie più piccole → punti diversi

Il Placement Index risolve tutti questi problemi normalizzando ogni piazzamento su una scala 0–100% indipendentemente dal contesto.
