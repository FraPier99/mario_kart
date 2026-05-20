import AppLayout from "@/components/layout/AppLayout";
import Header from "@/components/layout/Header";
import Hero from "@/components/layout/Hero";
import LastWinner from "@/components/layout/LastWinner";
import ApiBanner from '@/components/common/ApiBanner'
import { useAppData } from '@/context/AppDataContext'
const Home = () =>{
    const { errorMessage, refresh } = useAppData()

    return (
        <AppLayout>
        <Header />
        <div className="mx-auto max-w-7xl px-4">
            <ApiBanner
                title="Dati backend non disponibili"
                message={errorMessage}
                action={errorMessage ? (
                    <button
                        type="button"
                        onClick={refresh}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
                    >
                        Riprova
                    </button>
                ) : null}
            />
        </div>
        
        <Hero />
        <LastWinner />
        
        </AppLayout>
    )
}
 
export default Home;