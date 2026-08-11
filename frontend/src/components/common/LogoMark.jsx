// Icona del logo "Lega Kart": doppio esagono (anello esterno luminoso +
// esagono interno fisso chiaro) con una strada stilizzata a "L" al centro.
// Il colore dell'anello esterno e della strada segue il tema del personaggio
// preferito del giocatore (var(--mk-primary), impostata da useProfileTheme),
// con un drop-shadow dello stesso colore a fare da "glow" — l'esagono interno
// resta sempre chiaro perché vive su sfondo scuro (Navbar).
export default function LogoMark({ className, style }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {/* Anello esterno — colore dinamico + glow */}
      <path
        d="M100 8 L182 54 L182 146 L100 192 L18 146 L18 54 Z"
        fill="none"
        stroke="var(--mk-primary)"
        strokeWidth="9"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 7px var(--mk-primary-glow))' }}
      />

      {/* Esagono interno — sempre chiaro */}
      <path
        d="M100 26 L164 62 L164 138 L100 174 L36 138 L36 62 Z"
        fill="none"
        stroke="#F5F7FA"
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Strada — colore dinamico in base al tema del personaggio */}
      <path
        d="M100 58 L100 112 C100 128 110 136 128 136 L142 136 C156 136 164 144 164 156"
        fill="none"
        stroke="var(--mk-primary)"
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Corsia tratteggiata */}
      <path
        d="M100 62 L100 110 C100 128 110 134 128 134 L142 134 C154 134 161 141 162 152"
        fill="none"
        stroke="#F5F7FA"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="4 6"
      />
    </svg>
  )
}
