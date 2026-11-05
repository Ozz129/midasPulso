import type { BodyPose, BodySide, Joint, Keypoint, SquatMetrics } from '../types';

const DEG = Math.PI / 180;
const HIP = { x: 0.5, y: 0.55 };
const THIGH = 0.2;
const SHIN = 0.2;
const TRUNK = 0.28;

export interface PoseOptions extends Partial<SquatMetrics> {
  /** Lado visible (de perfil). El otro lado queda oculto (confianza baja). */
  side?: BodySide;
  score?: number;
  /** Puntos del lado visible que se ocultan (confianza 0). */
  hidden?: Joint[];
  /** Hacia dónde mira la persona en la imagen (+1 derecha, −1 izquierda). */
  facing?: 1 | -1;
}

const point = (x: number, y: number, score: number): Keypoint => ({ x, y, score });

/**
 * Construye una pose de perfil con ángulo de rodilla e inclinación de tronco exactos
 * (coordenadas de imagen: y hacia abajo).
 */
export function makePose({
  kneeAngle = 90,
  trunkLean = 35,
  side = 'left',
  score = 0.9,
  hidden = [],
  facing = 1,
}: PoseOptions = {}): BodyPose {
  // Muslo hacia delante y abajo: forma (180 − rodilla)/2 con la vertical hacia abajo,
  // de modo que la tibia quede simétrica hacia atrás.
  const thighFromDown = ((180 - kneeAngle) / 2) * DEG;
  const knee = {
    x: HIP.x + facing * THIGH * Math.sin(thighFromDown),
    y: HIP.y + THIGH * Math.cos(thighFromDown),
  };
  const ankle = {
    x: knee.x - facing * SHIN * Math.sin(thighFromDown),
    y: knee.y + SHIN * Math.cos(thighFromDown),
  };
  const shoulder = {
    x: HIP.x + facing * TRUNK * Math.sin(trunkLean * DEG),
    y: HIP.y - TRUNK * Math.cos(trunkLean * DEG),
  };
  const visible: Record<Joint, Keypoint> = {
    shoulder: point(shoulder.x, shoulder.y, hidden.includes('shoulder') ? 0 : score),
    hip: point(HIP.x, HIP.y, hidden.includes('hip') ? 0 : score),
    knee: point(knee.x, knee.y, hidden.includes('knee') ? 0 : score),
    ankle: point(ankle.x, ankle.y, hidden.includes('ankle') ? 0 : score),
  };
  const occluded: Record<Joint, Keypoint> = {
    shoulder: { ...visible.shoulder, score: 0.05 },
    hip: { ...visible.hip, score: 0.05 },
    knee: { ...visible.knee, score: 0.05 },
    ankle: { ...visible.ankle, score: 0.05 },
  };
  return side === 'left' ? { left: visible, right: occluded } : { left: occluded, right: visible };
}

export const STANDING: SquatMetrics = { kneeAngle: 175, trunkLean: 5 };

/** Genera muestras de métricas a 30 fps desde `fromMs` durante `durationMs`. */
export function* frames(fromMs: number, durationMs: number, metricsAt: (t: number) => SquatMetrics | null) {
  for (let t = fromMs; t < fromMs + durationMs; t += 33) yield { t, metrics: metricsAt(t) };
}

/** Interpolación lineal entre dos posturas. */
export function lerp(from: SquatMetrics, to: SquatMetrics, ratio: number): SquatMetrics {
  const r = Math.min(1, Math.max(0, ratio));
  return {
    kneeAngle: from.kneeAngle + (to.kneeAngle - from.kneeAngle) * r,
    trunkLean: from.trunkLean + (to.trunkLean - from.trunkLean) * r,
  };
}
