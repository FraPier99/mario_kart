GARE_CONFIG = {
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
}

PUNTEGGI_CONFIG = {
    4: [5, 3, 2, 1],
    5: [6, 4, 3, 2, 1],
    6: [7, 5, 4, 3, 2, 1],
    7: [8, 6, 5, 4, 3, 2, 1],
    8: [9, 7, 6, 5, 4, 3, 2, 1],
}


def setUpTournament(n_giocatori: int):
    if n_giocatori not in GARE_CONFIG:
        raise ValueError(f"Numero di giocatori non supportato. Supportati: {list(GARE_CONFIG.keys())}")

    return {
        'gare': GARE_CONFIG[n_giocatori],
        'punteggi': PUNTEGGI_CONFIG[n_giocatori],
    }