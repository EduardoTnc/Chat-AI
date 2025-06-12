import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
createRoot(document.getElementById('root')!).render(

    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>

)
