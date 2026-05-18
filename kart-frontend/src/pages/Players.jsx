import React,{useState,useEffect} from "react"
import { _get } from "../services/apiClient"
import avatar from  '../assets/avatar/fede.jpeg'
import AppLayout from "@/components/layout/AppLayout"
import PlayerCard from "@/components/PlayerCard"
import ModalPlayer from "@/components/ModalPlayer"

const Players = () =>{
    const [players,setPlayers] = useState([])
    const [selectedPlayer, setSelectedPlayer] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)


    const fetchPlayers =  async() =>{

        try {
           const response = await _get('/players')
           setPlayers(response.data)
        }
        catch(err){
            console.error('err','error trying to fetch')
        }

    }

    const handlePlayerClick = (player) =>{
        setSelectedPlayer(player)
        setIsModalOpen(true)
    }

    useEffect(()=>{
        console.log('fetching players')
        fetchPlayers()
    },[])

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-4 pt-12 pb-8 flex flex-col items-center text-center">
   
    
    {/* Titolo Principale */}
    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-900 mb-3">
        Roster Giocatori
    </h1>
    
    {/* Sottotitolo */}
    <p className="text-base text-slate-500 max-w-md font-medium leading-relaxed">
        Ecco i piloti ufficiali attivi e pronti a sfidarsi nella <span className="text-emerald-600 font-bold">Lega Kart</span>!
    </p>

    {/* Linea di finitura estetica sotto l'header */}
    <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 mt-6 rounded-full"></div>
</div>
         
         
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
            <PlayerCard player={players} handlePlayerClick={handlePlayerClick}  />

            {
                isModalOpen && selectedPlayer && (
                    <ModalPlayer player={selectedPlayer} onClose={() => setIsModalOpen(false)} />
                )
            }
      
            </div>
      
        
          
        </AppLayout>
    )

}

export default Players