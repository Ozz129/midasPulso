/** Validaciones compartidas por las vistas de acceso. Core sigue siendo la referencia. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function emailError(raw: string): string | undefined {
  const email = raw.trim();
  if (!email) return 'Escribe tu correo electrónico.';
  if (email.length > 254 || !EMAIL_PATTERN.test(email))
    return 'Escribe un correo electrónico válido, por ejemplo coach@ejemplo.com.';
  return undefined;
}
