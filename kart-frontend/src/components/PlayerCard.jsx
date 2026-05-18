import React from "react";

const PlayerCard = ({ player,handlePlayerClick }) => {
    return (
        <>
            {player.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-md flex flex-col items-center overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl">
    
    {/* Contenitore Immagine: rimosso mb-4 e bordi esterni per incollarla al top */}
    <div className="h-44 w-full overflow-hidden relative group">
        <img
            src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fimages.wallpapersden.com%2Fimage%2Fdownload%2Fanime-naruto-hd-2023-ai_bW5mbGmUmZqaraWkpJRmbmdlrWZlbWU.jpg&f=1&nofb=1&ipt=1ef441530fbb5c0cbadd4ef4ae28fd6199dfc207bb92dcb4afa14ccb939d2d48"
            alt={p.first_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Overlay leggero sfumato sull'immagine per dare profondità */}
        <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent"></div>
    </div>
    
    {/* Contenuto della Card con padding uniforme */}
    <div className="p-5 flex flex-col items-center grow w-full text-center">
        
        {/* Nickname: Corretto il bug di "rounded- full" e tolto l'effetto hover da bottone */}
        <span className="bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3.5 rounded-full shadow-sm mb-3 border border-emerald-400">
            {p.nickname}
        </span>

        {/* Nome e Cognome: Font più solido e scuro (non grigio slavato) */}
        <h3 className="text-slate-800 text-xl font-black uppercase tracking-tight mb-4">
            {p.first_name} {p.last_name}
        </h3>
        
        {/* Bottone: Corretta la sintassi "rounded-lg)", rimosso il conflitto bg-blue-600/hover:bg-blue-500 */}
        <button onClick={() => handlePlayerClick(p)} className="w-2xs mt-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-sm transition-colors duration-200 cursor-pointer text-sm">
            Visualizza Profilo
        </button>
    </div>
                </div>
            ))}
        </>

    )







}
export default PlayerCard