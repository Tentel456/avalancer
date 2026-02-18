import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header/Header';
import Home from './pages/Home/Home';
import Register from './pages/Register/Register';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Profile/Profile';
import Market from './pages/Market/Market';
import CryptoDetail from './pages/CryptoDetail/CryptoDetail';
import Chats from './pages/Chats/Chats';
import Agents from './pages/Agents/Agents';
import Feed from './pages/Feed/Feed';
import RelationshipGraph from './pages/RelationshipGraph/RelationshipGraph';

function AppContent() {
  const location = useLocation();
  const showHeader = location.pathname === '/';

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/market" element={<Market />} />
        <Route path="/market/:coinId" element={<CryptoDetail />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/graph" element={<RelationshipGraph />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
