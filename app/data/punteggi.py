PUNTEGGI_STATIC = {
    4: [5, 3, 2, 1],
    5: [6, 4, 3, 2, 1],
    6: [7, 5, 4, 3, 2, 1],
    7: [8, 6, 5, 4, 3, 2, 1],
    8: [9, 7, 6, 5, 4, 3, 2, 1],
}


def _compute_punteggi(n: int) -> list[int]:
    if n in PUNTEGGI_STATIC:
        return PUNTEGGI_STATIC[n]
    if n < 4:
        return list(range(n + 1, 0, -1))[:n]
    first = n + 1
    rest = list(range(n - 1, 0, -1))
    return [first] + rest


def _compute_gare(n: int) -> int:
    # Regola (docs/REGOLAMENTO.md §2a): max 20 gare totali, ogni
    # partecipante sceglie ceil(20 / n) circuiti — es. 7 giocatori → 21 gare.
    import math

    race_per_player = math.ceil(20 / n)
    return race_per_player * n


PUNTEGGI_CONFIG = {n: _compute_punteggi(n) for n in range(2, 13)}


def setUpTournament(n_giocatori: int):
    if n_giocatori < 2:
        raise ValueError(
            f"Numero di giocatori non supportato ({n_giocatori}). Minimo 2."
        )

    return {
        "gare": _compute_gare(n_giocatori),
        "punteggi": _compute_punteggi(n_giocatori),
    }
