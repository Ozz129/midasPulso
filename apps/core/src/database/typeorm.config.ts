import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataSourceOptions } from 'typeorm';

/** Raíz del código compilado (dist/), resuelta desde este archivo. */
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/** TypeORM espera globs con barras normales, también en Windows. */
const glob = (...segments: string[]) => join(rootDir, ...segments).replaceAll('\\', '/');

/**
 * Configuración única de TypeORM. La consumen el módulo de NestJS y el
 * DataSource del CLI de migraciones, de modo que ambos ven el mismo esquema.
 */
export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [glob('modules', '**', '*.entity.js')],
    migrations: [glob('database', 'migrations', '*.js')],
    migrationsTableName: 'typeorm_migrations',
    // El esquema solo cambia mediante migraciones versionadas.
    synchronize: false,
    migrationsRun: false,
    // UUID con gen_random_uuid(), nativo desde PostgreSQL 13: sin extensiones.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    logging: ['error', 'warn', 'migration'],
    extra: {
      application_name: 'pulso-core',
      connectionTimeoutMillis: 3_000,
      // Evita que una consulta colgada bloquee el health check u otras rutas.
      query_timeout: 5_000,
    },
  };
}
