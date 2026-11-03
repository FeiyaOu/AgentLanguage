import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ease } from '../ui';
import { TopNav } from './TopNav';
import { BottomTabs } from './BottomTabs';

/** Layout for browsing pages: global nav on top, tab bar on mobile. */
export function AppShell() {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();

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
          Keep content visible from its first frame while making the arrival perceptible.
        */}
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0.65, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: ease.enter }}
        >
          <Outlet />
        </motion.div>
      </main>
      <BottomTabs />
    </div>
  );
}
