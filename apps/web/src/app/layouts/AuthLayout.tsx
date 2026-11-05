import type { ReactNode } from 'react';
import { Link } from '../Link';
import { routes } from '../router';
import styles from './AuthLayout.module.css';

export interface AuthLayoutProps {
  children: ReactNode;
}

/** Marco de las vistas de acceso (registro, inicio de sesión). */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>

      <header className={styles.header}>
        <Link className={styles.brand} href={routes.home} aria-label="MYDAS PULSO — inicio">
          <img className={styles.brandIcon} src="/pulso-isotipo.svg" alt="" width="64" height="70" />
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.brandWordmark}>MYDAS PULSO</span>
        </Link>
        <span className={styles.headerRule} aria-hidden="true" />
        <span className={styles.headerSlashes} aria-hidden="true">
          //
        </span>
        <span className={styles.company}>MYDAS TECH</span>
      </header>

      <div className={styles.rail} aria-hidden="true">
        <span className={styles.railMarks} />
        <span className={styles.railWord}>PULSO</span>
        <span className={styles.railMarks} />
      </div>

      <Watermark />

      <main id="contenido" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

/** P con corona en relieve, decorativa. */
function Watermark() {
  return (
    <svg className={styles.watermark} viewBox="0 0 128 140" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="auth-watermark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f232b" />
          <stop offset="1" stopColor="#15181e" />
        </linearGradient>
      </defs>
      <g fill="url(#auth-watermark)" stroke="#272b34" strokeWidth="0.5">
        <path d="m52 22 13 9 5-17 11 15 11-19 6 21 15-10-9 26c-15-8-31-10-47-6z" />
        <circle cx="52" cy="21" r="4" />
        <circle cx="70" cy="13" r="4" />
        <circle cx="92" cy="9" r="4" />
        <circle cx="114" cy="20" r="4" />
        <path d="M26 72c7-14 17-20 33-20h23c21 0 32 11 29 27-3 18-18 28-38 28H49l-17 28H7c-3 0-4-2-2-5l26-43h43c7 0 12-3 13-8 1-5-3-7-9-7z" />
      </g>
      <path d="M58 46c16-5 31-3 44 4" fill="none" stroke="#1f232b" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
