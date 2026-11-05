import 'reflect-metadata';
import { Logger, VersioningType, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { createValidationPipe } from './common/validation.pipe.js';
import type { Env } from './config/env.schema.js';

const API_PREFIX = 'api';
const DOCS_PATH = `${API_PREFIX}/docs`;

function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Pulso Core API')
    .setDescription('API REST compartida por Pulso Web (coach) y Pulso Mobile (coach y coachee).')
    .setVersion('1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(DOCS_PATH, app, document, {
    jsonDocumentUrl: `${DOCS_PATH}/openapi.json`,
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const logger = new Logger('Bootstrap');

  // Todas las rutas quedan bajo /api/v{n}; la versión por defecto es 1.
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  // credentials: Web envía la cookie de sesión httpOnly en peticiones a otro puerto.
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  const isDevelopment = config.get('NODE_ENV', { infer: true }) === 'development';
  if (isDevelopment) {
    setupOpenApi(app);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  logger.log(`Pulso Core escuchando en http://localhost:${port}/${API_PREFIX}/v1`);
  if (isDevelopment) {
    logger.log(`OpenAPI disponible en http://localhost:${port}/${DOCS_PATH}`);
  }
}

await bootstrap();
