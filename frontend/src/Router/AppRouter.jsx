import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import ScrollToTop from '../components/common/ScrollToTop'
import Home from '../pages/Home'
import History from '../pages/History'
import Schedina from '../pages/Schedina'
import SchedinaForm from '../pages/SchedinaForm'
import SchedinaGroupForm from '../pages/SchedinaGroupForm'
import Cards from '../pages/Cards'
import Regolamento from '../pages/Regolamento'
import Stats from '../pages/Stats'
import NewTournament from '../pages/NewTournament'
import TournamentDetail from '../pages/TournamentDetail'
import TournamentStats from '../pages/TournamentStats'
import AdminPlayers from '../pages/AdminPlayers'
import AdminDashboard from '../pages/AdminDashboard'
import SuperAdminPanel from '../pages/SuperAdminPanel'
import Compare from '../pages/Compare'
import CircuitStats from '../pages/CircuitStats'
import Login from '../pages/Login'
import Dashboard from '../pages/ProfileDashboard'
import Gallery from '../pages/Gallery'
import CommunityUserPage from '../pages/CommunityUserPage'
import HallOfFame from '../pages/HallOfFame'
import ChangePassword from '../pages/ChangePassword'
import { useAuth } from '../context/AuthContext'

const RequireAuth = ({ roles = [] }) => {
    const { user, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 text-sm font-black uppercase tracking-widest text-slate-500">Caricamento accesso...</div>
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}

const AppRouter = () =>{
    return (
        <Router>
            <ScrollToTop />
            <Routes>
                <Route path='/login' element={<Login />} />
                <Route element={<RequireAuth />}>
                    <Route path='/' element={<Home />} />
                    <Route path='/history' element={<History />} />
                    <Route path='/schedina/:tournamentId?' element={<Schedina />} />
                    <Route path='/schedina/:tournamentId/compila' element={<SchedinaForm />} />
                    <Route path='/schedina/:tournamentId/group-stage' element={<SchedinaGroupForm />} />
                    <Route path='/carte' element={<Cards />} />
                    <Route path='/regolamento' element={<Regolamento />} />
                    <Route path='/stats' element={<Stats />} />
                    <Route path='/compare' element={<Compare />} />
                    <Route path='/circuits' element={<CircuitStats />} />
                    <Route path='/gallery' element={<Gallery />} />
                    <Route path='/community/user/:userId' element={<CommunityUserPage />} />
                    <Route path='/hall-of-fame' element={<HallOfFame />} />
                    <Route path='/dashboard' element={<Dashboard />} />
                    <Route path='/change-password' element={<ChangePassword />} />
                    {/* All authenticated users can view tournament details */}
                    <Route path='/tournaments/:tournamentId' element={<TournamentDetail />} />
                    <Route path='/tournaments/:tournamentId/stats' element={<TournamentStats />} />
                    <Route element={<RequireAuth roles={['superadmin', 'admin']} />}>
                        <Route path='/admin/players' element={<AdminPlayers />} />
                        <Route path='/admin' element={<AdminDashboard />} />
                        <Route path='/tournaments/new' element={<NewTournament />} />
                    </Route>
                    <Route element={<RequireAuth roles={['superadmin']} />}>
                        <Route path='/superadmin' element={<SuperAdminPanel />} />
                    </Route>
                    <Route path='/tournaments' element={<Navigate to='/history' replace />} />
                </Route>
                <Route path='*' element={<Navigate to='/' replace />} />
            </Routes>
        </Router>
    )
}

export default AppRouter