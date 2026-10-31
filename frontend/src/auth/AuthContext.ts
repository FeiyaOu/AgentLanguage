import { createContext, useContext } from 'react';

export type User = {
  name: string;
  email: string;
};

export type AuthStatus = 'loading' | 'guest' | 'authenticated';

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  /** Opens the shared login dialog from anywhere (nav, history, results…). */
  openLogin: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
