import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import type { Env } from '../../config/env.schema.js';
import { SessionsService } from '../sessions/sessions.service.js';
import type { User } from '../users/user.entity.js';
import { EmailTakenError, UsersService } from '../users/users.service.js';
import { AuthUserDto, LoginDto } from './login.dto.js';
import { hashPassword, verifyPassword } from './password-hasher.js';
import { RegisterCoachDto, RegisteredCoachDto } from './register-coach.dto.js';
import { SessionGuard, type AuthenticatedRequest } from './session.guard.js';
import { SESSION_COOKIE, sessionCookieOptions } from './session-token.js';

const toAuthUser = (user: User): AuthUserDto => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
});

// Límite de intentos por IP para frenar fuerza bruta y altas masivas.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController implements OnModuleInit {
  /** Hash de referencia para igualar el tiempo de respuesta cuando el correo no existe. */
  private dummyHash = '';

  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await hashPassword('pulso-dummy-password');
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Crea la cuenta de un coach' })
  @ApiCreatedResponse({ type: RegisteredCoachDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos: { code: "VALIDATION_ERROR", fields }' })
  @ApiConflictResponse({ description: 'El correo ya está registrado: { code: "EMAIL_TAKEN" }' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos' })
  async register(@Body() dto: RegisterCoachDto): Promise<RegisteredCoachDto> {
    try {
      const user = await this.users.create({
        fullName: dto.fullName,
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        role: 'coach',
      });
      return { id: user.id, fullName: user.fullName, email: user.email, role: 'coach' };
    } catch (error) {
      if (error instanceof EmailTakenError) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          code: 'EMAIL_TAKEN',
          message: 'Ya existe una cuenta con este correo.',
        });
      }
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Inicia sesión y establece la cookie de sesión httpOnly' })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: 'Credenciales incorrectas: { code: "INVALID_CREDENTIALS" }' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<AuthUserDto> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    // Se verifica siempre una contraseña para no revelar por tiempo si el correo existe.
    const valid = await verifyPassword(dto.password, user?.passwordHash ?? this.dummyHash);
    if (!user || !valid) {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos.',
      });
    }

    const { token } = await this.sessions.create(user.id);
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.isProduction()));
    return toAuthUser(user);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Usuario de la sesión actual' })
  @ApiOkResponse({ type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: 'Sin sesión: { code: "UNAUTHENTICATED" }' })
  me(@Req() request: AuthenticatedRequest): AuthUserDto {
    return toAuthUser(request.user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Cierra la sesión actual' })
  @ApiNoContentResponse()
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.sessions.revoke(request.sessionToken);
    const { maxAge: _maxAge, ...options } = sessionCookieOptions(this.isProduction());
    response.clearCookie(SESSION_COOKIE, options);
  }

  private isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }
}
