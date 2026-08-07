import React, { useEffect, useState } from 'react';
import { getEvents, createEvent, updateEvent, deleteEvent, deleteTransaction } from '../api';
import TransactionForm from './TransactionForm';

const EventList = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingEvent, setAddingEvent] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [editingEvent, setEditingEvent] = useState(null);
    const [selectedEventForTxn, setSelectedEventForTxn] = useState(null);
    const [editingTxn, setEditingTxn] = useState(null);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await getEvents();
            setEvents(res.data);
        } catch (error) {
            console.error("Error fetching events", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        if (!newEventName.trim()) return;
        try {
            if (editingEvent) {
                await updateEvent(editingEvent.id, { name: newEventName });
            } else {
                await createEvent({ name: newEventName });
            }
            setNewEventName('');
            setAddingEvent(false);
            setEditingEvent(null);
            fetchEvents();
        } catch (error) {
            console.error("Error creating event", error);
            alert("Failed to save event");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this event? This will not delete its transactions, but they will lose the event reference.")) {
            try {
                await deleteEvent(id);
                fetchEvents();
            } catch (error) {
                console.error("Error deleting event", error);
                alert("Failed to delete event");
            }
        }
    };

    const handleTransactionAdded = () => {
        setSelectedEventForTxn(null);
        setEditingTxn(null);
        fetchEvents();
    };

    const handleDeleteTxn = async (id) => {
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            try {
                await deleteTransaction(id);
                fetchEvents();
            } catch (error) {
                console.error("Error deleting transaction", error);
                alert("Failed to delete transaction");
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 text-text-main space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                     <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">Event Trackers</h2>
                     <p className="text-xs sm:text-sm text-text-muted mt-0.5">Aggregate budgets, incomes, and expenses for specific trips or occasions.</p>
                </div>
               
                <button 
                    onClick={() => {
                        setAddingEvent(!addingEvent);
                        setEditingEvent(null);
                        setNewEventName('');
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-secondary text-black font-extrabold rounded-xl text-sm transition-transform active:scale-95 cursor-pointer shadow-lg animate-fade-in"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Create Event
                </button>
            </div>

            {/* Forms Section */}
            <div className="space-y-6 mb-8">
                {addingEvent && (
                     <div className="animate-fade-in bg-card-dark p-5 rounded-2xl border border-border-main shadow-2xl relative">
                          <button onClick={() => setAddingEvent(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-main cursor-pointer">
                            ✕
                          </button>
                         <h3 className="text-base sm:text-lg font-black text-primary mb-4 uppercase tracking-wider">{editingEvent ? 'Edit Event Name' : 'Create New Event'}</h3>
                         <form onSubmit={handleCreateEvent} className="flex flex-col sm:flex-row gap-3">
                             <input
                                 type="text"
                                 value={newEventName}
                                 onChange={(e) => setNewEventName(e.target.value)}
                                 placeholder="Event Name (e.g., Annual Conference)"
                                 required
                                 className="flex-1 bg-bg-dark border border-border-main rounded-xl px-4 py-2.5 outline-none focus:border-primary text-sm text-text-main placeholder-text-muted font-semibold animate-fade-in"
                             />
                             <button 
                                 type="submit" 
                                 className="bg-secondary hover:bg-secondary-hover text-black font-extrabold py-2.5 px-6 rounded-xl text-xs uppercase cursor-pointer transition-transform active:scale-95 shadow"
                             >
                                 Save Event
                             </button>
                         </form>
                     </div>
                )}

                {selectedEventForTxn && (
                    <div className="animate-fade-in bg-card-dark p-1 rounded-2xl border border-border-main shadow-2xl">
                        <TransactionForm 
                            prefillEvent={selectedEventForTxn}
                            onTransactionAdded={handleTransactionAdded}
                            onCancelEventTxn={() => {
                                setSelectedEventForTxn(null);
                                setEditingTxn(null);
                            }}
                            editingTransaction={editingTxn}
                            onCancelEdit={() => {
                                setEditingTxn(null);
                                setSelectedEventForTxn(null);
                            }}
                        />
                    </div>
                )}
            </div>

            {loading ? (
                <div className="text-center py-20 text-text-muted flex flex-col justify-center items-center gap-3 animate-fade-in">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-sm font-semibold">Updating event registers...</p>
                </div>
            ) : (
                <div className="bg-card-dark rounded-2xl shadow-xl border border-border-main overflow-hidden min-h-[400px] animate-fade-in">
                    <div className="p-4 md:p-6">
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-text-muted text-sm font-semibold">
                                <p>No events found. Click 'Create Event' to start tracking budgets.</p>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {events.map(event => (
                                    <EventItem 
                                        key={event.id} 
                                        event={event} 
                                        onAddTxn={() => {
                                            setSelectedEventForTxn(event);
                                            setEditingTxn(null);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        onEdit={() => {
                                            setEditingEvent(event);
                                            setNewEventName(event.name);
                                            setAddingEvent(true);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        onDelete={() => handleDelete(event.id)}
                                        isSelected={selectedEventForTxn && selectedEventForTxn.id === event.id}
                                        onEditTxn={(txn) => {
                                            setSelectedEventForTxn(event);
                                            setEditingTxn(txn);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        onDeleteTxn={(txnId) => {
                                            handleDeleteTxn(txnId);
                                        }}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const EventItem = ({ event, onAddTxn, onEdit, onDelete, isSelected, onEditTxn, onDeleteTxn }) => {
    const [showTransactions, setShowTransactions] = useState(false);

    return (
        <li className={`group flex flex-col p-4 sm:p-5 rounded-2xl border transition-all ${
            isSelected 
            ? 'border-primary bg-bg-dark/40 shadow-lg' 
            : 'border-border-main bg-bg-dark/20 hover:border-border-main/80'
        }`}>
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center w-full gap-4">
                <div className="flex items-center gap-3.5 w-full md:w-auto">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black bg-primary/10 text-primary border border-primary/20 shrink-0">
                        {event.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="font-extrabold text-base text-text-main truncate">
                            {event.name}
                        </div>
                        <div className="text-[10px] sm:text-xs text-text-muted flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 font-semibold">
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <button 
                                onClick={() => setShowTransactions(!showTransactions)}
                                className="text-primary hover:underline font-bold text-left cursor-pointer"
                            >
                                {showTransactions ? 'Hide history' : `View ${event.transactions?.length || 0} transactions`}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full md:w-auto gap-4 mt-2 md:mt-0">
                    <div className="flex justify-between sm:justify-end gap-4 md:gap-6 border-b sm:border-b-0 border-border-main/50 pb-3 sm:pb-0 text-xs">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-0.5">Spent</span>
                            <span className="font-bold text-rose-500">₹{parseFloat(event.amount_spent).toLocaleString()}</span>
                        </div>
                        <div className="w-px bg-border-main"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-0.5">Received</span>
                            <span className="font-bold text-emerald-500">₹{parseFloat(event.amount_received).toLocaleString()}</span>
                        </div>
                        <div className="w-px bg-border-main"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mb-0.5">Balance</span>
                            <span className={`font-bold ${event.balance >= 0 ? 'text-secondary' : 'text-rose-500'}`}>
                                ₹{parseFloat(Math.abs(event.balance)).toLocaleString()}
                                {event.balance < 0 && <span className="block text-[8px] font-bold text-center mt-0.5 uppercase tracking-wide">Deficit</span>}
                                {event.balance > 0 && <span className="block text-[8px] font-bold text-center mt-0.5 uppercase tracking-wide">Surplus</span>}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                        <button 
                            onClick={onAddTxn} 
                            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-black text-xs font-extrabold shadow transition-all whitespace-nowrap cursor-pointer text-center"
                        >
                            Add Txn
                        </button>
                        
                        <button
                            onClick={() => {
                                import('../api').then(({ exportPDFReport }) => {
                                    exportPDFReport({ type: 'event', event_id: event.id })
                                        .then(res => {
                                            const url = window.URL.createObjectURL(new Blob([res.data]));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', `report_event_${event.id}.pdf`);
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                        }).catch(err => {
                                            console.error("Error downloading PDF", err);
                                            alert("Failed to download report");
                                        });
                                });
                            }}
                            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg bg-card-dark border border-border-main hover:bg-bg-dark text-text-muted hover:text-text-main text-xs font-extrabold shadow transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Report
                        </button>

                        {/* Edit/Delete Actions */}
                        <div className="flex items-center gap-1.5 ml-1 border-l border-border-main pl-2.5 shrink-0">
                            <button 
                                onClick={onEdit}
                                className="text-text-muted hover:text-primary transition-colors p-1.5 hover:bg-bg-dark rounded-lg cursor-pointer"
                                title="Edit"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button 
                                onClick={onDelete}
                                className="text-text-muted hover:text-error transition-colors p-1.5 hover:bg-bg-dark rounded-lg cursor-pointer"
                                title="Delete"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions List Dropdown */}
            {showTransactions && (
                <div className="mt-5 pt-4 border-t border-border-main animate-fade-in w-full">
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Event Transactions</h4>
                    {event.transactions && event.transactions.length > 0 ? (
                        <div className="bg-bg-dark rounded-xl overflow-hidden border border-border-main">
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-card-dark text-text-muted uppercase text-[10px] font-bold border-b border-border-main">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3">Mode</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-main/50">
                                        {event.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                            <tr key={txn.id} className="hover:bg-card-dark/20 transition-colors">
                                                <td className="px-4 py-2.5 text-text-muted text-xs font-semibold">{txn.date}</td>
                                                <td className="px-4 py-2.5 text-xs font-bold">
                                                      <span className={`${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-error' : 'text-emerald-500'}`}>
                                                        {txn.transaction_type.replace(/_/g, ' ')}
                                                      </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-text-main truncate max-w-[200px] text-xs font-semibold">{txn.description}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${txn.payment_mode === 'CASH' ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20' : 'bg-blue-500/15 text-blue-500 border border-blue-500/20'}`}>
                                                        {txn.payment_mode}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-2.5 text-right font-mono font-bold text-xs ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-error' : 'text-emerald-500'}`}>
                                                    ₹{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap text-xs">
                                                    <button onClick={() => onEditTxn(txn)} className="text-primary hover:underline mr-3 font-bold cursor-pointer">Edit</button>
                                                    <button onClick={() => onDeleteTxn(txn.id)} className="text-error hover:underline font-bold cursor-pointer">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List View */}
                            <div className="md:hidden divide-y divide-border-main/40">
                                {event.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                    <div key={txn.id} className="p-4 flex flex-col gap-2.5 hover:bg-card-dark/20 transition-colors">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-text-muted font-semibold">{txn.date}</span>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${txn.payment_mode === 'CASH' ? 'bg-yellow-500/15 text-yellow-500' : 'bg-blue-500/15 text-blue-500'}`}>
                                                {txn.payment_mode}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <span className={`font-extrabold block text-sm ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-error' : 'text-emerald-500'}`}>
                                                    {txn.transaction_type.replace(/_/g, ' ')}
                                                </span>
                                                {txn.description && (
                                                    <p className="text-xs text-text-muted mt-1 font-semibold">{txn.description}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-bold font-mono text-xs ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-error' : 'text-emerald-500'}`}>
                                                    ₹{parseFloat(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-4 mt-1.5 pt-2 border-t border-border-main/30">
                                            <button onClick={() => onEditTxn(txn)} className="text-primary hover:underline text-[11px] font-bold cursor-pointer">Edit</button>
                                            <button onClick={() => onDeleteTxn(txn.id)} className="text-error hover:underline text-[11px] font-bold cursor-pointer">Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-text-muted text-xs text-center py-4 bg-bg-dark rounded-xl border border-border-main border-dashed">No transactions associated with this event.</p>
                    )}
                </div>
            )}
        </li>
    );
};

export default EventList;
