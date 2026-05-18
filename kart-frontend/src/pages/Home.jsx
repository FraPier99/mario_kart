import React,{useEffect} from "react";
import Navbar from "../components/layout/Navbar";
import AppLayout from "@/components/layout/AppLayout";
import Header from "@/components/layout/Header";
import Hero from "@/components/layout/Hero";
import LastWinner from "@/components/layout/LastWinner";
const Home = () =>{

    return (
        <AppLayout>
        <Header />
        
        <Hero />
        <LastWinner />
        
        </AppLayout>
    )
}
 
export default Home;