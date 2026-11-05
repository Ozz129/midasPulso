import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env.schema.js';
import { SessionsService } from '../sessions/sessions.service.js';
import type { User } from '../users/user.entity.js';
import { readSessionToken } from './session-token.js';

export interface AuthenticatedRequest extends Request {
  user: User;
  sessionToken: string;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Exige una sesión vigente. Valida además el origen en peticiones con cookie que modifican datos. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readSessionToken(request);
    if (!token) throw this.unauthorized();

    // Defensa CSRF: una petición con cookie que modifica datos debe venir de un origen permitido.
    if (!SAFE_METHODS.has(request.method)) {
      const origin = request.headers.origin;
      if (!origin || !this.config.get('WEB_ORIGIN', { infer: true }).includes(origin)) {
        throw new ForbiddenException({ statusCode: 403, code: 'ORIGIN_NOT_ALLOWED', message: 'Origen no permitido.' });
      }
    }

    const user = await this.sessions.findUser(token);
    if (!user) throw this.unauthorized();
    request.user = user;
    request.sessionToken = token;
    return true;
  }

  private unauthorized() {
    return new UnauthorizedException({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'Inicia sesión para continuar.' });
  }
}
