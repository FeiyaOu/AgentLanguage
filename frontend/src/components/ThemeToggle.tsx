import { useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui';

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
    try {
      window.localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
    } catch {
      // Storage unavailable: theme still applies for this session.
    }
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
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        setIsDark((prev) => {
          const next = !prev;
          withNoTransitions(() => applyTheme(next));
          return next;
        });
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </Button>
  );
}
