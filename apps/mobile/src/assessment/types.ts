/**
 * Tipos del dominio de evaluación postural. Este módulo no depende de React
 * Native: se puede reutilizar en web o en el servidor.
 */

/** Punto 2D en un sistema con x hacia la derecha e y hacia abajo (imagen). */
export interface Point {
  x: number;
  y: number;
}

export interface Keypoint extends Point {
  /** Confianza del detector, 0–1. */
  score: number;
}

export type BodySide = 'left' | 'right';
export type Joint = 'shoulder' | 'hip' | 'knee' | 'ankle';
export const JOINTS: readonly Joint[] = ['shoulder', 'hip', 'knee', 'ankle'];

/** Puntos corporales necesarios para la sentadilla, por lado del cuerpo. */
export type BodyPose = Record<BodySide, Record<Joint, Keypoint>>;

export interface SquatMetrics {
  /** Ángulo interior de rodilla (cadera–rodilla–tobillo). 180° = pierna extendida. */
  kneeAngle: number;
  /** Inclinación del tronco (cadera→hombro) respecto a la vertical. 0° = erguido. */
  trunkLean: number;
}

export interface PostureReference extends SquatMetrics {
  /** Lado del cuerpo visible durante la captura; el usuario debe mostrar el mismo. */
  side: BodySide;
}

export type Metric = 'knee' | 'trunk';

export type DeviationDirection =
  /** Rodilla menos flexionada que la referencia: falta profundidad. */
  | 'too-shallow'
  /** Rodilla más flexionada que la referencia: baja de más. */
  | 'too-deep'
  /** Tronco más inclinado que la referencia. */
  | 'too-forward'
  /** Tronco más vertical que la referencia. */
  | 'too-upright';

export type Feedback =
  | { kind: 'within'; message: string }
  | {
      kind: 'deviation';
      metric: Metric;
      direction: DeviationDirection;
      /** Diferencia con signo respecto a la referencia (actual − referencia), en grados. */
      deltaDeg: number;
      /** Grados por fuera de la tolerancia. */
      excessDeg: number;
      message: string;
    };
