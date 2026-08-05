import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkAppInit } from '../api';
import SetupScreen from './SetupScreen';

const ProtectedRoute = ({ children }) => {
    const { user, loading, usersExist } = useAuth();
    const [appInitialized, setAppInitialized] = useState(null); // null = checking

    useEffect(() => {
        if (user) {
            checkAppInit()
                .then(res => setAppInitialized(res.data.initialized))
                .catch(err => {
                    console.error("Failed to check app initialization:", err);
                    setAppInitialized(true); // Fallback to avoid getting stuck
                });
        }
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-dark flex items-center justify-center text-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold tracking-wider text-gray-400">Verifying session...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        if (usersExist === false) {
            return <Navigate to="/register" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    if (appInitialized === null) {
        return (
            <div className="min-h-screen bg-bg-dark flex items-center justify-center text-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold tracking-wider text-gray-400">Loading FinanceManager...</span>
                </div>
            </div>
        );
    }

    if (!appInitialized) {
        return <SetupScreen onComplete={() => setAppInitialized(true)} />;
    }

    return children;
};

export default ProtectedRoute;
