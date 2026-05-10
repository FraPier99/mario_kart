import React,{useState,useEffect} from "react"
import { _get } from "../services/apiClient"
import CardPlayer from "../components/CardPlayer"
import {TableContainer, TableBody,Table,Paper,TableHead,TableRow,TableCell } from "@mui/material"



const Players = () =>{
    const [players,setPlayers] = useState([])


    const fetchPlayers =  async() =>{

        try {
           const response = await _get('/players')
           setPlayers(response.data)
        }
        catch(err){
            console.error('err','error trying to fetch')
        }

    }

    useEffect(()=>{
        console.log('fetching players')
        fetchPlayers()
    },[])

    return (
        <div>
          
            <h1>Players</h1>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead  >
                        <TableRow style={{textAlign:'center'}}>
                            <TableCell>#</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell >Nickname</TableCell>
                            <TableCell>Favorite Character</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {players.map(p=>{
                            return <CardPlayer key={p.id} id={p.id}
                             first_name={p.first_name}
                              last_name={p.last_name} 
                              nickname={p.nickname} 
                              favorite_character={p.favorite_character} avatar={p.avatar}/>
                 })}

          
          </TableBody>
                </Table>
            </TableContainer>

        
        </div>
    )

}

export default Players