import React, { useState, useEffect } from 'react';
import { createDebt, updateDebt, getDebtPeople } from '../api';
import Autocomplete from './Autocomplete';

const AddDebtForm = ({ onDebtAdded, onCancel, initialData }) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize with default or existing data
    const [formData, setFormData] = useState({
        person_name: '',
        amount: '',
        debt_type: 'TAKEN',
        date: today,
        payment_mode: 'CASH',
        description: ''
    });

    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchPeople = async () => {
        try {
            const res = await getDebtPeople();
            setPeople(res.data);
        } catch (error) {
            console.error("Error fetching people list:", error);
        }
    };

    useEffect(() => {
        fetchPeople();
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData({
                person_name: initialData.person_name,
                amount: initialData.amount,
                debt_type: initialData.debt_type,
                date: initialData.date,
                payment_mode: initialData.payment_mode || 'CASH',
                description: initialData.description || ''
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData) {
                 await updateDebt(initialData.id, formData);
            } else {
                 await createDebt(formData);
            }
            onDebtAdded();
            if (onCancel) onCancel();
        } catch (error) {
            console.error("Error saving debt:", error);
            alert("Failed to save debt");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-card-dark p-6 rounded-xl border border-gray-700 shadow-2xl relative">
            <button 
                type="button" 
                onClick={onCancel}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h3 className="text-xl font-bold text-primary mb-6">
                {initialData ? 'Edit Debt' : 'Add Existing Debt'}
            </h3>
            {!initialData && (
                <p className="text-gray-400 text-sm mb-6 -mt-4">
                    Record a debt from before you started using this app. This will not affect your current cash/account balance.
                </p>
            )}

            <div className="grid gap-5">
                {/* Person Name */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Person Name</label>
                    <Autocomplete
                        value={formData.person_name}
                        onChange={(val) => setFormData(prev => ({ ...prev, person_name: val }))}
                        suggestions={people}
                        placeholder="Type to search or add a new person..."
                        required={true}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Amount</label>
                        <input 
                            type="number" 
                            name="amount" 
                            value={formData.amount} 
                            onChange={handleChange}
                            required
                            min="0.01"
                            step="0.01"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-all font-mono"
                            placeholder="0.00"
                        />
                    </div>
                    
                    {/* Date */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Original Date</label>
                        <input 
                            type="date" 
                            name="date" 
                            value={formData.date} 
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Type */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Type</label>
                        <select 
                            name="debt_type" 
                            value={formData.debt_type} 
                            onChange={handleChange}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-all appearance-none cursor-pointer"
                        >
                            <option value="TAKEN">Taken (To Pay)</option>
                            <option value="GIVEN">Given (To Receive)</option>
                        </select>
                    </div>

                    {/* Mode (Optional/Record) */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Original Mode</label>
                        <select 
                            name="payment_mode" 
                            value={formData.payment_mode} 
                            onChange={handleChange}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white transition-all appearance-none cursor-pointer"
                        >
                            <option value="CASH">Cash</option>
                            <option value="ACCOUNT">Account</option>
                        </select>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Description (Optional)</label>
                    <textarea 
                        name="description" 
                        value={formData.description} 
                        onChange={handleChange}
                        rows="2"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white placeholder-gray-600 transition-all resize-none animate-fade-in"
                        placeholder="Add notes, details, or items for this debt..."
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="mt-2 w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>{initialData ? 'Update Debt' : 'Record Debt'}</>
                    )}
                </button>
            </div>
        </form>
    );
};

export default AddDebtForm;
