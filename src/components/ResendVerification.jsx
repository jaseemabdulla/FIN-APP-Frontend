import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { resendVerificationEmail } from '../api';

const ResendVerification = () => {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await resendVerificationEmail(email.trim());
            setSuccess(true);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Something went wrong. Please try again later.");
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
                        Resend Verification
                    </h2>
                    <p className="text-text-muted mt-2 text-sm font-semibold">
                        Get a new email verification link
                    </p>
                </div>

                {success ? (
                    <div className="space-y-6 text-center">
                        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto border border-success/20">
                            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2" />
                            </svg>
                        </div>
                        <p className="text-sm text-text-muted font-semibold leading-relaxed">
                            If an account is associated with <span className="text-primary font-bold">{email}</span>, a verification link has been sent. Please check your inbox.
                        </p>
                        <Link 
                            to="/login"
                            className="inline-block w-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-black font-extrabold py-3.5 rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider text-center"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                <input 
                                    type="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter registration email"
                                    className="w-full bg-bg-dark border border-border-main rounded-xl py-3.5 pl-11 pr-4 text-text-main placeholder-text-muted focus:border-primary outline-none transition-all"
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
                                    <span>Sending Link...</span>
                                </div>
                            ) : 'Resend Verification'}
                        </button>

                        <div className="text-center border-t border-border-main pt-4 mt-4">
                            <Link to="/login" className="text-sm font-bold text-secondary hover:text-secondary-hover transition-colors">
                                Back to Sign In
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResendVerification;
