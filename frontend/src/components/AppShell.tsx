import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomTabs } from './BottomTabs';

/** Layout for browsing pages: global nav on top, tab bar on mobile. */
export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}
