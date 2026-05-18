import React from "react";



const ModalPlayer = ({player,onClose}) => {
    if (!player) return null; // Se non c'è un giocatore, non mostrare nulla

    return (
        
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center ">
            <div className="bg-white rounded-lg p-6 w-104 relative border-4 border-emerald-500 shadow-lg 
            animate-fadeIn">
                <button onClick={onClose} className="text-2xl absolute top-2 right-2 text-red-500 hover:text-red-700">
                    &times;
                </button>

                <div className="flex flex-col justify-center items-center "> 
                    <div>
                        {/* momentaneo placeholder */}
                        <img src={'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fimages.wallpapersden.com%2Fimage%2Fdownload%2Fanime-naruto-hd-2023-ai_bW5mbGmUmZqaraWkpJRmbmdlrWZlbWU.jpg&f=1&nofb=1&ipt=1ef441530fbb5c0cbadd4ef4ae28fd6199dfc207bb92dcb4afa14ccb939d2d48'} alt={`${player.first_name} ${player.last_name}`} className="w-24 h-24 rounded-full mb-4" />
                    </div>

                       
        {/* Nickname: Corretto il bug di "rounded- full" e tolto l'effetto hover da bottone */}
        <span className="bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3.5 rounded-full shadow-sm mb-3 border border-emerald-400">
            {player.nickname}
        </span>

        {/* Nome e Cognome: Font più solido e scuro (non grigio slavato) */}
        <h3 className="text-slate-800 text-xl font-black uppercase tracking-tight mb-4">
            {player.first_name} {player.last_name}
        </h3>

                </div>

        <div className="w-full mt-6 bg-slate-50 rounded-2xl p-5 border border-slate-100">
    {/* Titolo della sezione */}
    <h3 className="text-center text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
        Statistiche Giocatore
    </h3>
    
    {/* Griglia delle statistiche */}
    <div className="grid grid-cols-2 gap-3 w-full">
        
        {/* Blocco: Gare Disputate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-slate-800">{player.races_participated || 1}</span>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1">Gare fatte</span>
        </div>

        {/* Blocco: Tornei Vinti */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-amber-500">{player.tournaments_won || 0}</span>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1">Tornei Vinti</span>
        </div>

        {/* Blocco: Vittorie */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-emerald-600">{player.wins || 0}</span>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1">Vittorie</span>
        </div>

        {/* Blocco: Podi */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-blue-600">{player.podiums || 0}</span>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mt-1">Podi</span>
        </div>

    </div>
</div>
               
                {/* Aggiungi altre informazioni del giocatore qui */}
            </div>
        </div>
       

    )

}

export default ModalPlayer

    