import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Invalid username or password. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 bg-bg-dark text-white">
            <div className="w-full max-w-md bg-card-dark p-8 rounded-2xl shadow-2xl border border-gray-800/80 relative overflow-hidden animate-fade-in">
                {/* Glowing top line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary"></div>
                
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Welcome Back
                    </h2>
                    <p className="text-gray-400 mt-2 text-sm">
                        Sign in to manage your daily finances
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
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
                                className="w-full bg-gray-900 border border-gray-700/80 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-300"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
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
                                className="w-full bg-gray-900 border border-gray-700/80 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all duration-300"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3.5 bg-red-900/20 text-red-400 text-sm rounded-xl border border-red-900/40 flex items-start gap-2.5 animate-pulse">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-black font-bold py-3.5 rounded-xl shadow-lg hover:shadow-cyan-500/10 hover:shadow-purple-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] cursor-pointer"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                <span>Authenticating...</span>
                            </div>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-gray-800/80 pt-6">
                    <p className="text-gray-400 text-sm">
                        First time tracking?{' '}
                        <Link to="/register" className="text-primary hover:text-primary-hover font-semibold transition-colors duration-200">
                            Create an account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
