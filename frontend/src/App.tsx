import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './auth/AuthProvider';
import { AppShell } from './components/AppShell';
import Home from './pages/Home';
import PracticeSetup from './pages/PracticeSetup';
import Practice from './pages/Practice';
import Feedback from './pages/Feedback';
import RoleplaySetup from './pages/RoleplaySetup';
import Roleplay from './pages/Roleplay';
import History from './pages/History';
import HistoryDetail from './pages/HistoryDetail';
import { Skeleton, SkeletonText, Toaster } from './ui';
import './index.css';

// Internal style guide; kept out of the main bundle.
const DesignSystem = lazy(() => import('./pages/DesignSystem'));

/** Holds the page's shape while its chunk loads, instead of an empty screen. */
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12" aria-busy>
      <Skeleton className="h-6 w-28 rounded-pill" />
      <Skeleton className="mt-4 h-10 w-72" />
      <SkeletonText lines={2} className="mt-4 max-w-2xl" />
    </div>
  );
}

function App() {
  return (
    // Motion animations follow the OS "reduce motion" setting.
    <MotionConfig reducedMotion="user">
      <Router>
        <AuthProvider>
          <Routes>
            {/* Browsing pages: global navigation */}
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/practice" element={<PracticeSetup />} />
              <Route path="/practice/results" element={<Feedback />} />
              <Route path="/roleplay" element={<RoleplaySetup />} />
              <Route path="/history" element={<History />} />
              <Route path="/history/:id" element={<HistoryDetail />} />
              <Route
                path="/design-system"
                element={
                  <Suspense fallback={<PageSkeleton />}>
                    <DesignSystem />
                  </Suspense>
                }
              />
            </Route>

            {/* Focus mode: an active session, no global navigation */}
            <Route path="/practice/session" element={<Practice />} />
            <Route path="/roleplay/session" element={<Roleplay />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </MotionConfig>
  );
}

export default App;
