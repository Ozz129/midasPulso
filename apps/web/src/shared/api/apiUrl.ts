const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

/**
 * URL base de la API v1 de Pulso Core (VITE_API_BASE_URL), sin barra final.
 * Ejemplo: http://localhost:3000/api/v1
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(
  /\/+$/,
  '',
);

/**
 * Única convención para construir URLs de Core: base + ruta del recurso con
 * barra inicial. apiUrl('/health') → http://localhost:3000/api/v1/health
 */
export function apiUrl(path: `/${string}`): string {
  return `${API_BASE_URL}${path}`;
}
