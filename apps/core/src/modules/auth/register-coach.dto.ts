import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterCoachDto {
  @ApiProperty({ example: 'Fabián Martínez', minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString({ message: 'Escribe tu nombre completo.' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres.' })
  fullName: string;

  @ApiProperty({ example: 'coach@ejemplo.com', maxLength: 254 })
  @Transform(trim)
  @IsString({ message: 'Escribe tu correo electrónico.' })
  @MaxLength(254, { message: 'El correo es demasiado largo.' })
  @IsEmail({}, { message: 'Escribe un correo electrónico válido.' })
  email: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH, format: 'password' })
  @IsString({ message: 'Escribe una contraseña.' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  password: string;
}

export class RegisteredCoachDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Fabián Martínez' })
  fullName: string;

  @ApiProperty({ example: 'coach@ejemplo.com' })
  email: string;

  @ApiProperty({ example: 'coach', enum: ['coach'] })
  role: 'coach';
}
