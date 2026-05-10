import React,{useState,useEffect} from 'react'
import {_get} from './services/apiClient'
import './App.css'
import {Paper,Table,TableBody,TableCell,TableContainer,TableHead,TableRow} from '@mui/material'
import Home from './pages/Home'
import AppRouter from './Router/AppRouter'
function App() {
  

  // useEffect(()=>{
  //   fetch('http://localhost:8000/tournaments')
  //   .then(res=>res.json())
  //   .then(data=>setTournaments(data))
  //   .catch(err=>console.log(err))
  // },[])

  

//   useEffect(()=>{

//  fetchPlayers()
  
//   },[])

   
  return (
    <>
    <AppRouter/>
    
    
    </>
  )
}

export default App