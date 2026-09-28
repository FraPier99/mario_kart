import math

# Punti "campionato": a differenza di PUNTEGGI_CONFIG (punti.py), questi
# dipendono SOLO dalla posizione finale nel torneo, mai dal numero di
# partecipanti — un 1° posto vale sempre lo stesso indipendentemente da
# quanti giocatori c'erano. Formula continua (non una tabella con un tetto
# fisso): resta valida anche per posizioni mai viste finora, se in futuro
# un torneo avesse più giocatori.
CAMPIONATO_POINTS_BASE = 25  # punti al 1° posto
CAMPIONATO_POINTS_DECAY = 0.30  # velocità di decadimento della parte esponenziale
# Oltre questa posizione l'esponenziale si appiattirebbe abbastanza da far
# collidere due posizioni consecutive sullo stesso valore intero (es. 9°/10°
# entrambi a 4 punti con la vecchia curva) — da qui in poi si passa a una
# coda LINEARE a scalino -1, che garantisce ogni posizione strettamente
# inferiore alla precedente, fino ad azzerarsi (mai punti negativi).
CAMPIONATO_POINTS_EXP_CUTOFF = 8


def compute_campionato_points(position: int) -> int:
    """Punti campionato per una posizione finale.

    Esponenziale nelle prime CAMPIONATO_POINTS_EXP_CUTOFF posizioni (decresce
    rapidamente sul podio, premiandolo molto), poi coda lineare -1 per
    posizione: nessuna posizione condivide mai lo stesso punteggio della
    successiva, a differenza della curva puramente esponenziale precedente
    (che si appiattiva su un asintoto e produceva duplicati oltre l'8°/9°
    posto).
    """
    if position < 1:
        raise ValueError("position deve essere >= 1")
    if position <= CAMPIONATO_POINTS_EXP_CUTOFF:
        raw = 2 + (CAMPIONATO_POINTS_BASE - 2) * math.exp(
            -CAMPIONATO_POINTS_DECAY * (position - 1)
        )
        return round(raw)
    cutoff_value = compute_campionato_points(CAMPIONATO_POINTS_EXP_CUTOFF)
    tail = cutoff_value - (position - CAMPIONATO_POINTS_EXP_CUTOFF)
    return max(tail, 0)
