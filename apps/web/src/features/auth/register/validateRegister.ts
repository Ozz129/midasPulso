import { emailError } from '../validation';

// Mismas reglas que RegisterCoachDto en Pulso Core; Core sigue siendo la referencia.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface RegisterValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegisterField = keyof RegisterValues;
export type RegisterErrors = Partial<Record<RegisterField, string>>;

export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  const fullName = values.fullName.trim();

  if (!fullName) errors.fullName = 'Escribe tu nombre completo.';
  else if (fullName.length < 2 || fullName.length > 100)
    errors.fullName = 'El nombre debe tener entre 2 y 100 caracteres.';

  const email = emailError(values.email);
  if (email) errors.email = email;

  if (!values.password) errors.password = 'Escribe una contraseña.';
  else if (values.password.length < PASSWORD_MIN_LENGTH)
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  else if (values.password.length > PASSWORD_MAX_LENGTH)
    errors.password = `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`;

  if (!values.confirmPassword) errors.confirmPassword = 'Confirma tu contraseña.';
  else if (values.confirmPassword !== values.password)
    errors.confirmPassword = 'Las contraseñas no coinciden.';

  return errors;
}
