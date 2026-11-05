import { useCallback, useEffect, useRef, useState } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { useFrameOutput } from 'react-native-vision-camera';
import { useResizer } from 'react-native-vision-camera-resizer';
import { scheduleOnRN } from 'react-native-worklets';
import type { BodyPose } from '../assessment';
import { decodeMoveNet, MOVENET_INPUT_SIZE, MOVENET_OUTPUT_LENGTH, type FrameOrientation } from './movenet';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MODEL = require('../../assets/models/movenet-singlepose-lightning-int8.tflite');

/** Resultado de analizar un fotograma, entregado en el hilo de JS. */
export interface PoseSample {
  pose: BodyPose | null;
  /** Reloj de pared (ms) al empezar a procesar el fotograma. */
  capturedAt: number;
  /** Tiempo de redimensionado + inferencia en el dispositivo. */
  inferenceMs: number;
  orientation: FrameOrientation;
}

export type PoseDetectorStatus = 'loading' | 'ready' | 'error';

interface RawSample {
  keypoints: number[];
  capturedAt: number;
  inferenceMs: number;
  orientation: FrameOrientation;
}

/**
 * Detección de pose en el dispositivo con MoveNet Lightning sobre los fotogramas
 * de VisionCamera. Los fotogramas se procesan y se liberan en el hilo de la cámara;
 * solo los 17 puntos (51 números) cruzan al hilo de JS. Nada se guarda ni se envía.
 */
export function usePoseDetection(onSample: (sample: PoseSample) => void) {
  // CPU por defecto: el delegado CoreML no admite todas las operaciones int8.
  const model = useTensorflowModel(MODEL, []);
  const resizer = useResizer({
    width: MOVENET_INPUT_SIZE,
    height: MOVENET_INPUT_SIZE,
    channelOrder: 'rgb',
    dataType: 'uint8',
    scaleMode: 'contain', // conserva la proporción: el cuerpo completo entra y los ángulos no se deforman
    pixelLayout: 'interleaved', // NHWC [1, 192, 192, 3]
  });
  const [droppedFrames, setDroppedFrames] = useState(0);
  // El callback más reciente, sin recrear el worklet en cada render.
  const callbackRef = useRef(onSample);
  useEffect(() => {
    callbackRef.current = onSample;
  }, [onSample]);

  const deliver = useCallback((raw: RawSample) => {
    callbackRef.current({
      pose: decodeMoveNet(raw.keypoints, raw.orientation),
      capturedAt: raw.capturedAt,
      inferenceMs: raw.inferenceMs,
      orientation: raw.orientation,
    });
  }, []);

  const countDropped = useCallback(() => setDroppedFrames((count) => count + 1), []);

  const tflite = model.state === 'loaded' ? model.model : undefined;
  const resizerInstance = resizer.resizer;

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    // Búfer físicamente rotado a la orientación de la interfaz: la vertical de la
    // imagen es la vertical real (necesario para la inclinación del tronco).
    enablePhysicalBufferRotation: true,
    targetResolution: { width: 640, height: 480 },
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      if (tflite == null || resizerInstance == null) {
        frame.dispose();
        return;
      }
      const capturedAt = Date.now();
      const orientation = frame.orientation;
      const resized = resizerInstance.resize(frame);
      frame.dispose();
      const input = resized.getPixelBuffer().slice(0);
      resized.dispose();
      const outputs = tflite.runSync([input]);
      const raw = new Float32Array(outputs[0]!);
      const keypoints: number[] = [];
      for (let i = 0; i < MOVENET_OUTPUT_LENGTH; i++) keypoints.push(raw[i]!);
      scheduleOnRN(deliver, { keypoints, capturedAt, inferenceMs: Date.now() - capturedAt, orientation });
    },
    onFrameDropped() {
      'worklet';
      scheduleOnRN(countDropped);
    },
  });

  const status: PoseDetectorStatus =
    model.state === 'error' || resizer.state === 'error'
      ? 'error'
      : model.state === 'loaded' && resizer.state === 'ready'
        ? 'ready'
        : 'loading';
  const error = model.state === 'error' ? model.error : resizer.error;

  return { frameOutput, status, error, droppedFrames };
}
