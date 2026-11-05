import type { Point } from './types';

const RAD_TO_DEG = 180 / Math.PI;

/** Ángulo interior en `vertex` formado por los segmentos vertex→a y vertex→c (0–180°). */
export function angleAt(a: Point, vertex: Point, c: Point): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = c.x - vertex.x;
  const v2y = c.y - vertex.y;
  const norms = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (norms === 0) return Number.NaN;
  const cos = (v1x * v2x + v1y * v2y) / norms;
  return Math.acos(Math.min(1, Math.max(-1, cos))) * RAD_TO_DEG;
}

/**
 * Inclinación del segmento from→to respecto a la vertical "hacia arriba"
 * en coordenadas de imagen (y crece hacia abajo). 0° = vertical, 90° = horizontal.
 * No depende de hacia qué lado mira la persona ni del espejado de la cámara.
 */
export function inclinationFromVertical(from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return Number.NaN;
  // Vector vertical hacia arriba en imagen: (0, -1).
  return Math.atan2(Math.abs(dx), -dy) * RAD_TO_DEG;
}
