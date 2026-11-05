import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.schema.js';
import { ENV_FILE_PATH } from './config/load-env-file.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ENV_FILE_PATH,
      validate: validateEnv,
    }),
    DatabaseModule,
    // Límite de peticiones; se aplica con ThrottlerGuard en las rutas sensibles.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    // Módulos de negocio, uno por dominio, bajo src/modules/.
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
