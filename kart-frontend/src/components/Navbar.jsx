import React,{useState,useEffect} from "react";
import { Link } from "@mui/material";
import {AppBar,Box,Container,Toolbar} from '@mui/material'


const Navbar = () =>{
    return (
        <AppBar position="static">
          <Container maxWidth="xl">
            <Toolbar>
                <Link href="/" color="inherit" underline="none" variant="h6" component="div" sx={{ flexGrow: 1 }}>
                   Kart
                </Link>
                <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                    <Link href="/players" color="inherit" underline="none" variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Players
                    </Link>
                    <Link href="/characters" color="inherit" underline="none" variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Characters
                    </Link>
                </Box>
            </Toolbar>
          </Container>
                 
        


        </AppBar>


    )
}

export default Navbar 
