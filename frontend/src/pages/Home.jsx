import AppLayout from "@/components/layout/AppLayout";
import Header from "@/components/layout/Header";
import Hero from "@/components/layout/Hero";
import ApiBanner from '@/components/common/ApiBanner'
import { useAppData } from '@/context/AppDataContext'
import sfondo from '@/assets/sfondo.jpg'

const Home = () =>{
    const { errorMessage, refresh } = useAppData()

    return (
        <AppLayout>
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <img
                    src={sfondo}
                    alt=""
                    className="h-full w-full object-cover opacity-35 blur-[2px] dark:opacity-20"
                />
            </div>
            <div className="relative z-10">
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
            </div>
        </AppLayout>
    )
}
 
export default Home;