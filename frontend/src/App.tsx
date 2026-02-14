import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Feedback from './pages/Feedback';
import Roleplay from './pages/Roleplay';
import ThemeToggle from './components/ThemeToggle';
import { HomeIcon } from '@heroicons/react/24/outline';
import './index.css';

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isRoleplay = location.pathname === '/roleplay';

  return (
    <div className={isRoleplay ? '' : 'min-h-screen flex flex-col'}>
      {/* Top-right controls: Home + Theme toggle */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {!isHome && (
          <Link
            to="/"
            className="p-2 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-200"
            aria-label="Go Home"
          >
            <HomeIcon className="w-5 h-5" />
          </Link>
        )}
        <ThemeToggle />
      </div>

      {/* Page content */}
      <div className={isRoleplay ? '' : 'flex-1'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/roleplay" element={<Roleplay />} />
        </Routes>
      </div>

      {/* Footer */}
      {!isRoleplay && (
        <footer className="py-6 text-center border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} <span className="font-semibold text-slate-500 dark:text-slate-400">TalkTutor</span>. All rights reserved.
          </p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
