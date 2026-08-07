import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthlyReport, exportPDFReport, deleteTransaction } from '../api';
import TransactionForm from './TransactionForm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['var(--primary)', 'var(--secondary)', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3', '#19FFD5', '#F5428D', '#42F587'];

const formatTransactionType = (type) => {
    if (!type) return 'Unknown';
    return type
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const MonthlyReport = () => {
    const navigate = useNavigate();
    const today = new Date();
    const [reportType, setReportType] = useState('monthly'); // daily, weekly, monthly, yearly
    
    // Params for different types
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [date, setDate] = useState(today.toISOString().split('T')[0]);

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [prefillInvestment, setPrefillInvestment] = useState(null);
    const [activeTab, setActiveTab] = useState('categories'); // categories, debt, audit, comparison

    // Debt log categories state
    const [selectedDebtCategory, setSelectedDebtCategory] = useState('borrowed');
    const [detailedTransaction, setDetailedTransaction] = useState(null);

    // Monthly comparison report states
    const currentMonthObj = { month: today.getMonth() + 1, year: today.getFullYear() };
    const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
    const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const prevMonthObj = { month: prevMonth, year: prevYear };

    const [comparisonMonths, setComparisonMonths] = useState([currentMonthObj, prevMonthObj]);
    const [comparisonResults, setComparisonResults] = useState(null);
    const [comparisonLoading, setComparisonLoading] = useState(false);
    const [selectedCompareMonth, setSelectedCompareMonth] = useState(today.getMonth() + 1);
    const [selectedCompareYear, setSelectedCompareYear] = useState(today.getFullYear());
    
    const fetchReportData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMonthlyReport(month, year);
            setReport(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        if (reportType === 'monthly') {
            fetchReportData();
        } else {
            setReport(null);
        }
    }, [reportType, fetchReportData]);

    const handleAddMonth = () => {
        const exists = comparisonMonths.some(m => m.month === parseInt(selectedCompareMonth) && m.year === parseInt(selectedCompareYear));
        if (exists) {
            alert("This month is already added to comparison.");
            return;
        }
        setComparisonMonths(prev => [...prev, { month: parseInt(selectedCompareMonth), year: parseInt(selectedCompareYear) }]);
    };

    const handleRemoveMonth = (index) => {
        if (comparisonMonths.length <= 2) {
            alert("You need at least two months for comparison.");
            return;
        }
        setComparisonMonths(prev => prev.filter((_, idx) => idx !== index));
    };

    const fetchComparisonData = useCallback(async () => {
        if (comparisonMonths.length < 2) return;
        setComparisonLoading(true);
        try {
            const promises = comparisonMonths.map(m => getMonthlyReport(m.month, m.year));
            const responses = await Promise.all(promises);
            const reports = responses.map((res, index) => ({
                month: comparisonMonths[index].month,
                year: comparisonMonths[index].year,
                label: `${new Date(0, comparisonMonths[index].month - 1).toLocaleString('default', { month: 'short' })} ${comparisonMonths[index].year}`,
                report: res.data
            }));
            
            const categoriesMap = {};
            const monthLabels = reports.map(r => r.label);

            reports.forEach(r => {
                const breakdown = r.report.category_breakdown || [];
                breakdown.forEach(cat => {
                    if (cat.type === 'EXPENSE') {
                        const catName = cat.category || 'Uncategorized';
                        if (!categoriesMap[catName]) {
                            categoriesMap[catName] = { category: catName };
                            monthLabels.forEach(label => {
                                categoriesMap[catName][label] = 0;
                            });
                        }
                        categoriesMap[catName][r.label] = parseFloat(cat.total || 0);
                    }
                });
            });

            const comparisonRows = Object.values(categoriesMap);
            setComparisonResults({
                rows: comparisonRows,
                months: reports,
                monthLabels
            });
        } catch (err) {
            console.error("Error fetching comparison data", err);
        } finally {
            setComparisonLoading(false);
        }
    }, [comparisonMonths]);

    useEffect(() => {
        if (activeTab === 'comparison') {
            fetchComparisonData();
        }
    }, [activeTab, fetchComparisonData]);

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

    const getLastDateOfMonth = () => {
        const lastDay = new Date(year, month, 0).getDate();
        return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    };

    const getSurplusInvestedAmount = () => {
        let total = 0;
        if (report && report.category_breakdown) {
            report.category_breakdown.forEach(cat => {
                if (cat.transactions) {
                    cat.transactions.forEach(txn => {
                        if (
                           txn.transaction_type === 'INVESTMENT' &&
                           txn.description &&
                           txn.description.toLowerCase().includes('monthly surplus investment')
                        ) {
                            total += parseFloat(txn.amount || 0);
                        }
                    });
                }
            });
        }
        return total;
    };

    const handleDelete = async (id) => {
        let isFundTxn = false;
        if (report) {
            if (report.category_breakdown) {
                for (const cat of report.category_breakdown) {
                    const found = cat.transactions?.find(t => t.id === id);
                    if (found && found.transaction_type.startsWith('FUND_MANAGEMENT')) {
                        isFundTxn = true;
                        break;
                    }
                }
            }
            if (!isFundTxn && report.audit_log) {
                const found = report.audit_log.find(t => t.id === id);
                if (found && found.transaction_type.startsWith('FUND_MANAGEMENT')) {
                    isFundTxn = true;
                }
            }
        }
        if (isFundTxn) {
            alert("This transaction is automatically managed by the Fund Management module. Please delete or settle the corresponding fund instead.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            try {
                await deleteTransaction(id);
                fetchReportData();
            } catch (error) {
                console.error("Error deleting transaction", error);
                alert("Failed to delete transaction");
            }
        }
    };

    const handleDownloadPDF = async () => {
        try {
            let params = { type: reportType };
            if (reportType === 'monthly') {
                params = { ...params, month, year };
            } else if (reportType === 'yearly') {
                params = { ...params, year };
            } else if (reportType === 'daily' || reportType === 'weekly') {
                params = { ...params, date };
            }

            const response = await exportPDFReport(params);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${reportType}_${params.date || `${year}_${month}`}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to download PDF");
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 text-text-main space-y-6">
            {/* Control Panel */}
            <div className="bg-card-dark p-4 sm:p-5 rounded-2xl border border-border-main shadow animate-fade-in">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-secondary tracking-tight">Report Registry</h2>
                        <p className="text-xs text-text-muted mt-0.5">Visualize statements and export transaction archives.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
                        {/* Type Selector */}
                        <select 
                            value={reportType} 
                            onChange={(e) => setReportType(e.target.value)} 
                            className="bg-bg-dark p-2.5 rounded-xl border border-border-main outline-none focus:border-primary text-sm flex-1 md:flex-initial cursor-pointer text-text-main font-semibold"
                        >
                            <option value="daily">Daily Statement</option>
                            <option value="weekly">Weekly Statement</option>
                            <option value="monthly">Monthly Summary</option>
                            <option value="yearly">Yearly Summary</option>
                        </select>

                        {/* Condition Controls */}
                        {reportType === 'monthly' && (
                             <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-bg-dark p-2.5 rounded-xl border border-border-main outline-none text-sm flex-1 md:flex-initial cursor-pointer text-text-main font-semibold">
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
                                    ))}
                                </select>
                        )}
                        
                        {(reportType === 'monthly' || reportType === 'yearly') && (
                            <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-bg-dark p-2.5 rounded-xl border border-border-main outline-none text-sm flex-1 md:flex-initial cursor-pointer text-text-main font-semibold">
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>
                        )}

                        {(reportType === 'daily' || reportType === 'weekly') && (
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                className="bg-bg-dark text-text-main border border-border-main rounded-xl p-2.5 outline-none text-sm flex-1 md:flex-initial cursor-pointer font-semibold"
                            />
                        )}

                        <button 
                            onClick={handleDownloadPDF}
                            className="bg-error text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm flex-1 md:flex-initial transition-all cursor-pointer shadow active:scale-95 border border-error hover:bg-opacity-90"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span>Download PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard View - Only for Monthly currently */}
            {loading && (
                <div className="text-center py-20 flex flex-col justify-center items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-text-muted text-sm font-semibold">Generating report card...</p>
                </div>
            )}

            {!loading && reportType === 'monthly' && report && (
                <>
                    {/* Day-to-Day Cash Flow Section */}
                    <div className="space-y-3 animate-fade-in">
                        <h4 className="text-[10px] sm:text-xs font-black text-text-muted uppercase tracking-widest">Day-to-Day Cash Flow</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Income */}
                            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 shadow-md">
                                <h3 className="text-text-muted mb-1.5 uppercase text-[10px] tracking-wider font-bold">Total Income</h3>
                                <p className="text-xl sm:text-2xl font-black text-emerald-500">₹{parseFloat(report.total_income || 0).toLocaleString()}</p>
                                <span className="text-[9px] text-text-muted block mt-1">Standard categories only</span>
                            </div>
                            {/* Total Expenses */}
                            <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/20 shadow-md">
                                <h3 className="text-text-muted mb-1.5 uppercase text-[10px] tracking-wider font-bold">Total Expenses</h3>
                                <p className="text-xl sm:text-2xl font-black text-rose-500">₹{parseFloat(report.total_expense || 0).toLocaleString()}</p>
                                <span className="text-[9px] text-text-muted block mt-1">Standard categories only</span>
                            </div>
                            {/* Net Savings */}
                            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 shadow-md">
                                <h3 className="text-text-muted mb-1.5 uppercase text-[10px] tracking-wider font-bold">Net Savings</h3>
                                <p className={`text-xl sm:text-2xl font-black ${report.net_savings >= 0 ? 'text-primary' : 'text-error'}`}>
                                    ₹{parseFloat(report.net_savings || 0).toLocaleString()}
                                </p>
                                <span className="text-[9px] text-text-muted block mt-1">Income minus Expenses</span>
                            </div>
                        </div>
                    </div>

                    {/* System-Wide Inflows, Outflows & Balances */}
                    <div className="space-y-3 pt-2 animate-fade-in">
                        <h4 className="text-[10px] sm:text-xs font-black text-text-muted uppercase tracking-widest">Inflows, Outflows & Savings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Credit */}
                            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 shadow-md">
                                <h3 className="text-text-muted mb-1.5 uppercase text-[10px] tracking-wider font-bold">Total Credit</h3>
                                <p className="text-xl sm:text-2xl font-black text-emerald-500">₹{parseFloat(report.total_credit || 0).toLocaleString()}</p>
                                <span className="text-[9px] text-text-muted block mt-1">Income + Borrowed + Collected</span>
                            </div>
                            {/* Total Debit / Spent */}
                            <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/20 shadow-md">
                                <h3 className="text-text-muted mb-1.5 uppercase text-[10px] tracking-wider font-bold">Total Debit</h3>
                                <p className="text-xl sm:text-2xl font-black text-orange-500">₹{parseFloat(report.total_debit || 0).toLocaleString()}</p>
                                <span className="text-[9px] text-text-muted block mt-1">Expenses + Lent + Investments</span>
                            </div>
                            {/* Net Difference */}
                            <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/20 shadow-md flex flex-col justify-between">
                                <div>
                                    <h3 className="text-text-muted mb-1.5 uppercase text-[10px] tracking-wider font-bold">Net Balance</h3>
                                    <p className={`text-xl sm:text-2xl font-black ${parseFloat(report.total_credit || 0) - parseFloat(report.total_debit || 0) >= 0 ? 'text-secondary' : 'text-error'}`}>
                                        ₹{(parseFloat(report.total_credit || 0) - parseFloat(report.total_debit || 0)).toLocaleString()}
                                    </p>
                                    <span className="text-[9px] text-text-muted block mt-1">Total Credits minus Total Debits</span>
                                </div>
                                <div className="mt-4 pt-3 border-t border-border-main/50 flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-[10px] text-text-muted font-bold uppercase">
                                        <span>Invested:</span>
                                        <span className="text-secondary">₹{getSurplusInvestedAmount().toLocaleString()}</span>
                                    </div>
                                    {parseFloat(report.total_credit || 0) - parseFloat(report.total_debit || 0) > 0 && (
                                        <button 
                                            onClick={() => setPrefillInvestment({ amount: parseFloat(report.total_credit || 0) - parseFloat(report.total_debit || 0) })}
                                            className="w-full text-center text-[10px] bg-secondary hover:bg-secondary-hover text-black font-extrabold py-2 px-2.5 rounded-lg transition-colors uppercase tracking-wider cursor-pointer shadow-sm active:scale-95"
                                        >
                                            💼 Convert to Investment
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Breakdowns & Audits Section */}
                    <div className="space-y-4 pt-4">
                        {/* Segmented Control / Tab Bar */}
                        <div className="flex border-b border-border-main bg-bg-dark/45 p-1 rounded-xl border overflow-x-auto scrollbar-none">
                            <button
                                onClick={() => setActiveTab('categories')}
                                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap px-4 ${activeTab === 'categories' ? 'bg-card-dark text-primary shadow' : 'text-text-muted hover:text-text-main'}`}
                            >
                                📊 Categories
                            </button>
                            <button
                                onClick={() => setActiveTab('debt')}
                                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap px-4 ${activeTab === 'debt' ? 'bg-card-dark text-primary shadow' : 'text-text-muted hover:text-text-main'}`}
                            >
                                🤝 Debt Log
                            </button>
                            <button
                                onClick={() => setActiveTab('audit')}
                                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap px-4 ${activeTab === 'audit' ? 'bg-card-dark text-primary shadow' : 'text-text-muted hover:text-text-main'}`}
                            >
                                🔍 Inflow vs Outflow
                            </button>
                            <button
                                onClick={() => setActiveTab('comparison')}
                                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap px-4 ${activeTab === 'comparison' ? 'bg-card-dark text-primary shadow' : 'text-text-muted hover:text-text-main'}`}
                            >
                                📈 Comparison
                            </button>
                        </div>

                        {activeTab === 'categories' && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-base sm:text-lg font-extrabold text-text-main">Category Breakdown</h3>
                                <div className="bg-card-dark rounded-2xl shadow border border-border-main overflow-hidden">
                                    <div className="p-4 sm:p-5">
                                        {report.category_breakdown.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                                                <p className="text-sm font-semibold">No data available for this month.</p>
                                            </div>
                                        ) : (() => {
                                            // Group categories by type
                                            const groupedCategories = {};
                                            report.category_breakdown.forEach(cat => {
                                                const type = cat.type || 'UNKNOWN';
                                                if (!groupedCategories[type]) {
                                                    groupedCategories[type] = [];
                                                }
                                                groupedCategories[type].push(cat);
                                            });

                                            return (
                                                <div className="space-y-8">
                                                    {Object.keys(groupedCategories).sort().map(type => {
                                                        const categoriesOfType = groupedCategories[type];
                                                        const totalForType = categoriesOfType.reduce((sum, c) => sum + parseFloat(c.total || 0), 0);

                                                        return (
                                                            <div key={type} className="space-y-3">
                                                                <div className="flex justify-between items-center border-b border-border-main pb-2 mb-3">
                                                                    <h4 className="text-xs font-extrabold text-secondary uppercase tracking-widest">
                                                                        {formatTransactionType(type)}
                                                                    </h4>
                                                                    <span className="text-xs text-text-muted font-bold font-mono">
                                                                        Total: ₹{totalForType.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>

                                                                <ul className="space-y-3">
                                                                    {categoriesOfType.map((cat, idx) => {
                                                                        const catKey = `${type}-${cat.category}`;
                                                                        const isExpanded = expandedCategory === catKey;

                                                                        return (
                                                                            <li key={catKey} className={`group flex flex-col p-4 rounded-xl border transition-all ${isExpanded ? 'bg-bg-dark border-primary shadow-lg' : 'bg-bg-dark/40 border-border-main hover:border-border-main/80'}`}>
                                                                                <div className="flex justify-between items-center w-full cursor-pointer gap-2" onClick={() => setExpandedCategory(isExpanded ? null : catKey)}>
                                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black bg-card-dark shrink-0" style={{ color: COLORS[idx % COLORS.length] }}>
                                                                                            {cat.category.charAt(0).toUpperCase()}
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <div className="font-extrabold text-sm sm:text-base text-text-main flex items-center gap-2 truncate">
                                                                                                <span className="truncate">{cat.category}</span>
                                                                                            </div>
                                                                                            <div className="text-[10px] text-text-muted flex items-center gap-2 mt-0.5">
                                                                                                <button 
                                                                                                    type="button"
                                                                                                    onClick={(e) => { e.stopPropagation(); setExpandedCategory(isExpanded ? null : catKey); }}
                                                                                                    className="text-primary hover:underline font-bold cursor-pointer"
                                                                                                >
                                                                                                    {isExpanded ? 'Collapse' : `View details (${cat.transactions?.length || 0})`}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="text-right shrink-0">
                                                                                        <span className="block text-[9px] text-text-muted font-bold uppercase tracking-wider">Total</span>
                                                                                        <span className="text-sm font-bold text-text-main font-mono">
                                                                                            ₹{parseFloat(cat.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Transactions List Dropdown */}
                                                                                {isExpanded && cat.transactions && (
                                                                                    <div className="mt-4 pt-4 border-t border-border-main animate-fade-in w-full">
                                                                                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Transactions Ledger</h4>
                                                                                        {cat.transactions.length === 0 ? (
                                                                                            <p className="text-text-muted text-xs py-4 text-center bg-bg-dark rounded-xl border border-border-main border-dashed">No transactions.</p>
                                                                                        ) : (
                                                                                            <div className="bg-bg-dark rounded-xl overflow-hidden border border-border-main">
                                                                                                {/* Desktop Table View */}
                                                                                                <div className="hidden md:block overflow-x-auto">
                                                                                                    <table className="w-full text-left text-sm">
                                                                                                        <thead className="bg-card-dark text-text-muted uppercase text-[10px] font-bold tracking-wider border-b border-border-main">
                                                                                                            <tr>
                                                                                                                <th className="px-4 py-3">Date</th>
                                                                                                                <th className="px-4 py-3">Description</th>
                                                                                                                <th className="px-4 py-3">Mode</th>
                                                                                                                <th className="px-4 py-3 text-right">Amount</th>
                                                                                                                <th className="px-4 py-3 text-right">Actions</th>
                                                                                                            </tr>
                                                                                                        </thead>
                                                                                                        <tbody className="divide-y divide-border-main/50">
                                                                                                            {cat.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                                                                                                <tr key={txn.id} className="hover:bg-card-dark/20 transition-colors">
                                                                                                                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap text-xs font-semibold">{txn.date}</td>
                                                                                                                    <td className="px-4 py-2.5 text-text-main truncate max-w-[200px] text-xs font-semibold" title={txn.description || 'No description'}>
                                                                                                                        {txn.description || <span className="text-text-muted italic">None</span>}
                                                                                                                    </td>
                                                                                                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                                                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${txn.payment_mode === 'CASH' ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20' : 'bg-blue-500/15 text-blue-500 border border-blue-500/20'}`}>
                                                                                                                            {txn.payment_mode}
                                                                                                                        </span>
                                                                                                                    </td>
                                                                                                                    <td className="px-4 py-2.5 text-right font-bold font-mono whitespace-nowrap text-text-main text-xs">
                                                                                                                        ₹{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                                                    </td>
                                                                                                                    <td className="px-4 py-2.5 text-right whitespace-nowrap text-xs">
                                                                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} className="text-primary hover:underline mr-3 font-bold cursor-pointer">Edit</button>
                                                                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} className="text-error hover:underline font-bold cursor-pointer">Delete</button>
                                                                                                                    </td>
                                                                                                                </tr>
                                                                                                            ))}
                                                                                                        </tbody>
                                                                                                    </table>
                                                                                                </div>

                                                                                                {/* Mobile Card List View */}
                                                                                                <div className="md:hidden divide-y divide-border-main/40">
                                                                                                    {cat.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                                                                                        <div key={txn.id} className="p-3.5 flex flex-col gap-2 hover:bg-card-dark/20 transition-colors">
                                                                                                            <div className="flex justify-between items-center text-[10px]">
                                                                                                                <span className="text-text-muted font-semibold">{txn.date}</span>
                                                                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${txn.payment_mode === 'CASH' ? 'bg-yellow-500/15 text-yellow-500' : 'bg-blue-500/15 text-blue-500'}`}>
                                                                                                                    {txn.payment_mode}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <div className="flex justify-between items-start gap-2">
                                                                                                                <div>
                                                                                                                    {txn.description && (
                                                                                                                        <p className="text-xs text-text-muted font-semibold">{txn.description}</p>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <div className="text-right">
                                                                                                                    <span className="font-bold text-text-main font-mono text-xs">
                                                                                                                        ₹{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                            <div className="flex justify-end gap-4 mt-1.5 pt-2 border-t border-border-main/30">
                                                                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} className="text-primary hover:underline text-[11px] font-bold cursor-pointer">Edit</button>
                                                                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} className="text-error hover:underline text-[11px] font-bold cursor-pointer">Delete</button>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'debt' && report.debt_breakdown && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-base sm:text-lg font-extrabold text-text-main">Debt & Repayments Log</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedDebtCategory('borrowed')}
                                        className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${selectedDebtCategory === 'borrowed' ? 'bg-emerald-500/10 border-emerald-500/30 shadow' : 'bg-card-dark border-border-main hover:border-border-main/80'}`}
                                    >
                                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-bold">Borrowed</div>
                                        <div className="text-base sm:text-lg font-black text-emerald-500">+₹{parseFloat(report.debt_breakdown.debt_taken).toLocaleString()}</div>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedDebtCategory('lent')}
                                        className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${selectedDebtCategory === 'lent' ? 'bg-rose-500/10 border-rose-500/30 shadow' : 'bg-card-dark border-border-main hover:border-border-main/80'}`}
                                    >
                                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-bold">Lent</div>
                                        <div className="text-base sm:text-lg font-black text-rose-500">-₹{parseFloat(report.debt_breakdown.debt_given).toLocaleString()}</div>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedDebtCategory('repaid')}
                                        className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${selectedDebtCategory === 'repaid' ? 'bg-orange-500/10 border-orange-500/30 shadow' : 'bg-card-dark border-border-main hover:border-border-main/80'}`}
                                    >
                                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-bold">Repaid</div>
                                        <div className="text-base sm:text-lg font-black text-orange-500">-₹{parseFloat(report.debt_breakdown.debt_taken_return).toLocaleString()}</div>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedDebtCategory('collected')}
                                        className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${selectedDebtCategory === 'collected' ? 'bg-emerald-500/10 border-emerald-500/30 shadow' : 'bg-card-dark border-border-main hover:border-border-main/80'}`}
                                    >
                                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 font-bold font-sans">Collected</div>
                                        <div className="text-base sm:text-lg font-black text-emerald-500">+₹{parseFloat(report.debt_breakdown.debt_given_return).toLocaleString()}</div>
                                    </button>
                                </div>

                                <div className="bg-card-dark rounded-2xl shadow border border-border-main overflow-hidden mb-8 p-3 sm:p-4">
                                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                                        Debt Ledger ({selectedDebtCategory === 'borrowed' ? 'Borrowed' : selectedDebtCategory === 'lent' ? 'Lent' : selectedDebtCategory === 'repaid' ? 'Repaid' : 'Collected'})
                                    </h4>
                                    {(() => {
                                        const filteredTxns = (report.debt_breakdown.transactions || []).filter(txn => {
                                            if (selectedDebtCategory === 'borrowed') return txn.transaction_type === 'DEBT_TAKEN';
                                            if (selectedDebtCategory === 'lent') return txn.transaction_type === 'DEBT_GIVEN';
                                            if (selectedDebtCategory === 'repaid') return txn.transaction_type === 'DEBT_TAKEN_RETURN';
                                            if (selectedDebtCategory === 'collected') return txn.transaction_type === 'DEBT_GIVEN_RETURN';
                                            return false;
                                        });

                                        if (filteredTxns.length === 0) {
                                            return (
                                                <p className="text-text-muted text-xs py-8 text-center bg-bg-dark rounded-xl border border-border-main border-dashed">
                                                    No transactions recorded for this category.
                                                </p>
                                            );
                                        }

                                        return (
                                            <div className="bg-bg-dark rounded-xl overflow-hidden border border-border-main animate-fade-in">
                                                {/* Desktop Table View */}
                                                <div className="hidden md:block overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-card-dark text-text-muted uppercase text-[10px] font-bold border-b border-border-main">
                                                            <tr>
                                                                <th className="px-4 py-3">Date</th>
                                                                <th className="px-4 py-3">Person (Ledger)</th>
                                                                <th className="px-4 py-3">Description</th>
                                                                <th className="px-4 py-3">Mode</th>
                                                                <th className="px-4 py-3 text-right">Amount</th>
                                                                <th className="px-4 py-3 text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border-main/50">
                                                            {filteredTxns.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                                                <tr 
                                                                    key={txn.id} 
                                                                    onClick={() => setDetailedTransaction(txn)}
                                                                    className="hover:bg-card-dark/20 transition-colors cursor-pointer"
                                                                >
                                                                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap text-xs">{txn.date}</td>
                                                                    <td className="px-4 py-2.5 font-bold text-primary whitespace-nowrap text-xs">
                                                                        {txn.ledger_name || txn.description || <span className="text-text-muted italic">None</span>}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-text-main truncate max-w-[200px] text-xs font-semibold" title={txn.description || 'No description'}>
                                                                        {txn.description || <span className="text-text-muted italic">None</span>}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${txn.payment_mode === 'CASH' ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20' : 'bg-blue-500/15 text-blue-500 border border-blue-500/20'}`}>
                                                                            {txn.payment_mode}
                                                                        </span>
                                                                    </td>
                                                                    <td className={`px-4 py-2.5 text-right font-mono font-bold text-xs whitespace-nowrap ${['EXPENSE', 'DEBT_GIVEN', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-error' : 'text-emerald-500'}`}>
                                                                        {['EXPENSE', 'DEBT_GIVEN', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? '-' : '+'}{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right whitespace-nowrap text-xs">
                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} className="text-primary hover:underline mr-3 font-bold cursor-pointer">Edit</button>
                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} className="text-error hover:underline font-bold cursor-pointer">Delete</button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Mobile Card List View */}
                                                <div className="md:hidden divide-y divide-border-main/40">
                                                    {filteredTxns.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                                        <div 
                                                            key={txn.id} 
                                                            onClick={() => setDetailedTransaction(txn)}
                                                            className="p-3.5 flex flex-col gap-2 hover:bg-card-dark/20 transition-colors cursor-pointer"
                                                        >
                                                            <div className="flex justify-between items-center text-[10px]">
                                                                <span className="text-text-muted font-semibold">{txn.date}</span>
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${txn.payment_mode === 'CASH' ? 'bg-yellow-500/15 text-yellow-500' : 'bg-blue-500/15 text-blue-500'}`}>
                                                                    {txn.payment_mode}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div>
                                                                    <span className="font-extrabold text-primary block text-sm">
                                                                        {txn.ledger_name || txn.description || <span className="text-text-muted italic">None</span>}
                                                                    </span>
                                                                    {txn.description && (
                                                                        <p className="text-xs text-text-muted mt-1 font-semibold">{txn.description}</p>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`font-bold font-mono text-xs ${['EXPENSE', 'DEBT_GIVEN', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-error' : 'text-emerald-500'}`}>
                                                                        {['EXPENSE', 'DEBT_GIVEN', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? '-' : '+'}{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end gap-4 mt-1.5 pt-2 border-t border-border-main/30">
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} className="text-primary hover:underline text-[11px] font-bold cursor-pointer">Edit</button>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} className="text-error hover:underline text-[11px] font-bold cursor-pointer">Delete</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {activeTab === 'audit' && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-base sm:text-lg font-extrabold text-text-main">Credit & Debit Audit</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    {/* Credits Column */}
                                    <div className="bg-card-dark rounded-2xl p-4 sm:p-5 border border-emerald-500/20 bg-gradient-to-br from-card-dark to-emerald-500/5">
                                        <h4 className="font-extrabold text-emerald-500 text-sm sm:text-base mb-4 border-b border-border-main/60 pb-2 flex justify-between gap-2">
                                            <span>Total Credited (Inflows)</span>
                                            <span>+₹{parseFloat(report.total_credit).toLocaleString()}</span>
                                        </h4>
                                        <ul className="space-y-3">
                                            <li className="flex justify-between text-xs py-1 border-b border-border-main/30 font-semibold">
                                                <span className="text-text-muted">Standard Category Income</span>
                                                <span className="font-bold text-emerald-500">+₹{parseFloat(report.total_income).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-xs py-1 border-b border-border-main/30 font-semibold">
                                                <span className="text-text-muted">Debts Borrowed (Taken)</span>
                                                <span className="font-bold text-emerald-500">+₹{parseFloat(report.debt_breakdown?.debt_taken || 0).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-xs py-1 border-b border-border-main/30 font-semibold">
                                                <span className="text-text-muted">Debt Repayments Received</span>
                                                <span className="font-bold text-emerald-500">+₹{parseFloat(report.debt_breakdown?.debt_given_return || 0).toLocaleString()}</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Debits Column */}
                                    <div className="bg-card-dark rounded-2xl p-4 sm:p-5 border border-rose-500/20 bg-gradient-to-br from-card-dark to-rose-500/5">
                                        <h4 className="font-extrabold text-rose-500 text-sm sm:text-base mb-4 border-b border-border-main/60 pb-2 flex justify-between gap-2">
                                            <span>Total Debited (Outflows)</span>
                                            <span>-₹{parseFloat(report.total_debit).toLocaleString()}</span>
                                        </h4>
                                        <ul className="space-y-3">
                                            <li className="flex justify-between text-xs py-1 border-b border-border-main/30 font-semibold">
                                                <span className="text-text-muted">Standard Category Expenses</span>
                                                <span className="font-bold text-error">-₹{parseFloat(report.total_expense).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-xs py-1 border-b border-border-main/30 font-semibold">
                                                <span className="text-text-muted">Investments Allocated</span>
                                                <span className="font-bold text-error">-₹{parseFloat(report.total_investment).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-xs py-1 border-b border-border-main/30 font-semibold">
                                                <span className="text-text-muted">Debts Given (Lent Out)</span>
                                                <span className="font-bold text-error">-₹{parseFloat(report.debt_breakdown?.debt_given || 0).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-xs py-1 border-b border-border-main/30 font-semibold">
                                                <span className="text-text-muted">Debt Repayments Made</span>
                                                <span className="font-bold text-error">-₹{parseFloat(report.debt_breakdown?.debt_taken_return || 0).toLocaleString()}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'comparison' && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-base sm:text-lg font-extrabold text-text-main">Category Comparison (Expenses)</h3>
                                
                                {/* Selected months list */}
                                <div className="flex flex-wrap gap-2 mb-4 items-center">
                                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Compared Months:</span>
                                    {comparisonMonths.map((m, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 bg-bg-dark border border-border-main rounded-full px-3 py-1 text-xs">
                                            <span className="text-text-main font-semibold">
                                                {new Date(0, m.month - 1).toLocaleString('default', { month: 'short' })} {m.year}
                                            </span>
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveMonth(idx)} 
                                                className="text-error hover:text-red-400 font-bold ml-1 cursor-pointer text-xs focus:outline-none"
                                                title="Remove month"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Month adder controls */}
                                <div className="flex flex-wrap gap-2.5 items-center bg-bg-dark/40 p-3 rounded-xl border border-border-main w-max max-w-full">
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={selectedCompareMonth} 
                                            onChange={(e) => setSelectedCompareMonth(parseInt(e.target.value))} 
                                            className="bg-bg-dark text-text-main border border-border-main rounded-lg px-2.5 py-1.5 outline-none text-xs sm:text-sm cursor-pointer font-semibold"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                        <select 
                                            value={selectedCompareYear} 
                                            onChange={(e) => setSelectedCompareYear(parseInt(e.target.value))} 
                                            className="bg-bg-dark text-text-main border border-border-main rounded-lg px-2.5 py-1.5 outline-none text-xs sm:text-sm cursor-pointer font-semibold"
                                        >
                                            <option value="2025">2025</option>
                                            <option value="2026">2026</option>
                                        </select>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={handleAddMonth} 
                                        className="bg-primary hover:bg-primary-hover text-black px-4 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer shrink-0 shadow"
                                    >
                                        + Add Month
                                    </button>
                                </div>

                                {comparisonLoading ? (
                                    <div className="text-center py-20 flex flex-col justify-center items-center gap-2">
                                        <div className="w-6 h-6 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-text-muted text-xs font-semibold">Comparing datasets...</p>
                                    </div>
                                ) : comparisonResults ? (
                                    <>
                                        {/* Table view */}
                                        <div className="bg-card-dark rounded-2xl shadow border border-border-main overflow-hidden mb-8 animate-fade-in">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-bg-dark/40 text-text-muted uppercase text-[10px] font-bold border-b border-border-main">
                                                        <tr>
                                                            <th className="px-5 py-3.5">Category</th>
                                                            {comparisonResults.monthLabels.map((label, idx) => (
                                                                <th key={idx} className="px-5 py-3.5 text-right">{label}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border-main/50">
                                                        {comparisonResults.rows.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={comparisonResults.monthLabels.length + 1} className="px-5 py-8 text-center text-text-muted italic">
                                                                    No expenses recorded in the compared months.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            <>
                                                                {comparisonResults.rows.map((row, idx) => (
                                                                    <tr key={idx} className="hover:bg-bg-dark/20 transition-colors">
                                                                        <td className="px-5 py-3 font-extrabold text-text-main text-xs">{row.category}</td>
                                                                        {comparisonResults.monthLabels.map((label, lIdx) => (
                                                                            <td key={lIdx} className="px-5 py-3 text-right font-mono text-text-muted text-xs font-semibold">
                                                                                {row[label] > 0 ? `₹${row[label].toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                                {/* Totals Row */}
                                                                <tr className="bg-bg-dark/30 border-t border-border-main font-bold text-text-main">
                                                                    <td className="px-5 py-4 uppercase text-xs tracking-wider font-extrabold text-primary">Total Expenses</td>
                                                                    {comparisonResults.monthLabels.map((label, idx) => {
                                                                        const totalVal = comparisonResults.rows.reduce((sum, r) => sum + (r[label] || 0), 0);
                                                                        return (
                                                                            <td key={idx} className="px-5 py-4 text-right font-mono text-base font-black text-secondary">
                                                                                ₹{totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            </>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Chart visualization */}
                                        {comparisonResults.rows.length > 0 && (
                                            <div className="bg-card-dark p-4 sm:p-5 rounded-2xl border border-border-main shadow mb-8 animate-fade-in">
                                                <h4 className="text-xs font-black text-text-muted uppercase tracking-widest mb-4">Spending Trends</h4>
                                                <div className="w-full h-80 sm:h-96">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={comparisonResults.rows}
                                                            margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" opacity={0.5} />
                                                            <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={10} fontWeight="bold" tickLine={false} />
                                                            <YAxis stroke="var(--text-muted)" fontSize={10} fontWeight="bold" tickLine={false} tickFormatter={(val) => `₹${val}`} />
                                                            <Tooltip 
                                                                contentStyle={{ backgroundColor: 'var(--card-dark)', borderColor: 'var(--border-main)', borderRadius: '12px' }}
                                                                itemStyle={{ color: 'var(--text-main)', fontSize: '11px', fontWeight: 'semibold' }}
                                                                labelStyle={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}
                                                                formatter={(value) => [`₹${parseFloat(value).toLocaleString()}`, '']}
                                                            />
                                                            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'semibold' }} />
                                                            {comparisonResults.monthLabels.map((label, idx) => (
                                                                <Bar 
                                                                    key={idx} 
                                                                    dataKey={label} 
                                                                    fill={COLORS[idx % COLORS.length]} 
                                                                    radius={[4, 4, 0, 0]} 
                                                                />
                                                            ))}
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Placeholder for other types */}
            {reportType !== 'monthly' && (
                <div className="text-center py-16 text-text-muted bg-card-dark rounded-2xl border border-border-main border-dashed animate-fade-in">
                    <p className="text-sm font-semibold">Preview not active for {reportType} logs.</p>
                    <p className="text-xs text-text-muted mt-1.5 mb-4">Please download the PDF report to view complete daily, weekly, or yearly transaction charts.</p>
                    <button 
                        onClick={handleDownloadPDF}
                        className="bg-primary hover:bg-primary-hover text-black font-extrabold py-2 px-5 rounded-xl text-xs transition-colors cursor-pointer shadow inline-flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span>Download Statement</span>
                    </button>
                </div>
            )}

            {/* Editing Modal */}
            {editingTransaction && (
                <div className="fixed inset-0 bg-black/75 overflow-y-auto flex items-start justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-4xl my-auto relative">
                        <TransactionForm 
                            onTransactionAdded={fetchReportData}
                            editingTransaction={editingTransaction}
                            onCancelEdit={handleCancelEdit}
                            selectedDate={editingTransaction.date}
                        />
                    </div>
                </div>
            )}

            {/* Investment Prefill Modal */}
            {prefillInvestment && (
                <div className="fixed inset-0 bg-black/75 overflow-y-auto flex items-start justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-4xl my-auto relative">
                        <TransactionForm 
                            onTransactionAdded={() => {
                                fetchReportData();
                                setPrefillInvestment(null);
                            }}
                            prefillInvestment={prefillInvestment}
                            onCancelInvestment={() => setPrefillInvestment(null)}
                            selectedDate={getLastDateOfMonth()}
                        />
                    </div>
                </div>
            )}

            {/* Detailed Transaction Modal */}
            {detailedTransaction && (
                <div className="fixed inset-0 bg-black/75 overflow-y-auto flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-card-dark border border-border-main rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                        <button 
                            type="button"
                            onClick={() => setDetailedTransaction(null)} 
                            className="absolute top-4 right-4 text-text-muted hover:text-text-main text-xl font-bold font-sans cursor-pointer focus:outline-none"
                        >
                            ×
                        </button>
                        <h3 className="text-lg font-black text-secondary mb-4 flex items-center gap-2 border-b border-border-main pb-2">
                            🤝 Debt Statement Info
                        </h3>
                        
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-3 gap-2 py-2 border-b border-border-main/55 font-semibold">
                                <span className="text-text-muted">Date:</span>
                                <span className="col-span-2 text-text-main">{detailedTransaction.date}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-2 border-b border-border-main/55 font-semibold">
                                <span className="text-text-muted">Type:</span>
                                <span className={`col-span-2 font-bold uppercase text-xs ${['EXPENSE', 'DEBT_GIVEN', 'DEBT_TAKEN_RETURN'].includes(detailedTransaction.transaction_type) ? 'text-error' : 'text-emerald-500'}`}>
                                    {detailedTransaction.transaction_type.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-2 border-b border-border-main/55 font-semibold">
                                <span className="text-text-muted">Amount:</span>
                                <span className="col-span-2 text-text-main font-bold text-base font-mono">
                                    ₹{parseFloat(detailedTransaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-2 border-b border-border-main/55 font-semibold">
                                <span className="text-text-muted">Person (Ledger):</span>
                                <span className="col-span-2 text-primary font-bold">
                                    {detailedTransaction.ledger_name || detailedTransaction.description || 'No linked ledger'}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-2 border-b border-border-main/55 font-semibold">
                                <span className="text-text-muted">Payment Mode:</span>
                                <span className="col-span-2">
                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${detailedTransaction.payment_mode === 'CASH' ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20' : 'bg-blue-500/15 text-blue-500 border border-blue-500/20'}`}>
                                        {detailedTransaction.payment_mode}
                                    </span>
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-2 font-semibold">
                                <span className="text-text-muted">Description:</span>
                                <span className="col-span-2 text-text-muted bg-bg-dark p-2.5 rounded-xl border border-border-main whitespace-pre-wrap font-sans text-xs">
                                    {detailedTransaction.description || <span className="text-text-muted italic font-normal">None</span>}
                                </span>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button 
                                type="button"
                                onClick={() => setDetailedTransaction(null)} 
                                className="bg-bg-dark border border-border-main text-text-muted hover:text-text-main font-extrabold py-2 px-4 rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyReport;
