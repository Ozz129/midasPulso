import { useState } from 'react';
import { CoachLayout } from '../../app/layouts/CoachLayout';
import { useDocumentTitle } from '../../app/router';
import { Button } from '../../shared/ui/Button';
import type { AuthUser } from '../auth/session/authApi';
import { useAuth } from '../auth/session/authContext';
import { SystemStatusCard } from '../system-status';
import styles from './CoachHomePage.module.css';

/** Inicio del panel del coach (requiere sesión). */
export function CoachHomePage({ user }: { user: AuthUser }) {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const firstName = user.fullName.split(' ')[0];

  useDocumentTitle('Panel del coach');

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <CoachLayout
      navigation={
        <div className={styles.account}>
          <span className={styles.who}>
            <span className={styles.name}>{user.fullName}</span>
            <span className={styles.email}>{user.email}</span>
          </span>
          <Button variant="secondary" onClick={handleSignOut} loading={signingOut} loadingLabel="Cerrando…">
            Cerrar sesión
          </Button>
        </div>
      }
    >
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Panel del coach</p>
          <h1 className={styles.title}>Hola, {firstName}</h1>
          <p className={styles.lead}>
            Desde aquí administrarás clientes, entrevistas, rutinas, agenda y planes de alimentación.
          </p>
        </header>
        <div className={styles.grid}>
          <SystemStatusCard />
        </div>
      </div>
    </CoachLayout>
  );
}
