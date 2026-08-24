"""
Seed iniziale del catalogo console (tabella `consoles`, popolata una sola
volta al primo avvio da `seed_consoles()` in app/core/bootstrap.py). Dopo il
seed, il catalogo è gestito interamente da superadmin via CRUD
(`app/controllers/utenti/consoles.py`) — questo modulo non è più la fonte di
validazione a runtime (vedi app/services/utenti/ownership.py, che ora legge
dalla tabella `consoles`).
"""

# (chiave stabile usata a DB, etichetta per la UI, R4-compatibile)
SEED_CONSOLES = [
    ("ds", "DS", True),
    ("ds_lite", "DS Lite", True),
    ("dsi", "DSi", True),
    ("dsi_xl", "DSi XL", True),
    ("3ds", "3DS", True),
    ("3ds_xl", "3DS XL", True),
    ("2ds", "2DS", True),
    ("new_3ds", "New 3DS", True),
    ("new_3ds_xl", "New 3DS XL", True),
    ("new_2ds_xl", "New 2DS XL", True),
    ("switch", "Switch", False),
    ("switch_lite", "Switch Lite", False),
    ("switch_oled", "Switch OLED", False),
    ("switch_2", "Switch 2", False),
]

MKDS_GAME_ID = 1  # game_id=1 è sempre Mario Kart DS (vedi app/core/bootstrap.py)
