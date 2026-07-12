"""CDN URL mapping for MKDS circuit textures from The Textures Resource."""

CDN_BASE = "https://textures.spriters-resource.com/media/asset_icons"

# circuit_name -> (folder, asset_id) from The Textures Resource asset pages
# Chiavi in inglese: sono solo l'identificativo usato per il lookup delle
# texture (invariato), non il nome mostrato in UI (vedi "name" sotto).
CIRCUIT_TEXTURES = {
    "Figure-8 Circuit": (365, 368004),
    "Yoshi Falls": (365, 368006),
    "Cheep Cheep Beach": (365, 368002),
    "Luigi's Mansion": (372, 375415),
    "Desert Hills": (365, 368003),
    "Delfino Square": (381, 384296),
    "Waluigi Pinball": (381, 384275),
    "Shroom Ridge": (381, 384298),
    "DK Pass": (372, 375417),
    "Tick-Tock Clock": (365, 368005),
    "Mario Circuit": (372, 375416),
    "Airship Fortress": (365, 368001),
    "Wario Stadium": (367, 370062),
    "Peach Gardens": (367, 370289),
    "Bowser Castle": (374, 377052),
    "Rainbow Road": (381, 384273),
    "Mario Circuit 1": (381, 384270),
    "Moo Moo Farm": (381, 384271),
    "Peach Circuit": (381, 384297),
    "Luigi Circuit (GCN)": (382, 384937),
    "Donut Plains 1": (367, 370060),
    "Frappe Snowland": (381, 384266),
    "Bowser Castle 2": (381, 384268),
    "Baby Park": (372, 375406),
    "Koopa Beach 2": (382, 384789),
    "Choco Mountain": (372, 375405),
    "Luigi Circuit (GBA)": (381, 384269),
    "Mushroom Bridge": (381, 384264),
    "Choco Island 2": (373, 376556),
    "Banshee Boardwalk": (381, 384265),
    "Sky Garden": (367, 370061),
    "Yoshi Circuit": (372, 375413),
}


def _cdn_url(circuit_name):
    info = CIRCUIT_TEXTURES.get(circuit_name)
    if info:
        folder, asset_id = info
        return f"{CDN_BASE}/{folder}/{asset_id}.png"
    return None


