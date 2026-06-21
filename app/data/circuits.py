"""CDN URL mapping for MKDS circuit textures from The Textures Resource."""

CDN_BASE = "https://textures.spriters-resource.com/media/asset_icons"

# circuit_name -> (folder, asset_id) from The Textures Resource asset pages
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
    # MUSHROOM CUP (Nitro)
    {
        "name": "Figure-8 Circuit",
        "description": "Mushroom Cup",
        "game_id": 1,
        "image_url": _cdn_url("Figure-8 Circuit"),
    },
    {
        "name": "Yoshi Falls",
        "description": "Mushroom Cup",
        "game_id": 1,
        "image_url": _cdn_url("Yoshi Falls"),
    },
    {
        "name": "Cheep Cheep Beach",
        "description": "Mushroom Cup",
        "game_id": 1,
        "image_url": _cdn_url("Cheep Cheep Beach"),
    },
    {
        "name": "Luigi's Mansion",
        "description": "Mushroom Cup",
        "game_id": 1,
        "image_url": _cdn_url("Luigi's Mansion"),
    },
    # FLOWER CUP (Nitro)
    {
        "name": "Desert Hills",
        "description": "Flower Cup",
        "game_id": 1,
        "image_url": _cdn_url("Desert Hills"),
    },
    {
        "name": "Delfino Square",
        "description": "Flower Cup",
        "game_id": 1,
        "image_url": _cdn_url("Delfino Square"),
    },
    {
        "name": "Waluigi Pinball",
        "description": "Flower Cup",
        "game_id": 1,
        "image_url": _cdn_url("Waluigi Pinball"),
    },
    {
        "name": "Shroom Ridge",
        "description": "Flower Cup",
        "game_id": 1,
        "image_url": _cdn_url("Shroom Ridge"),
    },
    # STAR CUP (Nitro)
    {
        "name": "DK Pass",
        "description": "Star Cup",
        "game_id": 1,
        "image_url": _cdn_url("DK Pass"),
    },
    {
        "name": "Tick-Tock Clock",
        "description": "Star Cup",
        "game_id": 1,
        "image_url": _cdn_url("Tick-Tock Clock"),
    },
    {
        "name": "Mario Circuit",
        "description": "Star Cup",
        "game_id": 1,
        "image_url": _cdn_url("Mario Circuit"),
    },
    {
        "name": "Airship Fortress",
        "description": "Star Cup",
        "game_id": 1,
        "image_url": _cdn_url("Airship Fortress"),
    },
    # SPECIAL CUP (Nitro)
    {
        "name": "Wario Stadium",
        "description": "Special Cup",
        "game_id": 1,
        "image_url": _cdn_url("Wario Stadium"),
    },
    {
        "name": "Peach Gardens",
        "description": "Special Cup",
        "game_id": 1,
        "image_url": _cdn_url("Peach Gardens"),
    },
    {
        "name": "Bowser Castle",
        "description": "Special Cup",
        "game_id": 1,
        "image_url": _cdn_url("Bowser Castle"),
    },
    {
        "name": "Rainbow Road",
        "description": "Special Cup",
        "game_id": 1,
        "image_url": _cdn_url("Rainbow Road"),
    },
    # SHELL CUP (Retro)
    {
        "name": "Mario Circuit 1",
        "description": "Shell Cup (SNES)",
        "game_id": 1,
        "image_url": _cdn_url("Mario Circuit 1"),
    },
    {
        "name": "Moo Moo Farm",
        "description": "Shell Cup (N64)",
        "game_id": 1,
        "image_url": _cdn_url("Moo Moo Farm"),
    },
    {
        "name": "Peach Circuit",
        "description": "Shell Cup (GBA)",
        "game_id": 1,
        "image_url": _cdn_url("Peach Circuit"),
    },
    {
        "name": "Luigi Circuit (GCN)",
        "description": "Shell Cup",
        "game_id": 1,
        "image_url": _cdn_url("Luigi Circuit (GCN)"),
    },
    # BANANA CUP (Retro)
    {
        "name": "Donut Plains 1",
        "description": "Banana Cup (SNES)",
        "game_id": 1,
        "image_url": _cdn_url("Donut Plains 1"),
    },
    {
        "name": "Frappe Snowland",
        "description": "Banana Cup (N64)",
        "game_id": 1,
        "image_url": _cdn_url("Frappe Snowland"),
    },
    {
        "name": "Bowser Castle 2",
        "description": "Banana Cup (GBA)",
        "game_id": 1,
        "image_url": _cdn_url("Bowser Castle 2"),
    },
    {
        "name": "Baby Park",
        "description": "Banana Cup (GCN)",
        "game_id": 1,
        "image_url": _cdn_url("Baby Park"),
    },
    # LEAF CUP (Retro)
    {
        "name": "Koopa Beach 2",
        "description": "Leaf Cup (SNES)",
        "game_id": 1,
        "image_url": _cdn_url("Koopa Beach 2"),
    },
    {
        "name": "Choco Mountain",
        "description": "Leaf Cup (N64)",
        "game_id": 1,
        "image_url": _cdn_url("Choco Mountain"),
    },
    {
        "name": "Luigi Circuit (GBA)",
        "description": "Leaf Cup",
        "game_id": 1,
        "image_url": _cdn_url("Luigi Circuit (GBA)"),
    },
    {
        "name": "Mushroom Bridge",
        "description": "Leaf Cup (GCN)",
        "game_id": 1,
        "image_url": _cdn_url("Mushroom Bridge"),
    },
    # LIGHTNING CUP (Retro)
    {
        "name": "Choco Island 2",
        "description": "Lightning Cup (SNES)",
        "game_id": 1,
        "image_url": _cdn_url("Choco Island 2"),
    },
    {
        "name": "Banshee Boardwalk",
        "description": "Lightning Cup (N64)",
        "game_id": 1,
        "image_url": _cdn_url("Banshee Boardwalk"),
    },
    {
        "name": "Sky Garden",
        "description": "Lightning Cup (GBA)",
        "game_id": 1,
        "image_url": _cdn_url("Sky Garden"),
    },
    {
        "name": "Yoshi Circuit",
        "description": "Lightning Cup (GCN)",
        "game_id": 1,
        "image_url": _cdn_url("Yoshi Circuit"),
    },
]
