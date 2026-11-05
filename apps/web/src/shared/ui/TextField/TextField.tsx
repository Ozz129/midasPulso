import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './TextField.module.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: ReactNode;
  /** Texto de ayuda permanente bajo el campo. */
  hint?: ReactNode;
  /** Mensaje de error; marca el campo como inválido. */
  error?: string;
  /** Muestra el botón para mostrar/ocultar (solo type="password"). */
  revealable?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, revealable = false, type = 'text', className, ...rest },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [revealed, setRevealed] = useState(false);
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  const canReveal = revealable && type === 'password';

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
        {hint && (
          <span id={hintId} className={styles.inlineHint}>
            {hint}
          </span>
        )}
      </div>
      <div className={styles.control}>
        <input
          {...rest}
          ref={ref}
          id={id}
          type={canReveal && revealed ? 'text' : type}
          className={[styles.input, canReveal && styles.withAction].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {canReveal && (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setRevealed((value) => !value)}
            aria-pressed={revealed}
            aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          <ErrorIcon />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
} as const;

function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg {...iconProps} className={styles.errorIcon}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  );
}
