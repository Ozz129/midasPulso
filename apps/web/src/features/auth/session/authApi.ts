import { apiUrl } from '../../../shared/api/apiUrl';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'coach' | 'coachee';
}

export type LoginFailure = 'invalid' | 'throttled' | 'network' | 'unexpected';
export type LoginResult = { ok: true; user: AuthUser } | { ok: false; reason: LoginFailure };

const TIMEOUT_MS = 15_000;

// La sesión viaja en una cookie httpOnly: todas las llamadas incluyen credenciales.
function request(path: `/${string}`, init: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...init.headers },
    signal: init.signal ?? AbortSignal.timeout(TIMEOUT_MS),
  });
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.fullName === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'coach' || user.role === 'coachee')
  );
}

export async function login(email: string, password: string): Promise<LoginResult> {
  let response: Response;
  try {
    response = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, reason: 'network' };
  }
  if (response.ok) {
    const body: unknown = await response.json().catch(() => null);
    return isAuthUser(body) ? { ok: true, user: body } : { ok: false, reason: 'unexpected' };
  }
  // 400 (formato inválido) se trata igual que 401 para no dar pistas.
  if (response.status === 401 || response.status === 400) return { ok: false, reason: 'invalid' };
  if (response.status === 429) return { ok: false, reason: 'throttled' };
  return { ok: false, reason: 'unexpected' };
}

/** Usuario de la sesión actual; null si no hay sesión o Core no responde. */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await request('/auth/me');
    if (!response.ok) return null;
    const body: unknown = await response.json().catch(() => null);
    return isAuthUser(body) ? body : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    // Aunque falle la red, el cliente olvida la sesión; la cookie vence sola.
  }
}
