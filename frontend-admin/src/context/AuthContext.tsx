import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import axios from 'axios';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin';
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);
    const [loading, setLoading] = useState<boolean>(true);

    const urlBase = import.meta.env.VITE_API_URL || "http://localhost:5001";
    const apiPrefix = import.meta.env.VITE_API_PREFIX || '/api/v1';
    const urlApi = `${urlBase}${apiPrefix}`;

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setIsAuthenticated(true);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            setIsAuthenticated(false);
        }
        setLoading(false);
    }, [token]);

    const login = async (email: string, password: string) => {
        try {
            const { data } = await axios.post(`${urlApi}/auth/login`, {
                email,
                password,
            });

            if (data.user.role !== 'admin') {
                return { success: false, error: 'Acceso denegado. Solo para administradores.' };
            }

            setToken(data.accessToken);
            setUser(data.user);
            localStorage.setItem("token", data.accessToken);
            localStorage.setItem("user", JSON.stringify(data.user));
            setIsAuthenticated(true);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.response?.data?.message || error.message };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ token, user, isAuthenticated, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
