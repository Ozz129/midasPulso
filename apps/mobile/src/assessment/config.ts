/** Parámetros configurables de la evaluación. Valores iniciales del PoC. */

export interface AssessmentConfig {
  /** Tolerancia por ángulo respecto a la referencia, en grados (±). */
  toleranceDeg: { knee: number; trunk: number };
  /** Confianza mínima de cada punto corporal para considerarlo visible (0–1). */
  minKeypointScore: number;
  /** Rodilla a partir de la cual la persona está de pie (rearma la repetición). */
  standingKneeDeg: number;
  /** Rodilla por debajo de la cual se considera que bajó (descenso / zona inferior). */
  descentKneeDeg: number;
  /** Duración de la pausa exigida en la posición inferior. */
  stableWindowMs: number;
  /** Muestras mínimas dentro de la ventana para poder juzgar la pausa. */
  stableMinSamples: number;
  /**
   * Dispersión máxima de cada ángulo en la ventana (desviación absoluta mediana).
   * Robusta frente al temblor del detector: un salto aislado no rompe la pausa.
   */
  stableSpreadDeg: { knee: number; trunk: number };
  /** Diferencia máxima entre las medianas de la 1.ª y la 2.ª mitad de la ventana (descarta que siga bajando). */
  stableDriftDeg: { knee: number; trunk: number };
  /** Tiempo continuo sin puntos visibles antes de retirar el feedback (filtra parpadeos). */
  visibilityGraceMs: number;
}

/**
 * Calibrado con lecturas reales de MoveNet Lightning en una Galaxy Tab Active3
 * (~12 fps): quieto abajo, la rodilla oscila ±5° típicos (saltos de hasta ±15°)
 * y el tronco ±3,5°; al bajar, la dispersión supera 15° y la tendencia es clara.
 */
export const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = {
  toleranceDeg: { knee: 15, trunk: 15 },
  minKeypointScore: 0.3,
  standingKneeDeg: 160,
  descentKneeDeg: 145,
  stableWindowMs: 700,
  stableMinSamples: 5,
  stableSpreadDeg: { knee: 8, trunk: 6 },
  stableDriftDeg: { knee: 8, trunk: 7 },
  visibilityGraceMs: 300,
};

export function withConfig(overrides: Partial<AssessmentConfig> = {}): AssessmentConfig {
  return {
    ...DEFAULT_ASSESSMENT_CONFIG,
    ...overrides,
    toleranceDeg: { ...DEFAULT_ASSESSMENT_CONFIG.toleranceDeg, ...overrides.toleranceDeg },
    stableSpreadDeg: { ...DEFAULT_ASSESSMENT_CONFIG.stableSpreadDeg, ...overrides.stableSpreadDeg },
    stableDriftDeg: { ...DEFAULT_ASSESSMENT_CONFIG.stableDriftDeg, ...overrides.stableDriftDeg },
  };
}
