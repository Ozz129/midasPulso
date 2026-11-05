import type { BodyPose, Joint, Keypoint } from '../assessment';

/**
 * MoveNet SinglePose Lightning (int8), Google, Apache 2.0.
 * Verificado sobre el archivo: entrada uint8 [1, 192, 192, 3] (RGB intercalado),
 * salida float32 [1, 1, 17, 3] con (y, x, confianza) normalizados a 0–1.
 */
export const MOVENET_INPUT_SIZE = 192;
export const MOVENET_KEYPOINTS = 17;
export const MOVENET_OUTPUT_LENGTH = MOVENET_KEYPOINTS * 3;

/** Índices COCO de los puntos que usa la evaluación. */
export const MOVENET_INDEX: Record<'left' | 'right', Record<Joint, number>> = {
  left: { shoulder: 5, hip: 11, knee: 13, ankle: 15 },
  right: { shoulder: 6, hip: 12, knee: 14, ankle: 16 },
};

/** Orientación de los píxeles del fotograma respecto a la vertical deseada (VisionCamera). */
export type FrameOrientation = 'up' | 'right' | 'down' | 'left';

/**
 * Lleva un punto normalizado del búfer a la orientación vertical.
 * VisionCamera documenta `'right'` como píxeles rotados +90° (sentido horario en
 * pantalla) y `'left'` como −90°. La app solicita búferes ya rotados
 * (`enablePhysicalBufferRotation`), así que lo esperado es `'up'`; esto cubre
 * el caso contrario. El recorte 'contain' es centrado, por lo que rotar el
 * cuadrado normalizado es válido.
 */
export function toUpright(x: number, y: number, orientation: FrameOrientation): { x: number; y: number } {
  switch (orientation) {
    case 'right':
      return { x: y, y: 1 - x };
    case 'left':
      return { x: 1 - y, y: x };
    case 'down':
      return { x: 1 - x, y: 1 - y };
    default:
      return { x, y };
  }
}

/**
 * Convierte la salida plana de MoveNet en la pose que usa la evaluación.
 * Las coordenadas se expresan en píxeles del cuadrado de entrada (escala uniforme
 * gracias al redimensionado 'contain'), así que los ángulos no se deforman.
 * Devuelve null si la salida no tiene el tamaño esperado.
 */
export function decodeMoveNet(output: ArrayLike<number>, orientation: FrameOrientation = 'up'): BodyPose | null {
  if (output.length < MOVENET_OUTPUT_LENGTH) return null;
  const keypoint = (index: number): Keypoint => {
    const y = output[index * 3]!;
    const x = output[index * 3 + 1]!;
    const upright = toUpright(x, y, orientation);
    return {
      x: upright.x * MOVENET_INPUT_SIZE,
      y: upright.y * MOVENET_INPUT_SIZE,
      score: output[index * 3 + 2]!,
    };
  };
  const side = (indices: Record<Joint, number>): Record<Joint, Keypoint> => ({
    shoulder: keypoint(indices.shoulder),
    hip: keypoint(indices.hip),
    knee: keypoint(indices.knee),
    ankle: keypoint(indices.ankle),
  });
  return { left: side(MOVENET_INDEX.left), right: side(MOVENET_INDEX.right) };
}
