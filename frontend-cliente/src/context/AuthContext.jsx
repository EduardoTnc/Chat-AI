import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	
	const [token, setToken] = useState(localStorage.getItem("token") || "");
	const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    });
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [loading, setLoading] = useState(true);

	const urlBase = import.meta.env.VITE_API_URL || "http://localhost:5001";
	const apiPrefix = import.meta.env.VITE_API_PREFIX || '/api/v1';
	const urlApi = `${urlBase}${apiPrefix}`;

	let isRefreshing = false;
	let failedQueue = [];

	const processQueue = (error, token = null) => {
		failedQueue.forEach((prom) => {
			if (error) {
				prom.reject(error);
			} else {
				prom.resolve(token);
			}
		});

		failedQueue = [];
	};

	const refreshAuthToken = async () => {
		if (isRefreshing) {
			return new Promise((resolve, reject) => {
				failedQueue.push({ resolve, reject });
			});
		}
		isRefreshing = true;
		try {
			const response = await axios.post(`${urlApi}/auth/refresh-token`, {}, { withCredentials: true });
			const { accessToken: newAccessToken } = response.data;
			setToken(newAccessToken);
			localStorage.setItem("token", newAccessToken);
			processQueue(null, newAccessToken);
			return newAccessToken;
		} catch (error) {
			logout();
			processQueue(error, null);
			throw error;
		} finally {
			isRefreshing = false;
		}
	};

	const login = async (email, password) => {
		console.log('Login - Intentando iniciar sesión...');
		try {
			const { data } = await axios.post(`${urlApi}/auth/login`, {
				email,
				password,
			}, { withCredentials: true });
			console.log('Login - Respuesta exitosa:', data);
			setToken(data.accessToken);
			localStorage.setItem("token", data.accessToken);
			setUser(data.user);
			localStorage.setItem("user", JSON.stringify(data.user));
			setIsAuthenticated(true);
			return { success: true };
		} catch (error) {
			console.error('Login - Error:', error);
			return { success: false, error: error.response?.data?.message || error.message };
		}
	};

	const logout = async () => {
		setToken("");
		localStorage.removeItem("token");
		setUser(null);
		localStorage.removeItem("user");
		setIsAuthenticated(false);
		try {
			await axios.post(`${urlApi}/auth/logout`);
		} catch (error) {
			console.error("Error during logout API call:", error);
		}
	};

	const fetchUserData = async () => {

		try {
			const response = await axios.get(`${urlApi}/auth/me`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (response.data.success) {
				setUser(response.data.user);
				setIsAuthenticated(true);
				console.log("User data fetched successfully:", response.data.user);
			} else {
				logout();
				console.log("User data not fetched successfully:", response.data.user);
			}
		} catch (error) {
			logout();
			console.log("Error fetching user data:", error);
		} finally {
            setLoading(false);
        }

	};

	useEffect(() => {
		if (token && !user) {
			fetchUserData();
		}
	}, [token, user]);

    // New useEffect for initial authentication check
    useEffect(() => {
        const checkInitialAuth = async () => {
            if (!token) {
                try {
                    console.log("Attempting to refresh token on initial load...");
                    const newAccessToken = await refreshAuthToken();
                    if (newAccessToken) {
                        // If refresh was successful, fetch user data
                        await fetchUserData();
                    }
                } catch (error) {
                    console.error("Initial token refresh failed:", error);
                    logout(); // Ensure user is logged out if refresh fails
                } finally {
                    setLoading(false);
                }
            } else if (token && !user) {
                // If token exists but user data is missing (e.g., from localStorage being cleared selectively)
                await fetchUserData();
            } else {
                // If token and user data exist, set authenticated and stop loading
                setIsAuthenticated(true);
                setLoading(false);
            }
        };

        checkInitialAuth();
    }, []); // Empty dependency array means this runs once on mount


	// MARK: - Axios Interceptors
	useEffect(() => {
		const requestInterceptor = axios.interceptors.request.use(
			(config) => {
				if (token) {
					config.headers.Authorization = `Bearer ${token}`;
					config.withCredentials = true;
				}
				return config;
			},
			(error) => {
				return Promise.reject(error);
			}
		);

		const responseInterceptor = axios.interceptors.response.use(
			(response) => response,
			async (error) => {
				console.error('Axios interceptor - Error de respuesta:', error.response);
				const originalRequest = error.config;

				// Si el error es 401 (Unauthorized) y no es un reintento
				if (error.response.status === 401 && !originalRequest._retry) {
					console.log('Axios interceptor - Error 401 detectado. Intentando refrescar token...');
					originalRequest._retry = true;

					try {
						// Llamar a la API para refrescar el token
						const newAccessToken = await refreshAuthToken();
						console.log('Axios interceptor - Token refrescado exitosamente:', newAccessToken);

						// Actualizar el token en el estado y en el header de la solicitud original
						originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

						// Reintentar la solicitud original
						console.log('Axios interceptor - Reintentando solicitud original...');
						return axios(originalRequest);
					} catch (refreshError) {
						console.error('Axios interceptor - Error al refrescar el token:', refreshError.response || refreshError);
						// Si falla el refresh, forzar logout
						logout();
						return Promise.reject(refreshError);
					}
				}

				return Promise.reject(error);
			}
		);

		return () => {
			axios.interceptors.request.eject(requestInterceptor);
			axios.interceptors.response.eject(responseInterceptor);
		};
	}, [token, urlApi]);



	return (
		<AuthContext.Provider
			value={{
				token,
				user,
				isAuthenticated,
				loading,
				login,
				logout,
				urlBase,
				urlApi,
				fetchUserData,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
