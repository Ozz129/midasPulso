import { describe, expect, it } from 'vitest';
import { withConfig } from '../config';
import { SquatBottomDetector, type DetectorEvent } from '../squatDetector';
import type { SquatMetrics } from '../types';
import { frames, lerp, STANDING } from './fixtures';

const BOTTOM: SquatMetrics = { kneeAngle: 90, trunkLean: 35 };

function run(detector: SquatBottomDetector, from: number, duration: number, at: (t: number) => SquatMetrics | null) {
  const events: (DetectorEvent & { t: number })[] = [];
  for (const { t, metrics } of frames(from, duration, at)) {
    for (const event of detector.update(metrics, t)) events.push({ ...event, t });
  }
  return events;
}

const types = (events: { type: string }[]) => events.map((event) => event.type);

/** De pie 500 ms, baja en 800 ms y mantiene la posición inferior. */
const squat = (from: number) => (t: number) => {
  const elapsed = t - from;
  if (elapsed < 500) return STANDING;
  return lerp(STANDING, BOTTOM, (elapsed - 500) / 800);
};

describe('detector de posición inferior', () => {
  it('evalúa una sola vez tras descenso y pausa estable', () => {
    const detector = new SquatBottomDetector(withConfig());
    const events = run(detector, 0, 3000, squat(0));
    expect(types(events)).toEqual(['armed', 'descent-started', 'bottom']);
    const bottom = events.find((event) => event.type === 'bottom');
    if (bottom?.type !== 'bottom') throw new Error('sin evento bottom');
    expect(bottom.metrics.kneeAngle).toBeCloseTo(90, 0);
    expect(bottom.metrics.trunkLean).toBeCloseTo(35, 0);
    // Llega abajo a 1300 ms; se confirma dentro del segundo siguiente (ventana de 700 ms).
    expect(bottom.t).toBeGreaterThan(1300);
    expect(bottom.t).toBeLessThan(1300 + 1000);
    expect(bottom.atMs - bottom.stableSinceMs).toBeLessThan(1000);
  });

  it('no evalúa mientras la persona está de pie aunque esté quieta', () => {
    const detector = new SquatBottomDetector(withConfig());
    expect(types(run(detector, 0, 3000, () => STANDING))).toEqual(['armed']);
  });

  it('no evalúa durante la bajada (movimiento continuo)', () => {
    const detector = new SquatBottomDetector(withConfig());
    // Baja lentamente durante 2,5 s sin pausa: ~34°/s, nunca estable.
    const slow = (t: number) => (t < 300 ? STANDING : lerp(STANDING, { kneeAngle: 90, trunkLean: 35 }, (t - 300) / 2500));
    expect(types(run(detector, 0, 2700, slow))).toEqual(['armed', 'descent-started']);
  });

  it('no evalúa si empieza agachado sin haberse puesto de pie', () => {
    const detector = new SquatBottomDetector(withConfig());
    expect(run(detector, 0, 2000, () => BOTTOM)).toEqual([]);
  });

  it('no vuelve a evaluar mientras se mantiene abajo', () => {
    const detector = new SquatBottomDetector(withConfig());
    const events = run(detector, 0, 6000, squat(0));
    expect(types(events).filter((type) => type === 'bottom')).toHaveLength(1);
    expect(detector.currentStance).toBe('holding');
  });

  it('se rearma al volver de pie y evalúa la siguiente repetición', () => {
    const detector = new SquatBottomDetector(withConfig());
    run(detector, 0, 2500, squat(0));
    const second = run(detector, 2500, 3000, squat(2500));
    expect(types(second)).toEqual(['armed', 'descent-started', 'bottom']);
  });

  it('pierde visibilidad tras el margen configurado y exige volver de pie', () => {
    const detector = new SquatBottomDetector(withConfig({ visibilityGraceMs: 300 }));
    run(detector, 0, 1000, squat(0)); // de pie y bajando
    const lost = run(detector, 1000, 500, () => null);
    expect(types(lost)).toEqual(['visibility-lost']);
    expect(lost[0]!.t - 1000).toBeGreaterThanOrEqual(300);
    expect(detector.currentStance).toBe('unarmed');
    // Reaparece agachado: no evalúa hasta ponerse de pie otra vez.
    const back = run(detector, 1500, 1500, () => BOTTOM);
    expect(types(back)).toEqual(['visibility-restored']);
    expect(types(run(detector, 3000, 3000, squat(3000)))).toEqual(['armed', 'descent-started', 'bottom']);
  });

  it('un parpadeo más corto que el margen no retira la visibilidad', () => {
    const detector = new SquatBottomDetector(withConfig({ visibilityGraceMs: 300 }));
    run(detector, 0, 600, () => STANDING);
    expect(run(detector, 600, 150, () => null)).toEqual([]);
    expect(detector.isVisibilityLost).toBe(false);
  });

  it('una pausa a media altura por encima del umbral de descenso no se evalúa', () => {
    const detector = new SquatBottomDetector(withConfig());
    const half = (t: number) => (t < 500 ? STANDING : lerp(STANDING, { kneeAngle: 150, trunkLean: 15 }, (t - 500) / 400));
    expect(types(run(detector, 0, 3000, half))).toEqual(['armed']);
  });
});

