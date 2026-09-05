import AppLayout from "@/components/layout/AppLayout";
import Header from "@/components/layout/Header";
import Hero from "@/components/layout/Hero";
import ActivityFeed from "@/components/layout/ActivityFeed";
import ApiBanner from '@/components/common/ApiBanner'
import CircuitBackdrop from '@/components/common/CircuitBackdrop'
import { pickSessionCircuit } from '@/lib/circuitBackground'
import { useAppData } from '@/context/AppDataContext'

const Home = () =>{
    const { errorMessage, refresh, circuits } = useAppData()
    // Un'unica immagine di atmosfera (sfocata/scurita) dietro l'intera
    // dashboard invece che una per pannello — stabile per la sessione del
    // browser come le altre selezioni di lib/circuitBackground.js.
    const dashboardBgCircuit = pickSessionCircuit('home-dashboard', circuits)

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
            <section className="mx-auto max-w-7xl px-4 py-8">
                <div className="relative overflow-hidden rounded-[2rem] border-2 border-white/15 bg-slate-900" style={{ boxShadow: 'var(--circuit-shadow-lg)' }}>
                    <CircuitBackdrop imageUrl={dashboardBgCircuit?.image_url} blurred />
                    <div className="relative z-10 grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[360px_1fr] lg:items-start">
                        <ActivityFeed />
                        <Hero />
                    </div>
                </div>
            </section>
        </AppLayout>
    )
}

export default Home;