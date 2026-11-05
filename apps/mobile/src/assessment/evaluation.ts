import type { AssessmentConfig } from './config';
import type { DeviationDirection, Feedback, Metric, PostureReference, SquatMetrics } from './types';

export const WITHIN_TARGET_MESSAGE = 'Postura dentro del objetivo';

export const DEVIATION_MESSAGES: Record<DeviationDirection, string> = {
  'too-shallow': 'Baja más: flexiona más las rodillas',
  'too-deep': 'No bajes tanto: sube un poco la cadera',
  'too-forward': 'Endereza el tronco: te estás inclinando de más',
  'too-upright': 'Inclina un poco más el tronco hacia delante',
};

interface Deviation {
  metric: Metric;
  direction: DeviationDirection;
  deltaDeg: number;
  excessDeg: number;
}

function deviationFor(
  metric: Metric,
  current: number,
  reference: number,
  tolerance: number,
): Deviation | null {
  const deltaDeg = current - reference;
  const excessDeg = Math.abs(deltaDeg) - tolerance;
  if (excessDeg <= 0) return null;
  const direction: DeviationDirection =
    metric === 'knee'
      ? deltaDeg > 0
        ? 'too-shallow' // ángulo mayor = rodilla más extendida
        : 'too-deep'
      : deltaDeg > 0
        ? 'too-forward' // más lejos de la vertical
        : 'too-upright';
  return { metric, direction, deltaDeg, excessDeg };
}

/**
 * Compara la posición inferior con la referencia y devuelve una sola indicación:
 * dentro del objetivo, o la desviación que más excede su tolerancia.
 * En empate exacto se prioriza la rodilla.
 */
export function evaluatePosture(
  reference: PostureReference,
  current: SquatMetrics,
  tolerance: AssessmentConfig['toleranceDeg'],
): Feedback {
  const deviations = [
    deviationFor('knee', current.kneeAngle, reference.kneeAngle, tolerance.knee),
    deviationFor('trunk', current.trunkLean, reference.trunkLean, tolerance.trunk),
  ].filter((deviation): deviation is Deviation => deviation !== null);

  if (deviations.length === 0) return { kind: 'within', message: WITHIN_TARGET_MESSAGE };

  const main = deviations.reduce((worst, next) => (next.excessDeg > worst.excessDeg ? next : worst));
  return { kind: 'deviation', ...main, message: DEVIATION_MESSAGES[main.direction] };
}
