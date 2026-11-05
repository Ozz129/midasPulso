import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Archivo de entorno local de Core: apps/core/.env (los scripts se ejecutan desde apps/core). */
export const ENV_FILE_PATH = resolve(process.cwd(), '.env');

/**
 * Carga apps/core/.env en process.env si existe. Las variables ya definidas
 * en el entorno del proceso tienen prioridad.
 */
export function loadEnvFile(): void {
  if (existsSync(ENV_FILE_PATH)) {
    process.loadEnvFile(ENV_FILE_PATH);
  }
}
