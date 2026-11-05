import * as Speech from 'expo-speech';
import { useEffect, useRef } from 'react';
import type { SessionSnapshot } from '../assessment';
import { emitTelemetry } from '../telemetry';
import { reminderCue, voiceCues, type VoiceCue } from './voiceCues';

const REMINDER_EVERY_MS = 9_000;

function say(cue: VoiceCue) {
  if (cue.interrupt) void Speech.stop();
  Speech.speak(cue.text, { language: 'es-ES', rate: 1.0 });
  emitTelemetry('event', { level: 'info', text: `🔊 ${cue.text}` });
}

/** Guía por voz de la prueba, para seguirla a distancia sin mirar la pantalla. */
export function useVoiceGuide(snapshot: SessionSnapshot, { enabled, soloMode }: { enabled: boolean; soloMode: boolean }) {
  const previous = useRef(snapshot);
  const lastSpokenAt = useRef(0);

  useEffect(() => {
    const before = previous.current;
    previous.current = snapshot;
    if (!enabled || before === snapshot) return;
    for (const cue of voiceCues(before, snapshot, { soloMode })) {
      say(cue);
      lastSpokenAt.current = Date.now();
    }
  }, [snapshot, enabled, soloMode]);

  // Mientras no se vea a la persona de pie y completa, recuerda qué ajustar.
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      const cue = reminderCue(previous.current);
      if (cue && Date.now() - lastSpokenAt.current >= REMINDER_EVERY_MS) {
        say(cue);
        lastSpokenAt.current = Date.now();
      }
    }, 1_000);
    return () => clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) void Speech.stop();
  }, [enabled]);
}

/** Anuncio puntual (por ejemplo, la cuenta regresiva del modo solo). */
export function speakNow(text: string, enabled: boolean) {
  if (enabled) say({ text, interrupt: true });
}
