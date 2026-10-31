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
import { Toaster } from './ui';
import './index.css';

// Internal style guide; kept out of the main bundle.
const DesignSystem = lazy(() => import('./pages/DesignSystem'));

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
              <Route
                path="/design-system"
                element={
                  <Suspense fallback={null}>
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
