import { useState, useEffect } from 'react';

export interface User {
  id:    string;
  email?: string;
}

export interface Session {
  user: User;
}

const SINGLE_USER: User = {
  id:    import.meta.env.VITE_CYCLOFUEL_USER_ID || 'cyclofuel-main-user',
  email: import.meta.env.VITE_CYCLOFUEL_USER_EMAIL || 'alexandrkasparek2-ux@cyclofuel.local',
};

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
    setState({ session: { user: SINGLE_USER }, user: SINGLE_USER, loading: false });
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    void email;
    void password;
    setState({ session: { user: SINGLE_USER }, user: SINGLE_USER, loading: false });
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    await signIn(email, password);
  };

  const signOut = async (): Promise<void> => {
    setState({ session: { user: SINGLE_USER }, user: SINGLE_USER, loading: false });
  };

  return { ...state, signIn, signUp, signOut };
}
