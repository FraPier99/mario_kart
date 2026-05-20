import Navbar from "./Navbar";


const AppLayout  =({children})=>{
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="grow animate-fade-in">
                {children}
            </main>
        </div>
    )
}

export default AppLayout