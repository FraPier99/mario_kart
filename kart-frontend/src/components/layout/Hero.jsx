import { Users, Flag, Trophy } from "lucide-react";
import MetricCard from "@/components/home/MetricCard";
import { useAppData } from '@/context/AppDataContext'


const Hero =() =>{
    const { homeMetrics } = useAppData()

    return (
     <div className="mx-auto bg-slate-100 dark:bg-muted px-8 py-4">
  <div className="max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8 mt-4 items-stretch mx-auto px-4">
    
    {/* 1. BOX VERDE: GIOCATORI ATTIVI */}
    <MetricCard
        tone="emerald"
        icon={<Users size={40} className="text-emerald-100 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]" />}
        value={homeMetrics.activePlayers}
        label="Giocatori attivi"
    />

    {/* 2. BOX ROSSO: GARE COMPLETATE */}
    <MetricCard
        tone="red"
        icon={<Flag size={40} className="text-red-100 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]" />}
        value={homeMetrics.completedRaces}
        label="Gare completate"
    />

    {/* 3. BOX NERO: TROFEI VINTI */}
    <MetricCard
        tone="slate"
        icon={<Trophy size={40} className="text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-pulse" />}
        value={homeMetrics.trophiesWon}
        label="Trofei vinti"
    />

  </div>
</div>



        
    )

}

export default Hero