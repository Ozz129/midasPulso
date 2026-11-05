import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AuthLayout } from '../../../app/layouts/AuthLayout';
import { Link } from '../../../app/Link';
import { routes, useDocumentTitle } from '../../../app/router';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import styles from '../AuthPage.module.css';
import { SOCIAL_PROVIDER_LABEL } from '../social/providers';
import { SocialAuth } from '../social/SocialAuth';
import { useNotice } from '../useNotice';
import { registerCoach, type RegisteredCoach } from './registerCoach';
import {
  PASSWORD_MIN_LENGTH,
  validateRegister,
  type RegisterErrors,
  type RegisterField,
  type RegisterValues,
} from './validateRegister';

const EMPTY: RegisterValues = { fullName: '', email: '', password: '', confirmPassword: '' };
const FIELD_ORDER: RegisterField[] = ['fullName', 'email', 'password', 'confirmPassword'];

export function RegisterPage() {
  const [values, setValues] = useState<RegisterValues>(EMPTY);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useNotice();
  const [submitting, setSubmitting] = useState(false);
  const [coach, setCoach] = useState<RegisteredCoach | null>(null);
  const inputs = useRef<Partial<Record<RegisterField, HTMLInputElement | null>>>({});
  const successHeading = useRef<HTMLHeadingElement>(null);

  useDocumentTitle(coach ? 'Cuenta creada' : 'Crea tu cuenta');

  useEffect(() => {
    if (coach) successHeading.current?.focus();
  }, [coach]);

  const focusFirstError = (next: RegisterErrors) => {
    const first = FIELD_ORDER.find((field) => next[field]);
    if (first) inputs.current[first]?.focus();
  };

  const handleChange = (field: RegisterField) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    // El error de un campo desaparece al corregirlo.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const clientErrors = validateRegister(values);
    setErrors(clientErrors);
    setFormError('');
    setNotice('');
    if (Object.keys(clientErrors).length > 0) {
      focusFirstError(clientErrors);
      return;
    }

    setSubmitting(true);
    const result = await registerCoach({
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      password: values.password,
    });
    setSubmitting(false);

    if (result.ok) {
      setCoach(result.coach);
    } else if ('fieldErrors' in result) {
      setErrors(result.fieldErrors);
      focusFirstError(result.fieldErrors);
    } else {
      setFormError(result.formError);
    }
  };

  const bind = (field: RegisterField) => ({
    ref: (element: HTMLInputElement | null) => {
      inputs.current[field] = element;
    },
    name: field,
    value: values[field],
    onChange: handleChange(field),
    error: errors[field],
  });

  return (
    <AuthLayout>
      <div className={`${styles.page} ${styles.dense}`}>
        {coach ? (
          <section className={styles.intro} aria-labelledby="registro-exito">
            <p className={styles.eyebrow}>Panel del coach</p>
            <h1 id="registro-exito" ref={successHeading} tabIndex={-1} className={styles.title}>
              Cuenta creada
            </h1>
            <div className={styles.success}>
              <p className={styles.successBadge}>
                <CheckIcon />
                Registro completado
              </p>
              <p>
                Te damos la bienvenida a MYDAS PULSO, <strong>{coach.fullName}</strong>. Tu cuenta de coach quedó
                registrada con <strong>{coach.email}</strong>.
              </p>
              <Link className={styles.cta} href={routes.login} state={{ email: coach.email }}>
                Inicia sesión
              </Link>
            </div>
          </section>
        ) : (
          <>
            <header className={styles.intro}>
              <p className={styles.eyebrow}>Panel del coach</p>
              <h1 className={styles.title}>Crea tu cuenta</h1>
              <p className={styles.subtitle}>Entrena con alguien de tu lado.</p>
            </header>

            <form className={styles.form} onSubmit={handleSubmit} noValidate aria-describedby="registro-error">
              <div className={styles.fields}>
                <TextField
                  {...bind('fullName')}
                  label="Nombre completo"
                  placeholder="Tu nombre y apellido"
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={100}
                  required
                />
                <TextField
                  {...bind('email')}
                  label="Correo electrónico"
                  type="email"
                  placeholder="coach@ejemplo.com"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  maxLength={254}
                  required
                />
                <TextField
                  {...bind('password')}
                  label="Contraseña"
                  type="password"
                  placeholder="Crea una contraseña"
                  hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`}
                  autoComplete="new-password"
                  revealable
                  required
                />
                <TextField
                  {...bind('confirmPassword')}
                  label="Confirmar contraseña"
                  type="password"
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  revealable
                  required
                />
              </div>

              <div id="registro-error" role="alert" className={styles.alert}>
                {formError}
              </div>
              <p role="status" className={styles.notice}>
                {notice}
              </p>

              <Button type="submit" size="lg" block loading={submitting} loadingLabel="Creando cuenta…">
                Crear cuenta
              </Button>

              <SocialAuth
                onSelect={(provider) =>
                  setNotice(`El registro con ${SOCIAL_PROVIDER_LABEL[provider]} estará disponible próximamente.`)
                }
              />

              <p className={styles.alt}>
                ¿Ya tienes una cuenta?
                <Link className={styles.link} href={routes.login}>
                  Inicia sesión
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 10" />
    </svg>
  );
}
