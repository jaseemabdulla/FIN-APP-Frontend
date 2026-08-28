import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyEmail } from '../api';

const VerifyEmail = () => {
    const { uid, token } = useParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const performVerification = async () => {
            try {
                await verifyEmail(uid, token);
                setStatus('success');
            } catch (err) {
                console.error(err);
                setStatus('error');
                if (err.response && err.response.data && err.response.data.detail) {
                    setErrorMessage(err.response.data.detail);
                } else {
                    setErrorMessage("Verification link is invalid, has expired, or was already used.");
                }
            }
        };

        performVerification();
    }, [uid, token]);

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 bg-bg-dark text-text-main">
            <div className="w-full max-w-md bg-card-dark p-8 rounded-2xl shadow-2xl border border-border-main relative overflow-hidden animate-fade-in text-center">
                {/* Glowing top line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary"></div>

                {status === 'verifying' && (
                    <div className="space-y-6 py-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <div>
                            <h2 className="text-2xl font-bold text-text-main">Verifying Email</h2>
                            <p className="text-sm text-text-muted mt-2 font-semibold">Please wait while we confirm your email address...</p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto border border-success/20">
                            <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                Email Verified!
                            </h2>
                            <p className="text-sm text-text-muted mt-2 font-semibold leading-relaxed">
                                Your account is now fully active. You can proceed to log in to manage your finances.
                            </p>
                        </div>
                        <Link 
                            to="/login"
                            className="inline-block w-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-black font-extrabold py-3.5 rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider text-center"
                        >
                            Sign In
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto border border-error/20">
                            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-error">
                                Verification Failed
                            </h2>
                            <p className="text-sm text-text-muted mt-2 font-semibold leading-relaxed">
                                {errorMessage}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pt-2">
                            <Link 
                                to="/resend-verification"
                                className="inline-block w-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-black font-extrabold py-3.5 rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider text-center"
                            >
                                Resend Verification Link
                            </Link>
                            <Link to="/login" className="text-sm font-bold text-text-muted hover:text-text-main transition-colors">
                                Back to Sign In
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
