import { createContext, useContext } from 'react';
import type { AuthUser, LoginFailure } from './authApi';

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: AuthUser };

/** Motivos de fallo del login vistos por la interfaz. */
export type SignInFailure = LoginFailure | 'not-coach';

export interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; reason: SignInFailure }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return value;
}
