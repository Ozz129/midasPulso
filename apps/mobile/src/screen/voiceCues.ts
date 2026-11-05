import type { SessionSnapshot } from '../assessment';
import { adjustPositionMessage } from './copy';

export interface VoiceCue {
  text: string;
  /** true: corta lo que se esté diciendo (avisos urgentes y resultados). */
  interrupt: boolean;
}

const deg = (value: number) => `${Math.round(value)} grados`;

/**
 * Qué decir en voz alta ante cada cambio de la sesión, para que la persona pueda
 * seguir la prueba a 2–3 m sin mirar la pantalla. Solo reacciona a transiciones
 * (ya filtradas por el detector), así que no repite en cada fotograma.
 */
export function voiceCues(previous: SessionSnapshot, next: SessionSnapshot, options: { soloMode: boolean }): VoiceCue[] {
  const cues: VoiceCue[] = [];

  if (next.visibilityLost && !previous.visibilityLost) {
    cues.push({ text: adjustPositionMessage(next).replace('Ajusta tu posición: ', 'No te veo bien: '), interrupt: true });
  }

  if (next.candidate && next.candidate !== previous.candidate) {
    cues.push({
      text:
        `Referencia capturada. Rodilla ${deg(next.candidate.kneeAngle)}, tronco ${deg(next.candidate.trunkLean)}.` +
        (options.soloMode ? ' Se guarda en 5 segundos. Para repetirla, toca Repetir captura.' : ' Toca Guardar referencia o Repetir captura.'),
      interrupt: true,
    });
  }

  if (next.reference && next.reference !== previous.reference) {
    cues.push({ text: 'Referencia guardada. Ahora, sentadillas de prueba.', interrupt: true });
  }

  if (next.repetitions > previous.repetitions && next.feedback) {
    cues.push({ text: next.feedback.message, interrupt: true });
  }

  if (next.stance !== previous.stance && next.phase !== 'review') {
    if (next.stance === 'standing') {
      cues.push({
        text:
          next.phase === 'reference'
            ? 'Te veo completo. Baja en una sentadilla y quédate quieto abajo.'
            : 'Te veo. Baja y quédate quieto abajo.',
        interrupt: false,
      });
    } else if (next.stance === 'descending') {
      cues.push({ text: 'Quieto ahí.', interrupt: false });
    }
  }

  return cues;
}

/** Recordatorio periódico mientras aún no se ve a la persona de pie y completa. */
export function reminderCue(snapshot: SessionSnapshot): VoiceCue | null {
  if (snapshot.phase === 'review' || snapshot.stance !== 'unarmed') return null;
  const allVisible = Object.values(snapshot.visibility).every(Boolean);
  if (allVisible) return { text: 'Ponte de pie, de perfil, para empezar.', interrupt: false };
  return { text: adjustPositionMessage(snapshot).replace('Ajusta tu posición: ', 'Ajusta tu posición. '), interrupt: false };
}
