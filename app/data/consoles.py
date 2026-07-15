"""
Elenco fisso e ordinato delle console handheld Nintendo supportate per la
dichiarazione di possesso utente. Nessun enum a DB (coerente con il resto
della codebase, es. Tournament.status, Race.phase): i valori sono stringhe
validate a livello di servizio.
"""

# (chiave stabile usata a DB, etichetta per la UI)
CONSOLE_CHOICES = [
    ("ds", "DS"),
    ("ds_lite", "DS Lite"),
    ("dsi", "DSi"),
    ("dsi_xl", "DSi XL"),
    ("3ds", "3DS"),
    ("3ds_xl", "3DS XL"),
    ("2ds", "2DS"),
    ("new_3ds", "New 3DS"),
    ("new_3ds_xl", "New 3DS XL"),
    ("new_2ds_xl", "New 2DS XL"),
    ("switch", "Switch"),
    ("switch_lite", "Switch Lite"),
    ("switch_oled", "Switch OLED"),
    ("switch_2", "Switch 2"),
]
CONSOLE_KEYS = {key for key, _ in CONSOLE_CHOICES}

# Sottoinsieme famiglia DS, usato per i dispositivi "R4 compatibile" (solo se
# si possiede Mario Kart DS, game_id=1).
_R4_KEYS = {
    "ds", "ds_lite", "dsi", "dsi_xl", "3ds", "3ds_xl",
    "2ds", "new_3ds", "new_3ds_xl", "new_2ds_xl",
}
R4_DEVICE_CHOICES = [(key, label) for key, label in CONSOLE_CHOICES if key in _R4_KEYS]
R4_DEVICE_KEYS = {key for key, _ in R4_DEVICE_CHOICES}

MKDS_GAME_ID = 1  # game_id=1 è sempre Mario Kart DS (vedi app/core/bootstrap.py)
