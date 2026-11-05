import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchCurrentUser, login, logout } from './authApi';
import { AuthContext, type AuthContextValue, type AuthState } from './authContext';

/** Pulso Web es el panel del coach: solo las cuentas de coach abren sesión aquí. */
const PANEL_ROLE = 'coach';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  // Recupera la sesión existente (cookie httpOnly) al abrir la app.
  useEffect(() => {
    let cancelled = false;
    void fetchCurrentUser().then(async (user) => {
      if (cancelled) return;
      if (user && user.role !== PANEL_ROLE) {
        await logout();
        user = null;
      }
      if (!cancelled) setState(user ? { status: 'authenticated', user } : { status: 'anonymous' });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const result = await login(email, password);
    if (!result.ok) return result;
    if (result.user.role !== PANEL_ROLE) {
      await logout();
      return { ok: false, reason: 'not-coach' };
    }
    setState({ status: 'authenticated', user: result.user });
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setState({ status: 'anonymous' });
  }, []);

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
