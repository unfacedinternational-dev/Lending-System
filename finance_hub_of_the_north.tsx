import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, ShieldAlert, Phone, Lock, User, FileText, DollarSign, 
  Calendar, AlertTriangle, CheckCircle2, Clock, Search, Filter, 
  Plus, Edit3, Trash2, Eye, Download, Upload, LogOut, ArrowRight, 
  ChevronRight, RefreshCw, AlertCircle, Database, HelpCircle, 
  Users, Check, X, FileCheck, Layers, Award, Terminal
} from 'lucide-react';

/* ============================================================================
   SIMULATED SUPABASE & POSTGRESQL DATABASE & AUTH STORAGE LAYER
   ============================================================================ */

// Initial seed data for demonstration and testing matching Philippine numbers & rules
const INITIAL_BORROWERS = [
  {
    id: 'bor-001',
    fullName: 'Juan Dela Cruz',
    mobileNumber: '09171234567',
    facebookName: 'Juan Cruz',
    facebookUrl: 'https://facebook.com/juancruz',
    loanAmount: 2000,
    amountToReturn: 2200,
    releaseDate: '2026-09-22', // Day 1 today (Sep 22, 2026)
    dueDate: '2026-09-28',
    amountPaid: 500,
    remainingBalance: 1700,
    status: 'ACTIVE', // Day 1
    archived: false,
    pinHash: 'hashed_123456', // pin: 123456
    createdAt: '2026-09-22T08:00:00Z'
  },
  {
    id: 'bor-002',
    fullName: 'Maria Santos',
    mobileNumber: '09189876543',
    facebookName: 'Maria Santos Official',
    facebookUrl: 'https://facebook.com/mariasantos',
    loanAmount: 1500,
    amountToReturn: 1650,
    releaseDate: '2026-09-17', // Sep 17 = Day 6 (Today Sep 22: Sep17=1, 18=2, 19=3, 20=4, 21=5, 22=6)
    dueDate: '2026-09-23',
    amountPaid: 0,
    remainingBalance: 1650,
    status: 'DAY_6',
    archived: false,
    pinHash: 'hashed_123456',
    createdAt: '2026-09-17T10:00:00Z'
  },
  {
    id: 'bor-003',
    fullName: 'Pedro Reyes',
    mobileNumber: '09195551234',
    facebookName: 'Pedro Reyes',
    facebookUrl: 'https://facebook.com/pedroreyes',
    loanAmount: 1000,
    amountToReturn: 1100,
    releaseDate: '2026-09-16', // Sep 16 = Day 7 (Today Sep 22)
    dueDate: '2026-09-22',
    amountPaid: 0,
    remainingBalance: 1100,
    status: 'DAY_7',
    archived: false,
    pinHash: 'hashed_123456',
    createdAt: '2026-09-16T09:00:00Z'
  },
  {
    id: 'bor-004',
    fullName: 'Ana Lim',
    mobileNumber: '09223334455',
    facebookName: 'Ana Lim',
    facebookUrl: 'https://facebook.com/analim',
    loanAmount: 2000,
    amountToReturn: 2200,
    releaseDate: '2026-09-10', // Overdue
    dueDate: '2026-09-16',
    amountPaid: 2200,
    remainingBalance: 0,
    status: 'PAID', // Paid overrides overdue
    archived: false,
    pinHash: 'hashed_123456',
    createdAt: '2026-09-10T11:00:00Z'
  }
];

const INITIAL_PAYMENTS = [
  {
    id: 'pay-001',
    borrowerId: 'bor-001',
    paymentDate: '2026-09-22',
    amount: 500,
    paymentMethod: 'GCash',
    reference: 'REF98237465',
    notes: 'Initial partial payment',
    remainingBalance: 1700
  },
  {
    id: 'pay-002',
    borrowerId: 'bor-004',
    paymentDate: '2026-09-15',
    amount: 2200,
    paymentMethod: 'Cash',
    reference: 'CSH-0012',
    notes: 'Full settlement',
    remainingBalance: 0
  }
];

const INITIAL_DOCUMENTS = [
  {
    id: 'doc-001',
    borrowerId: 'bor-001',
    documentType: 'Government ID',
    fileName: 'juan_drivers_license.jpg',
    fileSize: '1.4 MB',
    mimeType: 'image/jpeg',
    storagePath: 'private/bor-001/id.jpg',
    uploadDate: '2026-09-22',
    uploadedBy: 'Financer Admin'
  },
  {
    id: 'doc-002',
    borrowerId: 'bor-001',
    documentType: 'Loan Agreement',
    fileName: 'signed_agreement_bor001.pdf',
    fileSize: '420 KB',
    mimeType: 'application/pdf',
    storagePath: 'private/bor-001/agreement.pdf',
    uploadDate: '2026-09-22',
    uploadedBy: 'Financer Admin'
  },
  {
    id: 'doc-003',
    borrowerId: 'bor-002',
    documentType: 'Government ID',
    fileName: 'maria_passport_id.jpg',
    fileSize: '2.1 MB',
    mimeType: 'image/jpeg',
    storagePath: 'private/bor-002/id.jpg',
    uploadDate: '2026-09-17',
    uploadedBy: 'Financer Admin'
  }
];

const INITIAL_NOTES = [
  {
    id: 'note-001',
    borrowerId: 'bor-001',
    noteText: 'Borrower requested emergency cash for medical prescription. Very cooperative.',
    createdBy: 'Admin Financer',
    createdAt: '2026-09-22T08:30:00Z',
    updatedAt: '2026-09-22T08:30:00Z'
  },
  {
    id: 'note-002',
    borrowerId: 'bor-002',
    noteText: 'Promised to pay by tomorrow morning via GCash.',
    createdBy: 'Admin Financer',
    createdAt: '2026-09-21T14:15:00Z',
    updatedAt: '2026-09-21T14:15:00Z'
  }
];

