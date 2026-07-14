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
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div>
                     <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Events Manager</h2>
                     <p className="text-xs sm:text-sm text-gray-500 mt-1">Track expenses and incomes for specific programs/events</p>
                </div>
               
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            setAddingEvent(!addingEvent);
                            setEditingEvent(null);
                            setNewEventName('');
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-bold text-gray-300 transition-all"
                    >
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Event
                    </button>
                </div>
            </div>

            {/* Forms Section */}
            <div className="space-y-6 mb-8">
                {addingEvent && (
                     <div className="animate-fade-in bg-card-dark p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl relative">
                          <button onClick={() => setAddingEvent(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                         <h3 className="text-lg sm:text-xl font-bold text-primary mb-4">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
                         <form onSubmit={handleCreateEvent} className="flex flex-col sm:flex-row gap-3">
                             <input
                                 type="text"
                                 value={newEventName}
                                 onChange={(e) => setNewEventName(e.target.value)}
                                 placeholder="Event Name (e.g., Annual Conference)"
                                 required
                                 className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:border-primary outline-none text-white text-sm"
                             />
                             <button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg text-sm whitespace-nowrap">
                                 Save Event
                             </button>
                         </form>
                     </div>
                )}

                {selectedEventForTxn && (
                    <div className="animate-fade-in bg-card-dark p-1 rounded-xl border border-gray-700 shadow-2xl">
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
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-400 text-sm">Loading events...</p>
                </div>
            ) : (
                <div className="bg-card-dark rounded-xl shadow-xl border border-gray-700/50 overflow-hidden min-h-[400px]">
                    <div className="p-4 md:p-6">
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <p>No events found. Create one to start tracking!</p>
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
        <li className={`group flex flex-col p-4 sm:p-5 rounded-xl border border-gray-700/50 bg-gray-800/80 hover:border-gray-600 transition-all ${isSelected ? 'border-primary shadow-lg ring-1 ring-primary/50' : 'hover:bg-gray-800 hover:shadow-lg'}`}>
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center w-full gap-4">
                <div className="flex items-center gap-3.5 w-full md:w-auto">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold bg-purple-500/20 text-purple-400 shrink-0">
                        {event.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-base sm:text-lg text-white truncate">
                            {event.name}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <button 
                                onClick={() => setShowTransactions(!showTransactions)}
                                className="text-blue-400 hover:text-blue-300 underline font-medium text-left"
                            >
                                {showTransactions ? 'Hide Transactions' : `View ${event.transactions?.length || 0} Transactions`}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full md:w-auto gap-4 mt-2 md:mt-0">
                    <div className="flex justify-between sm:justify-end gap-4 md:gap-6 border-b sm:border-b-0 border-gray-700/60 pb-3 sm:pb-0">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Spent</span>
                            <span className="text-base sm:text-lg font-bold text-red-400">{parseFloat(event.amount_spent).toLocaleString()}</span>
                        </div>
                        <div className="w-px bg-gray-700"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Received</span>
                            <span className="text-base sm:text-lg font-bold text-green-400">{parseFloat(event.amount_received).toLocaleString()}</span>
                        </div>
                        <div className="w-px bg-gray-700"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Balance</span>
                            <span className={`text-base sm:text-lg font-bold ${event.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {parseFloat(Math.abs(event.balance)).toLocaleString()}
                                {event.balance < 0 && <span className="block text-[8px] font-semibold text-center mt-0.5">Deficit</span>}
                                {event.balance > 0 && <span className="block text-[8px] font-semibold text-center mt-0.5">Surplus</span>}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                        <button 
                            onClick={onAddTxn} 
                            className="px-3 sm:px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-white text-xs sm:text-sm font-bold shadow-lg transition-all whitespace-nowrap"
                        >
                            Add txn
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
                            className="px-3 sm:px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm font-bold shadow-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Report
                        </button>

                        {/* Edit/Delete Actions */}
                        <div className="flex items-center gap-1 ml-1 border-l border-gray-700 pl-2 shrink-0">
                            <button 
                                onClick={onEdit}
                                className="text-gray-500 hover:text-primary transition-colors p-1 rounded"
                                title="Edit"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button 
                                onClick={onDelete}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded"
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
                <div className="mt-6 pt-4 border-t border-gray-700/50 animate-fade-in w-full">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Event Transactions</h4>
                    {event.transactions && event.transactions.length > 0 ? (
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
                                        {event.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                            <tr key={txn.id} className="hover:bg-gray-800/50 transition-colors">
                                                <td className="px-4 py-2 text-gray-300">{txn.date}</td>
                                                <td className="px-4 py-2 font-semibold">
                                                      <span className={`${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                        {txn.transaction_type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-gray-300 truncate max-w-[200px]">{txn.description}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${txn.payment_mode === 'CASH' ? 'bg-yellow-900 text-yellow-200' : 'bg-blue-900 text-blue-200'}`}>
                                                        {txn.payment_mode}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-2 text-right font-bold ${['EXPENSE', 'DEBT_GIVEN', 'INVESTMENT', 'DEBT_TAKEN_RETURN'].includes(txn.transaction_type) ? 'text-red-400' : 'text-green-400'}`}>
                                                    {parseFloat(txn.amount).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2 text-right whitespace-nowrap">
                                                    <button onClick={() => onEditTxn(txn)} className="text-blue-400 hover:text-blue-300 mr-3 text-xs font-bold uppercase tracking-wider">Edit</button>
                                                    <button onClick={() => onDeleteTxn(txn.id)} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List View */}
                            <div className="md:hidden divide-y divide-gray-800">
                                {event.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(txn => (
                                    <div key={txn.id} className="p-4 flex flex-col gap-2.5 hover:bg-gray-800/10 transition-colors">
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
                                            <button onClick={() => onEditTxn(txn)} className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider">Edit</button>
                                            <button onClick={() => onDeleteTxn(txn.id)} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider">Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-4 bg-gray-900 rounded-lg border border-gray-700 border-dashed">No transactions associated with this event.</p>
                    )}
                </div>
            )}
        </li>
    );
};

export default EventList;
