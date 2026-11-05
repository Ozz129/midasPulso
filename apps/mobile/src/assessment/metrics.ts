import { angleAt, inclinationFromVertical } from './geometry';
import { JOINTS, type BodyPose, type BodySide, type Joint, type SquatMetrics } from './types';

/** Puntos requeridos visibles (confianza ≥ minScore) para un lado. */
export function jointVisibility(pose: BodyPose, side: BodySide, minScore: number): Record<Joint, boolean> {
  const joints = pose[side];
  return {
    shoulder: joints.shoulder.score >= minScore,
    hip: joints.hip.score >= minScore,
    knee: joints.knee.score >= minScore,
    ankle: joints.ankle.score >= minScore,
  };
}

function minScore(pose: BodyPose, side: BodySide): number {
  return Math.min(...JOINTS.map((joint) => pose[side][joint].score));
}

/** Lado con mayor confianza mínima en sus puntos requeridos (sin umbral). */
export function bestSide(pose: BodyPose): BodySide {
  return minScore(pose, 'left') >= minScore(pose, 'right') ? 'left' : 'right';
}

/**
 * Lado del cuerpo con todos los puntos requeridos visibles. Si ambos lo están
 * (por ejemplo, de frente), elige el de mayor confianza mínima.
 */
export function pickVisibleSide(pose: BodyPose, minKeypointScore: number): BodySide | null {
  const side = bestSide(pose);
  return minScore(pose, side) >= minKeypointScore ? side : null;
}

/**
 * Ángulo de rodilla (cadera–rodilla–tobillo) e inclinación del tronco
 * (cadera→hombro respecto a la vertical) del lado indicado.
 * Devuelve null si algún punto requerido no es visible.
 */
export function computeSquatMetrics(pose: BodyPose, side: BodySide, minKeypointScore: number): SquatMetrics | null {
  const { shoulder, hip, knee, ankle } = pose[side];
  if ([shoulder, hip, knee, ankle].some((point) => point.score < minKeypointScore)) return null;
  const kneeAngle = angleAt(hip, knee, ankle);
  const trunkLean = inclinationFromVertical(hip, shoulder);
  if (!Number.isFinite(kneeAngle) || !Number.isFinite(trunkLean)) return null;
  return { kneeAngle, trunkLean };
}
