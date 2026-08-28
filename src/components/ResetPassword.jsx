import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resetPassword } from '../api';
import PasswordInput from './PasswordInput';

const ResetPassword = () => {
    const { uid, token } = useParams();
    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { password, confirmPassword } = formData;

        if (!password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await resetPassword(uid, token, password, confirmPassword);
            setSuccess(true);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError("This reset link is invalid, expired, or has already been used.");
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
                        Reset Password
                    </h2>
                    <p className="text-text-muted mt-2 text-sm font-semibold">
                        Enter your new secure password
                    </p>
                </div>

                {success ? (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto border border-success/20">
                            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-text-main">Password Updated!</h3>
                        <p className="text-sm text-text-muted font-semibold leading-relaxed">
                            Your password has been reset successfully. You can now log in using your new credentials.
                        </p>
                        <Link 
                            to="/login"
                            className="inline-block w-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-black font-extrabold py-3.5 rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider text-center"
                        >
                            Sign In
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">New Password</label>
                            <PasswordInput 
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Choose new password"
                                className="focus:border-primary"
                                required
                                leftIcon={
                                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Confirm New Password</label>
                            <PasswordInput 
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm new password"
                                className="focus:border-secondary"
                                required
                                leftIcon={
                                    <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                }
                            />
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
                            className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-black font-extrabold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] cursor-pointer mt-2 text-sm uppercase tracking-wider"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                    <span>Resetting Password...</span>
                                </div>
                            ) : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
