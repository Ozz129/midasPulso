import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchHealth, type HealthResult } from './fetchHealth';

export interface SystemStatus {
  /** true mientras hay una consulta en curso. */
  checking: boolean;
  /** Resultado de la última consulta completada; null antes de la primera. */
  result: HealthResult | null;
  checkedAt: Date | null;
  /** Lanza una consulta nueva. Se ignora si ya hay una en curso. */
  check: () => void;
}

export function useSystemStatus(): SystemStatus {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<HealthResult | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const check = useCallback(() => {
    if (inFlight.current) return; // evita solicitudes duplicadas

    const controller = new AbortController();
    inFlight.current = controller;
    setChecking(true);

    fetchHealth(controller.signal)
      .then((next) => {
        setResult(next);
        setCheckedAt(new Date());
      })
      .catch(() => {
        // Abortada al desmontar: no hay estado que actualizar.
      })
      .finally(() => {
        if (inFlight.current === controller) {
          inFlight.current = null;
          setChecking(false);
        }
      });
  }, []);

  useEffect(() => {
    check();
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [check]);

  return { checking, result, checkedAt, check };
}
