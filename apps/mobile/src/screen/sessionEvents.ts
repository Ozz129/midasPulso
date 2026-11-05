import type { BodyPose, SessionSnapshot } from '../assessment';
import { JOINTS } from '../assessment';
import { formatDeg, SIDE_LABEL } from './copy';

const STANCE_LABEL: Record<SessionSnapshot['stance'], string> = {
  unarmed: 'sin armar (esperando de pie)',
  standing: 'de pie (repetición armada)',
  descending: 'bajando / esperando pausa',
  holding: 'evaluada, esperando volver de pie',
};

const PHASE_LABEL: Record<SessionSnapshot['phase'], string> = {
  reference: '1 Referencia (captura)',
  review: '1 Referencia (revisión)',
  test: '2 Prueba',
};

export interface SessionEvent {
  level: 'info' | 'ok' | 'warn';
  text: string;
}

/** Cambios relevantes entre dos instantáneas, en lenguaje legible para el monitor. */
export function sessionEvents(previous: SessionSnapshot, next: SessionSnapshot): SessionEvent[] {
  const events: SessionEvent[] = [];
  if (next.phase !== previous.phase) events.push({ level: 'info', text: `Fase → ${PHASE_LABEL[next.phase]}` });
  if (next.visibilityLost !== previous.visibilityLost) {
    events.push(
      next.visibilityLost
        ? { level: 'warn', text: 'Visibilidad perdida: se retira el feedback' }
        : { level: 'ok', text: 'Visibilidad recuperada' },
    );
  }
  if (next.stance !== previous.stance) events.push({ level: 'info', text: `Postura → ${STANCE_LABEL[next.stance]}` });
  if (next.candidate && next.candidate !== previous.candidate) {
    events.push({
      level: 'ok',
      text: `Referencia capturada: rodilla ${formatDeg(next.candidate.kneeAngle)}, tronco ${formatDeg(next.candidate.trunkLean)}, lado ${SIDE_LABEL[next.candidate.side]}`,
    });
  }
  if (next.reference && next.reference !== previous.reference) events.push({ level: 'ok', text: 'Referencia guardada' });
  if (!next.reference && previous.reference) events.push({ level: 'info', text: 'Referencia descartada' });
  if (next.repetitions > previous.repetitions && next.feedback) {
    const detail =
      next.feedback.kind === 'deviation'
        ? ` (${next.feedback.metric === 'knee' ? 'rodilla' : 'tronco'} ${next.feedback.deltaDeg > 0 ? '+' : ''}${Math.round(next.feedback.deltaDeg)}°)`
        : '';
    events.push({
      level: next.feedback.kind === 'within' ? 'ok' : 'warn',
      text: `Repetición ${next.repetitions}: «${next.feedback.message}»${detail}`,
    });
  }
  return events;
}

/** Confianza (0–1) de los puntos requeridos de ambos lados, redondeada a 2 decimales. */
export function jointScores(pose: BodyPose | null) {
  const round = (value: number) => Math.round(value * 100) / 100;
  const side = (s: 'left' | 'right') =>
    Object.fromEntries(JOINTS.map((joint) => [joint, pose ? round(pose[s][joint].score) : 0]));
  return { left: side('left'), right: side('right') };
}

export { PHASE_LABEL, STANCE_LABEL };
