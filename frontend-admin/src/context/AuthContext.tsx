import { createContext, useState, useEffect, useContext, useCallback, type ReactNode } from 'react';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a separate axios instance for auth to avoid circular dependencies
const authAxios = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure main axios instance
const apiAxios = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${import.meta.env.VITE_API_PREFIX || '/api/v1'}`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTokenRequest, setRefreshTokenRequest] = useState<Promise<string> | null>(null);

  // Set default auth header for API requests
  useEffect(() => {
    if (token) {
      apiAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      authAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
    } else {
      delete apiAxios.defaults.headers.common['Authorization'];
      delete authAxios.defaults.headers.common['Authorization'];
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, [token]);

  // Function to refresh the access token
  const refreshAccessToken = useCallback(async (): Promise<string> => {
    try {
      const { data } = await authAxios.post('/auth/refresh-token');
      const newToken = data.accessToken;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      return newToken;
    } catch (error) {
      // If refresh fails, log the user out
      await logout();
      throw error;
    }
  }, []);

  // Add request interceptor to add auth token to requests
  useEffect(() => {
    const requestInterceptor = apiAxios.interceptors.request.use(
      (config) => {
        // Don't add auth header for login/refresh-token requests
        if (config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh-token')) {
          return config;
        }
        
        const currentToken = token || localStorage.getItem('token');
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle 401 responses
    const responseInterceptor = apiAxios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // If error is not 401 or if this is a retry request, reject
        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
          return Promise.reject(error);
        }

        // Mark this request as a retry to prevent infinite loops
        originalRequest._retry = true;

        try {
          // If we don't have a refresh in progress, start one
          if (!refreshTokenRequest) {
            setRefreshTokenRequest(refreshAccessToken());
          }
          
          // Wait for the refresh to complete
          const newToken = await refreshTokenRequest;
          
          // Update the auth header for the original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          
          // Clear the refresh request
          setRefreshTokenRequest(null);
          
          // Retry the original request
          return apiAxios(originalRequest);
        } catch (refreshError) {
          // If refresh fails, log the user out
          await logout();
          return Promise.reject(refreshError);
        }
      }
    );

    // Limpia los interceptores cuando el componente se desmonta
    return () => {
      apiAxios.interceptors.request.eject(requestInterceptor);
      apiAxios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, refreshAccessToken, refreshTokenRequest]);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await authAxios.post('/auth/login', {
        email,
        password,
      });

      if (data.user.role !== 'admin') {
        return { success: false, error: 'Acceso denegado. Solo para administradores.' };
      }

      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setIsAuthenticated(true);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Error de inicio de sesión. Por favor, inténtalo de nuevo.' 
      };
    }
  };

  const logout = async () => {
    try {
      await authAxios.post('/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      delete apiAxios.defaults.headers.common['Authorization'];
      delete authAxios.defaults.headers.common['Authorization'];
    }
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

// Exporta la instancia de axios configurada para llamadas a la API
export { apiAxios as axios };
