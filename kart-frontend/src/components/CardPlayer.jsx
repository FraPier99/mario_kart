import React,{useState,useEffect} from "react";
import { Avatar,Stack, Table } from "@mui/material";
import {TableBody,TableCell,TableContainer,TableHead,TableRow,Box} from '@mui/material'
import { avatars } from "../assets/avatar";
const CardPlayer = ({id,first_name,last_name,nickname,favorite_character,avatar}) =>{

    useEffect(()=>{
        console.log('avatars',avatars)
    })
    return (
        // <div className="card-container"
        // style={{
        //   display: 'flex'
        // }}>
        //     <div className="img-container">
        //         <Stack direction="row" spacing={2}>
        //         <Avatar id="avatar" src={avatar || 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fstatic.vecteezy.com%2Fsystem%2Fresources%2Fpreviews%2F009%2F292%2F244%2Foriginal%2Fdefault-avatar-icon-of-social-media-user-vector.jpg&f=1&nofb=1&ipt=b2420dd7bf2e448f56bf4c4f6de70bdd4ab09efbf7b108b527c0671a36d9d1e4'} alt="" />
        //         <Avatar id='fav-char' src={favorite_character || "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn.pixabay.com%2Fphoto%2F2016%2F08%2F08%2F09%2F17%2Favatar-1577909_1280.png&f=1&nofb=1&ipt=2a2b19b748f99d82f1fb29681094d0e2e92cdf805f11d809d101b7d4a2ef872c"} alt="" />
        //         </Stack>
        //     </div>
        //     <div className="info-container">
        //         <h2>{first_name} {last_name}</h2>
        //         <p>Nickname: {nickame}</p>
        //         <p>Favorite Character: {favorite_character}</p>
        //     </div>
        // </div>
        
    <TableRow key={id}>
    {/* Avatar Player */}
    <TableCell>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Avatar 
                src={avatars[nickname]} 
                alt="Player Avatar" 
               sx={{ width: 60, height: 60 }} 
            
            />
        </Box>
    </TableCell>

    {/* Nome e Cognome - Allineamento Testo Standard */}
    <TableCell align="center">
        {first_name} {last_name}
    </TableCell>

    {/* Nickname */}
    <TableCell align="center">
        {nickname}
    </TableCell>

    {/* Favorite Character Avatar */}
    <TableCell>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Avatar 
                src={favorite_character || "https://sl1nk.com/v9ew5m1"} 
                alt="Fav Char" 
            />
        </Box>
    </TableCell>
</TableRow>
    )
}
export default CardPlayer