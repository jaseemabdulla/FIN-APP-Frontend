import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonthlyReport, exportPDFReport, deleteTransaction } from '../api';
import TransactionForm from './TransactionForm';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3', '#19FFD5', '#F5428D', '#42F587'];

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
    const [activeTab, setActiveTab] = useState('categories'); // categories, debt, audit, balances
    
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

    // Fetch data for ON-SCREEN visualization (Only for Monthly currently supported by backend logic here)
    useEffect(() => {
        if (reportType === 'monthly') {
            fetchReportData();
        } else {
            setReport(null);
        }
    }, [reportType, fetchReportData]);

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
        <div className="max-w-4xl mx-auto p-4">
            <div className="bg-card-dark p-4 rounded-xl border border-gray-700 mb-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-secondary">Reports & Export</h2>
                    
                    <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                        {/* Type Selector */}
                        <select 
                            value={reportType} 
                            onChange={(e) => setReportType(e.target.value)} 
                            className="bg-gray-800 p-2.5 rounded-lg border border-gray-600 outline-none focus:border-primary text-sm flex-1 sm:flex-initial cursor-pointer text-white"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>

                        {/* Condition Controls */}
                        {reportType === 'monthly' && (
                             <select value={month} onChange={(e) => setMonth(e.target.value)} className="bg-gray-800 p-2.5 rounded-lg border border-gray-600 outline-none text-sm flex-1 sm:flex-initial cursor-pointer text-white">
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
                                    ))}
                                </select>
                        )}
                        
                        {(reportType === 'monthly' || reportType === 'yearly') && (
                            <select value={year} onChange={(e) => setYear(e.target.value)} className="bg-gray-800 p-2.5 rounded-lg border border-gray-600 outline-none text-sm flex-1 sm:flex-initial cursor-pointer text-white">
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>
                        )}

                        {(reportType === 'daily' || reportType === 'weekly') && (
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                className="bg-gray-800 text-white border border-gray-600 rounded-lg p-2.5 outline-none text-sm flex-1 sm:flex-initial cursor-pointer"
                            />
                        )}

                        <button 
                            onClick={handleDownloadPDF}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm flex-1 sm:flex-initial transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span>PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard View - Only for Monthly currently */}
            {loading && (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-400 text-sm">Loading Report...</p>
                </div>
            )}

            {!loading && reportType === 'monthly' && report && (
                <>
                    {/* Day-to-Day Cash Flow Section */}
                    <div className="mb-6">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Day-to-Day Cash Flow</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Income */}
                            <div className="bg-card-dark p-5 rounded-xl border border-gray-700/60 shadow-lg transition-transform hover:-translate-y-0.5 duration-200">
                                <h3 className="text-gray-400 mb-1 uppercase text-[10px] sm:text-xs tracking-wider">Total Income</h3>
                                <p className="text-2xl sm:text-3xl font-bold text-green-400">+{parseFloat(report.total_income || 0).toLocaleString()}</p>
                                <span className="text-[10px] text-gray-500 block mt-1">Standard income categories only</span>
                            </div>
                            {/* Total Expenses */}
                            <div className="bg-card-dark p-5 rounded-xl border border-gray-700/60 shadow-lg transition-transform hover:-translate-y-0.5 duration-200">
                                <h3 className="text-gray-400 mb-1 uppercase text-[10px] sm:text-xs tracking-wider">Total Expenses</h3>
                                <p className="text-2xl sm:text-3xl font-bold text-red-400">-{parseFloat(report.total_expense || 0).toLocaleString()}</p>
                                <span className="text-[10px] text-gray-500 block mt-1">Standard expense categories only</span>
                            </div>
                            {/* Net Savings */}
                            <div className="bg-card-dark p-5 rounded-xl border border-gray-700/60 shadow-lg transition-transform hover:-translate-y-0.5 duration-200 bg-gradient-to-br from-card-dark to-blue-950/10">
                                <h3 className="text-gray-400 mb-1 uppercase text-[10px] sm:text-xs tracking-wider">Net Savings</h3>
                                <p className={`text-2xl sm:text-3xl font-bold ${report.net_savings >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                                    {parseFloat(report.net_savings || 0).toLocaleString()}
                                </p>
                                <span className="text-[10px] text-gray-500 block mt-1">Income minus Expenses</span>
                            </div>
                        </div>
                    </div>

                    {/* System-Wide Inflows, Outflows & Balances */}
                    <div className="mb-8">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Overall Credits, Debits & Net Difference</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Credit */}
                            <div className="bg-card-dark p-5 rounded-xl border border-gray-700/60 shadow-lg transition-transform hover:-translate-y-0.5 duration-200 bg-gradient-to-br from-card-dark to-emerald-950/10">
                                <h3 className="text-gray-400 mb-1 uppercase text-[10px] sm:text-xs tracking-wider">Total Credit</h3>
                                <p className="text-2xl sm:text-3xl font-bold text-emerald-400">+{parseFloat(report.total_credit || 0).toLocaleString()}</p>
                                <span className="text-[10px] text-gray-500 block mt-1">All inflows (Income + Debt + Returns)</span>
                            </div>
                            {/* Total Debit / Spent */}
                            <div className="bg-card-dark p-5 rounded-xl border border-gray-700/60 shadow-lg transition-transform hover:-translate-y-0.5 duration-200 bg-gradient-to-br from-card-dark to-orange-950/10">
                                <h3 className="text-gray-400 mb-1 uppercase text-[10px] sm:text-xs tracking-wider">Total Debit (Spent)</h3>
                                <p className="text-2xl sm:text-3xl font-bold text-orange-400">-{parseFloat(report.total_debit || 0).toLocaleString()}</p>
                                <span className="text-[10px] text-gray-500 block mt-1">All outflows (Expenses + Debts + Investments)</span>
                            </div>
                            {/* Net Difference */}
                            <div className="bg-card-dark p-5 rounded-xl border border-primary/40 shadow-lg transition-transform hover:-translate-y-0.5 duration-200 bg-gradient-to-br from-card-dark to-purple-950/20">
                                <h3 className="text-purple-300 mb-1 uppercase text-[10px] sm:text-xs tracking-wider font-semibold">Net Difference</h3>
                                <p className={`text-2xl sm:text-3xl font-bold ${parseFloat(report.total_credit || 0) - parseFloat(report.total_debit || 0) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                                    {(parseFloat(report.total_credit || 0) - parseFloat(report.total_debit || 0)).toLocaleString()}
                                </p>
                                <span className="text-[10px] text-gray-400 block mt-1">
                                    Overall Credits minus Overall Debits
                                </span>
                                <div className="mt-3 pt-2 border-t border-gray-800/40 flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-gray-400 font-medium">Invested:</span>
                                        <span className="font-bold text-emerald-400">{getSurplusInvestedAmount().toLocaleString()}</span>
                                    </div>
                                    {parseFloat(report.total_credit || 0) - parseFloat(report.total_debit || 0) > 0 && (
                                        <button 
                                            onClick={() => setPrefillInvestment({ amount: parseFloat(report.total_credit || 0) - parseFloat(report.total_debit || 0) })}
                                            className="w-full text-center text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 px-2 rounded-lg transition-colors uppercase tracking-wider cursor-pointer"
                                        >
                                            💼 Convert to Investment
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Breakdowns & Audits Section */}
                    <div className="mb-6">
                        <div className="flex border-b border-gray-700 mb-6 gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            <button
                                onClick={() => setActiveTab('categories')}
                                className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'bg-primary text-white font-bold border-b-2 border-primary' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            >
                                📊 Categories
                            </button>
                            <button
                                onClick={() => setActiveTab('debt')}
                                className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'debt' ? 'bg-primary text-white font-bold border-b-2 border-primary' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            >
                                🤝 Debt Log
                            </button>
                            <button
                                onClick={() => setActiveTab('audit')}
                                className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'audit' ? 'bg-primary text-white font-bold border-b-2 border-primary' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            >
                                🔄 Credit & Debit Audit
                            </button>
                            <button
                                onClick={() => setActiveTab('balances')}
                                className={`px-4 py-2 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'balances' ? 'bg-primary text-white font-bold border-b-2 border-primary' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                            >
                                🏦 Account Balances
                            </button>
                        </div>

                        {activeTab === 'categories' && (
                            <>
                                <h3 className="text-lg sm:text-xl font-semibold mb-4 text-white">Category Breakdown</h3>
                                <div className="bg-card-dark rounded-xl shadow-xl border border-gray-700/50 overflow-hidden mb-8">
                                    <div className="p-3 sm:p-5">
                                        {report.category_breakdown.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                                <p>No data available for this month.</p>
                                            </div>
                                        ) : (
                                            <ul className="space-y-4">
                                                {report.category_breakdown.map((cat, idx) => {
                                                    const isExpanded = expandedCategory === cat.category;
                                                    return (
                                                        <li key={idx} className={`group flex flex-col p-4 sm:p-5 rounded-xl border border-gray-700/50 transition-all ${isExpanded ? 'bg-gray-800 border-primary shadow-lg ring-1 ring-primary/50' : 'bg-gray-800/80 hover:bg-gray-800 hover:border-gray-600 hover:shadow-lg'}`}>
                                                            <div className="flex justify-between items-center w-full cursor-pointer gap-2" onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}>
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold bg-gray-900 shrink-0" style={{ color: COLORS[idx % COLORS.length] }}>
                                                                        {cat.category.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2 truncate">
                                                                            <span className="truncate">{cat.category}</span>
                                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${cat.type === 'INCOME' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{cat.type}</span>
                                                                        </div>
                                                                        <div className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); setExpandedCategory(isExpanded ? null : cat.category); }}
                                                                                className="text-blue-400 hover:text-blue-300 underline font-medium"
                                                                            >
                                                                                {isExpanded ? 'Hide' : `View ${cat.transactions?.length || 0} txns`}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="text-right shrink-0">
                                                                    <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider">Total</span>
                                                                    <span className="text-sm sm:text-base font-bold text-red-400">{parseFloat(cat.total).toLocaleString()}</span>
                                                                </div>
                                                            </div>

                                                            {/* Transactions List Dropdown */}
                                                            {isExpanded && cat.transactions && (
                                                                <div className="mt-5 pt-4 border-t border-gray-700/50 animate-fade-in w-full">
                                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Category Transactions</h4>
                                                                    {cat.transactions.length === 0 ? (
                                                                        <p className="text-gray-500 text-xs py-4 text-center bg-gray-900 rounded-lg border border-gray-700 border-dashed">No transactions.</p>
                                                                    ) : (
                                                                        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                                                                            {/* Desktop Table View */}
                                                                            <div className="hidden md:block overflow-x-auto">
                                                                                <table className="w-full text-left text-sm">
                                                                                    <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                                                                                        <tr>
                                                                                            <th className="px-4 py-3">Date</th>
                                                                                            <th className="px-4 py-3">Type</th>
                                                                                            <th className="px-4 py-3">Description</th>
                                                                                            <th className="px-4 py-3">Mode</th>
                                                                                            <th className="px-4 py-3 text-right">Amount</th>
                                                                                            <th className="px-4 py-3 text-right">Actions</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-gray-800">
                                                                                        {cat.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                                                                            <tr key={txn.id} className="hover:bg-gray-800/50 transition-colors">
                                                                                                <td className="px-4 py-2 text-gray-300 whitespace-nowrap">{txn.date}</td>
                                                                                                <td className="px-4 py-2 font-semibold whitespace-nowrap">
                                                                                                      <span className={`${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                                                                        {txn.transaction_type.startsWith('FUND_MANAGEMENT') ? 'Fund Management' : txn.transaction_type.replace('_', ' ')}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className="px-4 py-2 text-gray-300 truncate max-w-[200px]" title={txn.description || 'No description'}>
                                                                                                    {txn.description || <span className="text-gray-600 italic">None</span>}
                                                                                                    {txn.related_fund && (
                                                                                                        <span 
                                                                                                            onClick={() => navigate(`/funds?id=${txn.related_fund}`)}
                                                                                                            className="block text-[9px] text-secondary hover:text-emerald-300 font-bold bg-secondary/10 border border-secondary/20 px-1 py-0.5 rounded w-max mt-0.5 cursor-pointer"
                                                                                                        >
                                                                                                            💰 Fund: {txn.related_fund_title}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </td>
                                                                                                <td className="px-4 py-2 whitespace-nowrap">
                                                                                                    <span className={`px-2 py-0.5 rounded text-xs ${txn.payment_mode === 'CASH' ? 'bg-yellow-900 text-yellow-200' : 'bg-blue-900 text-blue-200'}`}>
                                                                                                        {txn.payment_mode}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className={`px-4 py-2 text-right font-bold whitespace-nowrap ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                                                                    {['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? '-' : '+'}{parseFloat(txn.amount).toLocaleString()}
                                                                                                </td>
                                                                                                <td className="px-4 py-2 text-right whitespace-nowrap">
                                                                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} className="text-blue-400 hover:text-blue-300 mr-3 text-xs uppercase font-bold tracking-wider">Edit</button>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} className="text-red-400 hover:text-red-300 text-xs uppercase font-bold tracking-wider">Delete</button>
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>

                                                                            {/* Mobile Card List View */}
                                                                            <div className="md:hidden divide-y divide-gray-800">
                                                                                {cat.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                                                                    <div key={txn.id} className="p-3.5 flex flex-col gap-2 hover:bg-gray-800/10 transition-colors">
                                                                                        <div className="flex justify-between items-center text-xs">
                                                                                            <span className="text-gray-400">{txn.date}</span>
                                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${txn.payment_mode === 'CASH' ? 'bg-yellow-900 text-yellow-200' : 'bg-blue-900 text-blue-200'}`}>
                                                                                                {txn.payment_mode}
                                                                                            </span>
                                                                                        </div>
                                                                                                <div className="flex justify-between items-start gap-2">
                                                                                                    <div>
                                                                                                        <span className={`font-semibold block text-sm ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                                                                            {txn.transaction_type.startsWith('FUND_MANAGEMENT') ? 'Fund Management' : txn.transaction_type.replace('_', ' ')}
                                                                                                        </span>
                                                                                                        {txn.description && (
                                                                                                            <p className="text-xs text-gray-300 mt-1 font-medium">{txn.description}</p>
                                                                                                        )}
                                                                                                        {txn.related_fund && (
                                                                                                            <span 
                                                                                                                onClick={() => navigate(`/funds?id=${txn.related_fund}`)}
                                                                                                                className="inline-block text-[9px] text-secondary hover:text-emerald-300 font-bold bg-secondary/10 border border-secondary/20 px-1.5 py-0.5 rounded mt-1 cursor-pointer"
                                                                                                            >
                                                                                                                💰 Fund: {txn.related_fund_title}
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <div className="text-right">
                                                                                                        <span className={`font-bold ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                                                                            {['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN', 'FUND_MANAGEMENT_DEC'].includes(txn.transaction_type) ? '-' : '+'}{parseFloat(txn.amount).toLocaleString()}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                        <div className="flex justify-end gap-4 mt-1 pt-2 border-t border-gray-800/40">
                                                                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider">Edit</button>
                                                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider">Delete</button>
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
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'debt' && report.debt_breakdown && (
                            <>
                                <h3 className="text-lg sm:text-xl font-semibold mb-4 text-white">Debt & Repayments Breakdown</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-card-dark p-3.5 sm:p-4 rounded-xl border border-gray-700/60 text-center">
                                        <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">Debt Borrowed</div>
                                        <div className="text-base sm:text-xl font-bold text-green-400">+{parseFloat(report.debt_breakdown.debt_taken).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-card-dark p-3.5 sm:p-4 rounded-xl border border-gray-700/60 text-center">
                                        <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">Debt Lent</div>
                                        <div className="text-base sm:text-xl font-bold text-red-400">-{parseFloat(report.debt_breakdown.debt_given).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-card-dark p-3.5 sm:p-4 rounded-xl border border-gray-700/60 text-center">
                                        <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">Debt Repaid</div>
                                        <div className="text-base sm:text-xl font-bold text-red-400">-{parseFloat(report.debt_breakdown.debt_taken_return).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-card-dark p-3.5 sm:p-4 rounded-xl border border-gray-700/60 text-center">
                                        <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mb-1">Debt Collected</div>
                                        <div className="text-base sm:text-xl font-bold text-green-400">+{parseFloat(report.debt_breakdown.debt_given_return).toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="bg-card-dark rounded-xl shadow-xl border border-gray-700/50 overflow-hidden mb-8 p-3 sm:p-4">
                                    <h4 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Debt Transactions Ledger</h4>
                                    {report.debt_breakdown.transactions.length === 0 ? (
                                        <p className="text-gray-500 text-xs py-8 text-center bg-gray-900 rounded-lg border border-gray-700 border-dashed">No debt transactions recorded for this month.</p>
                                    ) : (
                                        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                                            {/* Desktop Table View */}
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-800 text-gray-400 uppercase text-xs">
                                                        <tr>
                                                            <th className="px-4 py-3">Date</th>
                                                            <th className="px-4 py-3">Type</th>
                                                            <th className="px-4 py-3">Description / Person</th>
                                                            <th className="px-4 py-3">Mode</th>
                                                            <th className="px-4 py-3 text-right">Amount</th>
                                                            <th className="px-4 py-3 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-800">
                                                        {report.debt_breakdown.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                                            <tr key={txn.id} className="hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-4 py-2 text-gray-300 whitespace-nowrap">{txn.date}</td>
                                                                <td className="px-4 py-2 font-semibold whitespace-nowrap">
                                                                      <span className={`${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                                        {txn.transaction_type.replace('_', ' ')}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2 text-gray-300 truncate max-w-[200px]" title={txn.description || 'No description'}>
                                                                    {txn.description || <span className="text-gray-600 italic">None</span>}
                                                                </td>
                                                                <td className="px-4 py-2 whitespace-nowrap">
                                                                    <span className={`px-2 py-0.5 rounded text-xs ${txn.payment_mode === 'CASH' ? 'bg-yellow-900 text-yellow-200' : 'bg-blue-900 text-blue-200'}`}>
                                                                        {txn.payment_mode}
                                                                    </span>
                                                                </td>
                                                                <td className={`px-4 py-2 text-right font-bold whitespace-nowrap ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                                    {parseFloat(txn.amount).toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-2 text-right whitespace-nowrap">
                                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} className="text-blue-400 hover:text-blue-300 mr-3 text-xs uppercase font-bold tracking-wider">Edit</button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} className="text-red-400 hover:text-red-300 text-xs uppercase font-bold tracking-wider">Delete</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile Card List View */}
                                            <div className="md:hidden divide-y divide-gray-800">
                                                {report.debt_breakdown.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                                    <div key={txn.id} className="p-3.5 flex flex-col gap-2.5 hover:bg-gray-800/10 transition-colors">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-400">{txn.date}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${txn.payment_mode === 'CASH' ? 'bg-yellow-900 text-yellow-200' : 'bg-blue-900 text-blue-200'}`}>
                                                                {txn.payment_mode}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div>
                                                                <span className={`font-semibold block text-sm ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                                    {txn.transaction_type.replace('_', ' ')}
                                                                </span>
                                                                {txn.description && (
                                                                    <p className="text-xs text-gray-300 mt-1 font-medium">{txn.description}</p>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`font-bold ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                                    {parseFloat(txn.amount).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-4 mt-1 pt-2 border-t border-gray-800/40">
                                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(txn); }} className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider">Edit</button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(txn.id); }} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider">Delete</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'audit' && (
                            <>
                                <h3 className="text-lg sm:text-xl font-semibold mb-4 text-white">Inflows (Credits) vs Outflows (Debits) Audit</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    {/* Credits Column */}
                                    <div className="bg-card-dark rounded-xl p-5 border border-emerald-900/40 bg-gradient-to-br from-card-dark to-emerald-950/5">
                                        <h4 className="font-bold text-emerald-400 text-base sm:text-lg mb-4 border-b border-emerald-900/40 pb-2 flex justify-between gap-2">
                                            <span>Total Credited (Inflows)</span>
                                            <span>+{parseFloat(report.total_credit).toLocaleString()}</span>
                                        </h4>
                                        <ul className="space-y-3">
                                            <li className="flex justify-between text-sm py-1 border-b border-gray-800">
                                                <span className="text-gray-400">Standard Category Income</span>
                                                <span className="font-semibold text-green-400">+{parseFloat(report.total_income).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-sm py-1 border-b border-gray-800">
                                                <span className="text-gray-400">Debts Borrowed (Taken)</span>
                                                <span className="font-semibold text-green-400">+{parseFloat(report.debt_breakdown?.debt_taken || 0).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-sm py-1 border-b border-gray-800">
                                                <span className="text-gray-400">Debt Repayments Received</span>
                                                <span className="font-semibold text-green-400">+{parseFloat(report.debt_breakdown?.debt_given_return || 0).toLocaleString()}</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Debits Column */}
                                    <div className="bg-card-dark rounded-xl p-5 border border-orange-900/40 bg-gradient-to-br from-card-dark to-orange-950/5">
                                        <h4 className="font-bold text-orange-400 text-base sm:text-lg mb-4 border-b border-orange-900/40 pb-2 flex justify-between gap-2">
                                            <span>Total Debited (Outflows)</span>
                                            <span>-{parseFloat(report.total_debit).toLocaleString()}</span>
                                        </h4>
                                        <ul className="space-y-3">
                                            <li className="flex justify-between text-sm py-1 border-b border-gray-800">
                                                <span className="text-gray-400">Standard Category Expenses</span>
                                                <span className="font-semibold text-red-400">-{parseFloat(report.total_expense).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-sm py-1 border-b border-gray-800">
                                                <span className="text-gray-400">Investments Allocated</span>
                                                <span className="font-semibold text-red-400">-{parseFloat(report.total_investment).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-sm py-1 border-b border-gray-800">
                                                <span className="text-gray-400">Debts Given (Lent Out)</span>
                                                <span className="font-semibold text-red-400">-{parseFloat(report.debt_breakdown?.debt_given || 0).toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between text-sm py-1 border-b border-gray-800">
                                                <span className="text-gray-400">Debt Repayments Made</span>
                                                <span className="font-semibold text-red-400">-{parseFloat(report.debt_breakdown?.debt_taken_return || 0).toLocaleString()}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'balances' && (
                            <>
                                <h3 className="text-lg sm:text-xl font-semibold mb-4 text-white">Remaining Account & Wallet Distribution</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-card-dark rounded-xl p-5 border border-purple-900/40 bg-gradient-to-br from-card-dark to-purple-950/5">
                                        <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">Total Combined Balance</h4>
                                        <p className="text-3xl sm:text-4xl font-extrabold text-purple-400">{parseFloat(report.remaining_amount).toLocaleString()}</p>
                                        <span className="text-[10px] text-gray-500 mt-2 block">Net funds available across cash & account wallets</span>
                                    </div>

                                    <div className="bg-card-dark rounded-xl p-5 border border-yellow-900/40 bg-gradient-to-br from-card-dark to-yellow-950/5">
                                        <h4 className="text-sm font-bold text-yellow-300 uppercase tracking-wider mb-2">Cash In Hand</h4>
                                        <p className="text-3xl sm:text-4xl font-extrabold text-yellow-400">{parseFloat(report.remaining_cash).toLocaleString()}</p>
                                        <span className="text-[10px] text-gray-500 mt-2 block">Liquid physical cash balance</span>
                                    </div>

                                    <div className="bg-card-dark rounded-xl p-5 border border-blue-900/40 bg-gradient-to-br from-card-dark to-blue-950/5">
                                        <h4 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-2">Cash In Account</h4>
                                        <p className="text-3xl sm:text-4xl font-extrabold text-blue-400">{parseFloat(report.remaining_account).toLocaleString()}</p>
                                        <span className="text-[10px] text-gray-500 mt-2 block">Bank and digital account balance</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Placeholder for other types */}
            {reportType !== 'monthly' && (
                <div className="text-center py-12 text-gray-500 bg-card-dark rounded border border-gray-700 border-dashed">
                    <p className="text-lg">Preview not available for {reportType} reports.</p>
                    <p className="text-sm">Please use the "Download PDF" button to view the report.</p>
                </div>
            )}

            {/* Editing Modal */}
            {editingTransaction && (
                <div className="fixed inset-0 bg-black/60 overflow-y-auto flex items-start justify-center p-4 z-50 backdrop-blur-sm">
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
                <div className="fixed inset-0 bg-black/60 overflow-y-auto flex items-start justify-center p-4 z-50 backdrop-blur-sm">
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
        </div>
    );
};

export default MonthlyReport;
