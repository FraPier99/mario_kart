"""
Dati di Mario Kart 8 Deluxe per la popolazione del DB.
Struttura coerente con i modelli Game, Character, Circuit.

Characters: name, description (peso), img_url
Circuits: name, description (trofeo · origine), image_url (None — non disponibile)

Il game_id viene assegnato dallo script seed_mk8deluxe.py al momento dell'inserimento.
"""

MK8D_GAME_NAME = "Mario Kart 8 Deluxe"
MK8D_GAME_DESCRIPTION = "Mario Kart 8 Deluxe - Nintendo Switch (2017)"

# ─── Personaggi ───────────────────────────────────────────────────────────────
# description = classe di peso (usata nei filtri e nella UI)

MK8D_CHARACTERS = [
    # Leggeri
    {"name": "Baby Mario",      "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/d/d9/MK8_BabyMario_Icon.png/70px-MK8_BabyMario_Icon.png"},
    {"name": "Baby Luigi",      "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/a/aa/MK8_BabyLuigi_Icon.png/70px-MK8_BabyLuigi_Icon.png"},
    {"name": "Baby Peach",      "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/3/3d/MK8_BabyPeach_Icon.png/70px-MK8_BabyPeach_Icon.png"},
    {"name": "Baby Daisy",      "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/4/43/MK8_BabyDaisy_Icon.png/70px-MK8_BabyDaisy_Icon.png"},
    {"name": "Baby Rosalina",   "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/0/09/MK8_BabyRosalina_Icon.png/70px-MK8_BabyRosalina_Icon.png"},
    {"name": "Lemmy",           "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/f/fc/MK8_Lemmy_Icon.png/70px-MK8_Lemmy_Icon.png"},
    {"name": "Koopa Troopa",    "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/b/bc/MK8_Koopa_Icon.png/70px-MK8_Koopa_Icon.png"},
    {"name": "Lakitu",          "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/7/7d/MK8_Lakitu_Icon.png/70px-MK8_Lakitu_Icon.png"},
    {"name": "Tipo Timido",         "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/7/7f/MK8_ShyGuy_Icon.png/70px-MK8_ShyGuy_Icon.png"},
    {"name": "Tipo Timido Blu",    "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/4/41/MK8_Blue_Shy_Guy_Icon.png/70px-MK8_Blue_Shy_Guy_Icon.png"},
    {"name": "Tipo Timido Giallo", "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/d/d3/MK8_Yellow_Shy_Guy_Icon.png/70px-MK8_Yellow_Shy_Guy_Icon.png"},
    {"name": "Tipo Timido Verde",  "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/7/74/MK8_Green_Shy_Guy_Icon.png/70px-MK8_Green_Shy_Guy_Icon.png"},
    {"name": "Tipo Timido Rosa",   "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/b/bf/MK8_Pink_Shy_Guy_Icon.png/70px-MK8_Pink_Shy_Guy_Icon.png"},
    {"name": "Tipo Timido Azzurro","description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/d/d9/MK8_Light-Blue_Shy_Guy_Icon.png/70px-MK8_Light-Blue_Shy_Guy_Icon.png"},
    {"name": "Tipo Timido Bianco", "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/2/20/MK8_White_Shy_Guy_Icon.png/70px-MK8_White_Shy_Guy_Icon.png"},
    {"name": "Tipo Timido Nero",   "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/5/57/MK8_Black_Shy_Guy_Icon.png/70px-MK8_Black_Shy_Guy_Icon.png"},
    {"name": "Larry",           "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/c/c2/MK8_Larry_Icon.png/70px-MK8_Larry_Icon.png"},
    {"name": "Wendy",           "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/d/d9/MK8_Wendy_Icon.png/70px-MK8_Wendy_Icon.png"},
    {"name": "Toad",            "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/4/45/MK8_Toad_Icon.png/70px-MK8_Toad_Icon.png"},
    {"name": "Toadette",        "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/8/8e/MK8_Toadette_Icon.png/70px-MK8_Toadette_Icon.png"},
    {"name": "Inkling Girl",    "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/b/b9/MK8DX_Female_Inkling_Icon.png/70px-MK8DX_Female_Inkling_Icon.png"},
    {"name": "Inkling Boy",     "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/3/3c/MK8DX_Male_Inkling_Icon.png/70px-MK8DX_Male_Inkling_Icon.png"},
    {"name": "Tartosso",        "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/3/3f/MK8DX_Dry_Bones_Icon.png/70px-MK8DX_Dry_Bones_Icon.png"},
    {"name": "Bowser Jr.",      "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/2/26/MK8_Bowser_Jr_Icon.png/70px-MK8_Bowser_Jr_Icon.png"},
    {"name": "Peachette",       "description": "Leggero",   "img_url": "https://mario.wiki.gallery/images/thumb/f/fd/MK8DX_Peachette_Icon.png/70px-MK8DX_Peachette_Icon.png"},
    # Medi
    {"name": "Mario",           "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/d/d9/MK8_Mario_Icon.png/70px-MK8_Mario_Icon.png"},
    {"name": "Luigi",           "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/5/51/MK8_Luigi_Icon.png/70px-MK8_Luigi_Icon.png"},
    {"name": "Peach",           "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/c/c2/MK8_Peach_Icon.png/70px-MK8_Peach_Icon.png"},
    {"name": "Daisy",           "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/3/32/MK8_Daisy_Icon.png/70px-MK8_Daisy_Icon.png"},
    {"name": "Yoshi",           "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/9/91/MK8_Yoshi_Icon.png/70px-MK8_Yoshi_Icon.png"},
    {"name": "Yoshi Rosso",    "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/b/b4/MK8_Red_Yoshi_Icon.png/70px-MK8_Red_Yoshi_Icon.png"},
    {"name": "Yoshi Blu",      "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/c/cc/MK8_Blue_Yoshi_Icon.png/70px-MK8_Blue_Yoshi_Icon.png"},
    {"name": "Yoshi Rosa",     "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/4/4f/MK8_Pink_Yoshi_Icon.png/70px-MK8_Pink_Yoshi_Icon.png"},
    {"name": "Yoshi Arancione","description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/8/89/MK8_Orange_Yoshi_Icon.png/70px-MK8_Orange_Yoshi_Icon.png"},
    {"name": "Yoshi Azzurro",  "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/8/8c/MK8_Light-Blue_Yoshi_Icon.png/70px-MK8_Light-Blue_Yoshi_Icon.png"},
    {"name": "Yoshi Giallo",   "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/c/c7/MK8_Yellow_Yoshi_Icon.png/70px-MK8_Yellow_Yoshi_Icon.png"},
    {"name": "Yoshi Nero",     "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/5/5c/MK8_Black_Yoshi_Icon.png/70px-MK8_Black_Yoshi_Icon.png"},
    {"name": "Yoshi Bianco",   "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/3/3f/MK8_White_Yoshi_Icon.png/70px-MK8_White_Yoshi_Icon.png"},
    {"name": "Rosalina",        "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/8/89/MK8_Rosalina_Icon.png/70px-MK8_Rosalina_Icon.png"},
    {"name": "Link",            "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/9/9e/MK8D_BotW_Link_Icon.png/70px-MK8D_BotW_Link_Icon.png"},
    {"name": "Villager (M)",    "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/1/16/VillagerMale-Icon-MK8.png/70px-VillagerMale-Icon-MK8.png"},
    {"name": "Villager (F)",    "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/c/c3/VillagerFemale-Icon-MK8.png/70px-VillagerFemale-Icon-MK8.png"},
    {"name": "Isabelle",        "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/2/20/MK8_Isabelle_Icon.png/70px-MK8_Isabelle_Icon.png"},
    {"name": "Birdo",           "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/f/f6/MK8D_Birdo_Icon.png/70px-MK8D_Birdo_Icon.png"},
    {"name": "Kamek",           "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/0/00/MK8DX_Kamek_Icon.png/70px-MK8DX_Kamek_Icon.png"},
    {"name": "Pauline",         "description": "Medio",     "img_url": "https://mario.wiki.gallery/images/thumb/d/dd/MK8DX_Pauline_Icon.png/70px-MK8DX_Pauline_Icon.png"},
    {"name": "Mii",             "description": "Variabile", "img_url": "https://mario.wiki.gallery/images/thumb/b/bb/Mii_MK8.png/70px-Mii_MK8.png"},
    # Pesanti
    {"name": "Donkey Kong",     "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/0/08/MK8_DKong_Icon.png/70px-MK8_DKong_Icon.png"},
    {"name": "Wario",           "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/c/c2/MK8_Wario_Icon.png/70px-MK8_Wario_Icon.png"},
    {"name": "Waluigi",         "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/7/78/MK8_Waluigi_Icon.png/70px-MK8_Waluigi_Icon.png"},
    {"name": "Bowser",          "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/4/47/MK8_Bowser_Icon.png/70px-MK8_Bowser_Icon.png"},
    {"name": "Dry Bowser",      "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/2/29/MK8_Dry_Bowser_Icon.png/70px-MK8_Dry_Bowser_Icon.png"},
    {"name": "Roy",             "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/3/3e/MK8_Roy_Icon.png/70px-MK8_Roy_Icon.png"},
    {"name": "Morton",          "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/7/72/MK8_Morton_Icon.png/70px-MK8_Morton_Icon.png"},
    {"name": "Ludwig",          "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/a/a8/MK8_Ludwig_Icon.png/70px-MK8_Ludwig_Icon.png"},
    {"name": "Iggy",            "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/d/dd/MK8_Iggy_Icon.png/70px-MK8_Iggy_Icon.png"},
    {"name": "Metal Mario",     "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/e/e3/MK8_MMario_Icon.png/70px-MK8_MMario_Icon.png"},
    {"name": "Gold Mario",      "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/c/c8/MK8DX_Gold_Mario_Icon.png/70px-MK8DX_Gold_Mario_Icon.png"},
    {"name": "Pink Gold Peach", "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/0/0d/MK8_PGPeach_Icon.png/70px-MK8_PGPeach_Icon.png"},
    {"name": "King Boo",        "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/1/1d/MK8DX_King_Boo_Icon.png/70px-MK8DX_King_Boo_Icon.png"},
    {"name": "Diddy Kong",      "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/8/82/MK8DX_Diddy_Kong_Icon.png/70px-MK8DX_Diddy_Kong_Icon.png"},
    {"name": "Funky Kong",      "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/4/4a/MK8DX_Funky_Kong_Icon.png/70px-MK8DX_Funky_Kong_Icon.png"},
    # Spike NON è in MK8 Deluxe — debutta in Mario Kart World (2025)
    {"name": "Petey Piranha",   "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/8/86/MK8DX_Petey_Piranha_Icon.png/70px-MK8DX_Petey_Piranha_Icon.png"},
    {"name": "Wiggler",         "description": "Pesante",   "img_url": "https://mario.wiki.gallery/images/thumb/7/7e/MK8DX_Wiggler_Icon.png/70px-MK8DX_Wiggler_Icon.png"},
]

