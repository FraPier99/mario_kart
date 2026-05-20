import './App.css'
import AppRouter from './Router/AppRouter'
import { AppDataProvider } from './context/AppDataContext'
import { Toaster } from 'sonner'
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
    <AppDataProvider>
      <AppRouter/>
    </AppDataProvider>
    <Toaster position="top-right" richColors closeButton />
    
    
    </>
  )
}

export default App