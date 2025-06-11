import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/admin/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import MenuItemsPage from './pages/MenuItemsPage';
import AIModelsPage from './pages/AIModelsPage';
import ApiKeysPage from './pages/ApiKeysPage';
import OrdersPage from './pages/OrdersPage';
import FullChatPage from './pages/FullChatPage';
import { useAuth } from './context/AuthContext';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="menu-items" element={<MenuItemsPage />} />
            <Route path="ai-models" element={<AIModelsPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="chat" element={<FullChatPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
