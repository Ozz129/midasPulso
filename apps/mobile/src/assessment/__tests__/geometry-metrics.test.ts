import { describe, expect, it } from 'vitest';
import { angleAt, inclinationFromVertical } from '../geometry';
import { computeSquatMetrics, jointVisibility, pickVisibleSide } from '../metrics';
import { makePose } from './fixtures';

describe('geometría', () => {
  it('calcula el ángulo interior en el vértice', () => {
    expect(angleAt({ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90);
    expect(angleAt({ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(180);
    expect(angleAt({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(45);
  });

  it('devuelve NaN con segmentos de longitud cero', () => {
    expect(angleAt({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNaN();
  });

  it('mide la inclinación respecto a la vertical con y hacia abajo', () => {
    const hip = { x: 0, y: 0 };
    expect(inclinationFromVertical(hip, { x: 0, y: -1 })).toBeCloseTo(0);
    expect(inclinationFromVertical(hip, { x: 1, y: -1 })).toBeCloseTo(45);
    expect(inclinationFromVertical(hip, { x: 1, y: 0 })).toBeCloseTo(90);
  });

  it('la inclinación no depende de hacia qué lado mira la persona (ni del espejado)', () => {
    const hip = { x: 0, y: 0 };
    expect(inclinationFromVertical(hip, { x: -0.5, y: -1 })).toBeCloseTo(inclinationFromVertical(hip, { x: 0.5, y: -1 }));
  });
});

describe('métricas de sentadilla', () => {
  it.each([
    { kneeAngle: 90, trunkLean: 35 },
    { kneeAngle: 120, trunkLean: 20 },
    { kneeAngle: 70, trunkLean: 50 },
  ])('recupera rodilla $kneeAngle° y tronco $trunkLean° de puntos conocidos', (expected) => {
    for (const facing of [1, -1] as const) {
      const metrics = computeSquatMetrics(makePose({ ...expected, facing }), 'left', 0.3);
      expect(metrics?.kneeAngle).toBeCloseTo(expected.kneeAngle, 6);
      expect(metrics?.trunkLean).toBeCloseTo(expected.trunkLean, 6);
    }
  });

  it('devuelve null si falta cualquier punto requerido', () => {
    for (const hidden of ['shoulder', 'hip', 'knee', 'ankle'] as const) {
      expect(computeSquatMetrics(makePose({ hidden: [hidden] }), 'left', 0.3)).toBeNull();
    }
  });

  it('informa qué puntos son visibles', () => {
    expect(jointVisibility(makePose({ hidden: ['ankle'] }), 'left', 0.3)).toEqual({
      shoulder: true,
      hip: true,
      knee: true,
      ankle: false,
    });
  });

  it('elige el lado visible del perfil', () => {
    expect(pickVisibleSide(makePose({ side: 'right' }), 0.3)).toBe('right');
    expect(pickVisibleSide(makePose({ side: 'left' }), 0.3)).toBe('left');
    expect(pickVisibleSide(makePose({ score: 0.2 }), 0.3)).toBeNull();
  });
});
