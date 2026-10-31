import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn, spring } from '../ui';
import { NAV_ITEMS } from './navItems';

/** Mobile navigation, pinned to the bottom within thumb reach. Hidden from md up. */
export function BottomTabs() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-16 grid-cols-4">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-full flex-col items-center justify-center gap-1 text-caption font-medium outline-none',
                  'transition-colors duration-fast focus-visible:bg-sunken',
                  isActive ? 'text-accent-text' : 'text-subtle',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-active"
                      transition={spring.snappy}
                      className="absolute top-0 h-0.5 w-8 rounded-pill bg-accent"
                    />
                  )}
                  <item.icon className="size-6" aria-hidden />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
