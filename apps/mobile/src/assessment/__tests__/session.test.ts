import { describe, expect, it } from 'vitest';
import { withConfig } from '../config';
import { DEVIATION_MESSAGES, WITHIN_TARGET_MESSAGE } from '../evaluation';
import { PostureSession } from '../session';
import type { BodyPose, SquatMetrics } from '../types';
import { lerp, makePose, STANDING, type PoseOptions } from './fixtures';

/** Simula una repetición completa: de pie, bajada y pausa abajo. Devuelve el tiempo final. */
function repetition(session: PostureSession, from: number, bottom: SquatMetrics, options: PoseOptions = {}) {
  let t = from;
  const feed = (metrics: SquatMetrics) => session.processPose(makePose({ ...metrics, ...options }), t);
  for (; t < from + 500; t += 33) feed(STANDING);
  for (; t < from + 1300; t += 33) feed(lerp(STANDING, bottom, (t - from - 500) / 800));
  for (; t < from + 2200; t += 33) feed(bottom);
  return t;
}

function standUp(session: PostureSession, from: number, options: PoseOptions = {}) {
  let t = from;
  for (; t < from + 400; t += 33) session.processPose(makePose({ ...STANDING, ...options }), t);
  return t;
}

const REFERENCE = { kneeAngle: 90, trunkLean: 35 };

function sessionWithReference() {
  const session = new PostureSession(withConfig());
  const t = repetition(session, 0, REFERENCE, { side: 'left' });
  expect(session.snapshot.phase).toBe('review');
  session.confirmReference();
  return { session, t: standUp(session, t, { side: 'left' }) };
}

describe('sesión de captura y evaluación', () => {
  it('captura la referencia en la pausa inferior y permite guardarla', () => {
    const session = new PostureSession(withConfig());
    repetition(session, 0, REFERENCE, { side: 'left' });
    const { phase, candidate } = session.snapshot;
    expect(phase).toBe('review');
    expect(candidate?.side).toBe('left');
    expect(candidate?.kneeAngle).toBeCloseTo(90, 0);
    expect(candidate?.trunkLean).toBeCloseTo(35, 0);

    session.confirmReference();
    expect(session.snapshot).toMatchObject({ phase: 'test', candidate: null, reference: { side: 'left' } });
  });

  it('permite repetir la captura de la referencia', () => {
    const session = new PostureSession(withConfig());
    let t = repetition(session, 0, { kneeAngle: 120, trunkLean: 20 });
    session.retakeReference();
    expect(session.snapshot).toMatchObject({ phase: 'reference', candidate: null });
    t = standUp(session, t);
    repetition(session, t, REFERENCE);
    expect(session.snapshot.candidate?.kneeAngle).toBeCloseTo(90, 0);
  });

  it('en revisión ignora los fotogramas (la referencia candidata no cambia)', () => {
    const session = new PostureSession(withConfig());
    const t = repetition(session, 0, REFERENCE);
    const candidate = session.snapshot.candidate;
    repetition(session, t, { kneeAngle: 60, trunkLean: 60 });
    expect(session.snapshot.candidate).toBe(candidate);
  });

  it('muestra «Postura dentro del objetivo» dentro de ±15°', () => {
    const { session, t } = sessionWithReference();
    repetition(session, t, { kneeAngle: 100, trunkLean: 30 });
    expect(session.snapshot.feedback).toEqual({ kind: 'within', message: WITHIN_TARGET_MESSAGE });
    expect(session.snapshot.repetitions).toBe(1);
    expect(session.snapshot.lastEvaluationMs).toBeLessThan(1000);
  });

  it.each([
    [{ kneeAngle: 120, trunkLean: 35 }, 'too-shallow'],
    [{ kneeAngle: 60, trunkLean: 35 }, 'too-deep'],
    [{ kneeAngle: 90, trunkLean: 60 }, 'too-forward'],
    [{ kneeAngle: 90, trunkLean: 10 }, 'too-upright'],
  ] as const)('da una sola indicación para %o (%s)', (bottom, direction) => {
    const { session, t } = sessionWithReference();
    repetition(session, t, bottom);
    expect(session.snapshot.feedback).toMatchObject({ direction, message: DEVIATION_MESSAGES[direction] });
  });

  it('retira el resultado al perder visibilidad y pide ajustar la posición', () => {
    const { session, t: start } = sessionWithReference();
    let t = repetition(session, start, REFERENCE);
    expect(session.snapshot.feedback?.kind).toBe('within');
    for (const end = t + 400; t < end; t += 33) session.processPose(makePose({ ...REFERENCE, hidden: ['ankle'] }), t);
    expect(session.snapshot.feedback).toBeNull();
    expect(session.snapshot.visibilityLost).toBe(true);
    expect(session.snapshot.visibility.ankle).toBe(false);
  });

  it('sin persona detectada también retira el feedback', () => {
    const { session, t: start } = sessionWithReference();
    let t = repetition(session, start, REFERENCE);
    for (const end = t + 400; t < end; t += 33) session.processPose(null as BodyPose | null, t);
    expect(session.snapshot).toMatchObject({ feedback: null, visibilityLost: true });
  });

  it('exige el mismo lado que la referencia', () => {
    const { session, t } = sessionWithReference(); // referencia con el lado izquierdo
    repetition(session, t, REFERENCE, { side: 'right' });
    expect(session.snapshot).toMatchObject({ feedback: null, visibilityLost: true, side: 'left' });
  });

  it('aplica una tolerancia cambiada durante la sesión', () => {
    const { session, t } = sessionWithReference();
    session.setTolerance({ knee: 5, trunk: 5 });
    repetition(session, t, { kneeAngle: 100, trunkLean: 35 }); // +10° de rodilla
    expect(session.snapshot.feedback).toMatchObject({ direction: 'too-shallow' });
  });

  it('se rearma para la siguiente repetición con la misma referencia', () => {
    const { session, t: start } = sessionWithReference();
    let t = repetition(session, start, { kneeAngle: 120, trunkLean: 35 });
    expect(session.snapshot.feedback).toMatchObject({ direction: 'too-shallow' });
    t = standUp(session, t);
    expect(session.snapshot.stance).toBe('standing');
    // La indicación previa sigue visible de pie y se retira al iniciar el siguiente descenso.
    expect(session.snapshot.feedback).not.toBeNull();
    repetition(session, t, { kneeAngle: 95, trunkLean: 33 });
    expect(session.snapshot.feedback?.kind).toBe('within');
    expect(session.snapshot.repetitions).toBe(2);
  });
});
