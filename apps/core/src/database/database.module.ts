import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../config/env.schema.js';
import { buildTypeOrmOptions } from './typeorm.config.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...buildTypeOrmOptions(config.get('DATABASE_URL', { infer: true })),
        retryAttempts: 5,
        retryDelay: 2_000,
      }),
    }),
  ],
})
export class DatabaseModule {}
