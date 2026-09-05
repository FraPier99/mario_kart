// Livello di sfondo "foto circuito + overlay scuro" per le card che oggi
// risultano piatte/spente — va inserito come primo figlio di un contenitore
// con `relative overflow-hidden`; il resto del contenuto va poi in un
// wrapper `relative z-10` sopra questo livello. L'overlay è scuro a
// prescindere dal tema del sito (la card diventa una piccola "isola" a tema
// scuro con testo chiaro, non segue light/dark) — necessario per restare
// leggibile sopra una foto qualunque.
// `blurred`: per un uso come "atmosfera" dietro un intero contenitore ampio
// (es. dashboard Home) invece che come sfondo leggibile di una singola card
// — sfocatura marcata + leggero oversize (scale-110) per non lasciar vedere
// bordi netti sfocati ai margini.
const CircuitBackdrop = ({ imageUrl, blurred = false }) => {
    if (!imageUrl) return null
    return (
        <>
            <div
                className={`absolute inset-0 bg-cover bg-center ${blurred ? 'scale-110' : ''}`}
                style={{ backgroundImage: `url(${imageUrl})`, filter: blurred ? 'blur(20px) brightness(0.45)' : undefined }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/70 to-black/85" />
        </>
    )
}

export default CircuitBackdrop
