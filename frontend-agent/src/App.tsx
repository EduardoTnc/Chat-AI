import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AgentChatPage from './pages/AgentChatPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AgentChatPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
