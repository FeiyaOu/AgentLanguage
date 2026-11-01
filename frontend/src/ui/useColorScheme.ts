import { useSyncExternalStore } from 'react';

/** Current theme, kept in sync with the `dark` class on <html> (set by ThemeToggle). */
export function useColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light');
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
