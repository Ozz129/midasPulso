import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AuthLayout } from '../../../app/layouts/AuthLayout';
import { Link } from '../../../app/Link';
import { readNavigationState, routes, useDocumentTitle } from '../../../app/router';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import styles from '../AuthPage.module.css';
import { useAuth, type SignInFailure } from '../session/authContext';
import { SOCIAL_PROVIDER_LABEL } from '../social/providers';
import { SocialAuth } from '../social/SocialAuth';
import { useNotice } from '../useNotice';
import { emailError } from '../validation';

type Field = 'email' | 'password';
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const FIELD_ORDER: Field[] = ['email', 'password'];

const FAILURE_MESSAGE: Record<SignInFailure, string> = {
  invalid: 'Correo o contraseña incorrectos.',
  throttled: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  network: 'No pudimos conectar con Pulso. Revisa tu conexión e inténtalo de nuevo.',
  unexpected: 'No pudimos iniciar sesión en este momento. Inténtalo de nuevo en unos minutos.',
  'not-coach': 'Esta cuenta no es de coach. Usa Pulso Mobile para entrar como coachee.',
};

/** Inicio de sesión del coach contra Pulso Core (sesión en cookie httpOnly). */
export function LoginPage() {
  const { signIn } = useAuth();
  // Si viene del registro, el correo llega prellenado.
  const [values, setValues] = useState<Values>(() => ({
    email: readNavigationState('email') ?? '',
    password: '',
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useNotice();
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  useDocumentTitle('Inicia sesión');

  const handleChange = (field: Field) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const next: Errors = {
      email: emailError(values.email),
      password: values.password ? undefined : 'Escribe tu contraseña.',
    };
    setErrors(next);
    setFormError('');
    setNotice('');
    const first = FIELD_ORDER.find((field) => next[field]);
    if (first) {
      inputs.current[first]?.focus();
      return;
    }

    setSubmitting(true);
    const result = await signIn(values.email.trim(), values.password);
    if (result.ok) return; // El router lleva al panel al cambiar el estado de sesión.

    setSubmitting(false);
    setFormError(FAILURE_MESSAGE[result.reason]);
    if (result.reason === 'invalid') {
      setValues((current) => ({ ...current, password: '' }));
      inputs.current.password?.focus();
    }
  };

  const bind = (field: Field) => ({
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
      <div className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Panel del coach</p>
          <h1 className={styles.title}>Inicia sesión</h1>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fields}>
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
            <div className={styles.passwordGroup}>
              <TextField
                {...bind('password')}
                label="Contraseña"
                type="password"
                placeholder="Tu contraseña"
                autoComplete="current-password"
                revealable
                required
              />
              <button
                type="button"
                className={styles.textLink}
                onClick={() => setNotice('La recuperación de contraseña estará disponible próximamente.')}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>

          <div role="alert" className={styles.alert}>
            {formError}
          </div>
          <p role="status" className={styles.notice}>
            {notice}
          </p>

          <Button type="submit" size="lg" block loading={submitting} loadingLabel="Iniciando sesión…">
            Iniciar sesión
          </Button>

          <SocialAuth
            onSelect={(provider) =>
              setNotice(`El acceso con ${SOCIAL_PROVIDER_LABEL[provider]} estará disponible próximamente.`)
            }
          />

          <p className={styles.alt}>
            ¿Aún no tienes cuenta?
            <Link className={styles.link} href={routes.register}>
              Crea tu cuenta
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
