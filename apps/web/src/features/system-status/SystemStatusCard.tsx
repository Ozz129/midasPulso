import { useId, type ReactNode } from 'react';
import { API_BASE_URL } from '../../shared/api/apiUrl';
import { Badge, type BadgeTone } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card, CardBody, CardHeader } from '../../shared/ui/Card';
import type { HealthResult } from './fetchHealth';
import { AlertIcon, CheckIcon, PendingIcon, RetryIcon } from './StatusIcons';
import styles from './SystemStatusCard.module.css';
import { useSystemStatus } from './useSystemStatus';

type View = { tone: BadgeTone; label: string; detail: string; icon: ReactNode };

const timeFormatter = new Intl.DateTimeFormat('es', { timeStyle: 'medium' });

const OFFLINE_DETAIL: Record<Extract<HealthResult, { kind: 'offline' }>['reason'], string> = {
  network: 'No hay respuesta de la API. Comprueba que Pulso Core esté en marcha.',
  unavailable: 'La API responde, pero la base de datos no está disponible.',
  unexpected: 'La API devolvió una respuesta inesperada.',
};

function describe(checking: boolean, result: HealthResult | null): View {
  if (checking) {
    return {
      tone: 'pending',
      label: 'Conectando con Pulso Core…',
      detail: 'Comprobando la API y la conexión con PostgreSQL.',
      icon: <PendingIcon className={styles.spin} />,
    };
  }
  if (result?.kind === 'online') {
    return {
      tone: 'success',
      label: 'Core conectado',
      detail: 'La API responde y la conexión con PostgreSQL está activa.',
      icon: <CheckIcon />,
    };
  }
  return {
    tone: 'error',
    label: 'Core no disponible',
    detail: result ? OFFLINE_DETAIL[result.reason] : OFFLINE_DETAIL.network,
    icon: <AlertIcon />,
  };
}

export function SystemStatusCard() {
  const titleId = useId();
  const { checking, result, checkedAt, check } = useSystemStatus();
  const view = describe(checking, result);
  const isOffline = result?.kind === 'offline';

  return (
    <Card aria-labelledby={titleId} className={styles.card}>
      <CardHeader
        titleId={titleId}
        title="Estado del sistema"
        description="Conexión entre Pulso Web y Pulso Core."
      />
      <CardBody>
        {/* Región viva: anuncia cada cambio de estado a lectores de pantalla. */}
        <div role="status" aria-live="polite" aria-atomic="true" className={styles.status}>
          <Badge tone={view.tone} icon={view.icon}>
            {view.label}
          </Badge>
          <p className={styles.detail}>{view.detail}</p>
        </div>

        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt>API</dt>
            <dd>
              <code className={styles.code}>{API_BASE_URL}</code>
            </dd>
          </div>
          <div className={styles.metaRow}>
            <dt>Última comprobación</dt>
            <dd>{checkedAt ? <time dateTime={checkedAt.toISOString()}>{timeFormatter.format(checkedAt)}</time> : '—'}</dd>
          </div>
        </dl>

        {/* El botón aparece tras la primera respuesta y se mantiene montado
            durante las consultas para no perder el foco de teclado. */}
        {result && (
          <div className={styles.actions}>
            <Button
              variant={isOffline ? 'primary' : 'secondary'}
              icon={<RetryIcon />}
              loading={checking}
              loadingLabel="Comprobando…"
              onClick={check}
            >
              {isOffline ? 'Reintentar' : 'Comprobar de nuevo'}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
