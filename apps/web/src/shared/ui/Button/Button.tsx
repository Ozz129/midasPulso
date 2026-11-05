import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  /** Ocupa todo el ancho disponible. */
  block?: boolean;
  /**
   * Muestra un indicador de carga e ignora los clics. El botón sigue siendo
   * enfocable (aria-disabled) para no perder la posición del foco de teclado.
   */
  loading?: boolean;
  /** Texto alternativo mientras carga, p. ej. «Comprobando…». */
  loadingLabel?: ReactNode;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  loadingLabel,
  icon,
  type = 'button',
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const classes = [
    styles.button,
    styles[variant],
    size === 'lg' && styles.lg,
    block && styles.block,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      onClick={handleClick}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )
      )}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
}
