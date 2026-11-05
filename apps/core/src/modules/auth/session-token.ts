import type { CookieOptions, Request } from 'express';
import { SESSION_TTL_MS } from '../sessions/sessions.service.js';

/** Cookie de sesión de Pulso Web (httpOnly: el token nunca es legible desde JavaScript). */
export const SESSION_COOKIE = 'pulso_session';

export function sessionCookieOptions(production: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/api',
    maxAge: SESSION_TTL_MS,
  };
}

/** Token de sesión de la cookie, si existe. */
export function readSessionToken(request: Request): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === SESSION_COOKIE) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim()) || undefined;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
