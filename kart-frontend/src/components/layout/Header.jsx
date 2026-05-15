import React from "react";




const Header = () =>{
    return (
        <header className="relative w-full h-[300px] overflow-hidden shadow-2xl">
      {/* 1. Immagine di sfondo (Mario Kart) */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fassets3.thrillist.com%2Fv1%2Fimage%2F1907611%2Fsize%2Ftmg-facebook_social.jpg&f=1&nofb=1&ipt=86e0be5b56d7edc53c138836faec723ab958d85b5f64c959187b55af28d9a112')", // Sostituisci con la tua immagine
         backgroundPosition: 'center center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat'
        
        }}
      />

      {/* 2. Overlay Sfumato (Rosso -> Trasparente -> Verde) */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-red-600/80 via-transparent to-green-600/80" />

      {/* 3. Contenuto sopra l'header */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center text-white px-4">
        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
          Lega Kart
        </h1>
        <p className="mt-2 text-lg font-bold bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm">
          Stagione 2024 • Il torneo definitivo
        </p>
      </div>
    </header>
    )

}

export default Header