import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
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
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Listen for Ctrl+K (or Cmd+K) to open/close search modal
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

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg-dark text-white font-sans">
        <nav className="border-b border-gray-800 bg-card-dark sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              FinanceManager
            </h1>
            
            {user && (
              <div className="flex items-center gap-4">
                {/* Desktop links */}
                <div className="hidden md:flex gap-6 items-center">
                  <Link to="/" className="text-gray-300 hover:text-white transition-colors">Daily</Link>
                  <Link to="/monthly" className="text-gray-300 hover:text-white transition-colors">Reports</Link>
                  <Link to="/debts" className="text-gray-300 hover:text-white transition-colors">Debts</Link>
                  <Link to="/ledgers" className="text-gray-300 hover:text-white transition-colors">Ledgers</Link>
                  <Link to="/events" className="text-gray-300 hover:text-white transition-colors">Events</Link>
                  <Link to="/funds" className="text-gray-300 hover:text-white transition-colors">Funds</Link>
                  <Link to="/categories" className="text-gray-300 hover:text-white transition-colors">Categories</Link>
                  <button 
                    onClick={logout}
                    className="text-error hover:text-red-400 font-semibold transition-colors cursor-pointer"
                  >
                    Logout
                  </button>
                </div>

                {/* Search Button (Desktop & Mobile) */}
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800/80 hover:bg-gray-700 border border-gray-700/60 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer select-none"
                  title="Search (Ctrl+K)"
                >
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="hidden sm:inline">Search</span>
                  <span className="hidden md:inline text-[9px] bg-gray-950 border border-gray-800 px-1 py-0.2 rounded text-gray-500 font-mono">Ctrl K</span>
                </button>

                {/* Hamburger Button for Mobile */}
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)} 
                  className="md:hidden text-gray-300 hover:text-white focus:outline-none p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Mobile links dropdown */}
          {user && isMenuOpen && (
            <div className="md:hidden border-t border-gray-800/60 bg-card-dark px-4 py-3 flex flex-col gap-3 shadow-2xl animate-fade-in">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                 📅 Daily
              </Link>
              <Link to="/monthly" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                 📈 Reports
              </Link>
              <Link to="/debts" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                 🤝 Debts
              </Link>
              <Link to="/ledgers" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                 📖 Ledgers
              </Link>
              <Link to="/events" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                 🎪 Events
              </Link>
              <Link to="/funds" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                 💰 Funds
              </Link>
              <Link to="/categories" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                 🏷️ Categories
              </Link>
              <button 
                onClick={() => { logout(); setIsMenuOpen(false); }}
                className="text-error hover:text-red-400 text-left transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5 cursor-pointer w-full"
              >
                 🚪 Logout
              </button>
            </div>
          )}
        </nav>
        
        {user && <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
        
        <main className="py-8">
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
      </div>
    </BrowserRouter>
  );
}

export default App;
