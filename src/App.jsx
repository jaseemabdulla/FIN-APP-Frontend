import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import MonthlyReport from './components/MonthlyReport';
import DebtList from './components/DebtList';
import SetupScreen from './components/SetupScreen';
import CategoryManager from './components/CategoryManager';
import EventList from './components/EventList';
import FundList from './components/FundList';
import { checkAppInit } from './api';

function App() {
  const [initialized, setInitialized] = useState(null); // null = loading
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    checkAppInit()
      .then(res => setInitialized(res.data.initialized))
      .catch(err => {
        console.error("Failed to check init status", err);
        // Fallback to initialized so we can see the dashboard even if check fails
        setInitialized(true); 
      });
  }, []);

  if (initialized === null) {
      return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center text-primary">
            <div className="animate-pulse">Loading FinanceManager...</div>
        </div>
      );
  }

  return (
    <BrowserRouter>
      {!initialized ? (
        <SetupScreen onComplete={() => setInitialized(true)} />
      ) : (
        <div className="min-h-screen bg-bg-dark text-white font-sans">
          <nav className="border-b border-gray-800 bg-card-dark sticky top-0 z-50">
            <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                FinanceManager
              </h1>
              {/* Desktop links */}
              <div className="hidden md:flex gap-6">
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">Daily</Link>
                <Link to="/monthly" className="text-gray-300 hover:text-white transition-colors">Reports</Link>
                <Link to="/debts" className="text-gray-300 hover:text-white transition-colors">Debts</Link>
                <Link to="/events" className="text-gray-300 hover:text-white transition-colors">Events</Link>
                <Link to="/funds" className="text-gray-300 hover:text-white transition-colors">Funds</Link>
                <Link to="/categories" className="text-gray-300 hover:text-white transition-colors">Categories</Link>
              </div>

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

            {/* Mobile links dropdown */}
            {isMenuOpen && (
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
                <Link to="/events" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                   🎪 Events
                </Link>
                <Link to="/funds" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                   💰 Funds
                </Link>
                <Link to="/categories" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white transition-colors py-2 px-2 rounded hover:bg-gray-800 text-sm font-semibold tracking-wide flex items-center gap-2.5">
                   🏷️ Categories
                </Link>
              </div>
            )}
          </nav>
          <main className="py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/monthly" element={<MonthlyReport />} />
              <Route path="/debts" element={<DebtList />} />
              <Route path="/events" element={<EventList />} />
              <Route path="/funds" element={<FundList />} />
              <Route path="/categories" element={<CategoryManager />} />
            </Routes>
          </main>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
