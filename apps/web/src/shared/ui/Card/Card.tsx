import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

/** Agrupa contenido relacionado. Se renderiza como <section>; dale un aria-labelledby. */
export function Card({ className, children, ...rest }: CardProps) {
  return (
    <section {...rest} className={cx(styles.card, className)}>
      {children}
    </section>
  );
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  /** Contenido alineado a la derecha del título (p. ej. un Badge). */
  aside?: ReactNode;
}

export function CardHeader({ title, titleId, description, aside, className, ...rest }: CardHeaderProps) {
  return (
    <header {...rest} className={cx(styles.header, className)}>
      <div className={styles.heading}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {aside && <div className={styles.aside}>{aside}</div>}
    </header>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx(styles.body, className)}>
      {children}
    </div>
  );
}
