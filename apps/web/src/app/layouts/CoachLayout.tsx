import type { ReactNode } from 'react';
import styles from './CoachLayout.module.css';

export interface CoachLayoutProps {
  /** Navegación principal del panel; se mostrará cuando existan rutas funcionales. */
  navigation?: ReactNode;
  children: ReactNode;
}

export function CoachLayout({ navigation, children }: CoachLayoutProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="/" aria-label="MYDAS PULSO — inicio del panel">
            <img className={styles.brandIcon} src="/pulso-isotipo.svg" alt="" width="48" height="53" />
            <span className={styles.brandWordmark}>
              <span className={styles.brandMydas}>MYDAS</span>
            <span className={styles.brandPulso}>PULSO</span>
            </span>
          </a>
          <span className={styles.product}>Panel del coach</span>
          {navigation && (
            <nav className={styles.nav} aria-label="Principal">
              {navigation}
            </nav>
          )}
        </div>
      </header>

      <main id="contenido" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
