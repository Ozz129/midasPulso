import { apiUrl } from '../../shared/api/apiUrl';

const REQUEST_TIMEOUT_MS = 5_000;

export type HealthResult =
  | { kind: 'online' }
  | { kind: 'offline'; reason: 'network' | 'unavailable' | 'unexpected' };

/**
 * Consulta GET /health de Pulso Core.
 * - 200 + { status: 'ok' } → online
 * - 503 → offline (la API responde pero el servicio no está disponible)
 * - error de red / timeout / respuesta inesperada → offline
 * Rechaza solo si `signal` se aborta desde fuera.
 */
export async function fetchHealth(signal: AbortSignal): Promise<HealthResult> {
  try {
    const response = await fetch(apiUrl('/health'), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });

    if (response.status === 503) {
      return { kind: 'offline', reason: 'unavailable' };
    }
    if (!response.ok) {
      return { kind: 'offline', reason: 'unexpected' };
    }

    const body: unknown = await response.json();
    const isOk =
      typeof body === 'object' && body !== null && (body as { status?: unknown }).status === 'ok';
    return isOk ? { kind: 'online' } : { kind: 'offline', reason: 'unexpected' };
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }
    return { kind: 'offline', reason: 'network' };
  }
}
