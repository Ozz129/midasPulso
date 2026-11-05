import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User, type UserRole } from './user.entity.js';

/** Se lanza cuando el correo ya pertenece a otra cuenta. */
export class EmailTakenError extends Error {
  constructor() {
    super('El correo ya está registrado');
  }
}

const PG_UNIQUE_VIOLATION = '23505';

export interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /** Usuario por correo incluyendo el hash de contraseña (excluido por defecto). */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: UsersService.normalizeEmail(email) })
      .getOne();
  }

  async create(input: CreateUserInput): Promise<User> {
    const user = this.users.create({
      ...input,
      fullName: input.fullName.trim().replace(/\s+/g, ' '),
      email: UsersService.normalizeEmail(input.email),
    });
    try {
      return await this.users.save(user);
    } catch (error) {
      // El índice único resuelve también las altas simultáneas con el mismo correo.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string } | undefined)?.code === PG_UNIQUE_VIOLATION
      ) {
        throw new EmailTakenError();
      }
      throw error;
    }
  }
}
