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
        <div className="min-h-screen flex items-center justify-center bg-bg-dark text-white p-4">
            <div className="w-full max-w-md bg-card-dark p-8 rounded-2xl shadow-xl border border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
                
                <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Welcome</h2>
                <p className="text-gray-400 mb-8">Let's set up your starting balances.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Cash in Hand</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                            <input 
                                type="text"
                                name="cash_balance"
                                value={formData.cash_balance}
                                onChange={handleChange}
                                placeholder="0"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-8 pr-4 text-white placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Bank Account Balance</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                            <input 
                                type="text"
                                name="account_balance"
                                value={formData.account_balance}
                                onChange={handleChange}
                                placeholder="0"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-8 pr-4 text-white placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/30 text-red-400 text-sm rounded border border-red-900/50">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary-hover hover:to-secondary-hover text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                    >
                        {loading ? 'Setting up...' : 'Start Tracking'}
                    </button>
                    
                    <p className="text-xs text-center text-gray-600 mt-4">
                        You can add debts and other details later.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default SetupScreen;
