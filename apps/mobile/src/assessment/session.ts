import type { AssessmentConfig } from './config';
import { evaluatePosture } from './evaluation';
import { bestSide, computeSquatMetrics, jointVisibility, pickVisibleSide } from './metrics';
import { SquatBottomDetector, type SquatStance } from './squatDetector';
import type { BodyPose, BodySide, Feedback, Joint, PostureReference, SquatMetrics } from './types';

/**
 * - `reference`: el coach hace la sentadilla; se espera una posición inferior estable.
 * - `review`: hay una referencia candidata; el coach la guarda o la repite.
 * - `test`: el usuario hace repeticiones y recibe feedback contra la referencia.
 */
export type SessionPhase = 'reference' | 'review' | 'test';

export interface SessionSnapshot {
  phase: SessionPhase;
  stance: SquatStance;
  /** Lado evaluado (fijado por la referencia en la fase de prueba). */
  side: BodySide | null;
  /** Visibilidad de los puntos requeridos del lado evaluado (o del mejor lado). */
  visibility: Record<Joint, boolean>;
  /** true cuando se perdió la visibilidad por más del margen configurado. */
  visibilityLost: boolean;
  /** Métricas del último fotograma con visibilidad suficiente (diagnóstico). */
  live: SquatMetrics | null;
  candidate: PostureReference | null;
  reference: PostureReference | null;
  /** Indicación vigente; se retira al perder visibilidad o al iniciar otro descenso. */
  feedback: Feedback | null;
  /** Repeticiones evaluadas con la referencia actual. */
  repetitions: number;
  /** Tiempo entre el inicio de la pausa estable y la evaluación de la última repetición. */
  lastEvaluationMs: number | null;
}

const NO_JOINTS: Record<Joint, boolean> = { shoulder: false, hip: false, knee: false, ankle: false };

/**
 * Orquesta la captura de referencia y la evaluación de repeticiones.
 * Lógica pura (sin React Native): recibe poses y marcas de tiempo, y expone
 * una instantánea inmutable del estado para la interfaz.
 */
export class PostureSession {
  private readonly detector: SquatBottomDetector;
  private state: SessionSnapshot = {
    phase: 'reference',
    stance: 'unarmed',
    side: null,
    visibility: NO_JOINTS,
    visibilityLost: false,
    live: null,
    candidate: null,
    reference: null,
    feedback: null,
    repetitions: 0,
    lastEvaluationMs: null,
  };
  /** Lado usado durante la repetición de referencia en curso. */
  private repSide: BodySide | null = null;

  constructor(private config: AssessmentConfig) {
    this.detector = new SquatBottomDetector(config);
  }

  get toleranceDeg(): AssessmentConfig['toleranceDeg'] {
    return this.config.toleranceDeg;
  }

  /** Cambia la tolerancia de evaluación (se aplica a las siguientes repeticiones). */
  setTolerance(toleranceDeg: AssessmentConfig['toleranceDeg']): void {
    this.config = { ...this.config, toleranceDeg };
  }

  get snapshot(): SessionSnapshot {
    return this.state;
  }

  /** Procesa la pose de un fotograma (null si no se detectó a nadie). */
  processPose(pose: BodyPose | null, t: number): SessionSnapshot {
    if (this.state.phase === 'review') return this.state;

    const { minKeypointScore } = this.config;
    const side = pose ? this.sideFor(pose) : null;
    const metrics = pose && side ? computeSquatMetrics(pose, side, minKeypointScore) : null;
    // Para orientar al usuario se muestra la visibilidad del lado evaluado o, si aún
    // no hay ninguno completo, del lado con mejor confianza.
    const visibilitySide = side ?? (pose ? bestSide(pose) : null);
    const visibility = pose && visibilitySide ? jointVisibility(pose, visibilitySide, minKeypointScore) : NO_JOINTS;

    let next: SessionSnapshot = { ...this.state, side, visibility, live: metrics };

    for (const event of this.detector.update(metrics, t)) {
      switch (event.type) {
        case 'visibility-lost':
          next = { ...next, feedback: null, visibilityLost: true };
          if (next.phase === 'reference') this.repSide = null;
          break;
        case 'visibility-restored':
          next = { ...next, visibilityLost: false };
          break;
        case 'armed':
          if (next.phase === 'reference') this.repSide = null;
          break;
        case 'descent-started':
          // La indicación anterior se retira al empezar otra repetición.
          next = { ...next, feedback: null };
          if (next.phase === 'reference') this.repSide = side;
          break;
        case 'bottom': {
          const elapsed = event.atMs - event.stableSinceMs;
          if (next.phase === 'reference' && side) {
            next = { ...next, phase: 'review', candidate: { ...event.metrics, side }, lastEvaluationMs: elapsed };
          } else if (next.phase === 'test' && next.reference) {
            next = {
              ...next,
              feedback: evaluatePosture(next.reference, event.metrics, this.config.toleranceDeg),
              repetitions: next.repetitions + 1,
              lastEvaluationMs: elapsed,
            };
          }
          break;
        }
      }
    }

    this.state = { ...next, stance: this.detector.currentStance, visibilityLost: this.detector.isVisibilityLost };
    return this.state;
  }

  /** Guarda la referencia candidata y pasa a la fase de prueba. */
  confirmReference(): SessionSnapshot {
    if (this.state.phase !== 'review' || !this.state.candidate) return this.state;
    this.detector.reset();
    this.state = {
      ...this.state,
      phase: 'test',
      reference: this.state.candidate,
      candidate: null,
      feedback: null,
      repetitions: 0,
      stance: 'unarmed',
    };
    return this.state;
  }

  /** Descarta la referencia (candidata o guardada) y vuelve a capturarla. */
  retakeReference(): SessionSnapshot {
    this.detector.reset();
    this.repSide = null;
    this.state = {
      ...this.state,
      phase: 'reference',
      candidate: null,
      reference: null,
      feedback: null,
      repetitions: 0,
      stance: 'unarmed',
      lastEvaluationMs: null,
    };
    return this.state;
  }

  private sideFor(pose: BodyPose): BodySide | null {
    if (this.state.phase === 'test') return this.state.reference?.side ?? null;
    // Durante la referencia se mantiene el lado de la repetición en curso.
    return this.repSide ?? pickVisibleSide(pose, this.config.minKeypointScore);
  }
}
