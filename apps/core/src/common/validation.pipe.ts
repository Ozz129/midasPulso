import { BadRequestException, HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';

/**
 * ValidationPipe global. Errores en un formato que los clientes pueden mapear
 * a cada campo: { statusCode: 400, code: 'VALIDATION_ERROR', fields: { campo: mensaje } }
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const fields: Record<string, string> = {};
      for (const error of errors) {
        const message = Object.values(error.constraints ?? {})[0];
        fields[error.property] =
          error.constraints?.whitelistValidation ? 'Campo no permitido.' : (message ?? 'Valor inválido.');
      }
      return new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos enviados.',
        fields,
      });
    },
  });
}