# ─── Circuiti ─────────────────────────────────────────────────────────────────
# description = "Trofeo · Origine" (origine = Nuovo / SNES / N64 / GBA / GCN / DS / 3DS / Wii / Tour / NES)
# image_url = None (non disponibili)
# Nota: Rainbow Road Wii appare nella versione base (Trofeo Palloncino) e nel DLC Wave 6.
#       È la stessa pista — nel DB è registrata una volta sola.

MK8D_CIRCUITS = [
    # ── Trofeo Fungo (base, Nitro)
    {"name": "Circuito Mario", "description": "Trofeo Fungo · Nuovo", "image_url": "/images/mk8d/circuits/circuito_mario.png"},
    {"name": "Acqua Park Toad", "description": "Trofeo Fungo · Nuovo", "image_url": "/images/mk8d/circuits/acqua_park_toad.png"},
    {"name": "Piste di Ghiaccio", "description": "Trofeo Fungo · Nuovo", "image_url": "/images/mk8d/circuits/piste_di_ghiaccio.png"},
    {"name": "Corso di Nuvole", "description": "Trofeo Fungo · Nuovo", "image_url": "/images/mk8d/circuits/corso_di_nuvole.png"},
    # ── Trofeo Fiore (base, Nitro)
    {"name": "Cascate Tipo Timido", "description": "Trofeo Fiore · Nuovo", "image_url": "/images/mk8d/circuits/cascate_tipo_timido.png"},
    {"name": "Rovine di Mario", "description": "Trofeo Fiore · Nuovo", "image_url": "/images/mk8d/circuits/rovine_di_mario.png"},
    {"name": "Circuito Dolciaria", "description": "Trofeo Fiore · Nuovo", "image_url": "/images/mk8d/circuits/circuito_dolciaria.png"},
    {"name": "Monte Koopa", "description": "Trofeo Fiore · Nuovo", "image_url": "/images/mk8d/circuits/monte_koopa.png"},
    # ── Trofeo Stella (base, Nitro)
    {"name": "Holley Altopiani", "description": "Trofeo Stella · Nuovo", "image_url": "/images/mk8d/circuits/holley_altopiani.png"},
    {"name": "Acqua Park Peach", "description": "Trofeo Stella · Nuovo", "image_url": "/images/mk8d/circuits/acqua_park_peach.png"},
    {"name": "Maestosa Piramide", "description": "Trofeo Stella · Nuovo", "image_url": "/images/mk8d/circuits/maestosa_piramide.png"},
    {"name": "Montagne da Sogno", "description": "Trofeo Stella · Nuovo", "image_url": "/images/mk8d/circuits/montagne_da_sogno.png"},
    # ── Trofeo Speciale (base, Nitro)
    {"name": "Città Arcobaleno", "description": "Trofeo Speciale · Nuovo", "image_url": "/images/mk8d/circuits/citta_arcobaleno.png"},
    {"name": "Monte Wario", "description": "Trofeo Speciale · Nuovo", "image_url": "/images/mk8d/circuits/monte_wario.png"},
    {"name": "Pista Acquatica del Mando", "description": "Trofeo Speciale · Nuovo", "image_url": "/images/mk8d/circuits/pista_acquatica_del_mando.png"},
    {"name": "Pista Arcobaleno", "description": "Trofeo Speciale · Nuovo", "image_url": "/images/mk8d/circuits/pista_arcobaleno.png"},
    # ── Trofeo Guscio (base, Retro)
    {"name": "Moo Moo Meadows", "description": "Trofeo Guscio · Wii", "image_url": "/images/mk8d/circuits/moo_moo_meadows.png"},
    {"name": "Mario Raceway", "description": "Trofeo Guscio · N64", "image_url": "/images/mk8d/circuits/mario_raceway.png"},
    {"name": "Sherbet Land", "description": "Trofeo Guscio · GCN", "image_url": "/images/mk8d/circuits/sherbet_land.png"},
    {"name": "Music Park", "description": "Trofeo Guscio · 3DS", "image_url": "/images/mk8d/circuits/music_park.png"},
    # ── Trofeo Banana (base, Retro)
    {"name": "Yoshi Valley", "description": "Trofeo Banana · N64", "image_url": "/images/mk8d/circuits/yoshi_valley.png"},
    {"name": "Toad's Turnpike", "description": "Trofeo Banana · N64", "image_url": "/images/mk8d/circuits/toads_turnpike.png"},
    {"name": "Donut Plains 3", "description": "Trofeo Banana · SNES", "image_url": "/images/mk8d/circuits/donut_plains_3.png"},
    {"name": "Royal Raceway", "description": "Trofeo Banana · N64", "image_url": "/images/mk8d/circuits/royal_raceway.png"},
    # ── Trofeo Foglia (base, Retro)
    {"name": "DK Jungle", "description": "Trofeo Foglia · 3DS", "image_url": "/images/mk8d/circuits/dk_jungle.png"},
    {"name": "Wario Stadium", "description": "Trofeo Foglia · DS", "image_url": "/images/mk8d/circuits/wario_stadium.png"},
    {"name": "Piranha Plant Slide", "description": "Trofeo Foglia · 3DS", "image_url": "/images/mk8d/circuits/piranha_plant_slide.png"},
    {"name": "Airship Fortress", "description": "Trofeo Foglia · DS", "image_url": "/images/mk8d/circuits/airship_fortress.png"},
    # ── Trofeo Fulmine (base, Retro)
    {"name": "Baby Park", "description": "Trofeo Fulmine · GCN", "image_url": "/images/mk8d/circuits/baby_park.png"},
    {"name": "Cheese Land", "description": "Trofeo Fulmine · GBA", "image_url": "/images/mk8d/circuits/cheese_land.png"},
    {"name": "Wild Woods", "description": "Trofeo Fulmine · Nuovo", "image_url": "/images/mk8d/circuits/wild_woods.png"},
    {"name": "Animal Crossing", "description": "Trofeo Fulmine · Nuovo", "image_url": "/images/mk8d/circuits/animal_crossing.png"},
    # ── Trofeo Uovo (base, Link/F-Zero/Excitebike)
    {"name": "Excitebike Arena", "description": "Trofeo Uovo · NES", "image_url": "/images/mk8d/circuits/excitebike_arena.png"},
    {"name": "Dragon Driftway", "description": "Trofeo Uovo · Nuovo", "image_url": "/images/mk8d/circuits/dragon_driftway.png"},
    {"name": "Mute City", "description": "Trofeo Uovo · SNES", "image_url": "/images/mk8d/circuits/mute_city.png"},
    {"name": "Ice Ice Outpost", "description": "Trofeo Uovo · Nuovo", "image_url": "/images/mk8d/circuits/ice_ice_outpost.png"},
    # ── Trofeo Tritatutto (base, Hyrule/F-Zero/GBA)
    {"name": "Hyrule Circuit", "description": "Trofeo Tritatutto · Nuovo", "image_url": "/images/mk8d/circuits/hyrule_circuit.png"},
    {"name": "Aeroporto Supersole", "description": "Trofeo Tritatutto · Nuovo", "image_url": "/images/mk8d/circuits/aeroporto_supersole.png"},
    {"name": "Big Blue", "description": "Trofeo Tritatutto · Nuovo", "image_url": "/images/mk8d/circuits/big_blue.png"},
    {"name": "Monte Nevoso di Mario", "description": "Trofeo Tritatutto · 3DS", "image_url": "/images/mk8d/circuits/monte_nevoso_di_mario.png"},
    # ── Trofeo Campanella (base, Retro)
    {"name": "Circuito di Luigi", "description": "Trofeo Campanella · GCN", "image_url": "/images/mk8d/circuits/circuito_di_luigi.png"},
    {"name": "Pista di Toad", "description": "Trofeo Campanella · GBA", "image_url": "/images/mk8d/circuits/pista_di_toad.png"},
    {"name": "Pista Arcobaleno N64", "description": "Trofeo Campanella · N64", "image_url": "/images/mk8d/circuits/pista_arcobaleno_n64.png"},
    {"name": "Wario's Gold Mine", "description": "Trofeo Campanella · Wii", "image_url": "/images/mk8d/circuits/warios_gold_mine.png"},
    # ── Trofeo Palloncino (base, Retro)
    {"name": "Rainbow Road SNES", "description": "Trofeo Palloncino · SNES", "image_url": "/images/mk8d/circuits/rainbow_road_snes.png"},
    {"name": "Yoshi Circuit", "description": "Trofeo Palloncino · GCN", "image_url": "/images/mk8d/circuits/yoshi_circuit.png"},
    {"name": "Rainbow Road Wii", "description": "Trofeo Palloncino · Wii", "image_url": "/images/mk8d/circuits/rainbow_road_wii.png"},
    {"name": "Balloon Road", "description": "Trofeo Palloncino · Nuovo", "image_url": "/images/mk8d/circuits/balloon_road.png"},
    # ── DLC Wave 1 — Trofeo Boomerang
    {"name": "Coconut Mall", "description": "Trofeo Boomerang · Wii", "image_url": "/images/mk8d/circuits/coconut_mall.png"},
    {"name": "Tokyo Blur", "description": "Trofeo Boomerang · Tour", "image_url": "/images/mk8d/circuits/tokyo_blur.png"},
    {"name": "Shroom Ridge", "description": "Trofeo Boomerang · DS", "image_url": "/images/mk8d/circuits/shroom_ridge.png"},
    {"name": "Sky Garden", "description": "Trofeo Boomerang · GBA", "image_url": "/images/mk8d/circuits/sky_garden.png"},
    # ── DLC Wave 1 — Trofeo Piuma
    {"name": "Ninja Hideaway", "description": "Trofeo Piuma · Tour", "image_url": "/images/mk8d/circuits/ninja_hideaway.png"},
    {"name": "New York Minute", "description": "Trofeo Piuma · Tour", "image_url": "/images/mk8d/circuits/new_york_minute.png"},
    {"name": "Choco Mountain", "description": "Trofeo Piuma · N64", "image_url": "/images/mk8d/circuits/choco_mountain.png"},
    {"name": "Toad Circuit", "description": "Trofeo Piuma · 3DS", "image_url": "/images/mk8d/circuits/toad_circuit.png"},
    # ── DLC Wave 2 — Trofeo Gatto
    {"name": "Neo Bowser City", "description": "Trofeo Gatto · 3DS", "image_url": "/images/mk8d/circuits/neo_bowser_city.png"},
    {"name": "Kalimari Desert", "description": "Trofeo Gatto · N64", "image_url": "/images/mk8d/circuits/kalimari_desert.png"},
    {"name": "Waluigi Pinball", "description": "Trofeo Gatto · DS", "image_url": "/images/mk8d/circuits/waluigi_pinball.png"},
    {"name": "Sydney Sprint", "description": "Trofeo Gatto · Tour", "image_url": "/images/mk8d/circuits/sydney_sprint.png"},
    # ── DLC Wave 2 — Trofeo Corno Fortunato
    {"name": "Snow Land", "description": "Trofeo Corno Fortunato · GBA", "image_url": "/images/mk8d/circuits/snow_land.png"},
    {"name": "Mushroom Gorge", "description": "Trofeo Corno Fortunato · Wii", "image_url": "/images/mk8d/circuits/mushroom_gorge.png"},
    {"name": "Sky-High Sundae", "description": "Trofeo Corno Fortunato · Nuovo", "image_url": "/images/mk8d/circuits/skyhigh_sundae.png"},
    {"name": "London Loop", "description": "Trofeo Corno Fortunato · Tour", "image_url": "/images/mk8d/circuits/london_loop.png"},
    # ── DLC Wave 3 — Trofeo Foglia di Acero
    {"name": "Boo Lake", "description": "Trofeo Foglia di Acero · GBA", "image_url": "/images/mk8d/circuits/boo_lake.png"},
    {"name": "Alpine Pass", "description": "Trofeo Foglia di Acero · 3DS", "image_url": "/images/mk8d/circuits/alpine_pass.png"},
    {"name": "Maple Treeway", "description": "Trofeo Foglia di Acero · Wii", "image_url": "/images/mk8d/circuits/maple_treeway.png"},
    {"name": "Berlin Byways", "description": "Trofeo Foglia di Acero · Tour", "image_url": "/images/mk8d/circuits/berlin_byways.png"},
    # ── DLC Wave 3 — Trofeo Guscio di Noci
    {"name": "Peach Gardens", "description": "Trofeo Guscio di Noci · DS", "image_url": "/images/mk8d/circuits/peach_gardens.png"},
    {"name": "Merry Mountain", "description": "Trofeo Guscio di Noci · Tour", "image_url": "/images/mk8d/circuits/merry_mountain.png"},
    {"name": "Rainbow Road 3DS", "description": "Trofeo Guscio di Noci · 3DS", "image_url": "/images/mk8d/circuits/rainbow_road_3ds.png"},
    {"name": "Amsterdam Drift", "description": "Trofeo Guscio di Noci · Tour", "image_url": "/images/mk8d/circuits/amsterdam_drift.png"},
    # ── DLC Wave 4 — Trofeo Guscio Blu
    {"name": "Riverside Park", "description": "Trofeo Guscio Blu · GBA", "image_url": "/images/mk8d/circuits/riverside_park.png"},
    {"name": "DK Summit", "description": "Trofeo Guscio Blu · Wii", "image_url": "/images/mk8d/circuits/dk_summit.png"},
    {"name": "Yoshi's Island", "description": "Trofeo Guscio Blu · GBA", "image_url": "/images/mk8d/circuits/yoshis_island.png"},
    {"name": "Bangkok Rush", "description": "Trofeo Guscio Blu · Tour", "image_url": "/images/mk8d/circuits/bangkok_rush.png"},
    # ── DLC Wave 4 — Trofeo Rock
    {"name": "Mario Circuit DS", "description": "Trofeo Rock · DS", "image_url": "/images/mk8d/circuits/mario_circuit_ds.png"},
    {"name": "Waluigi Stadium", "description": "Trofeo Rock · GCN", "image_url": "/images/mk8d/circuits/waluigi_stadium.png"},
    {"name": "Singapore Speedway", "description": "Trofeo Rock · Tour", "image_url": "/images/mk8d/circuits/singapore_speedway.png"},
    {"name": "Athens Dash", "description": "Trofeo Rock · Tour", "image_url": "/images/mk8d/circuits/athens_dash.png"},
    # ── DLC Wave 5 — Trofeo Stella Cadente
    {"name": "Daisy Cruiser", "description": "Trofeo Stella Cadente · GCN", "image_url": "/images/mk8d/circuits/daisy_cruiser.png"},
    {"name": "Moonview Highway", "description": "Trofeo Stella Cadente · Wii", "image_url": "/images/mk8d/circuits/moonview_highway.png"},
    {"name": "Squeaky Clean Sprint", "description": "Trofeo Stella Cadente · Nuovo", "image_url": "/images/mk8d/circuits/squeaky_clean_sprint.png"},
    {"name": "Los Angeles Laps", "description": "Trofeo Stella Cadente · Tour", "image_url": "/images/mk8d/circuits/los_angeles_laps.png"},
    # ── DLC Wave 5 — Trofeo Trampolino
    {"name": "Sunset Wilds", "description": "Trofeo Trampolino · GBA", "image_url": "/images/mk8d/circuits/sunset_wilds.png"},
    {"name": "Koopa Cape", "description": "Trofeo Trampolino · Wii", "image_url": "/images/mk8d/circuits/koopa_cape.png"},
    {"name": "Vancouver Velocity", "description": "Trofeo Trampolino · Tour", "image_url": "/images/mk8d/circuits/vancouver_velocity.png"},
    {"name": "Rome Avanti", "description": "Trofeo Trampolino · Tour", "image_url": "/images/mk8d/circuits/rome_avanti.png"},
    # ── DLC Wave 6 — Trofeo Propeller
    {"name": "DK Mountain", "description": "Trofeo Propeller · GCN", "image_url": "/images/mk8d/circuits/dk_mountain.png"},
    {"name": "Daisy Circuit", "description": "Trofeo Propeller · Wii", "image_url": "/images/mk8d/circuits/daisy_circuit.png"},
    {"name": "Piranha Plant Cove", "description": "Trofeo Propeller · Nuovo", "image_url": "/images/mk8d/circuits/piranha_plant_cove.png"},
    {"name": "Madrid Drive", "description": "Trofeo Propeller · Tour", "image_url": "/images/mk8d/circuits/madrid_drive.png"},
    # ── DLC Wave 6 — Trofeo Turbine
    {"name": "Rosalina's Ice World", "description": "Trofeo Turbine · 3DS", "image_url": "/images/mk8d/circuits/rosalinas_ice_world.png"},
    {"name": "Bowser Castle 3", "description": "Trofeo Turbine · SNES", "image_url": "/images/mk8d/circuits/bowser_castle_3.png"},
    # Rainbow Road Wii è già presente (Trofeo Palloncino) — non duplicata
    {"name": "Mario Circuit 3", "description": "Trofeo Turbine · SNES", "image_url": "/images/mk8d/circuits/mario_circuit_3.png"},
]
