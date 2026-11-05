import { useEffect, useState } from 'react';

/** Aviso temporal de las vistas de acceso: se limpia solo tras `timeoutMs`. */
export function useNotice(timeoutMs = 6_000) {
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [notice, timeoutMs]);

  return [notice, setNotice] as const;
}
