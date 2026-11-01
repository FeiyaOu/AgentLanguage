import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { duration, ease } from '../ui';
import { TopNav } from './TopNav';
import { BottomTabs } from './BottomTabs';

/** Layout for browsing pages: global nav on top, tab bar on mobile. */
export function AppShell() {
  const { pathname } = useLocation();

  // New page, new reading position.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 pb-24 md:pb-0">
        {/* Enter-only transition: no exit delay, so navigation always feels instant. */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.base, ease: ease.enter }}
        >
          <Outlet />
        </motion.div>
      </main>
      <BottomTabs />
    </div>
  );
}
