import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import TabBar from './components/TabBar';
import Matching from './pages/Matching';
import Matches from './pages/Matches';
import TeamList from './pages/TeamList';
import MyTeam from './pages/MyTeam';
import TeamSettings from './pages/TeamSettings';
import PlayerDetail from './pages/PlayerDetail';
import OpponentTeamDetail from './pages/OpponentTeamDetail';
import Profile from './pages/Profile';
import CreateMatch from './pages/CreateMatch';
import VipSubscription from './pages/VipSubscription';
import MatchEditor from './pages/MatchEditor';

import InviteLanding from './pages/InviteLanding';
import TeamVerification from './pages/TeamVerification';
import ChatList from './pages/ChatList';
import ChatDetail from './pages/ChatDetail';
import Login from './pages/Login';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppProvider>
        <Router>
          <AuthWrapper />
        </Router>
      </AppProvider>
    </ToastProvider>
  );
};

const AuthWrapper: React.FC = () => {
  const { isLoggedIn } = useApp();
  const location = useLocation();

  if (!isLoggedIn && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-md mx-auto bg-gray-100 min-h-screen shadow-2xl relative overflow-hidden">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Matching />} />
        <Route path="/create-match" element={<CreateMatch />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/match/:id/edit" element={<MatchEditor />} />
        <Route path="/team" element={<TeamList />} />
        <Route path="/my-team" element={<MyTeam />} />
        <Route path="/invite" element={<InviteLanding />} />
        <Route path="/team/settings" element={<TeamSettings />} />
        <Route path="/team/verification" element={<TeamVerification />} />
        <Route path="/team/player/:id" element={<PlayerDetail />} />
        <Route path="/team/opponent/:id" element={<OpponentTeamDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/vip-subscribe" element={<VipSubscription />} />
        <Route path="/messages" element={<ChatList />} />
        <Route path="/chat/:id" element={<ChatDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isLoggedIn && <TabBar />}
    </div>
  );
};

export default App;