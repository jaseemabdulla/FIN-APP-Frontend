import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getDailyReport, deleteTransaction } from '../api';
import TransactionForm from './TransactionForm';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingTransaction, setEditingTransaction] = useState(null);

    // Parse query params
    const queryParams = new URLSearchParams(location.search);
    const highlightTxnId = queryParams.get('txnId') ? parseInt(queryParams.get('txnId')) : null;

    // Sync date from URL if provided
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const dateParam = params.get('date');
        if (dateParam && dateParam !== date) {
            setDate(dateParam);
        }
    }, [location.search]);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getDailyReport(date);
            setReport(res.data);
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleEdit = (txn) => {
        if (txn.transaction_type.startsWith('FUND_MANAGEMENT')) {
            alert("This transaction is automatically managed by the Fund Management module. Please edit the corresponding fund instead.");
            return;
        }
        setEditingTransaction(txn);
    };

    const handleCancelEdit = () => {
        setEditingTransaction(null);
    };

    const handleDelete = async (id) => {
        const txn = report?.transactions?.find(t => t.id === id);
        if (txn && txn.transaction_type.startsWith('FUND_MANAGEMENT')) {
            alert("This transaction is automatically managed by the Fund Management module. Please delete or settle the corresponding fund instead.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            try {
                await deleteTransaction(id);
                fetchReport();
            } catch (error) {
                console.error("Error deleting transaction", error);
                alert("Failed to delete transaction");
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Daily Dashboard</h2>
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full sm:w-auto bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 outline-none focus:border-primary cursor-pointer text-sm"
                />
            </div>

            <TransactionForm 
                onTransactionAdded={fetchReport} 
                editingTransaction={editingTransaction}
                onCancelEdit={handleCancelEdit}
                selectedDate={date}
            />

            {loading ? (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            ) : report ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <SummaryCard title="Opening Balance" value={report.opening_balance.total} sub={`Cash: ${report.opening_balance.cash} | Acc: ${report.opening_balance.account}`} />
                        <SummaryCard title="Income" value={report.total_income} color="text-green-400" />
                        <SummaryCard title="Expense" value={report.total_expense} color="text-red-400" />
                        <SummaryCard title="Closing Balance" value={report.closing_balance.total} sub={`Cash: ${report.closing_balance.cash} | Acc: ${report.closing_balance.account}`} highlight />
                    </div>

                    {/* Transactions List */}
                    <div className="bg-card-dark rounded-xl shadow border border-gray-700/60 overflow-hidden">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Mode</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/60">
                                    {report.transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500">No transactions found.</td>
                                        </tr>
                                    ) : (
                                        report.transactions.map((txn) => {
                                            const isHighlighted = txn.id === highlightTxnId;
                                            return (
                                                <tr 
                                                    key={txn.id} 
                                                    ref={el => {
                                                        if (isHighlighted && el) {
                                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        }
                                                    }}
                                                    className={`transition-all duration-500 ${
                                                        isHighlighted 
                                                        ? 'bg-primary/20 border-y border-primary hover:bg-primary/25 shadow-lg shadow-primary/10 animate-pulse' 
                                                        : 'hover:bg-gray-800/40 transition-colors'
                                                    }`}
                                                >
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${txn.payment_mode === 'CASH' ? 'bg-yellow-900 text-yellow-200' : 'bg-blue-900 text-blue-200'}`}>
                                                        {txn.payment_mode}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-semibold">
                                                     <span className={`${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                        {txn.transaction_type.startsWith('FUND_MANAGEMENT') ? 'Fund Management' : txn.transaction_type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-300">{txn.category_name}</td>
                                                <td className="px-4 py-3 text-gray-300">
                                                    {txn.description}
                                                    {txn.event_name && <span className="block text-xs text-purple-400 mt-0.5">Event: {txn.event_name}</span>}
                                                    {txn.related_fund && (
                                                        <span 
                                                            onClick={() => navigate(`/funds?id=${txn.related_fund}`)}
                                                            className="block text-[10px] text-secondary hover:text-emerald-300 font-bold bg-secondary/10 border border-secondary/20 px-1.5 py-0.5 rounded w-max mt-1 cursor-pointer"
                                                        >
                                                            💰 Fund: {txn.related_fund_title}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                    {['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? '-' : '+'}{parseFloat(txn.amount).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <button onClick={() => handleEdit(txn)} className="text-blue-400 hover:text-blue-300 mr-3 text-xs uppercase font-bold tracking-wide">Edit</button>
                                                    <button onClick={() => handleDelete(txn.id)} className="text-red-400 hover:text-red-300 text-xs uppercase font-bold tracking-wide">Delete</button>
                                                </td>
                                            </tr>
                                        );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="md:hidden divide-y divide-gray-800">
                            {report.transactions.length === 0 ? (
                                <div className="px-4 py-8 text-center text-gray-500 text-sm">No transactions found.</div>
                            ) : (
                                report.transactions.map((txn) => {
                                    const isHighlighted = txn.id === highlightTxnId;
                                    return (
                                        <div 
                                            key={txn.id} 
                                            ref={el => {
                                                if (isHighlighted && el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }}
                                            className={`p-4 flex flex-col gap-2.5 transition-all duration-500 ${
                                                isHighlighted 
                                                ? 'bg-primary/20 border-l-4 border-primary shadow-lg shadow-primary/10 animate-pulse font-medium' 
                                                : 'hover:bg-gray-800/10 transition-colors'
                                            }`}
                                        >
                                        <div className="flex justify-between items-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${txn.payment_mode === 'CASH' ? 'bg-yellow-900 text-yellow-200' : 'bg-blue-900 text-blue-200'}`}>
                                                {txn.payment_mode}
                                            </span>
                                            <span className={`text-base font-extrabold ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                {['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? '-' : '+'}{parseFloat(txn.amount).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                    {txn.category_name}
                                                </span>
                                                {txn.description && (
                                                    <span className="text-sm text-gray-200 font-medium mt-0.5">
                                                        {txn.description}
                                                    </span>
                                                )}
                                                {txn.event_name && (
                                                    <span className="inline-block self-start text-[10px] bg-purple-950/60 text-purple-400 border border-purple-900 px-1.5 py-0.5 rounded mt-1">
                                                        🎪 Event: {txn.event_name}
                                                    </span>
                                                )}
                                                {txn.related_fund && (
                                                    <span 
                                                        onClick={() => navigate(`/funds?id=${txn.related_fund}`)}
                                                        className="inline-block self-start text-[10px] bg-secondary/10 text-secondary border border-secondary/20 px-1.5 py-0.5 rounded mt-1 cursor-pointer"
                                                    >
                                                        💰 Fund: {txn.related_fund_title}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 font-bold uppercase whitespace-nowrap pt-0.5">
                                                {txn.transaction_type.startsWith('FUND_MANAGEMENT') ? 'Fund Management' : txn.transaction_type.replace('_', ' ')}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-4 mt-1 pt-2 border-t border-gray-800/40">
                                            <button 
                                                onClick={() => handleEdit(txn)} 
                                                className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(txn.id)} 
                                                className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                                })
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
};

const SummaryCard = ({ title, value, sub, color = 'text-white', highlight = false }) => (
    <div className={`p-4 rounded-xl border flex flex-col justify-between ${highlight ? 'bg-gray-800 border-primary' : 'bg-card-dark border-gray-700/60'}`}>
        <div>
            <h4 className="text-gray-400 text-[10px] sm:text-xs uppercase font-semibold tracking-wider mb-1">{title}</h4>
            <div className={`text-xl sm:text-2xl font-bold truncate ${color}`}>{parseFloat(value || 0).toLocaleString()}</div>
        </div>
        {sub && (
            <div className="text-[10px] text-gray-500 mt-2 leading-relaxed border-t border-gray-800/50 pt-1.5">
                {sub.replace(/ \| /g, '\n').split('\n').map((line, idx) => (
                    <span key={idx} className="block">{line}</span>
                ))}
            </div>
        )}
    </div>
);

export default Dashboard;
