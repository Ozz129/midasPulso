import { describe, expect, it } from 'vitest';
import type { SessionSnapshot } from '../../assessment';
import { makePose } from '../../assessment/__tests__/fixtures';
import { jointScores, sessionEvents } from '../sessionEvents';

const base: SessionSnapshot = {
  phase: 'reference',
  stance: 'standing',
  side: 'left',
  visibility: { shoulder: true, hip: true, knee: true, ankle: true },
  visibilityLost: false,
  live: null,
  candidate: null,
  reference: null,
  feedback: null,
  repetitions: 0,
  lastEvaluationMs: null,
};

describe('eventos para el monitor', () => {
  it('sin cambios no emite nada', () => {
    expect(sessionEvents(base, { ...base })).toEqual([]);
  });

  it('informa captura de referencia y cambio de fase', () => {
    const next: SessionSnapshot = {
      ...base,
      phase: 'review',
      stance: 'holding',
      candidate: { side: 'left', kneeAngle: 91.6, trunkLean: 34.2 },
    };
    const texts = sessionEvents(base, next).map((event) => event.text);
    expect(texts).toContain('Fase → 1 Referencia (revisión)');
    expect(texts).toContain('Referencia capturada: rodilla 92°, tronco 34°, lado izquierdo');
  });

  it('informa pérdida de visibilidad como advertencia', () => {
    expect(sessionEvents(base, { ...base, visibilityLost: true })).toContainEqual({
      level: 'warn',
      text: 'Visibilidad perdida: se retira el feedback',
    });
  });

  it('informa cada repetición evaluada con su indicación', () => {
    const next: SessionSnapshot = {
      ...base,
      phase: 'test',
      repetitions: 1,
      feedback: {
        kind: 'deviation',
        metric: 'knee',
        direction: 'too-shallow',
        deltaDeg: 22.4,
        excessDeg: 7.4,
        message: 'Baja más: flexiona más las rodillas',
      },
    };
    expect(sessionEvents({ ...base, phase: 'test' }, next)).toContainEqual({
      level: 'warn',
      text: 'Repetición 1: «Baja más: flexiona más las rodillas» (rodilla +22°)',
    });
  });

  it('resume la confianza de los puntos de ambos lados', () => {
    const scores = jointScores(makePose({ score: 0.876 }));
    expect(scores.left.knee).toBe(0.88);
    expect(scores.right.knee).toBe(0.05);
    expect(jointScores(null).left.hip).toBe(0);
  });
});
