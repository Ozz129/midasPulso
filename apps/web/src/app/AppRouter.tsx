import { LoginPage } from '../features/auth/login/LoginPage';
import { RegisterPage } from '../features/auth/register/RegisterPage';
import { useAuth } from '../features/auth/session/authContext';
import { CoachHomePage } from '../features/coach-home/CoachHomePage';
import { App } from './App';
import { Redirect } from './Redirect';
import { AUTHENTICATED_ROUTE, DEFAULT_ROUTE, routes, usePathname } from './router';

export function AppRouter() {
  const { state } = useAuth();
  const pathname = usePathname().replace(/\/+$/, '') || '/';

  // La demo de la ficha es pública y no depende de la sesión.
  if (pathname === routes.demo) return <App />;

  if (state.status === 'loading') {
    return (
      <p role="status" className="visually-hidden">
        Cargando Pulso…
      </p>
    );
  }

  if (state.status === 'authenticated') {
    return pathname === routes.panel ? (
      <CoachHomePage user={state.user} />
    ) : (
      <Redirect to={AUTHENTICATED_ROUTE} />
    );
  }

  switch (pathname) {
    case routes.register:
      return <RegisterPage />;
    case routes.login:
      return <LoginPage />;
    case routes.panel:
      return <Redirect to={routes.login} />;
    default:
      return <Redirect to={DEFAULT_ROUTE} />;
  }
}
