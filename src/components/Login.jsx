import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const { login, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-bg-dark flex items-center justify-center text-primary">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold tracking-wider text-gray-400">Verifying session...</span>
                </div>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.username.trim() || !formData.password) {
            setError("Please fill in all fields.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await login(formData.username, formData.password);
            navigate('/');
        } catch (err) {
            console.error(err);
            if (err.response) {
                if (err.response.status >= 400 && err.response.status < 500) {
                    setError("Invalid credentials.");
                } else {
                    setError("Server is unavailable. Please try again later.");
                }
            } else {
                setError("Server is unavailable. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 bg-bg-dark text-text-main">
            <div className="w-full max-w-md bg-card-dark p-8 rounded-2xl shadow-2xl border border-border-main relative overflow-hidden animate-fade-in">
                {/* Glowing top line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary"></div>
                
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Welcome Back
                    </h2>
                    <p className="text-text-muted mt-2 text-sm font-semibold">
                        Sign in to manage your daily finances
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Username</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </span>
                            <input 
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Enter username"
                                className="w-full bg-bg-dark border border-border-main rounded-xl py-3.5 pl-11 pr-4 text-text-main placeholder-text-muted focus:border-primary outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </span>
                            <input 
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter password"
                                className="w-full bg-bg-dark border border-border-main rounded-xl py-3.5 pl-11 pr-4 text-text-main placeholder-text-muted focus:border-secondary outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3.5 bg-error/10 text-error text-xs rounded-xl border border-error/20 flex items-start gap-2.5 font-semibold">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-black font-extrabold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] cursor-pointer text-sm uppercase tracking-wider"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                <span>Authenticating...</span>
                            </div>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-border-main pt-6">
                    <p className="text-text-muted text-sm font-semibold">
                        First time tracking?{' '}
                        <Link to="/register" className="text-primary hover:text-primary-hover font-extrabold transition-colors">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
