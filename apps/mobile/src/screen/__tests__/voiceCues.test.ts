import { describe, expect, it } from 'vitest';
import type { SessionSnapshot } from '../../assessment';
import { reminderCue, voiceCues } from '../voiceCues';

const base: SessionSnapshot = {
  phase: 'reference',
  stance: 'unarmed',
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
const texts = (prev: SessionSnapshot, next: SessionSnapshot, soloMode = true) =>
  voiceCues(prev, next, { soloMode }).map((cue) => cue.text);

describe('guía por voz', () => {
  it('sin cambios no dice nada', () => {
    expect(texts(base, { ...base })).toEqual([]);
  });

  it('al ver a la persona de pie y completa indica qué hacer', () => {
    expect(texts(base, { ...base, stance: 'standing' })).toEqual([
      'Te veo completo. Baja en una sentadilla y quédate quieto abajo.',
    ]);
  });

  it('anuncia la captura con los ángulos y el guardado automático en modo solo', () => {
    const next = { ...base, phase: 'review' as const, stance: 'holding' as const, candidate: { side: 'left' as const, kneeAngle: 91.6, trunkLean: 34.2 } };
    expect(texts(base, next)).toEqual([
      'Referencia capturada. Rodilla 92 grados, tronco 34 grados. Se guarda en 5 segundos. Para repetirla, toca Repetir captura.',
    ]);
    expect(texts(base, next, false)[0]).toMatch(/Toca Guardar referencia o Repetir captura\.$/);
  });

  it('dice el resultado de cada repetición e interrumpe lo anterior', () => {
    const prev = { ...base, phase: 'test' as const, stance: 'descending' as const };
    const next = {
      ...prev,
      stance: 'holding' as const,
      repetitions: 1,
      feedback: { kind: 'within' as const, message: 'Postura dentro del objetivo' },
    };
    const cues = voiceCues(prev, next, { soloMode: true });
    expect(cues).toContainEqual({ text: 'Postura dentro del objetivo', interrupt: true });
  });

  it('avisa la pérdida de visibilidad nombrando lo que falta', () => {
    const next = { ...base, visibilityLost: true, visibility: { ...base.visibility, ankle: false } };
    expect(texts(base, next)).toEqual(['No te veo bien: no se ve tobillo del lado izquierdo.']);
  });

  it('recuerda cómo colocarse mientras no esté listo', () => {
    expect(reminderCue({ ...base, visibility: { ...base.visibility, knee: false, ankle: false } })?.text).toBe(
      'Ajusta tu posición. no se ve rodilla, tobillo del lado izquierdo.',
    );
    expect(reminderCue(base)?.text).toBe('Ponte de pie, de perfil, para empezar.');
    expect(reminderCue({ ...base, stance: 'standing' })).toBeNull();
    expect(reminderCue({ ...base, phase: 'review' })).toBeNull();
  });
});
