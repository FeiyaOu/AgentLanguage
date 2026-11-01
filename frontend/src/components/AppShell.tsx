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
        {/*
          Enter-only and never from transparent: the old page is removed at once, so
          starting the new one at opacity 0 left a near-empty frame that read as a flash.
          It is visible from its first frame and only settles into place.
        */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0.85, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration.base, ease: ease.standard }}
        >
          <Outlet />
        </motion.div>
      </main>
      <BottomTabs />
    </div>
  );
}
