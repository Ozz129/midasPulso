import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import type { User } from '../users/user.entity.js';
import { Session } from './session.entity.js';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class SessionsService {
  constructor(@InjectRepository(Session) private readonly sessions: Repository<Session>) {}

  /** Crea una sesión y devuelve el token en claro (solo existe en la respuesta). */
  async create(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.sessions.insert({ userId, tokenHash: hashToken(token), expiresAt });
    // Limpieza oportunista de sesiones vencidas de este usuario.
    await this.sessions.delete({ userId, expiresAt: LessThan(new Date()) });
    return { token, expiresAt };
  }

  /** Usuario de un token vigente, o null si no existe o venció. */
  async findUser(token: string): Promise<User | null> {
    const session = await this.sessions.findOne({
      where: { tokenHash: hashToken(token) },
      relations: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessions.delete({ id: session.id });
      return null;
    }
    return session.user;
  }

  async revoke(token: string): Promise<void> {
    await this.sessions.delete({ tokenHash: hashToken(token) });
  }
}
