// Mirror di app/data/consoles.py — le chiavi devono restare identiche a quelle
// validate lato backend.
export const CONSOLE_LIST = [
    { key: 'ds', label: 'DS' },
    { key: 'ds_lite', label: 'DS Lite' },
    { key: 'dsi', label: 'DSi' },
    { key: 'dsi_xl', label: 'DSi XL' },
    { key: '3ds', label: '3DS' },
    { key: '3ds_xl', label: '3DS XL' },
    { key: '2ds', label: '2DS' },
    { key: 'new_3ds', label: 'New 3DS' },
    { key: 'new_3ds_xl', label: 'New 3DS XL' },
    { key: 'new_2ds_xl', label: 'New 2DS XL' },
    { key: 'switch', label: 'Switch' },
    { key: 'switch_lite', label: 'Switch Lite' },
    { key: 'switch_oled', label: 'Switch OLED' },
    { key: 'switch_2', label: 'Switch 2' },
]

const R4_KEYS = new Set([
    'ds', 'ds_lite', 'dsi', 'dsi_xl', '3ds', '3ds_xl',
    '2ds', 'new_3ds', 'new_3ds_xl', 'new_2ds_xl',
])
export const R4_DEVICE_LIST = CONSOLE_LIST.filter((c) => R4_KEYS.has(c.key))

export const MKDS_GAME_ID = 1

export const consoleLabel = (key) => CONSOLE_LIST.find((c) => c.key === key)?.label ?? key
