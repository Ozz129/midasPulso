import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: 'debe ser una URL postgres://usuario:clave@host:puerto/base',
  }),
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valida las variables de entorno al arrancar. El error nombra solo las
 * variables inválidas, nunca sus valores (pueden contener credenciales).
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Configuración de entorno inválida para Pulso Core:\n${issues}\n` +
        'Revisa apps/core/.env (plantilla: apps/core/.env.example).',
    );
  }
  return result.data;
}