all_circuits = [
    # TROFEO FUNGO (Nitro)
    {
        "name": "Ottotornante",
        "description": "Trofeo Fungo",
        "game_id": 1,
        "image_url": _cdn_url("Figure-8 Circuit"),
    },
    {
        "name": "Cascate di Yoshi",
        "description": "Trofeo Fungo",
        "game_id": 1,
        "image_url": _cdn_url("Yoshi Falls"),
    },
    {
        "name": "Spiaggia Smack",
        "description": "Trofeo Fungo",
        "game_id": 1,
        "image_url": _cdn_url("Cheep Cheep Beach"),
    },
    {
        "name": "Palazzo di Luigi",
        "description": "Trofeo Fungo",
        "game_id": 1,
        "image_url": _cdn_url("Luigi's Mansion"),
    },
    # TROFEO FIORE (Nitro)
    {
        "name": "Colli Desertici",
        "description": "Trofeo Fiore",
        "game_id": 1,
        "image_url": _cdn_url("Desert Hills"),
    },
    {
        "name": "Borgo Delfino",
        "description": "Trofeo Fiore",
        "game_id": 1,
        "image_url": _cdn_url("Delfino Square"),
    },
    {
        "name": "Flipper di Waluigi",
        "description": "Trofeo Fiore",
        "game_id": 1,
        "image_url": _cdn_url("Waluigi Pinball"),
    },
    {
        "name": "Colli Fungo",
        "description": "Trofeo Fiore",
        "game_id": 1,
        "image_url": _cdn_url("Shroom Ridge"),
    },
    # TROFEO STELLA (Nitro)
    {
        "name": "Vette di DK",
        "description": "Trofeo Stella",
        "game_id": 1,
        "image_url": _cdn_url("DK Pass"),
    },
    {
        "name": "Orologio Tic-toc",
        "description": "Trofeo Stella",
        "game_id": 1,
        "image_url": _cdn_url("Tick-Tock Clock"),
    },
    {
        "name": "Circuito di Mario",
        "description": "Trofeo Stella",
        "game_id": 1,
        "image_url": _cdn_url("Mario Circuit"),
    },
    {
        "name": "Fortezza Volante",
        "description": "Trofeo Stella",
        "game_id": 1,
        "image_url": _cdn_url("Airship Fortress"),
    },
    # TROFEO SPECIALE (Nitro)
    {
        "name": "Stadio di Wario",
        "description": "Trofeo Speciale",
        "game_id": 1,
        "image_url": _cdn_url("Wario Stadium"),
    },
    {
        "name": "Giardino di Peach",
        "description": "Trofeo Speciale",
        "game_id": 1,
        "image_url": _cdn_url("Peach Gardens"),
    },
    {
        "name": "Castello di Bowser",
        "description": "Trofeo Speciale",
        "game_id": 1,
        "image_url": _cdn_url("Bowser Castle"),
    },
    {
        "name": "Pista Arcobaleno",
        "description": "Trofeo Speciale",
        "game_id": 1,
        "image_url": _cdn_url("Rainbow Road"),
    },
    # TROFEO GUSCIO (Retro)
    {
        "name": "SNES Circuito di Mario 1",
        "description": "Trofeo Guscio",
        "game_id": 1,
        "image_url": _cdn_url("Mario Circuit 1"),
    },
    {
        "name": "N64 Fattoria Muu Muu",
        "description": "Trofeo Guscio",
        "game_id": 1,
        "image_url": _cdn_url("Moo Moo Farm"),
    },
    {
        "name": "GBA Circuito di Peach",
        "description": "Trofeo Guscio",
        "game_id": 1,
        "image_url": _cdn_url("Peach Circuit"),
    },
    {
        "name": "GCN Circuito di Luigi",
        "description": "Trofeo Guscio",
        "game_id": 1,
        "image_url": _cdn_url("Luigi Circuit (GCN)"),
    },
    # TROFEO BANANA (Retro)
    {
        "name": "SNES Pianura Ciambella 1",
        "description": "Trofeo Banana",
        "game_id": 1,
        "image_url": _cdn_url("Donut Plains 1"),
    },
    {
        "name": "N64 Innevata Frappè",
        "description": "Trofeo Banana",
        "game_id": 1,
        "image_url": _cdn_url("Frappe Snowland"),
    },
    {
        "name": "GBA Castello di Bowser 2",
        "description": "Trofeo Banana",
        "game_id": 1,
        "image_url": _cdn_url("Bowser Castle 2"),
    },
    {
        "name": "GCN Parco Baby",
        "description": "Trofeo Banana",
        "game_id": 1,
        "image_url": _cdn_url("Baby Park"),
    },
    # TROFEO FOGLIA (Retro)
    {
        "name": "SNES Spiaggia di Koopa 2",
        "description": "Trofeo Foglia",
        "game_id": 1,
        "image_url": _cdn_url("Koopa Beach 2"),
    },
    {
        "name": "N64 Monte Cioccolato",
        "description": "Trofeo Foglia",
        "game_id": 1,
        "image_url": _cdn_url("Choco Mountain"),
    },
    {
        "name": "GBA Circuito di Luigi",
        "description": "Trofeo Foglia",
        "game_id": 1,
        "image_url": _cdn_url("Luigi Circuit (GBA)"),
    },
    {
        "name": "GCN Ponte Fungo",
        "description": "Trofeo Foglia",
        "game_id": 1,
        "image_url": _cdn_url("Mushroom Bridge"),
    },
    # TROFEO FULMINE (Retro)
    {
        "name": "SNES Cioccoisola 2",
        "description": "Trofeo Fulmine",
        "game_id": 1,
        "image_url": _cdn_url("Choco Island 2"),
    },
    {
        "name": "N64 Pontile Spettrale",
        "description": "Trofeo Fulmine",
        "game_id": 1,
        "image_url": _cdn_url("Banshee Boardwalk"),
    },
    {
        "name": "GBA Giardino Volante",
        "description": "Trofeo Fulmine",
        "game_id": 1,
        "image_url": _cdn_url("Sky Garden"),
    },
    {
        "name": "GCN Circuito di Yoshi",
        "description": "Trofeo Fulmine",
        "game_id": 1,
        "image_url": _cdn_url("Yoshi Circuit"),
    },
]
