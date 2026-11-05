import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSESSMENT_CONFIG } from '../config';
import { DEVIATION_MESSAGES, evaluatePosture, WITHIN_TARGET_MESSAGE } from '../evaluation';
import type { PostureReference } from '../types';

const reference: PostureReference = { side: 'left', kneeAngle: 90, trunkLean: 35 };
const tolerance = DEFAULT_ASSESSMENT_CONFIG.toleranceDeg;

describe('evaluación contra la referencia (±15°)', () => {
  it('dentro del objetivo cuando ambos ángulos están en tolerancia', () => {
    expect(evaluatePosture(reference, { kneeAngle: 100, trunkLean: 28 }, tolerance)).toEqual({
      kind: 'within',
      message: WITHIN_TARGET_MESSAGE,
    });
  });

  it('el límite exacto de ±15° cuenta como dentro', () => {
    expect(evaluatePosture(reference, { kneeAngle: 105, trunkLean: 20 }, tolerance).kind).toBe('within');
    expect(evaluatePosture(reference, { kneeAngle: 75, trunkLean: 50 }, tolerance).kind).toBe('within');
  });

  it.each([
    { current: { kneeAngle: 115, trunkLean: 35 }, metric: 'knee', direction: 'too-shallow', delta: 25 },
    { current: { kneeAngle: 65, trunkLean: 35 }, metric: 'knee', direction: 'too-deep', delta: -25 },
    { current: { kneeAngle: 90, trunkLean: 58 }, metric: 'trunk', direction: 'too-forward', delta: 23 },
    { current: { kneeAngle: 90, trunkLean: 12 }, metric: 'trunk', direction: 'too-upright', delta: -23 },
  ] as const)('desviación $metric en sentido $direction', ({ current, metric, direction, delta }) => {
    const feedback = evaluatePosture(reference, current, tolerance);
    expect(feedback).toMatchObject({ kind: 'deviation', metric, direction, message: DEVIATION_MESSAGES[direction] });
    if (feedback.kind === 'deviation') {
      expect(feedback.deltaDeg).toBeCloseTo(delta);
      expect(feedback.excessDeg).toBeCloseTo(Math.abs(delta) - 15);
    }
  });

  it('con dos desviaciones prioriza la que más excede su tolerancia', () => {
    // Rodilla +20 (excede 5) y tronco +30 (excede 15) → tronco.
    expect(evaluatePosture(reference, { kneeAngle: 110, trunkLean: 65 }, tolerance)).toMatchObject({
      metric: 'trunk',
      direction: 'too-forward',
    });
    // Rodilla −35 (excede 20) y tronco −18 (excede 3) → rodilla.
    expect(evaluatePosture(reference, { kneeAngle: 55, trunkLean: 17 }, tolerance)).toMatchObject({
      metric: 'knee',
      direction: 'too-deep',
    });
  });

  it('en empate exacto prioriza la rodilla', () => {
    expect(evaluatePosture(reference, { kneeAngle: 110, trunkLean: 55 }, tolerance)).toMatchObject({ metric: 'knee' });
  });

  it('respeta una tolerancia configurada distinta', () => {
    const strict = { knee: 5, trunk: 5 };
    expect(evaluatePosture(reference, { kneeAngle: 100, trunkLean: 35 }, strict)).toMatchObject({
      direction: 'too-shallow',
    });
  });
});
