import { useEffect, useSyncExternalStore } from 'react';

/** Rutas de Pulso Web. Router mínimo basado en History API; se sustituirá
 *  por una librería cuando haya rutas anidadas. */
export const routes = {
  home: '/',
  register: '/registro',
  login: '/iniciar-sesion',
  panel: '/panel',
  demo: '/demo',
} as const;

/** Destino de "/" y de rutas desconocidas cuando no hay sesión. */
export const DEFAULT_ROUTE = routes.register;
/** Destino de "/" y de las vistas de acceso cuando hay sesión. */
export const AUTHENTICATED_ROUTE = routes.panel;

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
};

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export interface NavigateOptions {
  /** Sustituye la entrada actual del historial (redirecciones). */
  replace?: boolean;
  /** Datos de navegación (p. ej. el correo recién registrado para prellenar el login). */
  state?: Record<string, unknown>;
}

export function navigate(to: string, { replace = false, state }: NavigateOptions = {}): void {
  if (to === window.location.pathname && !state) return;
  if (replace) window.history.replaceState(state ?? null, '', to);
  else window.history.pushState(state ?? null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (!replace) window.scrollTo(0, 0);
}

/** Lee un valor de texto del estado de navegación actual. */
export function readNavigationState(key: string): string | undefined {
  const state: unknown = window.history.state;
  if (state && typeof state === 'object' && typeof (state as Record<string, unknown>)[key] === 'string') {
    return (state as Record<string, string>)[key];
  }
  return undefined;
}

/** Actualiza el título del documento para cada vista. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · MYDAS PULSO`;
  }, [title]);
}
