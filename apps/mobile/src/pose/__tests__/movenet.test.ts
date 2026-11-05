import { describe, expect, it } from 'vitest';
import { computeSquatMetrics } from '../../assessment';
import { makePose } from '../../assessment/__tests__/fixtures';
import { decodeMoveNet, MOVENET_INDEX, MOVENET_INPUT_SIZE, MOVENET_OUTPUT_LENGTH, toUpright, type FrameOrientation } from '../movenet';

/** Codifica una pose conocida como salida de MoveNet (y, x, score normalizados). */
function encode(pose: ReturnType<typeof makePose>, transform = (x: number, y: number) => ({ x, y })) {
  const output = new Float32Array(MOVENET_OUTPUT_LENGTH);
  for (const side of ['left', 'right'] as const) {
    for (const [joint, index] of Object.entries(MOVENET_INDEX[side])) {
      const kp = pose[side][joint as keyof typeof MOVENET_INDEX.left];
      const p = transform(kp.x, kp.y);
      output.set([p.y, p.x, kp.score], index * 3);
    }
  }
  return output;
}

describe('MoveNet', () => {
  it('decodifica la salida y conserva los ángulos', () => {
    const pose = makePose({ kneeAngle: 95, trunkLean: 30 });
    const decoded = decodeMoveNet(encode(pose));
    expect(decoded?.left.knee.x).toBeCloseTo(pose.left.knee.x * MOVENET_INPUT_SIZE, 3);
    const metrics = decoded && computeSquatMetrics(decoded, 'left', 0.3);
    expect(metrics?.kneeAngle).toBeCloseTo(95, 3);
    expect(metrics?.trunkLean).toBeCloseTo(30, 3);
  });

  it('rechaza salidas incompletas', () => {
    expect(decodeMoveNet(new Float32Array(10))).toBeNull();
  });

  it('toUpright invierte cada rotación documentada', () => {
    // Rotación de contenido usada para simular el búfer de cada orientación.
    const rotate: Record<FrameOrientation, (x: number, y: number) => { x: number; y: number }> = {
      up: (x, y) => ({ x, y }),
      right: (x, y) => ({ x: 1 - y, y: x }), // +90° horario
      left: (x, y) => ({ x: y, y: 1 - x }), // −90°
      down: (x, y) => ({ x: 1 - x, y: 1 - y }),
    };
    for (const orientation of Object.keys(rotate) as FrameOrientation[]) {
      const buffer = rotate[orientation](0.2, 0.7);
      const upright = toUpright(buffer.x, buffer.y, orientation);
      expect(upright.x).toBeCloseTo(0.2);
      expect(upright.y).toBeCloseTo(0.7);
    }
  });

  it('con un búfer rotado recupera la inclinación respecto a la vertical real', () => {
    const pose = makePose({ kneeAngle: 90, trunkLean: 30 });
    const rotatedRight = encode(pose, (x, y) => ({ x: 1 - y, y: x }));
    const metrics = computeSquatMetrics(decodeMoveNet(rotatedRight, 'right')!, 'left', 0.3);
    expect(metrics?.trunkLean).toBeCloseTo(30, 3);
  });
});
