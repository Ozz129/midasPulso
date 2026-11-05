import type { AssessmentConfig } from './config';
import type { SquatMetrics } from './types';

/**
 * Fases de una repetición:
 * - `unarmed`: aún no se vio a la persona de pie (inicio o tras perder visibilidad).
 * - `standing`: de pie; la repetición está armada.
 * - `descending`: bajó por debajo del umbral; se espera una pausa estable.
 * - `holding`: ya se evaluó la posición inferior; se espera volver de pie para rearmar.
 */
export type SquatStance = 'unarmed' | 'standing' | 'descending' | 'holding';

export type DetectorEvent =
  | { type: 'armed' }
  | { type: 'descent-started' }
  /** Posición inferior estable. `stableSinceMs` = inicio de la pausa; `atMs` = momento en que se confirmó. */
  | { type: 'bottom'; metrics: SquatMetrics; stableSinceMs: number; atMs: number }
  | { type: 'visibility-lost' }
  | { type: 'visibility-restored' };

interface Sample extends SquatMetrics {
  t: number;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Desviación absoluta mediana: dispersión robusta frente a saltos aislados del detector. */
export function medianAbsoluteDeviation(values: number[]): number {
  const center = median(values);
  return median(values.map((value) => Math.abs(value - center)));
}

/**
 * Cambio estimado a lo largo de la ventana según la pendiente de Theil-Sen
 * (mediana de las pendientes entre pares de muestras): detecta si el ángulo
 * sigue bajando o subiendo, sin que una lectura atípica la desvíe.
 */
export function robustDrift(samples: { t: number; value: number }[]): number {
  const slopes: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const dt = samples[j]!.t - samples[i]!.t;
      if (dt > 0) slopes.push((samples[j]!.value - samples[i]!.value) / dt);
    }
  }
  if (slopes.length === 0) return 0;
  return median(slopes) * (samples[samples.length - 1]!.t - samples[0]!.t);
}

/**
 * Detecta la llegada a la posición inferior tras un descenso y exige una pausa
 * breve y estable antes de emitir `bottom`. Solo se evalúa una vez por repetición:
 * para la siguiente hay que volver de pie. Lógica pura: se alimenta con muestras
 * (métricas o null si no hay visibilidad) y marcas de tiempo en milisegundos.
 */
export class SquatBottomDetector {
  private stance: SquatStance = 'unarmed';
  private window: Sample[] = [];
  private lostSince: number | null = null;
  private visibilityLost = false;

  constructor(private readonly config: AssessmentConfig) {}

  get currentStance(): SquatStance {
    return this.stance;
  }

  get isVisibilityLost(): boolean {
    return this.visibilityLost;
  }

  reset(): void {
    this.stance = 'unarmed';
    this.window = [];
    this.lostSince = null;
    this.visibilityLost = false;
  }

  update(metrics: SquatMetrics | null, t: number): DetectorEvent[] {
    const events: DetectorEvent[] = [];

    if (metrics === null) {
      // Un fotograma suelto sin puntos no reinicia la pausa: solo se descarta.
      this.lostSince ??= t;
      if (!this.visibilityLost && t - this.lostSince >= this.config.visibilityGraceMs) {
        this.visibilityLost = true;
        this.window = [];
        // Tras perder la visibilidad se exige volver a estar de pie antes de evaluar.
        this.stance = 'unarmed';
        events.push({ type: 'visibility-lost' });
      }
      return events;
    }

    this.lostSince = null;
    if (this.visibilityLost) {
      this.visibilityLost = false;
      events.push({ type: 'visibility-restored' });
    }

    const { standingKneeDeg, descentKneeDeg, stableWindowMs, stableMinSamples, stableSpreadDeg, stableDriftDeg } =
      this.config;

    if (metrics.kneeAngle >= standingKneeDeg) {
      this.window = [];
      if (this.stance !== 'standing') {
        this.stance = 'standing';
        events.push({ type: 'armed' });
      }
      return events;
    }

    if (this.stance === 'standing' && metrics.kneeAngle < descentKneeDeg) {
      this.stance = 'descending';
      this.window = [];
      events.push({ type: 'descent-started' });
    }

    if (this.stance !== 'descending') return events;

    this.window.push({ ...metrics, t });
    // Conserva solo las muestras de la última ventana (más la que la abre).
    while (this.window.length > 1 && t - this.window[1]!.t >= stableWindowMs) this.window.shift();

    const first = this.window[0]!;
    const covered = t - first.t >= stableWindowMs && this.window.length >= stableMinSamples;
    if (!covered) return events;

    const knees = this.window.map((sample) => sample.kneeAngle);
    const trunks = this.window.map((sample) => sample.trunkLean);
    const still =
      medianAbsoluteDeviation(knees) <= stableSpreadDeg.knee &&
      medianAbsoluteDeviation(trunks) <= stableSpreadDeg.trunk &&
      Math.abs(robustDrift(this.window.map(({ t, kneeAngle }) => ({ t, value: kneeAngle })))) <= stableDriftDeg.knee &&
      Math.abs(robustDrift(this.window.map(({ t, trunkLean }) => ({ t, value: trunkLean })))) <= stableDriftDeg.trunk;
    const low = median(knees) < descentKneeDeg;

    if (still && low) {
      this.stance = 'holding';
      events.push({
        type: 'bottom',
        // La mediana descarta las lecturas atípicas del detector.
        metrics: { kneeAngle: median(knees), trunkLean: median(trunks) },
        stableSinceMs: first.t,
        atMs: t,
      });
      this.window = [];
    }
    return events;
  }
}
