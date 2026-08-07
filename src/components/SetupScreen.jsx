import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from '../api';

const SetupScreen = ({ onComplete }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        cash_balance: '',
        account_balance: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleChange = (e) => {
        const { name, value } = e.target;
        // Allow only numbers
        const rawValue = value.replace(/,/g, '');
        if (!isNaN(rawValue)) {
            setFormData(prev => ({ ...prev, [name]: rawValue }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await initializeApp({
                cash_balance: formData.cash_balance ? parseFloat(formData.cash_balance) : 0,
                account_balance: formData.account_balance ? parseFloat(formData.account_balance) : 0,
            });
            if (onComplete) {
                onComplete();
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to initialize. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark text-text-main p-4">
            <div className="w-full max-w-md bg-card-dark p-8 rounded-2xl shadow-xl border border-border-main relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-secondary"></div>
                
                <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Welcome</h2>
                <p className="text-text-muted mb-8 text-sm font-semibold">Let's set up your starting balances.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Cash in Hand</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-bold">₹</span>
                            <input 
                                type="text"
                                name="cash_balance"
                                value={formData.cash_balance}
                                onChange={handleChange}
                                placeholder="0"
                                className="w-full bg-bg-dark border border-border-main rounded-xl py-3 pl-8 pr-4 text-text-main placeholder-text-muted focus:border-primary outline-none transition-all font-semibold font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">Bank Account Balance</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-bold">₹</span>
                            <input 
                                type="text"
                                name="account_balance"
                                value={formData.account_balance}
                                onChange={handleChange}
                                placeholder="0"
                                className="w-full bg-bg-dark border border-border-main rounded-xl py-3 pl-8 pr-4 text-text-main placeholder-text-muted focus:border-primary outline-none transition-all font-semibold font-mono"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3.5 bg-error/10 text-error text-xs rounded-xl border border-error/20 font-semibold animate-pulse">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-95 text-black font-extrabold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] cursor-pointer text-sm uppercase tracking-wider"
                    >
                        {loading ? 'Setting up...' : 'Start Tracking'}
                    </button>
                    
                    <p className="text-xs text-center text-text-muted mt-4 font-semibold">
                        You can add debts, categories, and other accounts later.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default SetupScreen;
