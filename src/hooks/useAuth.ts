import { useState, useEffect } from 'react';

export interface User {
  id:    string;
  email?: string;
}

export interface Session {
  user: User;
}

export interface AuthState {
  session: Session | null;
  user:    User    | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user:    null,
    loading: true,
  });

  useEffect(() => {
    fetch('/api/auth-session')
      .then(async response => response.ok ? response.json() : { user: null })
      .then(({ user }) => setState({
        session: user ? { user } : null,
        user,
        loading: false,
      }))
      .catch(() => setState({ session: null, user: null, loading: false }));
  }, []);

  const signIn = async (password: string): Promise<void> => {
    const response = await fetch('/api/auth-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Přihlášení se nezdařilo.');
    setState({ session: { user: payload.user }, user: payload.user, loading: false });
  };

  const signOut = async (): Promise<void> => {
    await fetch('/api/auth-logout', { method: 'POST' });
    setState({ session: null, user: null, loading: false });
  };

  return { ...state, signIn, signOut };
}
