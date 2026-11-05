import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity.js';

/** Sesión opaca. Solo se guarda el hash SHA-256 del token, nunca el token. */
@Entity({ name: 'sessions' })
export class Session {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_sessions' })
  id: string;

  @Index('IDX_sessions_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_sessions_user' })
  user: User;

  @Index('UQ_sessions_token_hash', { unique: true })
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
