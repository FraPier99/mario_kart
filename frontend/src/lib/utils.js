import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Title Case invece di UPPERCASE/lowercase per uniformare il rendering dei
// nomi torneo in tutte le viste (podio, header, card storico) — vedi
// formatTournamentTitle più sotto per l'uso combinato col troncamento.
export function toTitleCase(str) {
    if (!str) return str
    return str.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}

// Tronca su un confine di parola invece che a metà (evita "the battle of the
// go…" da un puro `truncate`/`line-clamp` CSS, che taglia i caratteri senza
// guardare gli spazi) e aggiunge l'ellissi solo se il testo è stato tagliato.
export function truncateAtWord(str, maxLength) {
    if (!str || str.length <= maxLength) return str
    const cut = str.slice(0, maxLength)
    const lastSpace = cut.lastIndexOf(' ')
    const trimmed = lastSpace > 0 ? cut.slice(0, lastSpace) : cut
    return `${trimmed}…`
}

export function formatTournamentTitle(name, maxLength = null) {
    const titled = toTitleCase(name)
    return maxLength ? truncateAtWord(titled, maxLength) : titled
}

// Per le immagini di contenuto con una variante scura opzionale (es. le 4
// card statistiche profilo): in dark mode preferisce `${baseKey}-dark` se
// il superadmin l'ha caricata, altrimenti ricade sulla versione base (così
// funziona anche se è stata impostata una sola immagine). Restituisce sia
// l'URL da mostrare sia la chiave su cui un eventuale upload deve scrivere
// (quella del tema corrente, per non sovrascrivere l'altra variante).
export function resolveThemedContentImage(contentImages, baseKey, dark) {
    const activeKey = dark ? `${baseKey}-dark` : baseKey
    const imageUrl = contentImages[activeKey] || contentImages[baseKey]
    return { activeKey, imageUrl }
}

export function downloadCSV(headers, rows, filename) {
    const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => {
            const str = String(cell ?? '')
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str
        }).join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
