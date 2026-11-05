import { useEffect } from 'react';
import { navigate } from './router';

/** Redirige sin añadir una entrada al historial. */
export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to]);
  return null;
}
