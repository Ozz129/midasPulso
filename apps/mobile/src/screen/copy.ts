import type { BodySide, Joint, SessionSnapshot } from '../assessment';

export const SIDE_LABEL: Record<BodySide, string> = { left: 'izquierdo', right: 'derecho' };
export const JOINT_LABEL: Record<Joint, string> = {
  shoulder: 'Hombro',
  hip: 'Cadera',
  knee: 'Rodilla',
  ankle: 'Tobillo',
};

export const SETUP_TIPS = [
  'Deja el teléfono fijo (apoyado o en trípode) a la altura de la cadera.',
  'Ponte de perfil a 2–3 m, con el cuerpo completo en cuadro.',
  'Coach y usuario, de perfil hacia el mismo lado (por ejemplo, ambos con el hombro izquierdo hacia la cámara).',
];

/** Cómo captura el coach la referencia (la app la toma sola en la pausa). */
export const REFERENCE_STEPS = [
  'De pie, de perfil, hasta que los 4 puntos estén en verde.',
  'Baja en una sentadilla sin peso y quédate quieto abajo ~1 segundo: la app la captura sola.',
  'Levántate, revisa los ángulos y toca «Guardar referencia» (o «Repetir captura»).',
];

/** Mensaje para pedir al usuario que ajuste su posición, nombrando los puntos que faltan. */
export function adjustPositionMessage(snapshot: SessionSnapshot): string {
  const missing = (Object.keys(snapshot.visibility) as Joint[])
    .filter((joint) => !snapshot.visibility[joint])
    .map((joint) => JOINT_LABEL[joint].toLowerCase());
  const side = snapshot.side ?? snapshot.reference?.side;
  const sideText = side ? ` del lado ${SIDE_LABEL[side]}` : '';
  if (missing.length === 0 || missing.length === 4) {
    return `Ajusta tu posición: muestra de perfil el cuerpo completo${sideText}.`;
  }
  return `Ajusta tu posición: no se ve ${missing.join(', ')}${sideText}.`;
}

/** Indicación de qué hacer en cada momento (independiente del feedback). */
export function statusMessage(snapshot: SessionSnapshot): string {
  if (snapshot.visibilityLost) return adjustPositionMessage(snapshot);
  const coach = snapshot.phase === 'reference';
  switch (snapshot.stance) {
    case 'unarmed':
      return coach ? 'Coach: ponte de pie, de perfil, para empezar.' : 'Ponte de pie, de perfil, para empezar.';
    case 'standing':
      return coach
        ? 'Coach: baja en una sentadilla sin peso y haz una pausa abajo.'
        : 'Baja en una sentadilla y haz una pausa abajo.';
    case 'descending':
      return 'Mantén la pausa abajo…';
    case 'holding':
      return 'Vuelve a la posición de pie para otra repetición.';
  }
}

export const formatDeg = (value: number) => `${Math.round(value)}°`;
