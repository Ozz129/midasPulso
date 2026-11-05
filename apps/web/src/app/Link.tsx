import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from './router';

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  /** Estado de navegación para la vista destino. */
  state?: Record<string, unknown>;
};

/** Enlace interno: navega sin recargar y respeta clic medio/Ctrl/Cmd. */
export function Link({ href, state, onClick, children, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (event.defaultPrevented || modified || rest.target) return;
    event.preventDefault();
    navigate(href, { state });
  };
  return (
    <a {...rest} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
