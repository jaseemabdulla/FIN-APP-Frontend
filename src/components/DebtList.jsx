import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getDebts, deleteDebt, exportPDFReport, settlePersonDebts } from '../api';
import TransactionForm from './TransactionForm';
import AddDebtForm from './AddDebtForm';

const DebtList = () => {
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settlingDebt, setSettlingDebt] = useState(null);
    const [activeTab, setActiveTab] = useState('ACTIVE_PAYABLE');
    const [highlightedDebtId, setHighlightedDebtId] = useState(null);

    const [showAddDebtForm, setShowAddDebtForm] = useState(false);
    const [editingDebt, setEditingDebt] = useState(null);
    const location = useLocation();

    const [settlingPerson, setSettlingPerson] = useState(null);
    const [loadingSettlePerson, setLoadingSettlePerson] = useState(false);
    const [settlePersonData, setSettlePersonData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_mode: 'CASH',
        description: ''
    });

    const fetchDebts = async () => {
        setLoading(true);
        try {
            const res = await getDebts();
            setDebts(res.data);
        } catch (error) {
            console.error("Error fetching debts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebts();
    }, []);

    // Sync active tab & highlighted debt from URL
    useEffect(() => {
        if (debts.length > 0) {
            const queryParams = new URLSearchParams(location.search);
            const debtIdParam = queryParams.get('id');
            if (debtIdParam) {
                const debtId = parseInt(debtIdParam);
                const targetDebt = debts.find(d => d.id === debtId);
                if (targetDebt) {
                    let tab = 'ACTIVE_PAYABLE';
                    if (targetDebt.debt_type === 'GIVEN') {
                        tab = targetDebt.is_cleared ? 'CLEARED_GIVEN' : 'ACTIVE_GIVEN';
                    } else {
                        tab = targetDebt.is_cleared ? 'CLEARED_PAYABLE' : 'ACTIVE_PAYABLE';
                    }
                    setActiveTab(tab);
                    setHighlightedDebtId(debtId);
                }
            }
        }
    }, [location.search, debts]);

    const handleSettle = (debt) => {
        setSettlingDebt(debt);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleTransactionAdded = () => {
        setSettlingDebt(null);
        fetchDebts();
    };

    const handleSettleTotal = (group) => {
        const debtType = group.debts[0]?.debt_type || (activeTab.includes('GIVEN') ? 'GIVEN' : 'TAKEN');
        setSettlingPerson({
            person_name: group.person_name,
            debt_type: debtType,
            total_remaining: group.total_remaining
        });
        setSettlePersonData({
            amount: group.total_remaining.toString(),
            date: new Date().toISOString().split('T')[0],
            payment_mode: 'CASH',
            description: ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSettlePersonSubmit = async (e) => {
        e.preventDefault();
        setLoadingSettlePerson(true);
        try {
            await settlePersonDebts({
                person_name: settlingPerson.person_name,
                amount: settlePersonData.amount,
                debt_type: settlingPerson.debt_type,
                payment_mode: settlePersonData.payment_mode,
                date: settlePersonData.date,
                description: settlePersonData.description
            });
            setSettlingPerson(null);
            fetchDebts();
        } catch (error) {
            console.error("Error settling total person debts", error);
            alert("Failed to settle total person debts: " + (error.response?.data?.error || error.message));
        } finally {
            setLoadingSettlePerson(false);
        }
    };
    
    const handleDebtAdded = () => {
        setShowAddDebtForm(false);
        setEditingDebt(null);
        fetchDebts();
    };

    const handleEdit = (debt) => {
        setEditingDebt(debt);
        setShowAddDebtForm(true); // Reuse this, or better separate? Let's check logic.
        // It's cleaner to reuse the form area.
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this debt?")) {
            try {
                await deleteDebt(id);
                fetchDebts();
            } catch (error) {
                console.error("Error deleting debt", error);
                alert("Failed to delete debt");
            }
        }
    };

    const handleDownload = async () => {
        try {
            const response = await exportPDFReport({ type: 'debt' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'debt_report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading report", error);
            alert("Failed to download report");
        }
    };

    const groupDebtsByPerson = (debtList) => {
        const groups = {};
        debtList.forEach(debt => {
            const personName = debt.person_name.trim();
            if (!groups[personName]) {
                groups[personName] = {
                    person_name: personName,
                    debts: [],
                    total_remaining: 0,
                    total_original: 0,
                    is_cleared: true
                };
            }
            groups[personName].debts.push(debt);
            const remaining = parseFloat(debt.remaining_amount !== undefined ? debt.remaining_amount : debt.amount);
            groups[personName].total_original += parseFloat(debt.amount);
            
            if (!debt.is_cleared) {
                groups[personName].is_cleared = false;
                groups[personName].total_remaining += remaining;
            }
        });
        
        // Sort individual debts: uncleared first, then by date descending
        Object.values(groups).forEach(group => {
            group.debts.sort((a, b) => {
                if (a.is_cleared !== b.is_cleared) {
                    return a.is_cleared ? 1 : -1;
                }
                return new Date(b.date) - new Date(a.date);
            });
        });
        
        // Sort groups: uncleared groups first, then alphabetically by name
        return Object.values(groups).sort((a, b) => {
            if (a.is_cleared !== b.is_cleared) {
                return a.is_cleared ? 1 : -1;
            }
            return a.person_name.localeCompare(b.person_name);
        });
    };

    const activeGiven = debts.filter(d => d.debt_type === 'GIVEN' && !d.is_cleared);
    const activePayable = debts.filter(d => d.debt_type === 'TAKEN' && !d.is_cleared);
    const clearedGiven = debts.filter(d => d.debt_type === 'GIVEN' && d.is_cleared);
    const clearedPayable = debts.filter(d => d.debt_type === 'TAKEN' && d.is_cleared);

    // Calculate outstanding totals
    const totalGiven = activeGiven.reduce((acc, d) => acc + parseFloat(d.remaining_amount || d.amount), 0);
    const totalTaken = activePayable.reduce((acc, d) => acc + parseFloat(d.remaining_amount || d.amount), 0);

    let currentList = [];
    let isClearedSection = false;

    if (activeTab === 'ACTIVE_GIVEN') {
        currentList = activeGiven;
        isClearedSection = false;
    } else if (activeTab === 'ACTIVE_PAYABLE') {
        currentList = activePayable;
        isClearedSection = false;
    } else if (activeTab === 'CLEARED_GIVEN') {
        currentList = clearedGiven;
        isClearedSection = true;
    } else if (activeTab === 'CLEARED_PAYABLE') {
        currentList = clearedPayable;
        isClearedSection = true;
    }

    const currentGroupedList = groupDebtsByPerson(currentList);

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                     <h2 className="text-3xl font-bold text-primary tracking-tight">Debt Manager</h2>
                     <p className="text-sm text-gray-500 mt-1">Track loans given and taken</p>
                </div>
               
                <div className="flex gap-2">
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-bold text-gray-300 transition-all"
                        title="Download Debt Report"
                    >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span className="hidden md:inline">Download Report</span>
                    </button>
                    <button 
                        onClick={() => {
                            setEditingDebt(null);
                            setShowAddDebtForm(!showAddDebtForm);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-bold text-gray-300 transition-all"
                    >
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Existing Debt
                    </button>
                </div>
            </div>

            {/* Forms Section */}
            <div className="space-y-6 mb-8">
                {showAddDebtForm && (
                     <div className="animate-fade-in">
                        <AddDebtForm 
                            initialData={editingDebt}
                            onDebtAdded={handleDebtAdded} 
                            onCancel={() => {
                                setShowAddDebtForm(false);
                                setEditingDebt(null);
                            }} 
                        />
                    </div>
                )}

                {settlingDebt && (
                    <div className="animate-fade-in bg-card-dark p-1 rounded-xl border border-gray-700 shadow-2xl">
                        <TransactionForm 
                            prefillDebt={settlingDebt}
                            onTransactionAdded={handleTransactionAdded}
                            onCancelRepayment={() => setSettlingDebt(null)}
                        />
                    </div>
                )}

                {settlingPerson && (
                    <div className="animate-fade-in bg-card-dark p-6 rounded-xl border border-gray-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-secondary">
                                Settle Total Outstanding: {settlingPerson.person_name}
                            </h3>
                            <button 
                                onClick={() => setSettlingPerson(null)} 
                                className="text-gray-400 hover:text-white text-sm underline"
                            >
                                Cancel
                            </button>
                        </div>
                        <form onSubmit={handleSettlePersonSubmit} className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-stretch sm:items-end">
                            <div className="w-full sm:w-[calc(50%-8px)] md:w-auto md:min-w-[130px]">
                                <label className="block text-xs text-gray-400 mb-1 font-semibold">Date</label>
                                <input 
                                    type="date" 
                                    value={settlePersonData.date} 
                                    onChange={(e) => setSettlePersonData(prev => ({ ...prev, date: e.target.value }))}
                                    required
                                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary outline-none text-white text-sm"
                                />
                            </div>

                            <div className="w-full sm:w-[calc(50%-8px)] md:flex-1 md:min-w-[110px]">
                                <label className="block text-xs text-gray-400 mb-1 font-semibold">Amount</label>
                                <input 
                                    type="number" 
                                    value={settlePersonData.amount} 
                                    onChange={(e) => setSettlePersonData(prev => ({ ...prev, amount: e.target.value }))}
                                    required
                                    min="0.01"
                                    step="any"
                                    max={settlingPerson.total_remaining}
                                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary outline-none text-white font-mono text-sm"
                                />
                                <span className="text-[10px] text-gray-400 mt-1 block">
                                    Max: ${settlingPerson.total_remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="w-full md:flex-[2] md:min-w-[180px]">
                                <label className="block text-xs text-gray-400 mb-1 font-semibold">Notes (Optional)</label>
                                <input 
                                    type="text" 
                                    value={settlePersonData.description} 
                                    onChange={(e) => setSettlePersonData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="e.g. Cleared all outstanding"
                                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 focus:border-primary outline-none text-white text-sm"
                                />
                            </div>

                            <div className="w-full sm:w-auto flex items-center gap-4 h-[42px] py-1">
                                <label className="cursor-pointer flex items-center gap-2 select-none">
                                    <input 
                                        type="radio" 
                                        name="settle_person_mode" 
                                        value="CASH"
                                        checked={settlePersonData.payment_mode === 'CASH'}
                                        onChange={() => setSettlePersonData(prev => ({ ...prev, payment_mode: 'CASH' }))}
                                        className="w-4 h-4 text-primary focus:ring-primary bg-gray-800 border-gray-600"
                                    />
                                    <span className="text-sm text-gray-200">Cash</span>
                                </label>
                                <label className="cursor-pointer flex items-center gap-2 select-none">
                                    <input 
                                        type="radio" 
                                        name="settle_person_mode" 
                                        value="ACCOUNT"
                                        checked={settlePersonData.payment_mode === 'ACCOUNT'}
                                        onChange={() => setSettlePersonData(prev => ({ ...prev, payment_mode: 'ACCOUNT' }))}
                                        className="w-4 h-4 text-primary focus:ring-primary bg-gray-800 border-gray-600"
                                    />
                                    <span className="text-sm text-gray-200">Account</span>
                                </label>
                            </div>

                            <div className="w-full sm:w-auto flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={loadingSettlePerson}
                                    className="w-full sm:w-auto bg-purple-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-purple-700 border border-purple-400 transition-colors text-sm"
                                >
                                    {loadingSettlePerson ? '...' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-card-dark p-4 rounded-xl border border-gray-700/50 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-16 h-16 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total To Pay</p>
                    <p className="text-3xl font-bold text-red-400 mt-1">{totalTaken.toLocaleString()}</p>
                </div>
                <div className="bg-card-dark p-4 rounded-xl border border-gray-700/50 shadow-lg relative overflow-hidden group">
                     <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-16 h-16 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total To Receive</p>
                    <p className="text-3xl font-bold text-green-400 mt-1">{totalGiven.toLocaleString()}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading debts...</p>
                </div>
            ) : (
                <div className="bg-card-dark rounded-xl shadow-xl border border-gray-700/50 overflow-hidden min-h-[400px]">
                    {/* Tabs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-700/50">
                        {/* Active Given */}
                        <button 
                            onClick={() => setActiveTab('ACTIVE_GIVEN')}
                            className={`py-4 text-center font-bold text-sm tracking-wide transition-all duration-300 relative ${
                                activeTab === 'ACTIVE_GIVEN' 
                                ? 'text-green-400 bg-green-400/5' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Active Given
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans ${
                                    activeTab === 'ACTIVE_GIVEN' ? 'bg-green-400/20 text-green-400' : 'bg-gray-800 text-gray-400'
                                }`}>
                                    {activeGiven.length}
                                </span>
                            </span>
                            {activeTab === 'ACTIVE_GIVEN' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-400 shadow-[0_-2px_10px_rgba(74,222,128,0.5)]"></div>}
                        </button>

                        {/* Active Payable */}
                        <button 
                            onClick={() => setActiveTab('ACTIVE_PAYABLE')}
                            className={`py-4 text-center font-bold text-sm tracking-wide transition-all duration-300 relative ${
                                activeTab === 'ACTIVE_PAYABLE' 
                                ? 'text-red-400 bg-red-400/5' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Active Payable
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans ${
                                    activeTab === 'ACTIVE_PAYABLE' ? 'bg-red-400/20 text-red-400' : 'bg-gray-800 text-gray-400'
                                }`}>
                                    {activePayable.length}
                                </span>
                            </span>
                            {activeTab === 'ACTIVE_PAYABLE' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-400 shadow-[0_-2px_10px_rgba(248,113,113,0.5)]"></div>}
                        </button>

                        {/* Cleared Given */}
                        <button 
                            onClick={() => setActiveTab('CLEARED_GIVEN')}
                            className={`py-4 text-center font-bold text-sm tracking-wide transition-all duration-300 relative ${
                                activeTab === 'CLEARED_GIVEN' 
                                ? 'text-green-400 bg-green-400/5' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Cleared Given
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans ${
                                    activeTab === 'CLEARED_GIVEN' ? 'bg-green-400/20 text-green-400' : 'bg-gray-800 text-gray-400'
                                }`}>
                                    {clearedGiven.length}
                                </span>
                            </span>
                            {activeTab === 'CLEARED_GIVEN' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-400 shadow-[0_-2px_10px_rgba(74,222,128,0.5)]"></div>}
                        </button>

                        {/* Cleared Payable */}
                        <button 
                            onClick={() => setActiveTab('CLEARED_PAYABLE')}
                            className={`py-4 text-center font-bold text-sm tracking-wide transition-all duration-300 relative ${
                                activeTab === 'CLEARED_PAYABLE' 
                                ? 'text-red-400 bg-red-400/5' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Cleared Payable
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans ${
                                    activeTab === 'CLEARED_PAYABLE' ? 'bg-red-400/20 text-red-400' : 'bg-gray-800 text-gray-400'
                                }`}>
                                    {clearedPayable.length}
                                </span>
                            </span>
                            {activeTab === 'CLEARED_PAYABLE' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-400 shadow-[0_-2px_10px_rgba(248,113,113,0.5)]"></div>}
                        </button>
                    </div>

                    {/* List Content */}
                    <div className="p-4 md:p-6 space-y-8">
                        {currentGroupedList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p>No debts found in this category.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 border-b border-gray-800 pb-2 mb-3">
                                    <h3 className="text-xs font-bold text-gray-400 tracking-wide uppercase">
                                        {activeTab === 'ACTIVE_GIVEN' && "Active Given (Receivables)"}
                                        {activeTab === 'ACTIVE_PAYABLE' && "Active Payable (Payables)"}
                                        {activeTab === 'CLEARED_GIVEN' && "Cleared Given (Receivables)"}
                                        {activeTab === 'CLEARED_PAYABLE' && "Cleared Payable (Payables)"}
                                    </h3>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        isClearedSection 
                                        ? 'bg-green-500/25 text-green-400' 
                                        : (activeTab === 'ACTIVE_PAYABLE' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary')
                                    }`}>
                                        {currentList.length}
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    {currentGroupedList.map(group => (
                                        <PersonDebtGroup 
                                            key={group.person_name} 
                                            group={group} 
                                            onSettle={handleSettle}
                                            onSettleTotal={handleSettleTotal}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            isClearedSection={isClearedSection}
                                            highlightedDebtId={highlightedDebtId}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const IndividualDebtItem = ({ debt, onSettle, onEdit, onDelete, isHighlighted }) => {
    const [isExpanded, setIsExpanded] = useState(isHighlighted);
    const ref = useRef(null);

    const totalRepaid = parseFloat(debt.total_repaid || 0);
    const originalAmount = parseFloat(debt.amount || 0);
    const remainingAmount = parseFloat(debt.remaining_amount !== undefined ? debt.remaining_amount : (originalAmount - totalRepaid));

    useEffect(() => {
        if (isHighlighted) {
            setIsExpanded(true);
            if (ref.current) {
                setTimeout(() => {
                    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [isHighlighted]);

    return (
        <div 
            ref={ref}
            className={`transition-all rounded-lg overflow-hidden ${
                isHighlighted
                ? 'border-2 border-primary bg-primary/20 shadow-lg shadow-primary/10 animate-pulse my-2'
                : isExpanded 
                    ? 'bg-gray-800/60 shadow-lg border border-gray-700/50 my-2' 
                    : 'hover:bg-white/5'
            }`}
        >
            {/* Row Trigger */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex flex-col md:flex-row justify-between items-start md:items-center py-3.5 px-4 cursor-pointer select-none"
            >
                {/* Date and Description */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <svg 
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-500 font-medium">
                            {new Date(debt.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        {debt.description ? (
                            <span className="text-sm text-gray-200 font-medium">{debt.description}</span>
                        ) : (
                            <span className="text-sm text-gray-500 italic">No notes</span>
                        )}
                    </div>
                </div>

                {/* Amount and Actions */}
                <div 
                    className="flex items-center justify-between w-full md:w-auto gap-6 mt-2 md:mt-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-right">
                        <span className={`font-mono font-bold text-base ${debt.is_cleared ? 'line-through text-gray-500' : 'text-white'}`}>
                            ${(debt.is_cleared ? originalAmount : remainingAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {!debt.is_cleared && totalRepaid > 0 && (
                            <span className="block text-[10px] text-gray-400">
                                of ${originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        )}
                        {debt.is_cleared && (
                            <span className="block text-[10px] text-green-400 font-bold uppercase tracking-wide font-sans">Settled</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {!debt.is_cleared ? (
                            <button 
                                onClick={() => onSettle(debt)} 
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
                            >
                                Settle
                            </button>
                        ) : (
                            <div className="w-[50px] flex justify-center">
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        )}

                        {/* Actions Divider */}
                        <div className="flex items-center gap-1.5 border-l border-gray-700/80 pl-2">
                            <button 
                                onClick={() => onEdit(debt)}
                                className="text-gray-400 hover:text-primary transition-colors p-1 hover:bg-white/5 rounded"
                                title="Edit"
                                type="button"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button 
                                onClick={() => onDelete(debt.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors p-1 hover:bg-white/5 rounded"
                                title="Delete"
                                type="button"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Details Area */}
            {isExpanded && (
                <div className="px-10 pb-5 pt-3 border-t border-gray-700/40 bg-gray-900/20 text-sm text-gray-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-gray-700/40">
                        <div>
                            <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Original Debt</span>
                            <span className="font-mono font-bold text-white">${originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Total Paid</span>
                            <span className="font-mono font-bold text-green-400">${totalRepaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {!debt.is_cleared ? (
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Remaining Balance</span>
                                <span className="font-mono font-bold text-red-400">${remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        ) : (
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Cleared Date</span>
                                <span className="font-mono font-bold text-green-400">
                                    {debt.cleared_date ? new Date(debt.cleared_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Settled'}
                                </span>
                            </div>
                        )}
                        <div>
                            <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Payment Status</span>
                            <span className={`inline-block font-bold text-xs px-2 py-0.5 rounded ${
                                debt.is_cleared ? 'bg-green-500/25 text-green-400' : totalRepaid > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                                {debt.is_cleared ? 'Fully Settled' : totalRepaid > 0 ? 'Partially Paid' : 'Active / Unpaid'}
                            </span>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="pt-4">
                        <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-3">Payment History Timeline</span>
                        {(!debt.repayments || debt.repayments.length === 0) ? (
                            <p className="text-xs text-gray-500 italic">No payments recorded yet.</p>
                        ) : (
                            <div className="relative pl-6 border-l-2 border-gray-700/80 space-y-4 py-1">
                                {debt.repayments.map((payment, idx) => (
                                    <div key={payment.id || idx} className="relative">
                                        {/* Timeline marker node */}
                                        <span className="absolute -left-[31px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-gray-900"></span>
                                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-sm font-mono">
                                                    ${parseFloat(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {payment.description || 'Repayment'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap mt-1 md:mt-0">
                                                {new Date(payment.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const PersonDebtGroup = ({ group, onSettle, onSettleTotal, onEdit, onDelete, isClearedSection, highlightedDebtId }) => {
    const hasHighlighted = group.debts.some(d => d.id === highlightedDebtId);
    const [isExpanded, setIsExpanded] = useState(hasHighlighted);

    useEffect(() => {
        if (hasHighlighted) {
            setIsExpanded(true);
        }
    }, [highlightedDebtId, hasHighlighted]);

    const outstandingColor = isClearedSection
        ? 'text-green-400'
        : (group.debts[0]?.debt_type === 'TAKEN' ? 'text-red-400' : 'text-green-400');

    return (
        <div className={`bg-gray-800/40 rounded-xl border overflow-hidden shadow-md transition-all ${
            isClearedSection ? 'border-gray-800/80 opacity-85 hover:opacity-100' : 'border-gray-700/60'
        }`}>
            {/* Header */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex flex-col sm:flex-row justify-between sm:items-center p-4 cursor-pointer hover:bg-gray-800/100 transition-colors select-none gap-4 ${
                    isClearedSection ? 'bg-gray-800/40' : 'bg-gray-800/80'
                }`}
            >
                <div className="flex items-center justify-between w-full sm:w-auto">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            isClearedSection ? 'bg-green-500/15 text-green-400' : 'bg-primary/25 text-primary'
                        }`}>
                            {group.person_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-lg tracking-tight flex items-center gap-2">
                                {group.person_name}
                                {isClearedSection && (
                                    <span className="bg-green-500/20 text-green-400 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide">Settled</span>
                                )}
                            </h4>
                            <p className="text-xs text-gray-400">
                                {group.debts.length} {group.debts.length === 1 ? 'record' : 'records'}
                            </p>
                        </div>
                    </div>
                    {/* Chevron for Mobile */}
                    <svg 
                        className={`w-5 h-5 text-gray-400 sm:hidden transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    {!isClearedSection && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSettleTotal(group);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95 whitespace-nowrap"
                        >
                            Settle Total
                        </button>
                    )}
                    <div className="text-right sm:mr-2">
                        <p className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider">
                            {isClearedSection ? 'Total Cleared' : 'Outstanding'}
                        </p>
                        <p className={`text-lg sm:text-xl font-extrabold tracking-tight ${outstandingColor}`}>
                            {isClearedSection ? `$${group.total_original.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `$${group.total_remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        </p>
                    </div>
                    {/* Chevron for Desktop */}
                    <svg 
                        className={`w-5 h-5 text-gray-400 hidden sm:block transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Debts List */}
            {isExpanded && (
                <div className="divide-y divide-gray-700/50 p-2 bg-gray-900/10 animate-fade-in space-y-1">
                    {group.debts.map(debt => (
                        <IndividualDebtItem 
                            key={debt.id} 
                            debt={debt} 
                            onSettle={onSettle}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            isClearedSection={isClearedSection}
                            isHighlighted={debt.id === highlightedDebtId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DebtList;
