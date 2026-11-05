import { apiUrl } from '../../../shared/api/apiUrl';
import type { RegisterErrors } from './validateRegister';

export interface RegisterCoachInput {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisteredCoach {
  id: string;
  fullName: string;
  email: string;
  role: 'coach';
}

export type RegisterResult =
  | { ok: true; coach: RegisteredCoach }
  | { ok: false; fieldErrors: RegisterErrors }
  | { ok: false; formError: string };

const TIMEOUT_MS = 15_000;
const KNOWN_FIELDS = ['fullName', 'email', 'password'] as const;

/** POST /auth/register en Pulso Core. Nunca lanza: devuelve un resultado tipado. */
export async function registerCoach(input: RegisterCoachInput): Promise<RegisterResult> {
  let response: Response;
  try {
    response = await fetch(apiUrl('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return {
      ok: false,
      formError: 'No pudimos conectar con Pulso. Revisa tu conexión e inténtalo de nuevo.',
    };
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (response.status === 201 && body) {
    return { ok: true, coach: body as unknown as RegisteredCoach };
  }
  if (response.status === 409 && body?.code === 'EMAIL_TAKEN') {
    return { ok: false, fieldErrors: { email: 'Ya existe una cuenta con este correo. Inicia sesión.' } };
  }
  if (response.status === 400 && body?.code === 'VALIDATION_ERROR' && typeof body.fields === 'object') {
    const fields = body.fields as Record<string, unknown>;
    const fieldErrors: RegisterErrors = {};
    for (const name of KNOWN_FIELDS) {
      if (typeof fields[name] === 'string') fieldErrors[name] = fields[name];
    }
    if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  }
  return {
    ok: false,
    formError: 'No pudimos crear tu cuenta en este momento. Inténtalo de nuevo en unos minutos.',
  };
}
