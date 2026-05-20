import {BrowserRouter as Router, Navigate, Routes, Route} from 'react-router-dom'
import Home from '../pages/Home'
import Players from '../pages/Players'
import History from '../pages/History'
import Stats from '../pages/Stats'
import NewTournament from '../pages/NewTournament'
import TournamentDetail from '../pages/TournamentDetail'
import TournamentStats from '../pages/TournamentStats'
import AdminPlayers from '../pages/AdminPlayers'
import Compare from '../pages/Compare'
import CircuitStats from '../pages/CircuitStats'

const AppRouter = () =>{
    return (
        <Router>
            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/players' element={<Players />} />
                <Route path='/history' element={<History />} />
                <Route path='/stats' element={<Stats />} />
                <Route path='/compare' element={<Compare />} />
                <Route path='/circuits' element={<CircuitStats />} />
                <Route path='/admin/players' element={<AdminPlayers />} />
                <Route path='/admin' element={<Navigate to='/admin/players' replace />} />
                <Route path='/tournaments' element={<Navigate to='/history' replace />} />
                <Route path='/tournaments/new' element={<NewTournament />} />
                <Route path='/tournaments/:tournamentId' element={<TournamentDetail />} />
                <Route path='/tournaments/:tournamentId/stats' element={<TournamentStats />} />
                <Route path='*' element={<Navigate to='/' replace />} />
            </Routes>
        </Router>
    )
}

export default AppRouter