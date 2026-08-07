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
    const [showForm, setShowForm] = useState(false);

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

    // Listen for Quick Add event from app navigation
    useEffect(() => {
        const handleTrigger = () => {
            setEditingTransaction(null);
            setShowForm(true);
        };
        window.addEventListener('trigger_add_transaction', handleTrigger);
        return () => window.removeEventListener('trigger_add_transaction', handleTrigger);
    }, []);

    const handleEdit = (txn) => {
        if (txn.transaction_type.startsWith('FUND_MANAGEMENT')) {
            alert("This transaction is automatically managed by the Fund Management module. Please edit the corresponding fund instead.");
            return;
        }
        setEditingTransaction(txn);
        setShowForm(true);
    };

    const handleCancelEdit = () => {
        setEditingTransaction(null);
        setShowForm(false);
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

    // Helper for transaction type details
    const getTxnTypeBadge = (type) => {
        const isOutflow = ['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(type);
        const colorClass = isOutflow ? 'text-error' : 'text-success';
        const label = type.startsWith('FUND_MANAGEMENT') ? 'Fund Management' : type.replace('_', ' ');
        return { isOutflow, colorClass, label };
    };

    // Get emoji/icon for category
    const getCategoryEmoji = (catName) => {
        const name = catName.toLowerCase();
        if (name.includes('food') || name.includes('eat') || name.includes('restaurant')) return '🍔';
        if (name.includes('rent') || name.includes('flat') || name.includes('house')) return '🏠';
        if (name.includes('travel') || name.includes('cab') || name.includes('metro') || name.includes('fuel') || name.includes('bike')) return '🚗';
        if (name.includes('movie') || name.includes('show') || name.includes('entertainment') || name.includes('game')) return '🎬';
        if (name.includes('shop') || name.includes('clothes') || name.includes('store')) return '🛍️';
        if (name.includes('salary') || name.includes('wage') || name.includes('work')) return '💼';
        if (name.includes('medical') || name.includes('health') || name.includes('doctor') || name.includes('medicine')) return '💊';
        if (name.includes('loan') || name.includes('debt') || name.includes('borrow')) return '🤝';
        if (name.includes('invest') || name.includes('stock') || name.includes('mutual')) return '📈';
        if (name.includes('bill') || name.includes('recharge') || name.includes('phone') || name.includes('wifi')) return '⚡';
        return '💰';
    };

    return (
        <div className="max-w-4xl mx-auto px-4 text-text-main">
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 animate-fade-in">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">Daily Dashboard</h2>
                    <p className="text-xs sm:text-sm text-text-muted mt-0.5">Track and view your ledger items for the selected day.</p>
                </div>
                
                <div className="flex gap-2 items-center w-full sm:w-auto">
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="flex-1 sm:flex-initial bg-card-dark text-text-main border border-border-main rounded-xl px-4 py-2.5 outline-none focus:border-primary cursor-pointer text-sm font-semibold select-none shadow"
                    />
                    
                    {/* Add Transaction Button for Desktop */}
                    <button 
                        onClick={() => { setEditingTransaction(null); setShowForm(true); }}
                        className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-black font-bold px-4 py-2.5 rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Transaction</span>
                    </button>
                </div>
            </div>

            {/* Quick action button for mobile dashboard view */}
            <div className="sm:hidden mb-6">
                <button 
                    onClick={() => { setEditingTransaction(null); setShowForm(true); }}
                    className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-black font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm active:scale-[0.99] transition-transform"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Transaction</span>
                </button>
            </div>

            {/* Responsive Modal/Drawer Form Overlay */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
                        onClick={handleCancelEdit}
                    ></div>
                    
                    {/* Modal Content */}
                    <div className="relative w-full sm:max-w-xl bg-card-dark border-t sm:border border-border-main rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto z-10 animate-slide-up sm:animate-fade-in pb-10 sm:pb-6">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-main">
                            <h3 className="text-base sm:text-lg font-bold text-text-main">
                                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
                            </h3>
                            <button 
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded-lg bg-bg-dark border border-border-main text-text-muted hover:text-text-main cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <TransactionForm 
                            onTransactionAdded={() => { fetchReport(); setShowForm(false); setEditingTransaction(null); }} 
                            editingTransaction={editingTransaction}
                            onCancelEdit={handleCancelEdit}
                            selectedDate={date}
                        />
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 flex flex-col justify-center items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-text-muted text-sm font-medium">Fetching details...</p>
                </div>
            ) : report ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
                        <SummaryCard 
                            title="Opening Balance" 
                            value={report.opening_balance.total} 
                            sub={`Cash: ${report.opening_balance.cash} | Acc: ${report.opening_balance.account}`} 
                            variant="opening"
                        />
                        <SummaryCard 
                            title="Income" 
                            value={report.total_income} 
                            variant="income"
                        />
                        <SummaryCard 
                            title="Expense" 
                            value={report.total_expense} 
                            variant="expense"
                        />
                        <SummaryCard 
                            title="Closing Balance" 
                            value={report.closing_balance.total} 
                            sub={`Cash: ${report.closing_balance.cash} | Acc: ${report.closing_balance.account}`} 
                            variant="closing"
                        />
                    </div>

                    {/* Transactions Header */}
                    <div className="flex items-center justify-between mb-4 animate-fade-in">
                        <h3 className="text-base sm:text-lg font-bold text-text-main">Today's Transactions</h3>
                        <span className="text-xs font-semibold text-text-muted bg-card-dark border border-border-main px-2.5 py-1 rounded-lg">
                            {report.transactions.length} record(s)
                        </span>
                    </div>

                    {/* Transactions List */}
                    <div className="bg-card-dark rounded-2xl shadow border border-border-main overflow-hidden animate-fade-in">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-bg-dark/60 text-text-muted uppercase text-[10px] font-bold tracking-wider border-b border-border-main">
                                    <tr>
                                        <th className="px-5 py-3.5">Mode</th>
                                        <th className="px-5 py-3.5">Type</th>
                                        <th className="px-5 py-3.5">Category</th>
                                        <th className="px-5 py-3.5">Description</th>
                                        <th className="px-5 py-3.5 text-right">Amount</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-main/50">
                                    {report.transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-5 py-10 text-center text-text-muted font-medium">No transactions found.</td>
                                        </tr>
                                    ) : (
                                        report.transactions.map((txn) => {
                                            const isHighlighted = txn.id === highlightTxnId;
                                            const badgeInfo = getTxnTypeBadge(txn.transaction_type);
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
                                                        ? 'bg-primary/10 border-y border-primary/30' 
                                                        : 'hover:bg-bg-dark/30 transition-colors'
                                                    }`}
                                                >
                                                <td className="px-5 py-3.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${txn.payment_mode === 'CASH' ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-900/40' : 'bg-blue-950/60 text-blue-400 border border-blue-900/40'}`}>
                                                        {txn.payment_mode}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 font-bold">
                                                     <span className={badgeInfo.colorClass}>
                                                        {badgeInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-text-muted font-semibold flex items-center gap-1.5 mt-0.5">
                                                    <span>{getCategoryEmoji(txn.category_name)}</span>
                                                    <span>{txn.category_name}</span>
                                                </td>
                                                <td className="px-5 py-3.5 text-text-main font-medium">
                                                    {txn.description}
                                                    {txn.event_name && <span className="block text-[10px] text-purple-400 mt-1 font-semibold bg-purple-950/40 border border-purple-900/30 px-1.5 py-0.5 rounded w-max">🎪 Event: {txn.event_name}</span>}
                                                    {txn.related_fund && (
                                                        <span 
                                                            onClick={() => navigate(`/funds?id=${txn.related_fund}`)}
                                                            className="block text-[10px] text-secondary hover:text-emerald-300 font-bold bg-secondary/10 border border-secondary/20 px-1.5 py-0.5 rounded w-max mt-1 cursor-pointer"
                                                        >
                                                            💰 Fund: {txn.related_fund_title}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`px-5 py-3.5 text-right font-extrabold text-sm ${badgeInfo.colorClass}`}>
                                                    {badgeInfo.isOutflow ? '-' : '+'}{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    <button onClick={() => handleEdit(txn)} className="text-primary hover:text-purple-300 mr-4.5 text-xs uppercase font-extrabold tracking-wider cursor-pointer">Edit</button>
                                                    <button onClick={() => handleDelete(txn.id)} className="text-error hover:text-red-400 text-xs uppercase font-extrabold tracking-wider cursor-pointer">Delete</button>
                                                </td>
                                            </tr>
                                        );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="md:hidden divide-y divide-border-main/50">
                            {report.transactions.length === 0 ? (
                                <div className="px-5 py-10 text-center text-text-muted text-sm font-medium">No transactions found.</div>
                            ) : (
                                report.transactions.map((txn) => {
                                    const isHighlighted = txn.id === highlightTxnId;
                                    const badgeInfo = getTxnTypeBadge(txn.transaction_type);
                                    return (
                                        <div 
                                            key={txn.id} 
                                            ref={el => {
                                                if (isHighlighted && el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }}
                                            className={`p-4 flex flex-col gap-2 transition-all duration-500 ${
                                                isHighlighted 
                                                ? 'bg-primary/10 border-l-4 border-primary font-medium' 
                                                : 'hover:bg-bg-dark/10 transition-colors'
                                            }`}
                                        >
                                            {/* Row 1: Category Emoji/Title & Amount */}
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-bg-dark border border-border-main flex items-center justify-center text-sm shrink-0">
                                                        {getCategoryEmoji(txn.category_name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                                                            {txn.category_name}
                                                        </span>
                                                        {txn.description && (
                                                            <span className="text-sm text-text-main font-medium truncate block">
                                                                {txn.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <span className={`text-base font-extrabold ${badgeInfo.colorClass}`}>
                                                    {badgeInfo.isOutflow ? '-' : '+'}{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            {/* Row 2: Badges and Tags */}
                                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${txn.payment_mode === 'CASH' ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-900/40' : 'bg-blue-950/60 text-blue-400 border border-blue-900/40'}`}>
                                                    {txn.payment_mode}
                                                </span>
                                                <span className={`text-[9px] font-bold bg-bg-dark/50 border border-border-main px-2 py-0.5 rounded uppercase ${badgeInfo.colorClass}`}>
                                                    {badgeInfo.label}
                                                </span>
                                                {txn.event_name && (
                                                    <span className="text-[9px] bg-purple-950/40 text-purple-400 border border-purple-900/30 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                                                        🎪 {txn.event_name}
                                                    </span>
                                                )}
                                                {txn.related_fund && (
                                                    <span 
                                                        onClick={() => navigate(`/funds?id=${txn.related_fund}`)}
                                                        className="text-[9px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded font-bold uppercase cursor-pointer"
                                                    >
                                                        💰 Fund: {txn.related_fund_title}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Row 3: Action Buttons */}
                                            <div className="flex justify-end gap-4 mt-2 pt-2 border-t border-border-main/30">
                                                <button 
                                                    onClick={() => handleEdit(txn)} 
                                                    className="text-primary hover:text-purple-300 text-xs font-extrabold uppercase tracking-widest cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(txn.id)} 
                                                    className="text-error hover:text-red-400 text-xs font-extrabold uppercase tracking-widest cursor-pointer"
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

const SummaryCard = ({ title, value, sub, variant }) => {
    let cardStyle = "bg-card-dark border-border-main";
    let textStyle = "text-text-main";
    let subBorder = "border-border-main/50";
    
    switch (variant) {
        case 'opening':
            cardStyle = "bg-slate-500/5 border-slate-500/25";
            break;
        case 'income':
            cardStyle = "bg-emerald-500/5 border-emerald-500/20";
            textStyle = "text-emerald-500 dark:text-emerald-400";
            break;
        case 'expense':
            cardStyle = "bg-rose-500/5 border-rose-500/20";
            textStyle = "text-rose-500 dark:text-rose-400";
            break;
        case 'closing':
            cardStyle = "bg-primary/5 border-primary/20 shadow-md shadow-primary/2";
            break;
    }
    
    return (
        <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-colors duration-200 ${cardStyle}`}>
            <div>
                <h4 className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-widest mb-1.5">{title}</h4>
                <div className={`text-lg sm:text-2xl font-black truncate ${textStyle}`}>
                    ₹{parseFloat(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </div>
            </div>
            {sub && (
                <div className={`text-[10px] text-text-muted mt-2.5 leading-relaxed border-t pt-2 font-semibold ${subBorder}`}>
                    {sub.replace(/ \| /g, '\n').split('\n').map((line, idx) => (
                        <span key={idx} className="block">{line}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
