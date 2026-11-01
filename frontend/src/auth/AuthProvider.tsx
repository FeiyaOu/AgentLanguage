import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthStatus, type User } from './AuthContext';
import { LoginDialog } from '../components/LoginDialog';
import { toast } from '../ui';

/*
 * Mock authentication: no backend yet, so the "account" lives in localStorage.
 * The session is read synchronously on first render, so pages never render as a
 * guest and then switch (that switch read as a flash). The 'loading' status and
 * its skeletons stay in place for a real, asynchronous session check later.
 * Login keeps a short delay so its button state behaves as it will with an API.
 */

const STORAGE_KEY = 'agentlanguage.user';
const LOGIN_MS = 700;

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function nameFromEmail(email: string) {
  const local = email.split('@')[0] ?? '';
  const first = local.split(/[._-]/)[0] ?? local;
  return first ? first[0].toUpperCase() + first.slice(1) : 'Learner';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [status, setStatus] = useState<AuthStatus>(() => (user ? 'authenticated' : 'guest'));
  const [loginOpen, setLoginOpen] = useState(false);

  // Mock: any password is accepted, so it isn't read here.
  const login = useCallback(async (email: string) => {
    await new Promise((resolve) => setTimeout(resolve, LOGIN_MS));
    const next: User = { email, name: nameFromEmail(email) };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode): stay logged in for this tab only.
    }
    setUser(next);
    setStatus('authenticated');
    return next;
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    setStatus('guest');
    toast('Signed out');
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);

  const value = useMemo(() => ({ status, user, login, logout, openLogin }), [status, user, login, logout, openLogin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </AuthContext.Provider>
  );
}
