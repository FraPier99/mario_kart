import React, { Children } from "react";
import Navbar from "./Navbar";


const AppLayout  =({children})=>{
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
                {children}
            </main>
        </div>
    

    )

}

export default AppLayout