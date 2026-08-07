import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import MonthlyReport from './components/MonthlyReport';
import DebtList from './components/DebtList';
import CategoryManager from './components/CategoryManager';
import EventList from './components/EventList';
import FundList from './components/FundList';
import GlobalSearchModal from './components/GlobalSearchModal';
import LedgerManager from './components/LedgerManager';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickAdd = () => {
    if (location.pathname !== '/') {
      navigate('/');
      // Delay slightly to allow dashboard to mount, then fire event
      setTimeout(() => {
        window.dispatchEvent(new Event('trigger_add_transaction'));
      }, 150);
    } else {
      window.dispatchEvent(new Event('trigger_add_transaction'));
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <nav className="border-b border-border-main bg-card-dark/80 backdrop-blur sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 select-none group">
            <span className="text-xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">
              FinanceManager
            </span>
          </Link>
          
          <div className="flex items-center gap-3">
            {/* Search Button (Ctrl+K shortcut) */}
            {user && (
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-dark border border-border-main rounded-lg text-xs font-semibold text-text-muted hover:text-text-main hover:bg-border-main transition-all cursor-pointer"
                title="Search (Ctrl+K)"
              >
                <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">Search</span>
                <span className="hidden md:inline text-[9px] bg-bg-dark border border-border-main px-1 rounded font-mono text-text-muted">Ctrl K</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-bg-dark border border-border-main hover:bg-border-main text-text-main transition-all cursor-pointer flex items-center justify-center"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464a1 1 0 10-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Desktop Navigation Links */}
            {user && (
              <div className="hidden md:flex gap-4 items-center pl-2 border-l border-border-main">
                <Link to="/" className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${location.pathname === '/' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}`}>Daily</Link>
                <Link to="/debts" className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${location.pathname === '/debts' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}`}>Debts</Link>
                <Link to="/monthly" className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${location.pathname === '/monthly' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}`}>Reports</Link>
                <Link to="/funds" className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${location.pathname === '/funds' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}`}>Funds</Link>
                <Link to="/ledgers" className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${location.pathname === '/ledgers' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}`}>Ledgers</Link>
                <Link to="/events" className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${location.pathname === '/events' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}`}>Events</Link>
                <Link to="/categories" className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${location.pathname === '/categories' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-main'}`}>Categories</Link>
                <button 
                  onClick={logout}
                  className="px-2.5 py-1.5 rounded-lg text-sm font-semibold text-error hover:bg-error/10 transition-all cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Global Search Component */}
      {user && <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}

      {/* Sliding Drawer for Mobile 'More' actions */}
      {user && isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end" role="dialog" aria-modal="true">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          
          {/* Drawer Panel */}
          <div className="relative w-72 max-w-full bg-card-dark border-l border-border-main h-full flex flex-col shadow-2xl p-5 z-10 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-border-main">
              <div>
                <h3 className="text-base font-bold text-text-main">Menu Options</h3>
                <p className="text-xs text-text-muted mt-0.5">Signed in as: <span className="font-semibold text-primary">{user?.username}</span></p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-bg-dark border border-border-main text-text-muted hover:text-text-main cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation links inside drawer */}
            <div className="flex flex-col gap-2 flex-1">
              <Link 
                to="/funds" 
                onClick={() => setIsDrawerOpen(false)} 
                className={`py-3 px-3.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${location.pathname === '/funds' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-bg-dark hover:text-text-main'}`}
              >
                <span className="text-lg">💰</span> Funds Management
              </Link>
              <Link 
                to="/ledgers" 
                onClick={() => setIsDrawerOpen(false)} 
                className={`py-3 px-3.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${location.pathname === '/ledgers' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-bg-dark hover:text-text-main'}`}
              >
                <span className="text-lg">📖</span> Ledger Directory
              </Link>
              <Link 
                to="/events" 
                onClick={() => setIsDrawerOpen(false)} 
                className={`py-3 px-3.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${location.pathname === '/events' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-bg-dark hover:text-text-main'}`}
              >
                <span className="text-lg">🎪</span> Event Expenses
              </Link>
              <Link 
                to="/categories" 
                onClick={() => setIsDrawerOpen(false)} 
                className={`py-3 px-3.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${location.pathname === '/categories' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-bg-dark hover:text-text-main'}`}
              >
                <span className="text-lg">🏷️</span> Category Manager
              </Link>
            </div>

            {/* Logout at bottom */}
            <div className="pt-4 border-t border-border-main">
              <button 
                onClick={() => { logout(); setIsDrawerOpen(false); }}
                className="w-full bg-error/10 hover:bg-error/20 text-error py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto pb-24 md:pb-8 pt-4">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/monthly" element={<ProtectedRoute><MonthlyReport /></ProtectedRoute>} />
          <Route path="/debts" element={<ProtectedRoute><DebtList /></ProtectedRoute>} />
          <Route path="/ledgers" element={<ProtectedRoute><LedgerManager /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><EventList /></ProtectedRoute>} />
          <Route path="/funds" element={<ProtectedRoute><FundList /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><CategoryManager /></ProtectedRoute>} />
        </Routes>
      </main>

      {/* Bottom Nav Tab Bar for Mobile */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card-dark/95 backdrop-blur-md border-t border-border-main z-40 safe-bottom transition-colors duration-200">
          <div className="flex justify-around items-center h-16 px-2">
            <Link 
              to="/" 
              className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold tracking-tight transition-all ${location.pathname === '/' ? 'text-primary' : 'text-text-muted'}`}
            >
              <svg className="w-5.5 h-5.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Daily</span>
            </Link>
            <Link 
              to="/debts" 
              className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold tracking-tight transition-all ${location.pathname === '/debts' ? 'text-primary' : 'text-text-muted'}`}
            >
              <svg className="w-5.5 h-5.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Debts</span>
            </Link>

            {/* Quick Add FAB */}
            <div className="flex-1 flex justify-center -mt-6">
              <button 
                onClick={handleQuickAdd}
                className="flex items-center justify-center w-13 h-13 rounded-full bg-gradient-to-r from-primary to-secondary text-black shadow-lg shadow-primary/30 border-4 border-bg-dark active:scale-90 transition-transform cursor-pointer"
                aria-label="Add transaction"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <Link 
              to="/monthly" 
              className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold tracking-tight transition-all ${location.pathname === '/monthly' ? 'text-primary' : 'text-text-muted'}`}
            >
              <svg className="w-5.5 h-5.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2" />
              </svg>
              <span>Reports</span>
            </Link>
            
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold tracking-tight transition-all ${isDrawerOpen ? 'text-primary' : 'text-text-muted'} cursor-pointer`}
            >
              <svg className="w-5.5 h-5.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              <span>More</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
