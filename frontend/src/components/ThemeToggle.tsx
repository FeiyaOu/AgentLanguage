import { useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    // index.html applies the initial theme class before React mounts.
    // Using that as source-of-truth avoids a flash where we compute a different value.
    return document.documentElement.classList.contains('dark');
  });

  const applyTheme = (nextIsDark: boolean) => {
    const root = document.documentElement;
    root.classList.toggle('dark', nextIsDark);
    root.style.colorScheme = nextIsDark ? 'dark' : 'light';
    window.localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
  };

  const withNoTransitions = (fn: () => void) => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    fn();
    // Remove after a couple frames so the browser applies the new styles first.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('theme-switching');
      });
    });
  };

  return (
    <button
      onClick={() => {
        setIsDark((prev) => {
          const next = !prev;
          withNoTransitions(() => applyTheme(next));
          return next;
        });
      }}
      className="p-2 rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-200"
      aria-label="Toggle Dark Mode"
    >
      {isDark ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
    </button>
  );
}
