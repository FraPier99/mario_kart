import math

# Punti "campionato": a differenza di PUNTEGGI_CONFIG (punti.py), questi
# dipendono SOLO dalla posizione finale nel torneo, mai dal numero di
# partecipanti — un 1° posto vale sempre lo stesso indipendentemente da
# quanti giocatori c'erano. Formula continua (non una tabella con un tetto
# fisso): resta valida anche per posizioni mai viste finora, se in futuro
# un torneo avesse più giocatori.
CAMPIONATO_POINTS_BASE = 25  # punti al 1° posto
CAMPIONATO_POINTS_DECAY = 0.30  # velocità di decadimento
CAMPIONATO_POINTS_FLOOR = 2  # asintoto minimo, mai sotto questa soglia


def compute_campionato_points(position: int) -> int:
    """Punti campionato per una posizione finale.

    Curva esponenziale che decresce rapidamente sul podio e si appiattisce
    verso il basso senza mai azzerarsi. Le 3 costanti sopra sono l'unico
    punto da ritoccare per cambiare la curva.
    """
    if position < 1:
        raise ValueError("position deve essere >= 1")
    raw = CAMPIONATO_POINTS_FLOOR + (
        CAMPIONATO_POINTS_BASE - CAMPIONATO_POINTS_FLOOR
    ) * math.exp(-CAMPIONATO_POINTS_DECAY * (position - 1))
    return round(raw)
