import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH } from './register-coach.dto.js';

export class LoginDto {
  @ApiProperty({ example: 'coach@ejemplo.com' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Escribe tu correo electrónico.' })
  @MaxLength(254, { message: 'El correo es demasiado largo.' })
  @IsEmail({}, { message: 'Escribe un correo electrónico válido.' })
  email: string;

  @ApiProperty({ format: 'password' })
  @IsString({ message: 'Escribe tu contraseña.' })
  @MinLength(1, { message: 'Escribe tu contraseña.' })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'Correo o contraseña incorrectos.' })
  password: string;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Fabián Martínez' })
  fullName: string;

  @ApiProperty({ example: 'coach@ejemplo.com' })
  email: string;

  @ApiProperty({ enum: ['coach', 'coachee'] })
  role: 'coach' | 'coachee';
}

