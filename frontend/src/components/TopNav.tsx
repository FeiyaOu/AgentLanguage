import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn, spring } from '../ui';
import { Logo } from './Logo';
import ThemeToggle from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { NAV_ITEMS } from './navItems';

/** Global navigation. Desktop shows links inline; on mobile they move to BottomTabs. */
export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.filter((item) => item.to !== '/').map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'relative flex h-9 items-center rounded-pill px-3.5 text-body-sm font-medium outline-none',
                      'transition-colors duration-fast ease-standard focus-visible:ring-2 focus-visible:ring-ring',
                      isActive ? 'text-fg' : 'text-muted hover:text-fg',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          transition={spring.snappy}
                          className="absolute inset-0 rounded-pill bg-sunken"
                        />
                      )}
                      <span className="relative">{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
