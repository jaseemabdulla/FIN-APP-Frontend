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
        setShowAddDebtForm(true);
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
        
        Object.values(groups).forEach(group => {
            group.debts.sort((a, b) => {
                if (a.is_cleared !== b.is_cleared) {
                    return a.is_cleared ? 1 : -1;
                }
                return new Date(b.date) - new Date(a.date);
            });
        });
        
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
        <div className="max-w-4xl mx-auto px-4 text-text-main">
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4 animate-fade-in">
                <div>
                     <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">Debt Manager</h2>
                     <p className="text-xs sm:text-sm text-text-muted mt-0.5">Track loans, credit lines, and legacy debts.</p>
                </div>
               
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={handleDownload}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-card-dark hover:bg-bg-dark border border-border-main rounded-xl text-sm font-bold text-text-main transition-all cursor-pointer shadow"
                        title="Download Debt Report"
                    >
                        <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span>Download PDF</span>
                    </button>
                    <button 
                        onClick={() => {
                            setEditingDebt(null);
                            setShowAddDebtForm(!showAddDebtForm);
                        }}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-black font-bold rounded-xl text-sm transition-transform active:scale-95 cursor-pointer shadow-lg"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        <span>Record Debt</span>
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
                    <div className="animate-fade-in bg-card-dark p-1 rounded-2xl border border-border-main shadow-2xl">
                        <TransactionForm 
                            prefillDebt={settlingDebt}
                            onTransactionAdded={handleTransactionAdded}
                            onCancelRepayment={() => setSettlingDebt(null)}
                        />
                    </div>
                )}

                {settlingPerson && (
                    <div className="animate-fade-in bg-card-dark p-5 rounded-2xl border border-border-main shadow-2xl">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-main">
                            <h3 className="text-base sm:text-lg font-bold text-secondary truncate pr-2">
                                Settle Total Outstanding: {settlingPerson.person_name}
                            </h3>
                            <button 
                                onClick={() => setSettlingPerson(null)} 
                                className="text-text-muted hover:text-text-main text-xs underline cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                        <form onSubmit={handleSettlePersonSubmit} className="flex flex-col sm:flex-row sm:flex-wrap gap-4 items-stretch sm:items-end">
                            <div className="w-full sm:w-[calc(50%-8px)] md:w-auto md:min-w-[130px]">
                                <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Date</label>
                                <input 
                                    type="date" 
                                    value={settlePersonData.date} 
                                    onChange={(e) => setSettlePersonData(prev => ({ ...prev, date: e.target.value }))}
                                    required
                                    className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm cursor-pointer"
                                />
                            </div>

                            <div className="w-full sm:w-[calc(50%-8px)] md:flex-1 md:min-w-[110px]">
                                <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Amount</label>
                                <input 
                                    type="number" 
                                    value={settlePersonData.amount} 
                                    onChange={(e) => setSettlePersonData(prev => ({ ...prev, amount: e.target.value }))}
                                    required
                                    min="0.01"
                                    step="any"
                                    max={settlingPerson.total_remaining}
                                    className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main font-mono text-sm"
                                />
                                <span className="text-[10px] text-text-muted mt-1.5 block">
                                    Max: ₹{settlingPerson.total_remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="w-full md:flex-[2] md:min-w-[180px]">
                                <label className="block text-xs text-text-muted mb-1 font-semibold uppercase tracking-wider">Notes (Optional)</label>
                                <input 
                                    type="text" 
                                    value={settlePersonData.description} 
                                    onChange={(e) => setSettlePersonData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="e.g. Cleared all outstanding"
                                    className="w-full bg-bg-dark border border-border-main rounded-xl px-3 py-2 focus:border-primary outline-none text-text-main text-sm"
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
                                        className="w-4 h-4 text-primary focus:ring-primary border-border-main bg-bg-dark"
                                    />
                                    <span className="text-sm text-text-main font-semibold">Cash</span>
                                </label>
                                <label className="cursor-pointer flex items-center gap-2 select-none">
                                    <input 
                                        type="radio" 
                                        name="settle_person_mode" 
                                        value="ACCOUNT"
                                        checked={settlePersonData.payment_mode === 'ACCOUNT'}
                                        onChange={() => setSettlePersonData(prev => ({ ...prev, payment_mode: 'ACCOUNT' }))}
                                        className="w-4 h-4 text-primary focus:ring-primary border-border-main bg-bg-dark"
                                    />
                                    <span className="text-sm text-text-main font-semibold">Account</span>
                                </label>
                            </div>

                            <div className="w-full sm:w-auto flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={loadingSettlePerson}
                                    className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-black font-extrabold py-2.5 px-6 rounded-xl border border-primary transition-all text-sm cursor-pointer shadow active:scale-95"
                                >
                                    {loadingSettlePerson ? 'Recording...' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-2 gap-4 mb-8 animate-fade-in">
                <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/20 shadow-md relative overflow-hidden group">
                    <p className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-wider">Total To Pay (Payables)</p>
                    <p className="text-xl sm:text-3xl font-black text-rose-500 mt-1.5">₹{totalTaken.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 shadow-md relative overflow-hidden group">
                    <p className="text-text-muted text-[10px] sm:text-xs uppercase font-extrabold tracking-wider">Total To Receive (Receivables)</p>
                    <p className="text-xl sm:text-3xl font-black text-emerald-500 mt-1.5">₹{totalGiven.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 flex flex-col justify-center items-center gap-3 animate-fade-in">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-text-muted text-sm font-semibold">Loading debt directory...</p>
                </div>
            ) : (
                <div className="bg-card-dark rounded-2xl shadow-xl border border-border-main overflow-hidden min-h-[400px] animate-fade-in">
                    {/* Tabs / Segmented Control */}
                    <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border-main bg-bg-dark/40">
                        {/* Active Given */}
                        <button 
                            onClick={() => setActiveTab('ACTIVE_GIVEN')}
                            className={`py-3.5 text-center font-extrabold text-xs tracking-wider uppercase transition-all duration-200 relative cursor-pointer ${
                                activeTab === 'ACTIVE_GIVEN' 
                                ? 'text-emerald-500 bg-emerald-500/5' 
                                : 'text-text-muted hover:text-text-main'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                Given
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                    activeTab === 'ACTIVE_GIVEN' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-card-dark text-text-muted'
                                }`}>
                                    {activeGiven.length}
                                </span>
                            </span>
                            {activeTab === 'ACTIVE_GIVEN' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500"></div>}
                        </button>

                        {/* Active Payable */}
                        <button 
                            onClick={() => setActiveTab('ACTIVE_PAYABLE')}
                            className={`py-3.5 text-center font-extrabold text-xs tracking-wider uppercase transition-all duration-200 relative cursor-pointer ${
                                activeTab === 'ACTIVE_PAYABLE' 
                                ? 'text-rose-500 bg-rose-500/5' 
                                : 'text-text-muted hover:text-text-main'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                Payable
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                    activeTab === 'ACTIVE_PAYABLE' ? 'bg-rose-500/20 text-rose-500' : 'bg-card-dark text-text-muted'
                                }`}>
                                    {activePayable.length}
                                </span>
                            </span>
                            {activeTab === 'ACTIVE_PAYABLE' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500"></div>}
                        </button>

                        {/* Cleared Given */}
                        <button 
                            onClick={() => setActiveTab('CLEARED_GIVEN')}
                            className={`py-3.5 text-center font-extrabold text-xs tracking-wider uppercase transition-all duration-200 relative cursor-pointer ${
                                activeTab === 'CLEARED_GIVEN' 
                                ? 'text-primary bg-primary/5' 
                                : 'text-text-muted hover:text-text-main'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                Cleared Given
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                    activeTab === 'CLEARED_GIVEN' ? 'bg-primary/20 text-primary' : 'bg-card-dark text-text-muted'
                                }`}>
                                    {clearedGiven.length}
                                </span>
                            </span>
                            {activeTab === 'CLEARED_GIVEN' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                        </button>

                        {/* Cleared Payable */}
                        <button 
                            onClick={() => setActiveTab('CLEARED_PAYABLE')}
                            className={`py-3.5 text-center font-extrabold text-xs tracking-wider uppercase transition-all duration-200 relative cursor-pointer ${
                                activeTab === 'CLEARED_PAYABLE' 
                                ? 'text-primary bg-primary/5' 
                                : 'text-text-muted hover:text-text-main'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                Cleared Payable
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                    activeTab === 'CLEARED_PAYABLE' ? 'bg-primary/20 text-primary' : 'bg-card-dark text-text-muted'
                                }`}>
                                    {clearedPayable.length}
                                </span>
                            </span>
                            {activeTab === 'CLEARED_PAYABLE' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
                        </button>
                    </div>

                    {/* List Content */}
                    <div className="p-4 md:p-6 space-y-8">
                        {currentGroupedList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                                <svg className="w-16 h-16 mb-4 opacity-20 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="text-sm font-semibold">No debt records found in this view.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 border-b border-border-main pb-2 mb-4">
                                    <h3 className="text-[10px] font-bold text-text-muted tracking-widest uppercase">
                                        {activeTab === 'ACTIVE_GIVEN' && "Active Given (Receivables)"}
                                        {activeTab === 'ACTIVE_PAYABLE' && "Active Payable (Payables)"}
                                        {activeTab === 'CLEARED_GIVEN' && "Cleared Given (Receivables)"}
                                        {activeTab === 'CLEARED_PAYABLE' && "Cleared Payable (Payables)"}
                                    </h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isClearedSection 
                                        ? 'bg-primary/20 text-primary' 
                                        : (activeTab === 'ACTIVE_PAYABLE' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500')
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
            className={`transition-all rounded-xl overflow-hidden border ${
                isHighlighted
                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5 my-2 animate-fade-in'
                : isExpanded 
                    ? 'bg-bg-dark border-border-main my-2' 
                    : 'border-transparent hover:bg-bg-dark/20'
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
                        className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-text-muted font-bold font-sans">
                            {new Date(debt.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        {debt.description ? (
                            <span className="text-sm text-text-main font-semibold flex items-center gap-1.5 flex-wrap">
                                {debt.description}
                                {debt.related_fund && (
                                    <span className="bg-primary/20 text-primary text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide border border-primary/20">
                                        🏷️ Fund Debt
                                    </span>
                                )}
                            </span>
                        ) : (
                            <span className="text-sm text-text-muted italic">No legacy notes</span>
                        )}
                    </div>
                </div>

                {/* Amount and Actions */}
                <div 
                    className="flex items-center justify-between w-full md:w-auto gap-6 mt-3 md:mt-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-left md:text-right">
                        <span className={`font-mono font-bold text-sm ${debt.is_cleared ? 'line-through text-text-muted' : 'text-text-main'}`}>
                            ₹{(debt.is_cleared ? originalAmount : remainingAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {!debt.is_cleared && totalRepaid > 0 && (
                            <span className="block text-[10px] text-text-muted font-semibold mt-0.5">
                                of ₹{originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        )}
                        {debt.is_cleared && (
                            <span className="block text-[9px] text-success font-extrabold uppercase tracking-wide font-sans mt-0.5">Settled</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {!debt.is_cleared ? (
                            <button 
                                onClick={() => onSettle(debt)} 
                                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-black text-[11px] font-extrabold shadow transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                            >
                                Settle
                            </button>
                        ) : (
                            <div className="w-[50px] flex justify-center">
                                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        )}

                        {/* Actions Divider */}
                        <div className="flex items-center gap-1 border-l border-border-main pl-2">
                            <button 
                                onClick={() => onEdit(debt)}
                                className="text-text-muted hover:text-primary transition-colors p-1.5 hover:bg-bg-dark rounded-lg cursor-pointer"
                                title="Edit"
                                type="button"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button 
                                onClick={() => onDelete(debt.id)}
                                className="text-text-muted hover:text-error transition-colors p-1.5 hover:bg-bg-dark rounded-lg cursor-pointer"
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
                <div className="px-5 pb-5 pt-3 border-t border-border-main bg-bg-dark/40 text-sm text-text-muted">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-border-main/50">
                        <div>
                            <span className="block text-[9px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Original Debt</span>
                            <span className="font-mono font-bold text-text-main">₹{originalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                            <span className="block text-[9px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Total Paid</span>
                            <span className="font-mono font-bold text-success font-sans">₹{totalRepaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {!debt.is_cleared ? (
                            <div>
                                <span className="block text-[9px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Remaining Balance</span>
                                <span className="font-mono font-bold text-error font-sans">₹{remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        ) : (
                            <div>
                                <span className="block text-[9px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Cleared Date</span>
                                <span className="font-mono font-bold text-success">
                                    {debt.cleared_date ? new Date(debt.cleared_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Settled'}
                                </span>
                            </div>
                        )}
                        <div>
                            <span className="block text-[9px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Payment Status</span>
                            <span className={`inline-block font-extrabold text-[10px] px-2 py-0.5 rounded uppercase ${
                                debt.is_cleared ? 'bg-success/15 text-success border border-success/20' : totalRepaid > 0 ? 'bg-warning/15 text-warning border border-warning/20' : 'bg-error/15 text-error border border-error/20'
                            }`}>
                                {debt.is_cleared ? 'Settled' : totalRepaid > 0 ? 'Part Paid' : 'Unpaid'}
                            </span>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="pt-4 animate-fade-in">
                        <span className="block text-[9px] text-text-muted uppercase font-bold tracking-wider mb-3.5">Payment History Timeline</span>
                        {(!debt.repayments || debt.repayments.length === 0) ? (
                            <p className="text-xs text-text-muted italic">No payments recorded yet.</p>
                        ) : (
                            <div className="relative pl-5 border-l-2 border-border-main space-y-4 py-1 ml-1.5">
                                {debt.repayments.map((payment, idx) => (
                                    <div key={payment.id || idx} className="relative">
                                        {/* Timeline marker node */}
                                        <span className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-bg-dark"></span>
                                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-text-main text-sm font-mono">
                                                    ₹{parseFloat(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-xs text-text-muted">
                                                    {payment.description || 'Repayment'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-text-muted font-semibold whitespace-nowrap mt-1 md:mt-0 font-sans">
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
        ? 'text-emerald-500'
        : (group.debts[0]?.debt_type === 'TAKEN' ? 'text-rose-500' : 'text-emerald-500');

    return (
        <div className={`bg-card-dark rounded-2xl border overflow-hidden shadow-md transition-all ${
            isClearedSection ? 'border-border-main/60 opacity-90 hover:opacity-100' : 'border-border-main'
        }`}>
            {/* Header */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex flex-col sm:flex-row justify-between sm:items-center p-4 cursor-pointer hover:bg-bg-dark/30 transition-colors select-none gap-4 ${
                    isClearedSection ? 'bg-bg-dark/20' : 'bg-bg-dark/50'
                }`}
            >
                <div className="flex items-center justify-between w-full sm:w-auto">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border uppercase shadow-sm ${
                            isClearedSection ? 'bg-success/10 text-success border-success/20' : 'bg-primary/10 text-primary border-primary/20'
                        }`}>
                            {group.person_name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-extrabold text-text-main text-base tracking-tight flex items-center gap-2">
                                {group.person_name}
                                {isClearedSection && (
                                    <span className="bg-success/15 text-success text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide border border-success/15">Settled</span>
                                )}
                            </h4>
                            <p className="text-xs text-text-muted font-semibold mt-0.5">
                                {group.debts.length} {group.debts.length === 1 ? 'debt record' : 'debt records'}
                            </p>
                        </div>
                    </div>
                    {/* Chevron for Mobile */}
                    <svg 
                        className={`w-5 h-5 text-text-muted sm:hidden transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
                    {!isClearedSection && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSettleTotal(group);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-black text-[11px] font-extrabold shadow transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                        >
                            Settle Total
                        </button>
                    )}
                    <div className="text-left sm:text-right sm:mr-1">
                        <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">
                            {isClearedSection ? 'Total Cleared' : 'Outstanding'}
                        </p>
                        <p className={`text-base sm:text-lg font-black tracking-tight ${outstandingColor}`}>
                            {isClearedSection ? `₹${group.total_original.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `₹${group.total_remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        </p>
                    </div>
                    {/* Chevron for Desktop */}
                    <svg 
                        className={`w-5 h-5 text-text-muted hidden sm:block transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Debts List */}
            {isExpanded && (
                <div className="divide-y divide-border-main/50 p-2 bg-bg-dark/10 animate-fade-in space-y-1">
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
