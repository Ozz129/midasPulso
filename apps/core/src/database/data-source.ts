import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.schema.js';
import { loadEnvFile } from '../config/load-env-file.js';
import { buildTypeOrmOptions } from './typeorm.config.js';

// DataSource del CLI de TypeORM (migration:run, :show, :revert, :generate).
loadEnvFile();
const env = validateEnv(process.env);

export default new DataSource(buildTypeOrmOptions(env.DATABASE_URL));
