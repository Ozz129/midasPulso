import { describe, expect, it } from 'vitest';
import type { SessionSnapshot } from '../../assessment';
import { adjustPositionMessage, statusMessage } from '../copy';

const base: SessionSnapshot = {
  phase: 'test',
  stance: 'standing',
  side: 'left',
  visibility: { shoulder: true, hip: true, knee: true, ankle: true },
  visibilityLost: false,
  live: null,
  candidate: null,
  reference: { side: 'left', kneeAngle: 90, trunkLean: 35 },
  feedback: null,
  repetitions: 0,
  lastEvaluationMs: null,
};

describe('textos de la pantalla', () => {
  it('nombra los puntos que faltan y el lado', () => {
    const snapshot = { ...base, visibilityLost: true, visibility: { ...base.visibility, ankle: false } };
    expect(adjustPositionMessage(snapshot)).toBe('Ajusta tu posición: no se ve tobillo del lado izquierdo.');
    expect(statusMessage(snapshot)).toBe(adjustPositionMessage(snapshot));
  });

  it('sin ningún punto visible pide mostrar el cuerpo completo', () => {
    const snapshot = {
      ...base,
      visibilityLost: true,
      visibility: { shoulder: false, hip: false, knee: false, ankle: false },
    };
    expect(adjustPositionMessage(snapshot)).toBe('Ajusta tu posición: muestra de perfil el cuerpo completo del lado izquierdo.');
  });

  it('guía cada fase de la repetición', () => {
    expect(statusMessage({ ...base, phase: 'reference', stance: 'standing' })).toMatch(/^Coach: baja/);
    expect(statusMessage({ ...base, stance: 'descending' })).toBe('Mantén la pausa abajo…');
    expect(statusMessage({ ...base, stance: 'holding' })).toMatch(/Vuelve a la posición de pie/);
    expect(statusMessage({ ...base, stance: 'unarmed' })).toMatch(/Ponte de pie/);
  });
});
