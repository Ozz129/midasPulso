/**
 * Telemetría del PoC para el monitor de escritorio (apps/mobile/scripts/monitor.cjs).
 * Solo en desarrollo: cada evento es una línea `[pulso] {json}` en la consola de JS,
 * que Android reenvía a logcat (etiqueta ReactNativeJS) y el monitor lee por USB.
 * No incluye imágenes ni datos personales: solo números y estados.
 */
export type TelemetryType =
  | 'detector' // estado del modelo y del redimensionado
  | 'frame' // muestra periódica (~4 por segundo) del procesamiento en vivo
  | 'event'; // cambios de fase, pausa detectada, feedback, visibilidad…

export function emitTelemetry(type: TelemetryType, payload: Record<string, unknown>): void {
  if (!__DEV__) return;
  // oxlint-disable-next-line no-console -- canal intencional hacia el monitor de desarrollo
  console.log(`[pulso] ${JSON.stringify({ type, at: Date.now(), ...payload })}`);
}