/** Generador pseudoaleatorio determinista (mulberry32) para reproducir el ruido. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ruido como el medido en una Galaxy Tab Active3 con MoveNet (~12 fps): quieto abajo,
 * rodilla ±5° típicos con saltos de hasta ±15°, tronco ±3,5° con saltos de ±9°,
 * y algún fotograma suelto sin puntos.
 */
function noisy(seed: number, dropEvery = 0) {
  const random = rng(seed);
  let frame = 0;
  return (metrics: SquatMetrics): SquatMetrics | null => {
    frame++;
    if (dropEvery && frame % dropEvery === 0) return null;
    const jump = random() < 0.15; // ~15 % de lecturas atípicas
    const knee = (random() - 0.5) * (jump ? 30 : 10);
    const trunk = (random() - 0.5) * (jump ? 18 : 7);
    return { kneeAngle: metrics.kneeAngle + knee, trunkLean: metrics.trunkLean + trunk };
  };
}

describe('detector con ruido real del dispositivo', () => {
  const REAL_BOTTOM: SquatMetrics = { kneeAngle: 104, trunkLean: 32 };
  const at12fps = function* (from: number, duration: number) {
    for (let t = from; t < from + duration; t += 83) yield t;
  };

  it.each([1, 2, 3, 4, 5])('captura la pausa pese al temblor y a fotogramas perdidos (semilla %i)', (seed) => {
    const detector = new SquatBottomDetector(withConfig());
    const noise = noisy(seed, 9);
    const events: DetectorEvent[] = [];
    for (const t of at12fps(0, 4000)) {
      const ideal = t < 500 ? STANDING : lerp(STANDING, REAL_BOTTOM, (t - 500) / 900);
      events.push(...detector.update(t < 500 ? ideal : noise(ideal), t));
    }
    const bottom = events.find((event) => event.type === 'bottom');
    expect(bottom?.type).toBe('bottom');
    if (bottom?.type !== 'bottom') return;
    // Meta del PoC: confirmar en < 1 s desde que la posición se estabiliza
    // (y, con este ruido, a menos de 1,5 s de haber llegado abajo a 1400 ms).
    expect(bottom.atMs - bottom.stableSinceMs).toBeLessThan(1000);
    expect(bottom.atMs).toBeLessThan(1400 + 1500);
    expect(Math.abs(bottom.metrics.kneeAngle - 104)).toBeLessThanOrEqual(6);
    expect(Math.abs(bottom.metrics.trunkLean - 32)).toBeLessThanOrEqual(5);
    expect(types(events)).not.toContain('visibility-lost');
  });

  it.each([1, 2, 3])('no captura durante una bajada lenta con ruido (semilla %i)', (seed) => {
    const detector = new SquatBottomDetector(withConfig());
    const noise = noisy(seed);
    const types: string[] = [];
    // Baja de 175° a 70° en 3 s sin pausa (~35°/s), con temblor.
    for (const t of at12fps(0, 3300)) {
      const ideal = t < 300 ? STANDING : lerp(STANDING, { kneeAngle: 70, trunkLean: 40 }, (t - 300) / 3000);
      for (const event of detector.update(t < 300 ? ideal : noise(ideal), t)) types.push(event.type);
    }
    expect(types).not.toContain('bottom');
  });
});
