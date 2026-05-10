import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import Home from '../pages/Home'
import Players from '../pages/Players'

const AppRouter = () =>{
    return (
        <Router>
            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/players' element={<Players />} />
            </Routes>
        </Router>
    )
}

export default AppRouter