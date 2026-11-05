import { useCallback, useMemo, useRef, useState } from 'react';
import { DEFAULT_ASSESSMENT_CONFIG, PostureSession, type SessionSnapshot } from '../assessment';
import type { PoseSample } from '../pose/usePoseDetection';
import { emitTelemetry } from '../telemetry';
import { jointScores, sessionEvents } from './sessionEvents';

export interface PipelineStats {
  /** Fotogramas analizados por segundo (media móvil). */
  fps: number;
  /** Redimensionado + inferencia del último fotograma, en ms. */
  inferenceMs: number;
  /** Desde que empezó la pausa estable hasta mostrar la indicación (última repetición). */
  responseMs: number | null;
  orientation: string;
}

const INITIAL_STATS: PipelineStats = { fps: 0, inferenceMs: 0, responseMs: null, orientation: '—' };
const FRAME_TELEMETRY_INTERVAL_MS = 250;

/**
 * Conecta la detección de pose con la sesión de evaluación (lógica pura).
 * La referencia vive solo en memoria durante la sesión.
 */
export function usePostureSession(getDroppedFrames: () => number = () => 0) {
  const session = useMemo(() => new PostureSession({ ...DEFAULT_ASSESSMENT_CONFIG }), []);
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(session.snapshot);
  const [tolerance, setToleranceState] = useState(session.toleranceDeg.knee);
  const [stats, setStats] = useState<PipelineStats>(INITIAL_STATS);
  const frameTimes = useRef<number[]>([]);
  const lastFrameTelemetry = useRef(0);
  const responseRef = useRef<number | null>(null);

  const publish = useCallback((previous: SessionSnapshot, next: SessionSnapshot) => {
    for (const event of sessionEvents(previous, next)) emitTelemetry('event', { ...event });
  }, []);

  const onSample = useCallback(
    (sample: PoseSample) => {
      const previous = session.snapshot;
      const next = session.processPose(sample.pose, sample.capturedAt);

      const now = Date.now();
      const times = frameTimes.current;
      times.push(now);
      while (times.length > 0 && now - times[0]! > 1000) times.shift();

      const evaluated =
        next.repetitions !== previous.repetitions || (next.candidate !== null && previous.candidate === null);
      if (evaluated && next.lastEvaluationMs !== null) {
        // Pausa estable exigida + tiempo desde la captura del fotograma hasta este punto.
        responseRef.current = next.lastEvaluationMs + (now - sample.capturedAt);
        emitTelemetry('event', { level: 'info', text: `Tiempo de respuesta: ${responseRef.current} ms` });
      }
      setStats({
        fps: times.length,
        inferenceMs: sample.inferenceMs,
        orientation: sample.orientation,
        responseMs: responseRef.current,
      });
      if (next !== previous) {
        publish(previous, next);
        setSnapshot(next);
      }

      if (now - lastFrameTelemetry.current >= FRAME_TELEMETRY_INTERVAL_MS) {
        lastFrameTelemetry.current = now;
        emitTelemetry('frame', {
          fps: times.length,
          inferenceMs: sample.inferenceMs,
          pipelineMs: now - sample.capturedAt,
          dropped: getDroppedFrames(),
          orientation: sample.orientation,
          personDetected: sample.pose !== null,
          scores: jointScores(sample.pose),
          phase: next.phase,
          stance: next.stance,
          side: next.side,
          visibilityLost: next.visibilityLost,
          live: next.live && { knee: Math.round(next.live.kneeAngle), trunk: Math.round(next.live.trunkLean) },
          reference: next.reference && {
            knee: Math.round(next.reference.kneeAngle),
            trunk: Math.round(next.reference.trunkLean),
            side: next.reference.side,
          },
          candidate: next.candidate && {
            knee: Math.round(next.candidate.kneeAngle),
            trunk: Math.round(next.candidate.trunkLean),
          },
          feedback: next.feedback?.message ?? null,
          repetitions: next.repetitions,
          responseMs: responseRef.current,
          tolerance: session.toleranceDeg.knee,
        });
      }
    },
    [session, publish, getDroppedFrames],
  );

  const confirmReference = useCallback(() => {
    const previous = session.snapshot;
    const next = session.confirmReference();
    publish(previous, next);
    setSnapshot(next);
  }, [session, publish]);

  const retakeReference = useCallback(() => {
    const previous = session.snapshot;
    responseRef.current = null;
    setStats((current) => ({ ...current, responseMs: null }));
    const next = session.retakeReference();
    publish(previous, next);
    setSnapshot(next);
  }, [session, publish]);

  const setTolerance = useCallback(
    (degrees: number) => {
      const value = Math.min(30, Math.max(5, degrees));
      session.setTolerance({ knee: value, trunk: value });
      setToleranceState(value);
      emitTelemetry('event', { level: 'info', text: `Tolerancia → ±${value}°` });
    },
    [session],
  );

  return { snapshot, stats, tolerance, onSample, confirmReference, retakeReference, setTolerance };
}