// Helper to normalize Philippine mobile numbers (e.g., +639171234567, 09171234567, 9171234567 -> 09171234567)
function normalizeMobile(num) {
  if (!num) return '';
  let cleaned = num.replace(/\D/g, '');
  if (cleaned.startsWith('63') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

// Helper: Calculate Due Date (Release Date + 7 days) and current day status
function calculateLoanStatusAndDays(releaseDateStr, remainingBalance) {
  if (remainingBalance <= 0) {
    return { status: 'PAID', currentDay: 7, label: 'PAID', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }

  const release = new Date(releaseDateStr + 'T00:00:00');
  // Current simulated date: September 22, 2026
  const today = new Date('2026-09-22T00:00:00');
  
  const diffTime = today.getTime() - release.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // Release date is Day 1

  let currentDay = Math.max(1, diffDays);
  let status = 'ACTIVE';
  let label = `DAY ${currentDay} • ACTIVE`;
  let badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';

  if (currentDay === 6) {
    status = 'DAY_6';
    label = 'DAY 6 • DUE TOMORROW';
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
  } else if (currentDay === 7) {
    status = 'DAY_7';
    label = 'DAY 7 • DUE TODAY';
    badgeColor = 'bg-red-100 text-red-800 border-red-300';
  } else if (currentDay > 7) {
    status = 'OVERDUE';
    label = 'OVERDUE';
    badgeColor = 'bg-red-200 text-red-900 border-red-400 font-bold';
  }

  return { status, currentDay, label, badgeColor };
}

/* ============================================================================
   MAIN REACT APPLICATION COMPONENT
   ============================================================================ */
export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing', 'financerLogin', 'borrowerLogin', 'borrowerSignup', 'financerDashboard', 'borrowerDashboard'
  
  // Database state stored in React state with persistence simulation
  const [borrowers, setBorrowers] = useState(() => {
    const saved = localStorage.getItem('fhn_borrowers');
    return saved ? JSON.parse(saved) : INITIAL_BORROWERS;
  });
  const [payments, setPayments] = useState(() => {
    const saved = localStorage.getItem('fhn_payments');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });
  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem('fhn_documents');
    return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
  });
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('fhn_notes');
    return saved ? JSON.parse(saved) : INITIAL_NOTES;
  });

  // Authenticated user state
  const [sessionUser, setSessionUser] = useState(null); // { type: 'financer' } or { type: 'borrower', borrowerId, mobileNumber }

  // Calculator state on landing page
  const [calcAmount, setCalcAmount] = useState(1000);

  // Toast notifications state
  const [toast, setToast] = useState(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('fhn_borrowers', JSON.stringify(borrowers));
  }, [borrowers]);

  useEffect(() => {
    localStorage.setItem('fhn_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('fhn_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('fhn_notes', JSON.stringify(notes));
  }, [notes]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogout = () => {
    setSessionUser(null);
    setCurrentView('landing');
    showToast('Logged out successfully.', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border ${
            toast.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-200' : 
            toast.type === 'warning' ? 'bg-amber-950/90 border-amber-500 text-amber-200' : 
            'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          }`}>
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> : 
             toast.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : 
             <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-wider text-lg sm:text-xl text-white">FINANCE HUB</h1>
              <p className="text-xs tracking-widest text-amber-400 font-semibold uppercase">OF THE NORTH</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {sessionUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hidden sm:inline-block">
                  {sessionUser.type === 'financer' ? '🛡️ Financer Admin' : `👤 Borrower (${sessionUser.mobileNumber})`}
                </span>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-xl text-sm font-semibold transition flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setCurrentView('borrowerLogin')}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
                >
                  Borrower Login
                </button>
                <button
                  onClick={() => setCurrentView('financerLogin')}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Financer Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main View Router */}
      <main className="flex-grow">
        {currentView === 'landing' && (
          <LandingPage 
            setCurrentView={setCurrentView} 
            calcAmount={calcAmount} 
            setCalcAmount={setCalcAmount} 
          />
        )}
        {currentView === 'financerLogin' && (
          <FinancerLogin 
            setCurrentView={setCurrentView} 
            showToast={showToast} 
          />
        )}
        {currentView === 'borrowerLogin' && (
          <BorrowerLogin 
            borrowers={borrowers} 
            setCurrentView={setCurrentView} 
            setSessionUser={setSessionUser} 
            showToast={showToast} 
          />
        )}
        {currentView === 'borrowerSignup' && (
          <BorrowerSignup 
            borrowers={borrowers} 
            setBorrowers={setBorrowers} 
            setCurrentView={setCurrentView} 
            showToast={showToast} 
          />
        )}
        {currentView === 'financerDashboard' && (
          <FinancerDashboard 
            borrowers={borrowers} 
            setBorrowers={setBorrowers} 
            payments={payments} 
            setPayments={setPayments} 
            documents={documents} 
            setDocuments={setDocuments} 
            notes={notes} 
            setNotes={setNotes} 
            showToast={showToast} 
          />
        )}
        {currentView === 'borrowerDashboard' && sessionUser?.type === 'borrower' && (
          <BorrowerDashboard 
            sessionUser={sessionUser} 
            borrowers={borrowers} 
            payments={payments} 
            documents={documents} 
            showToast={showToast} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-2 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>FINANCE HUB OF THE NORTH</span>
            </h3>
            <p className="text-sm text-slate-400">Emergency Funds When You Need Them Most. Run to us in times of emergency shortage.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Loan Terms & Strict Rules</h4>
            <ul className="text-sm space-y-2 text-slate-400">
              <li>• Loan Range: ₱1,000 to ₱2,000</li>
              <li>• Return Formula: Exactly 10% more (Loan × 1.10)</li>
              <li>• Repayment Period: 7 Days Strict</li>
              <li>• No service charges, no processing fees, no late penalties.</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Secure Access Portals</h4>
            <div className="flex flex-col space-y-2">
              <button onClick={() => setCurrentView('borrowerLogin')} className="text-left text-sm text-amber-400 hover:underline">
                → Borrower Access & Sign Up
              </button>
              <button onClick={() => setCurrentView('financerLogin')} className="text-left text-sm text-amber-400 hover:underline">
                → Financer Administrative Portal
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/60 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} FINANCE HUB OF THE NORTH. All rights reserved. Production-grade Supabase & PostgreSQL architecture simulation.
        </div>
      </footer>
    </div>
  );
}

/* ============================================================================
   1. LANDING PAGE COMPONENT
   ============================================================================ */
function LandingPage({ setCurrentView, calcAmount, setCalcAmount }) {
  const returnAmount = Math.round(calcAmount * 1.10);

  return (
    <div className="space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.1),transparent_50%)]"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold animate-pulse">
            <Clock className="w-4 h-4" />
            <span>Emergency Shortage Cash Solutions • 7 Day Strict Repayment</span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight">
            FINANCE HUB <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              OF THE NORTH
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 font-medium max-w-2xl mx-auto">
            Emergency Funds When You Need Them Most. Run to us in times of emergency shortage.
          </p>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto shadow-2xl backdrop-blur-md">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Loan Range</div>
                <div className="text-2xl font-extrabold text-amber-400">₱1,000 – ₱2,000</div>
              </div>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Repayment Term</div>
                <div className="text-2xl font-extrabold text-white">7 DAYS STRICT</div>
              </div>
            </div>
          </div>

          {/* Dual Login Options */}
          <div className="pt-6 flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => setCurrentView('borrowerLogin')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl shadow-xl shadow-amber-500/20 transform hover:-translate-y-0.5 transition flex items-center justify-center space-x-3 text-base"
            >
              <User className="w-5 h-5" />
              <span>LOGIN AS BORROWER</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentView('financerLogin')}
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition flex items-center justify-center space-x-3 text-base"
            >
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>LOGIN AS FINANCER</span>
            </button>
          </div>
        </div>
      </section>

      {/* Loan Offer Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Transparent, Straightforward Emergency Loans</h2>
          <p className="text-slate-400 text-lg">No hidden processing fees. No service charges. No late fee penalties. Exactly 10% return.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-amber-500/50 transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6 font-bold text-xl">₱</div>
            <h3 className="text-xl font-bold text-white mb-3">₱1,000 → ₱1,100</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Borrow ₱1,000 for emergency shortage and return exactly ₱1,100 within 7 strict days.</p>
          </div>
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-8 shadow-xl relative overflow{-hidden}">
            <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-xs font-extrabold px-4 py-1 rounded-bl-xl uppercase tracking-wider">Most Popular</div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6 font-bold text-xl">₱</div>
            <h3 className="text-xl font-bold text-white mb-3">₱1,500 → ₱1,650</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Borrow ₱1,500 for sudden utility or grocery needs and return exactly ₱1,650 in 7 days.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-amber-500/50 transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6 font-bold text-xl">₱</div>
            <h3 className="text-xl font-bold text-white mb-3">₱2,000 → ₱2,200</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Maximum emergency loan of ₱2,000 with a total return of exactly ₱2,200.</p>
          </div>
        </div>
      </section>

      {/* Interactive Loan Calculator */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Interactive Loan Calculator</h2>
            <p className="text-slate-400 text-sm">Slide to calculate your exact 7-day emergency return amount.</p>
          </div>

          <div className="space-y-8 max-w-2xl mx-auto">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-slate-300">Select Loan Amount</label>
                <span className="text-2xl font-extrabold text-amber-400">₱{calcAmount.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="2000" 
                step="100" 
                value={calcAmount} 
                onChange={(e) => setCalcAmount(Number(e.target.value))}
                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>₱1,000 (Min)</span>
                <span>₱1,500</span>
                <span>₱2,000 (Max)</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Return (10% Fixed)</div>
                <div className="text-3xl font-extrabold text-emerald-400">₱{returnAmount.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Loan Amount × 1.10 (No extra charges)</div>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-slate-800 sm:pl-6 pt-4 sm:pt-0">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Repayment Schedule</div>
                <div className="text-lg font-bold text-white">7 Days Strict</div>
                <div className="text-xs text-slate-500 mt-1">Release date = Day 1, Due = Day 7</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7 Day Repayment Status System */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">The 7-Day Repayment Status Lifecycle</h2>
          <p className="text-slate-400 text-sm">Automated status tracking based on your loan release date.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-lg inline-block">DAY 1 TO 5</span>
            <h3 className="text-lg font-bold text-white">Normal Active Status</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Your loan is active and within standard grace period.</p>
          </div>
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-3">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg inline-block">DAY 6</span>
            <h3 className="text-lg font-bold text-amber-400">DAY 6 • DUE TOMORROW</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Reminder alert as your 7-day term approaches completion.</p>
          </div>
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 space-y-3">
            <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold rounded-lg inline-block">DAY 7 & OVERDUE</span>
            <h3 className="text-lg font-bold text-red-400">DAY 7 • DUE TODAY / OVERDUE</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Due today or overdue status if balance remains unpaid after Day 7.</p>
          </div>
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-3">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg inline-block">PAID OVERRIDE</span>
            <h3 className="text-lg font-bold text-emerald-400">PAID (₱0 Balance)</h3>
            <p className="text-slate-400 text-xs leading-relaxed">Once remaining balance is ₱0, PAID status permanently overrides date statuses.</p>
          </div>
        </div>
      </section>

      {/* Bottom Login CTAs */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 space-y-6">
          <h3 className="text-2xl font-bold text-white">Ready to Access Your Account?</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">Borrowers sign in using mobile number and 6-digit PIN. Financer administers records securely.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => setCurrentView('borrowerLogin')}
              className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-2xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <User className="w-5 h-5" />
              <span>LOGIN AS BORROWER</span>
            </button>
            <button
              onClick={() => setCurrentView('financerLogin')}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>LOGIN AS FINANCER</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   2. FINANCER LOGIN COMPONENT
   ============================================================================ */
function FinancerLogin({ setCurrentView, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Secure Financer credentials check
    if (username === 'admin' && password === 'north2026') {
      showToast('Financer login successful!', 'success');
      setCurrentView('financerDashboard');
    } else {
      showToast('Invalid financer credentials. Use admin / north2026', 'error');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Financer Portal Login</h2>
          <p className="text-xs text-slate-400">Authorized administrative access only.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-lg transition text-sm"
          >
            Access Financer Dashboard
          </button>
        </form>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">Demo Financer Credentials:</div>
          <div>Username: <code className="text-amber-400 font-mono">admin</code></div>
          <div>Password: <code className="text-amber-400 font-mono">north2026</code></div>
        </div>

        <div className="text-center">
          <button 
            onClick={() => setCurrentView('landing')}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. BORROWER LOGIN COMPONENT
   ============================================================================ */
function BorrowerLogin({ borrowers, setCurrentView, setSessionUser, showToast }) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();

    if (lockedUntil && Date.now() < lockedUntil) {
      showToast('Too many incorrect PIN attempts. Account locked for 30 seconds.', 'error');
      return;
    }

    const normalized = normalizeMobile(mobileNumber);
    const borrower = borrowers.find(b => normalizeMobile(b.mobileNumber) === normalized && !b.archived);

    if (!borrower) {
      showToast('Mobile number not found in active borrower records. Contact financer.', 'error');
      return;
    }

    // Verify PIN simulation (hashed_ + pin)
    const expectedHash = `hashed_${pin}`;
    if (borrower.pinHash === expectedHash) {
      setAttempts(0);
      setSessionUser({ type: 'borrower', borrowerId: borrower.id, mobileNumber: borrower.mobileNumber });
      showToast(`Welcome back, ${borrower.fullName}!`, 'success');
      setCurrentView('borrowerDashboard');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setLockedUntil(Date.now() + 30000); // 30s lockout
        showToast('3 incorrect PIN attempts. Security lockout for 30s.', 'error');
      } else {
        showToast(`Incorrect 6-digit PIN. Attempt ${newAttempts} of 3.`, 'error');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Borrower Login</h2>
          <p className="text-xs text-slate-400">Enter your registered mobile number & 6-digit PIN.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500 text-sm">📱</span>
              <input 
                type="text" 
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="09171234567"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">6-Digit PIN</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500 text-sm">🔒</span>
              <input 
                type="password" 
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm tracking-widest focus:outline-none focus:border-amber-400"
                required
              />
            </div>
            <div className="text-xs text-slate-500 mt-1">Exactly 6 numbers (e.g. 123456)</div>
          </div>

          <button 
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition text-sm"
          >
            Login to Borrower Dashboard
          </button>
        </form>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-300">Test Borrower Accounts (PIN: 123456):</div>
          <div className="flex justify-between items-center">
            <span>Juan Dela Cruz:</span>
            <code className="text-amber-400 font-mono">09171234567</code>
          </div>
          <div className="flex justify-between items-center">
            <span>Maria Santos:</span>
            <code className="text-amber-400 font-mono">09189876543</code>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 text-center space-y-2">
          <div className="text-xs text-slate-400">
            First time setting up your PIN?{' '}
            <button 
              onClick={() => setCurrentView('borrowerSignup')}
              className="text-amber-400 font-bold hover:underline"
            >
              Sign Up / Set PIN
            </button>
          </div>
          <button 
            onClick={() => setCurrentView('landing')}
            className="text-xs text-slate-500 hover:text-white transition block mx-auto"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. BORROWER SIGNUP (SET PIN) COMPONENT
   ============================================================================ */
function BorrowerSignup({ borrowers, setBorrowers, setCurrentView, showToast }) {
  const [mobileNumber, setMobileNumber] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSignup = (e) => {
    e.preventDefault();

    const normalized = normalizeMobile(mobileNumber);
    if (!normalized || normalized.length < 10) {
      showToast('Please enter a valid Philippine mobile number.', 'error');
      return;
    }

    // Check if mobile number exists in registered borrower records added by financer
    const borrowerIndex = borrowers.findIndex(b => normalizeMobile(b.mobileNumber) === normalized);
    if (borrowerIndex === -1) {
      showToast('Mobile number not found in financer records. Please contact the Financer to add your record first.', 'error');
      return;
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      showToast('PIN must be exactly 6 digits (numbers only).', 'error');
      return;
    }

    if (pin !== confirmPin) {
      showToast('PIN entries do not match. Please re-enter.', 'error');
      return;
    }

    // Update borrower record with hashed PIN
    const updated = [...borrowers];
    updated[borrowerIndex] = {
      ...updated[borrowerIndex],
      pinHash: `hashed_${pin}`
    };

    setBorrowers(updated);
    showToast('PIN successfully registered! You can now log in.', 'success');
    setCurrentView('borrowerLogin');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Borrower Sign Up & PIN Setup</h2>
          <p className="text-xs text-slate-400">Associate your mobile number with your 6-digit secure PIN.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Registered Mobile Number</label>
            <input 
              type="text" 
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="09171234567"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
              required
            />
            <div className="text-xs text-slate-500 mt-1">Must match the number added by the Financer.</div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Create 6-Digit PIN</label>
            <input 
              type="password" 
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm tracking-widest focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Confirm 6-Digit PIN</label>
            <input 
              type="password" 
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm tracking-widest focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-lg transition text-sm"
          >
            Create Borrower Account
          </button>
        </form>

        <div className="text-center pt-2">
          <button 
            onClick={() => setCurrentView('borrowerLogin')}
            className="text-xs text-amber-400 hover:underline"
          >
            Already have a PIN? Log in here
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5. FINANCER DASHBOARD COMPONENT
   ============================================================================ */
function FinancerDashboard({ borrowers, setBorrowers, payments, setPayments, documents, setDocuments, notes, setNotes, showToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'addBorrower', 'editBorrower', 'recordPayment', 'viewDocs', 'uploadDoc', 'viewNotes', 'resetPin'
  const [selectedBorrower, setSelectedBorrower] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formFbName, setFormFbName] = useState('');
  const [formFbUrl, setFormFbUrl] = useState('');
  const [formLoanAmount, setFormLoanAmount] = useState(1000);
  const [formReleaseDate, setFormReleaseDate] = useState('2026-09-22');

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('GCash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Document upload state
  const [docType, setDocType] = useState('Government ID');
  const [docFile, setDocFile] = useState(null);

  // Note add state
  const [newNoteText, setNewNoteText] = useState('');

  // Reset PIN state
  const [newPin, setNewPin] = useState('');

  // Calculations for Stats Cards
  const totalBorrowersCount = borrowers.filter(b => !b.archived).length;
  const activeLoansCount = borrowers.filter(b => !b.archived && b.remainingBalance > 0).length;
  
  // Day status calculation for all
  const processedBorrowers = borrowers.map(b => {
    const calc = calculateLoanStatusAndDays(b.releaseDate, b.remainingBalance);
    return { ...b, calculatedStatus: calc.status, currentDay: calc.currentDay, statusLabel: calc.label, badgeColor: calc.badgeColor };
  });

  const day6Count = processedBorrowers.filter(b => !b.archived && b.calculatedStatus === 'DAY_6').length;
  const dueTodayCount = processedBorrowers.filter(b => !b.archived && b.calculatedStatus === 'DAY_7').length;
  const overdueCount = processedBorrowers.filter(b => !b.archived && b.calculatedStatus === 'OVERDUE').length;
  const paidCount = processedBorrowers.filter(b => !b.archived && b.calculatedStatus === 'PAID').length;

  const totalBorrowedSum = processedBorrowers.filter(b => !b.archived).reduce((acc, b) => acc + Number(b.loanAmount), 0);
  const totalReturnSum = processedBorrowers.filter(b => !b.archived).reduce((acc, b) => acc + Number(b.amountToReturn), 0);
  const totalCollectedSum = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalOutstandingSum = processedBorrowers.filter(b => !b.archived).reduce((acc, b) => acc + Number(b.remainingBalance), 0);

  // Filtered list
  const filteredBorrowers = processedBorrowers.filter(b => {
    if (b.archived) return false;
    const matchSearch = b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.mobileNumber.includes(searchTerm) || 
                          (b.facebookName && b.facebookName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return b.calculatedStatus === 'ACTIVE';
    if (statusFilter === 'DAY_6') return b.calculatedStatus === 'DAY_6';
    if (statusFilter === 'DUE_TODAY') return b.calculatedStatus === 'DAY_7';
    if (statusFilter === 'OVERDUE') return b.calculatedStatus === 'OVERDUE';
    if (statusFilter === 'PARTIALLY_PAID') return b.amountPaid > 0 && b.remainingBalance > 0;
    if (statusFilter === 'PAID') return b.calculatedStatus === 'PAID';
    return true;
  });

  // Handlers for Financer Actions
  const handleAddBorrowerSubmit = (e) => {
    e.preventDefault();
    const amount = Number(formLoanAmount);
    if (amount < 1000 || amount > 2000) {
      showToast('Loan amount must be between ₱1,000 and ₱2,000.', 'error');
      return;
    }

    const returnAmt = Math.round(amount * 1.10);
    const newId = `bor-${Date.now()}`;
    const newBorrower = {
      id: newId,
      fullName: formName,
      mobileNumber: normalizeMobile(formMobile),
      facebookName: formFbName,
      facebookUrl: formFbUrl,
      loanAmount: amount,
      amountToReturn: returnAmt,
      releaseDate: formReleaseDate,
      dueDate: new Date(new Date(formReleaseDate).getTime() + 7 * 86400000).toISOString().split('T')[0],
      amountPaid: 0,
      remainingBalance: returnAmt,
      status: 'ACTIVE',
      archived: false,
      pinHash: 'hashed_123456', // default initial PIN
      createdAt: new Date().toISOString()
    };

    setBorrowers([newBorrower, ...borrowers]);
    setActiveModal(null);
    showToast('Borrower added successfully!', 'success');
    // Reset form
    setFormName('');
    setFormMobile('');
    setFormFbName('');
    setFormFbUrl('');
    setFormLoanAmount(1000);
  };

  const handleRecordPaymentSubmit = (e) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (amt <= 0) {
      showToast('Payment amount must be greater than 0.', 'error');
      return;
    }

    if (amt > selectedBorrower.remainingBalance) {
      showToast('Payment cannot exceed remaining balance.', 'error');
      return;
    }

    const newRemaining = selectedBorrower.remainingBalance - amt;
    const newTotalPaid = selectedBorrower.amountPaid + amt;

    // Update borrower
    const updatedBorrowers = borrowers.map(b => {
      if (b.id === selectedBorrower.id) {
        return {
          ...b,
          amountPaid: newTotalPaid,
          remainingBalance: newRemaining,
          status: newRemaining === 0 ? 'PAID' : b.status
        };
      }
      return b;
    });

    // Add payment record
    const newPayment = {
      id: `pay-${Date.now()}`,
      borrowerId: selectedBorrower.id,
      paymentDate: new Date().toISOString().split('T')[0],
      amount: amt,
      paymentMethod: payMethod,
      reference: payRef,
      notes: payNotes,
      remainingBalance: newRemaining
    };

    setBorrowers(updatedBorrowers);
    setPayments([newPayment, ...payments]);
    setActiveModal(null);
    showToast(`Payment of ₱${amt.toLocaleString()} recorded successfully!`, 'success');
    setPayAmount('');
    setPayRef('');
    setPayNotes('');
  };

  const handleUploadDocSubmit = (e) => {
    e.preventDefault();
    if (!docFile) {
      showToast('Please select a file to upload.', 'error');
      return;
    }

    const newDoc = {
      id: `doc-${Date.now()}`,
      borrowerId: selectedBorrower.id,
      documentType: docType,
      fileName: docFile.name || 'uploaded_document.jpg',
      fileSize: '1.2 MB',
      mimeType: docFile.type || 'image/jpeg',
      storagePath: `private/${selectedBorrower.id}/${docFile.name}`,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: 'Financer Admin'
    };

    setDocuments([newDoc, ...documents]);
    setActiveModal(null);
    setDocFile(null);
    showToast('Document securely uploaded to storage!', 'success');
  };

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote = {
      id: `note-${Date.now()}`,
      borrowerId: selectedBorrower.id,
      noteText: newNoteText,
      createdBy: 'Financer Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNotes([newNote, ...notes]);
    setNewNoteText('');
    showToast('Private note added.', 'success');
  };

  const handleResetPinSubmit = (e) => {
    e.preventDefault();
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      showToast('PIN must be exactly 6 digits.', 'error');
      return;
    }

    const updated = borrowers.map(b => {
      if (b.id === selectedBorrower.id) {
        return { ...b, pinHash: `hashed_${newPin}` };
      }
      return b;
    });

    setBorrowers(updated);
    setActiveModal(null);
    setNewPin('');
    showToast('Borrower PIN securely reset!', 'success');
  };

  const handleArchiveBorrower = (id) => {
    if (window.confirm('Are you sure you want to archive this borrower?')) {
      setBorrowers(borrowers.map(b => b.id === id ? { ...b, archived: true } : b));
      showToast('Borrower archived.', 'warning');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Dashboard Header & Add Borrower Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>Financer Administrative Dashboard</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage borrower records, 7-day loan statuses, payments, and private documents.</p>
        </div>
        <button
          onClick={() => setActiveModal('addBorrower')}
          className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl shadow-lg transition flex items-center space-x-2 text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Borrower</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 uppercase font-semibold">Total Borrowers</div>
          <div className="text-2xl font-extrabold text-white mt-1">{totalBorrowersCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400 uppercase font-semibold">Active Loans</div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">{activeLoansCount}</div>
        </div>
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl">
          <div className="text-xs text-amber-400 uppercase font-semibold">Day 6 (Tomorrow)</div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">{day6Count}</div>
        </div>
        <div className="bg-slate-900 border border-red-500/30 p-4 rounded-2xl">
          <div className="text-xs text-red-400 uppercase font-semibold">Due Today</div>
          <div className="text-2xl font-extrabold text-red-400 mt-1">{dueTodayCount}</div>
        </div>
        <div className="bg-slate-900 border border-red-500/40 p-4 rounded-2xl">
          <div className="text-xs text-red-400 uppercase font-semibold">Overdue</div>
          <div className="text-2xl font-extrabold text-red-500 mt-1">{overdueCount}</div>
        </div>
        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl">
          <div className="text-xs text-emerald-400 uppercase font-semibold">Paid</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{paidCount}</div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 uppercase">Total Released</div>
          <div className="text-xl font-bold text-white mt-1">₱{totalBorrowedSum.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 uppercase">Total Return Expected</div>
          <div className="text-xl font-bold text-amber-400 mt-1">₱{totalReturnSum.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 uppercase">Total Collected</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">₱{totalCollectedSum.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 uppercase">Total Outstanding Balance</div>
          <div className="text-xl font-bold text-red-400 mt-1">₱{totalOutstandingSum.toLocaleString()}</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by name, mobile, or FB name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'DAY_6', 'DUE_TODAY', 'OVERDUE', 'PARTIALLY_PAID', 'PAID'].map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === filter ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Spreadsheet Borrower Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                <th className="p-4">Borrower / Mobile</th>
                <th className="p-4">Facebook</th>
                <th className="p-4">Loan / Return</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Paid / Balance</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {filteredBorrowers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No borrower records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredBorrowers.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-white">{b.fullName}</div>
                      <div className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Phone className="w-3 h-3 text-amber-400" />
                        <span>{b.mobileNumber}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {b.facebookName ? (
                        <a href={b.facebookUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-400 hover:underline flex items-center space-x-1">
                          <span>{b.facebookName}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">Not linked</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">₱{b.loanAmount.toLocaleString()}</div>
                      <div className="text-xs text-amber-400">Return: ₱{b.amountToReturn.toLocaleString()}</div>
                    </td>
                    <td className="p-4 text-xs text-slate-300">
                      <div>Rel: {b.releaseDate}</div>
                      <div className="text-slate-400">Due: {b.dueDate}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-emerald-400 font-semibold">₱{b.amountPaid.toLocaleString()}</div>
                      <div className="text-xs text-red-400 font-bold">Bal: ₱{b.remainingBalance.toLocaleString()}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${b.badgeColor}`}>
                        {b.statusLabel}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => { setSelectedBorrower(b); setActiveModal('recordPayment'); }}
                          title="Record Payment"
                          className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg transition"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedBorrower(b); setActiveModal('viewDocs'); }}
                          title="View Documents & Notes"
                          className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedBorrower(b); setActiveModal('resetPin'); }}
                          title="Reset PIN"
                          className="p-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg transition"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchiveBorrower(b.id)}
                          title="Archive Borrower"
                          className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}

      {/* 1. Add Borrower Modal */}
      {activeModal === 'addBorrower' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <span>Add New Borrower Record</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBorrowerSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  placeholder="Juan Dela Cruz" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm" 
                  required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Mobile Number (Primary Login ID)</label>
                <input 
                  type="text" 
                  value={formMobile} 
                  onChange={(e) => setFormMobile(e.target.value)} 
                  placeholder="09171234567" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Facebook Name</label>
                  <input 
                    type="text" 
                    value={formFbName} 
                    onChange={(e) => setFormFbName(e.target.value)} 
                    placeholder="Juan Cruz" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Facebook Profile URL</label>
                  <input 
                    type="url" 
                    value={formFbUrl} 
                    onChange={(e) => setFormFbUrl(e.target.value)} 
                    placeholder="https://facebook.com/..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Loan Amount (₱1,000 to ₱2,000)</label>
                <input 
                  type="number" 
                  min="1000" 
                  max="2000" 
                  step="100" 
                  value={formLoanAmount} 
                  onChange={(e) => setFormLoanAmount(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm" 
                  required 
                />
                <div className="text-xs text-amber-400 mt-1">
                  Amount to Return (10%): ₱{Math.round(Number(formLoanAmount || 0) * 1.10).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Release Date (Day 1)</label>
                <input 
                  type="date" 
                  value={formReleaseDate} 
                  onChange={(e) => setFormReleaseDate(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm" 
                  required 
                />
              </div>

              <button type="submit" className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-sm transition">
                Save Borrower Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Record Payment Modal */}
      {activeModal === 'recordPayment' && selectedBorrower && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Record Payment for {selectedBorrower.fullName}</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400">Remaining Balance:</div>
              <div className="text-2xl font-extrabold text-red-400">₱{selectedBorrower.remainingBalance.toLocaleString()}</div>
              <div className="text-xs text-slate-500">Total Return Required: ₱{selectedBorrower.amountToReturn.toLocaleString()}</div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Amount (₱)</label>
                <input 
                  type="number" 
                  max={selectedBorrower.remainingBalance}
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)} 
                  placeholder="e.g. 500" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm" 
                  required 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Method</label>
                <select 
                  value={payMethod} 
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm"
                >
                  <option value="GCash">GCash</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Maya">Maya</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Reference Number / Receipt ID</label>
                <input 
                  type="text" 
                  value={payRef} 
                  onChange={(e) => setPayRef(e.target.value)} 
                  placeholder="REF12345678" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm" 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Notes</label>
                <input 
                  type="text" 
                  value={payNotes} 
                  onChange={(e) => setPayNotes(e.target.value)} 
                  placeholder="Optional remarks..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm" 
                />
              </div>

              <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition">
                Submit Payment & Update Balance
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. View Documents & Private Notes Modal */}
      {activeModal === 'viewDocs' && selectedBorrower && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Documents & Private Notes: {selectedBorrower.fullName}</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Private Storage Documents</h4>
                <div className="flex items-center space-x-2">
                  <select 
                    value={docType} 
                    onChange={(e) => setDocType(e.target.value)} 
                    className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-1.5 text-white"
                  >
                    <option value="Government ID">Government ID</option>
                    <option value="Loan Agreement">Loan Agreement</option>
                    <option value="Selfie">Selfie</option>
                    <option value="Proof of Payment">Proof of Payment</option>
                  </select>
                  <input 
                    type="file" 
                    onChange={(e) => setDocFile(e.target.files[0])} 
                    className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-400 file:text-slate-950"
                  />
                  <button 
                    onClick={handleUploadDocSubmit}
                    className="px-3 py-1.5 bg-amber-400 text-slate-950 text-xs font-bold rounded-lg"
                  >
                    Upload
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {documents.filter(d => d.borrowerId === selectedBorrower.id).length === 0 ? (
                  <div className="text-xs text-slate-500 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    No documents uploaded for this borrower yet.
                  </div>
                ) : (
                  documents.filter(d => d.borrowerId === selectedBorrower.id).map(doc => (
                    <div key={doc.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">{doc.documentType}: {doc.fileName}</div>
                        <div className="text-xs text-slate-400">Uploaded {doc.uploadDate} • {doc.fileSize}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => showToast(`Opening secure viewer for ${doc.fileName}...`, 'success')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button 
                          onClick={() => {
                            setDocuments(documents.filter(d => d.id !== doc.id));
                            showToast('Document deleted from secure storage.', 'warning');
                          }}
                          className="p-1.5 bg-red-600/20 text-red-300 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Private Notes Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Private Financer Notes (Hidden from Borrower)</h4>
              
              <div className="space-y-2">
                {notes.filter(n => n.borrowerId === selectedBorrower.id).length === 0 ? (
                  <div className="text-xs text-slate-500 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    No private notes recorded.
                  </div>
                ) : (
                  notes.filter(n => n.borrowerId === selectedBorrower.id).map(note => (
                    <div key={note.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
                      <div className="text-xs text-slate-400">{note.createdBy} • {new Date(note.createdAt).toLocaleString()}</div>
                      <div className="text-sm text-slate-200">{note.noteText}</div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={newNoteText} 
                  onChange={(e) => setNewNoteText(e.target.value)} 
                  placeholder="Add a private administrative note..." 
                  className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white text-xs" 
                />
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl">
                  Add Note
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reset PIN Modal */}
      {activeModal === 'resetPin' && selectedBorrower && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <span>Reset PIN: {selectedBorrower.fullName}</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPinSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">New 6-Digit PIN</label>
                <input 
                  type="password" 
                  maxLength={6}
                  value={newPin} 
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} 
                  placeholder="••••••" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm tracking-widest" 
                  required 
                />
                <div className="text-xs text-slate-500 mt-1">Financer never sees old PIN; securely generates new 6-digit PIN hash.</div>
              </div>

              <button type="submit" className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-sm transition">
                Update Borrower PIN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   6. BORROWER DASHBOARD COMPONENT
   ============================================================================ */
function BorrowerDashboard({ sessionUser, borrowers, payments, documents, showToast }) {
  // Retrieve ONLY the authenticated borrower's own record linked by mobile number
  const borrower = borrowers.find(b => normalizeMobile(b.mobileNumber) === normalizeMobile(sessionUser.mobileNumber));

  if (!borrower) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Borrower Record Not Found</h2>
        <p className="text-slate-400 text-sm">Your mobile number is not associated with an active record. Please contact the Financer.</p>
      </div>
    );
  }

  // Calculate strict status
  const loanStatusInfo = calculateLoanStatusAndDays(borrower.releaseDate, borrower.remainingBalance);
  const borrowerPayments = payments.filter(p => p.borrowerId === borrower.id);
  const borrowerDocs = documents.filter(d => d.borrowerId === borrower.id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-8 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-2xl">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg inline-block">
            Verified Borrower Account
          </span>
          <h2 className="text-3xl font-extrabold text-white">Welcome, {borrower.fullName}</h2>
          <p className="text-slate-400 text-sm">Primary Mobile: <code className="text-amber-400">{borrower.mobileNumber}</code></p>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Loan Status</div>
          <span className={`px-4 py-1.5 rounded-xl text-sm font-extrabold border inline-block ${loanStatusInfo.badgeColor}`}>
            {loanStatusInfo.label}
          </span>
        </div>
      </div>

      {/* Loan Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="text-xs text-slate-400 uppercase font-semibold">Loan Amount</div>
          <div className="text-2xl font-extrabold text-white mt-2">₱{borrower.loanAmount.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Released: {borrower.releaseDate}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="text-xs text-slate-400 uppercase font-semibold">Amount to Return</div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2">₱{borrower.amountToReturn.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Exact 10% return (No fees)</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="text-xs text-slate-400 uppercase font-semibold">Amount Paid</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">₱{borrower.amountPaid.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Total settled so far</div>
        </div>
        <div className="bg-slate-900 border border-red-500/30 p-6 rounded-2xl">
          <div className="text-xs text-red-400 uppercase font-semibold">Remaining Balance</div>
          <div className="text-2xl font-extrabold text-red-400 mt-2">₱{borrower.remainingBalance.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Due Date: {borrower.dueDate}</div>
        </div>
      </div>

      {/* 7-Day Repayment Countdown Box */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <span>7-Day Repayment Schedule (Day {loanStatusInfo.currentDay} of 7)</span>
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const isPast = day < loanStatusInfo.currentDay;
            const isCurrent = day === loanStatusInfo.currentDay;
            return (
              <div 
                key={day} 
                className={`p-3 rounded-xl text-center border ${
                  isCurrent ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 
                  isPast ? 'bg-slate-950 border-slate-800 text-slate-500' : 
                  'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-xs">Day {day}</div>
                <div className="text-xs mt-1 font-semibold">{isCurrent ? 'TODAY' : isPast ? 'Passed' : 'Upcoming'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <span>Your Payment History</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Remaining Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {borrowerPayments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">No payments recorded yet.</td>
                </tr>
              ) : (
                borrowerPayments.map(p => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 text-slate-300">{p.paymentDate}</td>
                    <td className="py-3 px-4 text-white font-semibold">{p.paymentMethod}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">{p.reference || 'N/A'}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">₱{p.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-red-400">₱{p.remainingBalance.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Read-Only Borrower Documents Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <span>Your Available Documents (Read-Only)</span>
        </h3>
        <p className="text-xs text-slate-400">Borrowers can view their own documents but cannot upload, edit, or delete them.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {borrowerDocs.length === 0 ? (
            <div className="col-span-2 text-xs text-slate-500 bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center">
              No documents currently made available by the financer.
            </div>
          ) : (
            borrowerDocs.map(doc => (
              <div key={doc.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{doc.documentType}</div>
                  <div className="text-xs text-slate-400">{doc.fileName} • {doc.fileSize}</div>
                </div>
                <button
                  onClick={() => showToast(`Opening secure viewer for ${doc.fileName}...`, 'success')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>View Document</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}