import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, logoutUser, getCurrentUser, checkUsersExist } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [usersExist, setUsersExist] = useState(true); // default true to avoid premature redirect

    const checkAuth = async () => {
        const token = localStorage.getItem('access_token');
        try {
            // First check if any users exist in the system
            const existRes = await checkUsersExist();
            setUsersExist(existRes.data.exists);

            if (token) {
                const userRes = await getCurrentUser();
                setUser(userRes.data);
            }
        } catch (error) {
            console.error("Auth verification failed", error);
            // Clear invalid tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
        
        const handleSessionExpired = () => {
            setUser(null);
            checkUsersExist()
                .then(res => setUsersExist(res.data.exists))
                .catch(err => console.error("Failed to check user existence on session expiry", err));
        };

        window.addEventListener('auth_session_expired', handleSessionExpired);
        return () => window.removeEventListener('auth_session_expired', handleSessionExpired);
    }, []);

    const login = async (username, password) => {
        const response = await loginUser({ username, password });
        const { access, refresh } = response.data;
        
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        
        const userResponse = await getCurrentUser();
        setUser(userResponse.data);
        setUsersExist(true);
        return userResponse.data;
    };

    const register = async (username, email, password) => {
        const response = await registerUser({ username, email, password });
        const { access, refresh, user: registeredUser } = response.data;
        
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        
        setUser(registeredUser);
        setUsersExist(true);
        return registeredUser;
    };

    const logout = async () => {
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
            try {
                await logoutUser({ refresh });
            } catch (err) {
                console.error("Logout request failed", err);
            }
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        
        // Re-verify if users exist
        try {
            const existRes = await checkUsersExist();
            setUsersExist(existRes.data.exists);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, usersExist, login, register, logout, setUsersExist }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
