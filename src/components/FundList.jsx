import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
    getFundReports, 
    getFundDetails, 
    createFund, 
    settleFund, 
    reopenFund, 
    deleteFund, 
    createFundAddition, 
    deleteFundAddition, 
    createFundExpense, 
    deleteFundExpense,
    getCategories,
    BACKEND_URL
} from '../api';

const FundList = () => {
    const location = useLocation();
    const [reports, setReports] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedFund, setSelectedFund] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE or SETTLED

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAdditionModal, setShowAdditionModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);

    // Form states
    const [createForm, setCreateForm] = useState({
        title: '',
        purpose: '',
        provider: '',
        initial_amount: '',
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
        payment_mode: 'ACCOUNT'
    });

    const [additionForm, setAdditionForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        payment_mode: 'ACCOUNT'
    });

    const [expenseForm, setExpenseForm] = useState({
        title: '',
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        attachment: null,
        payment_mode: 'ACCOUNT'
    });

    const [settleForm, setSettleForm] = useState({
        settlement_date: new Date().toISOString().split('T')[0],
        returned_amount: '0',
        additional_amount_required: '0',
        settlement_notes: '',
        settlement_payment_mode: 'ACCOUNT'
    });

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getFundReports();
            setReports(res.data);
            
            // If a fund is currently selected, refresh its details
            if (selectedFund) {
                const detailRes = await getFundDetails(selectedFund.id);
                setSelectedFund(detailRes.data);
            }
        } catch (error) {
            console.error("Error fetching funds", error);
        } finally {
            setLoading(false);
        }
    }, [selectedFund]);

    const fetchCategories = async () => {
        try {
            const res = await getCategories();
            setCategories(res.data);
            if (res.data.length > 0) {
                setExpenseForm(prev => ({ ...prev, category: res.data[0].id }));
            }
        } catch (error) {
            console.error("Error fetching categories", error);
        }
    };

    useEffect(() => {
        fetchReports();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (reports) {
            const queryParams = new URLSearchParams(location.search);
            const fundIdParam = queryParams.get('id');
            if (fundIdParam) {
                const fundId = parseInt(fundIdParam);
                const allFunds = [
                    ...(reports.active_funds || []),
                    ...(reports.settled_funds || [])
                ];
                const fundToSelect = allFunds.find(f => f.id === fundId);
                if (fundToSelect) {
                    setActiveTab(fundToSelect.status);
                    getFundDetails(fundId).then(res => {
                        setSelectedFund(res.data);
                    }).catch(err => {
                        console.error("Failed to fetch fund details from query parameter", err);
                    });
                }
            }
        }
    }, [location.search, reports]);

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            await createFund(createForm);
            setShowCreateModal(false);
            setCreateForm({
                title: '',
                purpose: '',
                provider: '',
                initial_amount: '',
                received_date: new Date().toISOString().split('T')[0],
                notes: '',
                payment_mode: 'ACCOUNT'
            });
            fetchReports();
        } catch (error) {
            console.error("Failed to create fund", error);
            alert("Error creating fund: " + (error.response?.data?.error || error.message));
        }
    };

    const handleAdditionSubmit = async (e) => {
        e.preventDefault();
        try {
            await createFundAddition({
                fund: selectedFund.id,
                amount: additionForm.amount,
                date: additionForm.date,
                notes: additionForm.notes,
                payment_mode: additionForm.payment_mode
            });
            setShowAdditionModal(false);
            setAdditionForm({
                amount: '',
                date: new Date().toISOString().split('T')[0],
                notes: '',
                payment_mode: 'ACCOUNT'
            });
            fetchReports();
        } catch (error) {
            console.error("Failed to add funds", error);
            alert("Error adding funds: " + (error.response?.data?.error || error.message));
        }
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('fund', selectedFund.id);
        formData.append('title', expenseForm.title);
        formData.append('category', expenseForm.category);
        formData.append('amount', expenseForm.amount);
        formData.append('date', expenseForm.date);
        formData.append('description', expenseForm.description);
        formData.append('payment_mode', expenseForm.payment_mode);
        if (expenseForm.attachment) {
            formData.append('attachment', expenseForm.attachment);
        }

        try {
            await createFundExpense(formData);
            setShowExpenseModal(false);
            setExpenseForm({
                title: '',
                category: categories[0]?.id || '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                attachment: null,
                payment_mode: 'ACCOUNT'
            });
            fetchReports();
        } catch (error) {
            console.error("Failed to add expense", error);
            alert("Error adding expense: " + (error.response?.data?.error || error.message));
        }
    };

    const handleSettleSubmit = async (e) => {
        e.preventDefault();
        try {
            await settleFund(selectedFund.id, settleForm);
            setShowSettleModal(false);
            setSettleForm({
                settlement_date: new Date().toISOString().split('T')[0],
                returned_amount: '0',
                additional_amount_required: '0',
                settlement_notes: '',
                settlement_payment_mode: 'ACCOUNT'
            });
            fetchReports();
        } catch (error) {
            console.error("Failed to settle fund", error);
            alert("Error settling fund: " + (error.response?.data?.error || error.message));
        }
    };

    const handleReopen = async (fundId) => {
        if (!window.confirm("Are you sure you want to reopen this settled fund?")) return;
        try {
            await reopenFund(fundId);
            fetchReports();
        } catch (error) {
            console.error("Failed to reopen fund", error);
        }
    };

    const handleDeleteFund = async (fundId) => {
        if (!window.confirm("Are you sure you want to delete this fund permanently? All additions and expenses will be deleted.")) return;
        try {
            await deleteFund(fundId);
            setSelectedFund(null);
            fetchReports();
        } catch (error) {
            console.error("Failed to delete fund", error);
        }
    };

    const handleDeleteAddition = async (id) => {
        if (!window.confirm("Delete this funding addition?")) return;
        try {
            await deleteFundAddition(id);
            fetchReports();
        } catch (error) {
            console.error("Failed to delete addition", error);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("Delete this expense item?")) return;
        try {
            await deleteFundExpense(id);
            fetchReports();
        } catch (error) {
            console.error("Failed to delete expense", error);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    };

    // Helper for timeline items styling and icons
    const renderTimelineIcon = (type) => {
        switch (type) {
            case 'INITIAL_FUND':
                return (
                    <div className="w-8 h-8 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-semibold text-xs animate-pulse">
                        🚀
                    </div>
                );
            case 'ADDITIONAL_FUND':
                return (
                    <div className="w-8 h-8 rounded-full bg-secondary/20 border-2 border-secondary flex items-center justify-center text-secondary font-semibold text-xs">
                        ➕
                    </div>
                );
            case 'EXPENSE':
                return (
                    <div className="w-8 h-8 rounded-full bg-error/20 border-2 border-error flex items-center justify-center text-error font-semibold text-xs">
                        💸
                    </div>
                );
            case 'SETTLEMENT':
                return (
                    <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary font-semibold text-xs">
                        🏁
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading && !reports) {
        return (
            <div className="max-w-4xl mx-auto p-4 text-center text-gray-400">
                <div className="animate-pulse py-8 text-primary">Loading Fund Manager...</div>
            </div>
        );
    }

    const { summary, active_funds = [], settled_funds = [] } = reports || { summary: {}, active_funds: [], settled_funds: [] };
    const displayedFunds = activeTab === 'ACTIVE' ? active_funds : settled_funds;

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                     <h2 className="text-3xl font-bold text-primary tracking-tight">Fund Management</h2>
                     <p className="text-sm text-gray-500 mt-1">Track money received for specific purposes and their expenses independently.</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-purple-600 hover:from-purple-500 hover:to-primary text-white rounded-lg text-sm font-bold shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Create New Fund
                </button>
            </div>

            {/* Overall Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card-dark p-4 rounded-xl border border-gray-800 shadow-md">
                        <span className="text-xs text-gray-500 font-semibold block uppercase">Total Funds Received</span>
                        <span className="text-xl font-bold text-emerald-400 mt-1 block">{formatCurrency(summary.total_received)}</span>
                    </div>
                    <div className="bg-card-dark p-4 rounded-xl border border-gray-800 shadow-md">
                        <span className="text-xs text-gray-500 font-semibold block uppercase">Total Amount Spent</span>
                        <span className="text-xl font-bold text-error mt-1 block">{formatCurrency(summary.total_spent)}</span>
                    </div>
                    <div className="bg-card-dark p-4 rounded-xl border border-gray-800 shadow-md">
                        <span className="text-xs text-gray-500 font-semibold block uppercase">Remaining Balance</span>
                        <span className="text-xl font-bold text-secondary mt-1 block">{formatCurrency(summary.remaining_balance)}</span>
                    </div>
                    <div className="bg-card-dark p-4 rounded-xl border border-gray-800 shadow-md">
                        <span className="text-xs text-gray-500 font-semibold block uppercase">Active / Settled Count</span>
                        <span className="text-xl font-bold text-primary mt-1 block">{summary.active_count} Active / {summary.settled_count} Settled</span>
                    </div>
                </div>
            )}

            {/* Fund Selection detail view */}
            {selectedFund && (
                <div className="bg-card-dark p-6 rounded-2xl border border-gray-700 shadow-2xl animate-fade-in space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-bold text-primary">{selectedFund.title}</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                    selectedFund.status === 'ACTIVE' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80' : 'bg-gray-800 text-gray-400 border border-gray-700'
                                }`}>
                                    {selectedFund.status}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm mt-1.5"><strong className="text-gray-300">Provider:</strong> {selectedFund.provider} | <strong className="text-gray-300">Purpose:</strong> {selectedFund.purpose}</p>
                            {selectedFund.notes && (
                                <p className="text-xs text-gray-500 mt-1"><strong className="text-gray-400">Notes:</strong> {selectedFund.notes}</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {selectedFund.status === 'ACTIVE' ? (
                                <button 
                                    onClick={() => {
                                        setSettleForm(prev => ({
                                            ...prev,
                                            returned_amount: Math.max(0, parseFloat(selectedFund.remaining_balance)).toString(),
                                            additional_amount_required: Math.max(0, -parseFloat(selectedFund.remaining_balance)).toString()
                                        }));
                                        setShowSettleModal(true);
                                    }}
                                    className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                >
                                    Settle/Close
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleReopen(selectedFund.id)}
                                    className="px-4 py-1.5 bg-yellow-800 hover:bg-yellow-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                >
                                    Reopen Fund
                                </button>
                            )}
                            <button 
                                onClick={() => handleDeleteFund(selectedFund.id)}
                                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-400 rounded-lg text-sm font-semibold transition-colors"
                            >
                                Delete Fund
                            </button>
                            <button 
                                onClick={() => setSelectedFund(null)}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                                Close Detail
                            </button>
                        </div>
                    </div>

                    {/* Detail calculations */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bg-dark/50 p-4 rounded-xl border border-gray-800">
                        <div>
                            <span className="text-xs text-gray-500 block">Total Fund Received</span>
                            <span className="text-lg font-bold text-emerald-400">{formatCurrency(selectedFund.total_received)}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Total Amount Spent</span>
                            <span className="text-lg font-bold text-error">{formatCurrency(selectedFund.total_spent)}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Remaining Balance</span>
                            <span className={`text-lg font-bold ${parseFloat(selectedFund.remaining_balance) >= 0 ? 'text-secondary' : 'text-error'}`}>
                                {formatCurrency(selectedFund.remaining_balance)}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Transactions Count</span>
                            <span className="text-lg font-bold text-primary">{selectedFund.number_of_transactions}</span>
                        </div>
                    </div>

                    {/* Action buttons inside selected fund */}
                    {selectedFund.status === 'ACTIVE' && (
                        <div className="flex flex-wrap gap-3">
                            <button 
                                onClick={() => setShowAdditionModal(true)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-bold text-secondary flex items-center gap-1.5 transition-colors"
                            >
                                ➕ Add Additional Money
                            </button>
                            <button 
                                onClick={() => setShowExpenseModal(true)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-bold text-error flex items-center gap-1.5 transition-colors"
                            >
                                💸 Record Fund Expense
                            </button>
                        </div>
                    )}

                    {/* Chronological Timeline */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-bold text-gray-200">Chronological Timeline</h4>
                        <div className="relative border-l border-gray-800 ml-4 pl-6 space-y-6">
                            {selectedFund.timeline && selectedFund.timeline.map((item) => (
                                <div key={item.id} className="relative group">
                                    {/* Timeline dot */}
                                    <div className="absolute -left-10 top-0.5">
                                        {renderTimelineIcon(item.type)}
                                    </div>
                                    <div className="bg-bg-dark/40 p-4 rounded-xl border border-gray-800/80 shadow-sm relative hover:border-gray-700 transition-colors">
                                        
                                        {/* Action deletion buttons */}
                                        {selectedFund.status === 'ACTIVE' && (
                                            <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {item.type === 'ADDITIONAL_FUND' && (
                                                    <button 
                                                        onClick={() => handleDeleteAddition(item.id.replace('addition_', ''))}
                                                        className="text-xs text-red-400 hover:text-red-500 bg-red-950/20 px-2 py-0.5 border border-red-900 rounded"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                                {item.type === 'EXPENSE' && (
                                                    <button 
                                                        onClick={() => handleDeleteExpense(item.id.replace('expense_', ''))}
                                                        className="text-xs text-red-400 hover:text-red-500 bg-red-950/20 px-2 py-0.5 border border-red-900 rounded"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-gray-200">{item.title}</span>
                                                    {item.category && (
                                                        <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-[10px] uppercase font-bold tracking-wide">
                                                            {item.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500 mt-1 block">{item.date}</span>
                                                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{item.notes || item.description}</p>
                                                
                                                {/* Attachment Section */}
                                                {item.attachment_url && (
                                                    <div className="mt-3">
                                                        <a 
                                                            href={item.attachment_url.startsWith('http') ? item.attachment_url : `${BACKEND_URL}${item.attachment_url}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline bg-secondary/10 px-2.5 py-1 rounded border border-secondary/20"
                                                        >
                                                            <span>📄 View Receipt/Attachment</span>
                                                        </a>
                                                        {/* Optional thumbnail if image */}
                                                        {/\.(jpg|jpeg|png|webp|gif)$/i.test(item.attachment_url) && (
                                                            <div className="mt-2 rounded-lg border border-gray-805 overflow-hidden w-24 h-24 bg-black flex items-center justify-center">
                                                                <img 
                                                                    src={item.attachment_url.startsWith('http') ? item.attachment_url : `${BACKEND_URL}${item.attachment_url}`} 
                                                                    alt="receipt thumb"
                                                                    className="max-w-full max-h-full object-cover" 
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                {item.type === 'EXPENSE' ? (
                                                    <span className="text-base font-extrabold text-error">-{formatCurrency(item.amount)}</span>
                                                ) : item.type === 'INITIAL_FUND' || item.type === 'ADDITIONAL_FUND' ? (
                                                    <span className="text-base font-extrabold text-emerald-400">+{formatCurrency(item.amount)}</span>
                                                ) : item.type === 'SETTLEMENT' ? (
                                                    <div className="space-y-1 text-right text-xs">
                                                        {item.returned_amount > 0 && (
                                                            <div>
                                                                <span className="text-gray-500 block">Returned</span>
                                                                <span className="text-sm font-bold text-emerald-400">{formatCurrency(item.returned_amount)}</span>
                                                            </div>
                                                        )}
                                                        {item.additional_amount_required > 0 && (
                                                            <div>
                                                                <span className="text-gray-500 block">Exceeded Cost</span>
                                                                <span className="text-sm font-bold text-error">{formatCurrency(item.additional_amount_required)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs for active vs settled funds */}
            <div className="flex border-b border-gray-805">
                <button 
                    onClick={() => setActiveTab('ACTIVE')}
                    className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 text-center ${
                        activeTab === 'ACTIVE' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    🟢 Active Purpose Funds ({active_funds.length})
                </button>
                <button 
                    onClick={() => setActiveTab('SETTLED')}
                    className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 text-center ${
                        activeTab === 'SETTLED' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                    🏁 Settled / Closed Funds ({settled_funds.length})
                </button>
            </div>

            {/* Funds List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedFunds.length > 0 ? (
                    displayedFunds.map(fund => (
                        <div 
                            key={fund.id} 
                            onClick={async () => {
                                setSelectedFund(fund);
                                // Fetch full details (with timeline)
                                try {
                                    const res = await getFundDetails(fund.id);
                                    setSelectedFund(res.data);
                                    window.scrollTo({ top: 120, behavior: 'smooth' });
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            className={`p-5 rounded-xl border transition-all cursor-pointer shadow-md flex flex-col justify-between ${
                                selectedFund?.id === fund.id
                                ? 'bg-gray-850 border-primary shadow-lg ring-1 ring-primary'
                                : 'bg-card-dark border-gray-800 hover:border-gray-700 hover:shadow-lg'
                            }`}
                        >
                            <div>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h4 className="font-bold text-lg text-gray-200 line-clamp-1">{fund.title}</h4>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        fund.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400' : 'bg-gray-800 text-gray-400'
                                    }`}>
                                        {fund.status}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500 font-semibold block">Provided by: {fund.provider}</span>
                                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{fund.purpose}</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-800/80 grid grid-cols-3 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500 block">Received</span>
                                    <span className="font-semibold text-emerald-400">{formatCurrency(fund.total_received)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Spent</span>
                                    <span className="font-semibold text-error">{formatCurrency(fund.total_spent)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Remaining</span>
                                    <span className={`font-semibold ${parseFloat(fund.remaining_balance) >= 0 ? 'text-secondary' : 'text-error'}`}>
                                        {formatCurrency(fund.remaining_balance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 py-12 text-center text-gray-500 bg-card-dark rounded-xl border border-gray-800">
                        No {activeTab.toLowerCase()} funds found. Click "Create New Fund" to start.
                    </div>
                )}
            </div>

            {/* MODALS SECTION */}
            
            {/* Create Fund Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setShowCreateModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <h3 className="text-xl font-bold text-primary mb-4">Create New Fund</h3>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Fund Title *</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                    value={createForm.title}
                                    onChange={e => setCreateForm({...createForm, title: e.target.value})}
                                    placeholder="e.g. Tech Fest 2026"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Purpose *</label>
                                <textarea 
                                    required 
                                    rows={2}
                                    className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary resize-none"
                                    value={createForm.purpose}
                                    onChange={e => setCreateForm({...createForm, purpose: e.target.value})}
                                    placeholder="Brief purpose description"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="text-xs text-gray-400 block mb-1">Received Amount (INR) *</label>
                                     <input 
                                         type="number" 
                                         required 
                                         min="0"
                                         step="0.01"
                                         className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                         value={createForm.initial_amount}
                                         onChange={e => setCreateForm({...createForm, initial_amount: e.target.value})}
                                         placeholder="0.00"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-xs text-gray-400 block mb-1">Payment Mode *</label>
                                     <select 
                                         className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                         value={createForm.payment_mode}
                                         onChange={e => setCreateForm({...createForm, payment_mode: e.target.value})}
                                     >
                                         <option value="ACCOUNT">Account</option>
                                         <option value="CASH">Cash</option>
                                     </select>
                                 </div>
                             </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Provider Person *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                        value={createForm.provider}
                                        onChange={e => setCreateForm({...createForm, provider: e.target.value})}
                                        placeholder="Provider Name"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Received Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                        value={createForm.received_date}
                                        onChange={e => setCreateForm({...createForm, received_date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Notes (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                    value={createForm.notes}
                                    onChange={e => setCreateForm({...createForm, notes: e.target.value})}
                                    placeholder="Any notes"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-2 bg-gradient-to-r from-primary to-purple-600 hover:from-purple-500 hover:to-primary text-white font-bold rounded-lg text-sm transition-all mt-2"
                            >
                                Initialize Fund
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Additional Money Modal */}
            {showAdditionModal && selectedFund && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-gray-700 w-full max-w-sm shadow-2xl relative">
                        <button 
                            onClick={() => setShowAdditionModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-bold text-secondary mb-4">Add Money to Fund</h3>
                        <p className="text-xs text-gray-500 mb-3">Adding to: <span className="text-gray-300 font-semibold">{selectedFund.title}</span></p>
                        <form onSubmit={handleAdditionSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Additional Amount *</label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-secondary"
                                        value={additionForm.amount}
                                        onChange={e => setAdditionForm({...additionForm, amount: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Payment Mode *</label>
                                    <select 
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-secondary"
                                        value={additionForm.payment_mode}
                                        onChange={e => setAdditionForm({...additionForm, payment_mode: e.target.value})}
                                    >
                                        <option value="ACCOUNT">Account</option>
                                        <option value="CASH">Cash</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Received Date *</label>
                                <input 
                                    type="date" 
                                    required 
                                    className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-secondary"
                                    value={additionForm.date}
                                    onChange={e => setAdditionForm({...additionForm, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Notes (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-secondary"
                                    value={additionForm.notes}
                                    onChange={e => setAdditionForm({...additionForm, notes: e.target.value})}
                                    placeholder="e.g. Approved budget increase"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-2 bg-secondary text-bg-dark hover:bg-[#02c7b5] font-bold rounded-lg text-sm transition-colors mt-2"
                            >
                                Confirm Money Received
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Record Expense Modal */}
            {showExpenseModal && selectedFund && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setShowExpenseModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-bold text-error mb-4">Record Fund Expense</h3>
                        <p className="text-xs text-gray-500 mb-3">Charging against: <span className="text-gray-300 font-semibold">{selectedFund.title}</span></p>
                        <form onSubmit={handleExpenseSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Expense Title *</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-error"
                                    value={expenseForm.title}
                                    onChange={e => setExpenseForm({...expenseForm, title: e.target.value})}
                                    placeholder="e.g. Printing flyers"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Category *</label>
                                    <select 
                                        required 
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-error"
                                        value={expenseForm.category}
                                        onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Expense Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-error"
                                        value={expenseForm.date}
                                        onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Amount Spent (INR) *</label>
                                    <input 
                                        type="number" 
                                        required 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-error"
                                        value={expenseForm.amount}
                                        onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Payment Mode *</label>
                                    <select 
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-error"
                                        value={expenseForm.payment_mode}
                                        onChange={e => setExpenseForm({...expenseForm, payment_mode: e.target.value})}
                                    >
                                        <option value="ACCOUNT">Account</option>
                                        <option value="CASH">Cash</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Description (Optional)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-error"
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                                    placeholder="Details of purchase"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Attachment (Optional Receipt)</label>
                                <input 
                                    type="file" 
                                    className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700"
                                    onChange={e => setExpenseForm({...expenseForm, attachment: e.target.files[0]})}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-2 bg-error text-white hover:bg-red-500 font-bold rounded-lg text-sm transition-colors mt-2"
                            >
                                Record Expense
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Settle Fund Modal */}
            {showSettleModal && selectedFund && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
                    <div className="bg-card-dark p-6 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl relative">
                        <button 
                            onClick={() => setShowSettleModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-bold text-primary mb-4">Settle & Close Fund</h3>
                        <p className="text-xs text-gray-500 mb-3">Settling: <span className="text-gray-300 font-semibold">{selectedFund.title}</span></p>
                        <form onSubmit={handleSettleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Settlement Date *</label>
                                    <input 
                                        type="date" 
                                        required 
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                        value={settleForm.settlement_date}
                                        onChange={e => setSettleForm({...settleForm, settlement_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Returned Amount (if any)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                        value={settleForm.returned_amount}
                                        onChange={e => setSettleForm({...settleForm, returned_amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Additional Required (if exceeded)</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                        value={settleForm.additional_amount_required}
                                        onChange={e => setSettleForm({...settleForm, additional_amount_required: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Settlement Payment Mode *</label>
                                    <select 
                                        className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                                        value={settleForm.settlement_payment_mode}
                                        onChange={e => setSettleForm({...settleForm, settlement_payment_mode: e.target.value})}
                                    >
                                        <option value="ACCOUNT">Account</option>
                                        <option value="CASH">Cash</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Settlement Notes *</label>
                                <textarea 
                                    required 
                                    rows={2}
                                    className="w-full bg-bg-dark border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary resize-none"
                                    value={settleForm.settlement_notes}
                                    onChange={e => setSettleForm({...settleForm, settlement_notes: e.target.value})}
                                    placeholder="Settlement comments (e.g. leftover returned to company account)"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-2 bg-gradient-to-r from-primary to-purple-600 hover:from-purple-500 hover:to-primary text-white font-bold rounded-lg text-sm transition-all mt-2"
                            >
                                Finalize Settlement & Close
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundList;
