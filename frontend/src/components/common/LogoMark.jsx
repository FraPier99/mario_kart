// Icona del logo "Lega Kart": esagono + strada stilizzata a "L".
// Lo stroke dell'esagono e delle corsie tratteggiate è fisso (chiaro), perché
// vive sempre su uno sfondo scuro (Navbar). Lo stroke della "strada" invece
// segue il tema del personaggio preferito del giocatore, esattamente come
// l'icona Flag che sostituisce (vedi useProfileTheme / var(--mk-primary)).
export default function LogoMark({ className, style }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="130 53 380 380"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {/* Esagono */}
      <path
        d="M320 72 L465 155 L465 323 L320 406 L175 323 L175 155 Z"
        fill="none"
        stroke="#F5F7FA"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Strada — colore dinamico in base al tema del personaggio */}
      <path
        d="M320 126 L320 250 C320 286 342 302 380 302 L412 302 C444 302 462 322 462 350 C462 381 438 402 406 402 L282 402"
        fill="none"
        stroke="var(--mk-primary)"
        strokeWidth="42"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Corsie tratteggiate */}
      <path
        d="M320 134 L320 248 C320 286 342 302 380 302 L412 302 C444 302 462 322 462 350 C462 381 438 402 406 402 L290 402"
        fill="none"
        stroke="#F5F7FA"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="10 14"
      />
    </svg>
  )
}
