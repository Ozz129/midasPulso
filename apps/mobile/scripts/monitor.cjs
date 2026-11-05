#!/usr/bin/env node
// Monitor de escritorio del PoC de postura: muestra en vivo lo que hace la app.
//
// Uso:
//   node apps/mobile/scripts/monitor.cjs <log-de-metro>   (lee la salida de Metro; sirve por Wi-Fi)
//   node apps/mobile/scripts/monitor.cjs                  (lee `adb logcat` del dispositivo USB)
//
// La app emite en desarrollo líneas `[pulso] {json}` (src/telemetry.ts). Este monitor
// solo lee: no controla la app ni guarda nada.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const LOG_FILE = process.argv[2];
const MIN_SCORE = 0.3; // igual que DEFAULT_ASSESSMENT_CONFIG.minKeypointScore

const state = {
  source: LOG_FILE ? `log de Metro (${path.basename(LOG_FILE)})` : 'adb logcat (USB)',
  lastAt: 0,
  detector: { status: '—', error: null },
  frame: null,
  events: [],
  metro: [],
  build: '—',
};

// ---------------------------------------------------------------- lectura
function handleLine(raw) {
  // oxlint-disable-next-line no-control-regex -- quita los códigos de color ANSI de Metro
  const line = raw.replace(/\x1b\[[0-9;]*m/g, '');
  const at = line.indexOf('[pulso] ');
  if (at >= 0) {
    try {
      const msg = JSON.parse(line.slice(at + 8).trim());
      state.lastAt = Date.now();
      if (msg.type === 'frame') state.frame = msg;
      else if (msg.type === 'detector') {
        state.detector = msg;
        pushEvent(msg.status === 'error' ? 'warn' : 'info', `Detector: ${msg.status}${msg.error ? ` (${msg.error})` : ''}`, msg.at);
      } else if (msg.type === 'event') pushEvent(msg.level, msg.text, msg.at);
    } catch {
      /* línea partida o no JSON: se ignora */
    }
    return;
  }
  if (/BUILD SUCCESSFUL/.test(line)) state.build = 'compilada ✔';
  else if (/BUILD FAILED/.test(line)) state.build = 'falló ✖';
  if (/Android Bundled|Model loaded|ERROR|Error:|WARN|Installing|Opening .* on/.test(line)) {
    state.metro.push({ at: Date.now(), text: line.trim().slice(0, 110) });
    state.metro = state.metro.slice(-4);
  }
}

function pushEvent(level, text, at = Date.now()) {
  state.events.push({ level, text, at });
  state.events = state.events.slice(-12);
}

function followFile(file) {
  let offset = 0;
  let rest = '';
  setInterval(() => {
    let size;
    try {
      size = fs.statSync(file).size;
    } catch {
      return;
    }
    if (size < offset) offset = 0;
    if (size === offset) return;
    const fd = fs.openSync(file, 'r');
    const chunk = Buffer.alloc(size - offset);
    fs.readSync(fd, chunk, 0, chunk.length, offset);
    fs.closeSync(fd);
    offset = size;
    const lines = (rest + chunk.toString('utf8')).split(/\r?\n/);
    rest = lines.pop();
    lines.forEach(handleLine);
  }, 200);
}

function followLogcat() {
  const sdk = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
  const adb = fs.existsSync(path.join(sdk, 'platform-tools', 'adb.exe'))
    ? path.join(sdk, 'platform-tools', 'adb.exe')
    : 'adb';
  const start = () => {
    const child = spawn(adb, ['logcat', '-v', 'raw', '-T', '1', 'ReactNativeJS:V', '*:S']);
    let rest = '';
    child.stdout.on('data', (data) => {
      const lines = (rest + data.toString('utf8')).split(/\r?\n/);
      rest = lines.pop();
      lines.forEach(handleLine);
    });
    child.on('exit', () => {
      pushEvent('warn', 'adb desconectado; reintentando…');
      setTimeout(start, 2000);
    });
    child.on('error', () => pushEvent('warn', 'No se encontró adb (Android SDK platform-tools)'));
  };
  start();
}

// ---------------------------------------------------------------- dibujo
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[90m',
  lime: '\x1b[38;2;198;246;78m',
  gold: '\x1b[38;2;201;163;78m',
  ok: '\x1b[38;2;79;209;165m',
  warn: '\x1b[38;2;245;185;78m',
  err: '\x1b[38;2;255;122;122m',
};
const color = (c, text) => `${c}${text}${C.reset}`;
const clock = (ms) => new Date(ms).toLocaleTimeString('es', { hour12: false });
const JOINTS = [
  ['shoulder', 'Hombro'],
  ['hip', 'Cadera'],
  ['knee', 'Rodilla'],
  ['ankle', 'Tobillo'],
];
const PHASE = { reference: '1 Referencia (captura)', review: '1 Referencia (revisión)', test: '2 Prueba' };
const STANCE = {
  unarmed: 'sin armar: esperando que esté de pie',
  standing: 'de pie: repetición armada',
  descending: 'bajando / esperando pausa estable',
  holding: 'evaluada: esperando volver de pie',
};
const SIDE = { left: 'izquierdo', right: 'derecho' };

function scoreBar(score) {
  const width = 10;
  const filled = Math.round(Math.min(1, score) * width);
  const c = score >= MIN_SCORE ? C.ok : C.err;
  return `${c}${'█'.repeat(filled)}${C.dim}${'░'.repeat(width - filled)}${C.reset} ${score.toFixed(2)}`;
}

function angleLine(label, live, ref, tol) {
  if (live == null) return `  ${label.padEnd(8)} ${color(C.dim, '— (sin puntos visibles)')}`;
  let text = `  ${label.padEnd(8)} ${color(C.bold, String(live).padStart(3) + '°')}`;
  if (ref != null) {
    const delta = live - ref;
    const inside = Math.abs(delta) <= tol;
    text += `   ref ${String(ref).padStart(3)}°   Δ ${(delta > 0 ? '+' : '') + delta}°  ${inside ? color(C.ok, 'dentro') : color(C.warn, 'fuera')}`;
  }
  return text;
}

function render() {
  const f = state.frame;
  const age = state.lastAt ? (Date.now() - state.lastAt) / 1000 : null;
  const live = age !== null && age < 2;
  const out = [];
  out.push(`${color(C.bold, ' MYDAS PULSO · Monitor del PoC de postura')}   ${color(C.dim, clock(Date.now()))}`);
  out.push(
    color(C.dim, ` Fuente: ${state.source} · `) +
      (live ? color(C.ok, '● recibiendo datos') : age === null ? color(C.warn, '○ esperando datos de la app…') : color(C.warn, `○ sin datos hace ${age.toFixed(0)} s`)),
  );
  out.push('');

  out.push(color(C.gold, ' APP'));
  const det = state.detector.status;
  out.push(
    `  Detector: ${det === 'ready' ? color(C.ok, 'listo (MoveNet)') : det === 'error' ? color(C.err, 'error') : color(C.warn, det)}` +
      (state.detector.error ? color(C.err, ` · ${state.detector.error}`) : '') +
      color(C.dim, `   ·   Build: ${state.build}`),
  );
  if (f) {
    const fpsColor = f.fps >= 15 ? C.ok : f.fps >= 8 ? C.warn : C.err;
    out.push(
      `  ${color(fpsColor, `${f.fps} fps`)} · inferencia ${f.inferenceMs} ms · latencia ${f.pipelineMs} ms · descartados ${f.dropped} · orientación ${f.orientation === 'up' ? color(C.ok, 'up') : color(C.warn, f.orientation)}`,
    );
    out.push(`  Persona detectada: ${f.personDetected ? color(C.ok, 'sí') : color(C.warn, 'no')}`);
  } else out.push(color(C.dim, '  (sin muestras todavía)'));
  out.push('');

  out.push(color(C.gold, ' SESIÓN'));
  if (f) {
    out.push(`  Fase: ${color(C.lime, PHASE[f.phase] ?? f.phase)}   ·   Postura: ${STANCE[f.stance] ?? f.stance}`);
    out.push(
      `  Lado evaluado: ${f.side ? SIDE[f.side] : '—'}   ·   Visibilidad: ${f.visibilityLost ? color(C.err, 'PERDIDA (feedback retirado)') : color(C.ok, 'ok')}   ·   Repeticiones: ${f.repetitions}   ·   Tolerancia ±${f.tolerance}°`,
    );
  }
  out.push('');

  out.push(color(C.gold, ' PUNTOS CORPORALES') + color(C.dim, `  (confianza; verde ≥ ${MIN_SCORE})`));
  out.push(color(C.dim, '              Izquierdo          Derecho'));
  for (const [key, label] of JOINTS) {
    const l = f ? f.scores.left[key] : 0;
    const r = f ? f.scores.right[key] : 0;
    out.push(`  ${label.padEnd(10)}  ${scoreBar(l)}    ${scoreBar(r)}`);
  }
  out.push('');

  out.push(color(C.gold, ' ÁNGULOS EN VIVO'));
  const ref = f && (f.reference ?? f.candidate);
  out.push(angleLine('Rodilla', f?.live?.knee, ref?.knee, f?.tolerance ?? 15));
  out.push(angleLine('Tronco', f?.live?.trunk, ref?.trunk, f?.tolerance ?? 15));
  out.push(
    color(
      C.dim,
      f?.reference
        ? `  Referencia guardada (lado ${SIDE[f.reference.side]}).`
        : f?.candidate
          ? '  Referencia capturada: falta que el coach toque «Guardar referencia».'
          : '  Sin referencia todavía.',
    ),
  );
  out.push('');

  out.push(color(C.gold, ' INDICACIÓN'));
  if (f?.feedback) out.push(`  ${color(C.bold, `«${f.feedback}»`)}`);
  else out.push(color(C.dim, '  (ninguna en pantalla)'));
  if (f?.responseMs != null) {
    out.push(`  Tiempo de respuesta última evaluación: ${f.responseMs < 1000 ? color(C.ok, `${f.responseMs} ms ✔`) : color(C.err, `${f.responseMs} ms ✖ (meta < 1000)`)}`);
  }
  out.push('');

  out.push(color(C.gold, ' EVENTOS'));
  if (state.events.length === 0) out.push(color(C.dim, '  (sin eventos)'));
  for (const e of state.events.slice().reverse()) {
    const c = e.level === 'ok' ? C.ok : e.level === 'warn' ? C.warn : C.reset;
    out.push(`  ${color(C.dim, clock(e.at))}  ${color(c, e.text)}`);
  }
  if (state.metro.length) {
    out.push('');
    out.push(color(C.gold, ' METRO'));
    for (const m of state.metro) out.push(color(C.dim, `  ${clock(m.at)}  ${m.text}`));
  }
  out.push('');
  out.push(color(C.dim, ' Solo lectura: cerrar esta ventana no afecta a la app. Ctrl+C para salir.'));
  process.stdout.write('\x1b[H\x1b[2J' + out.join('\n') + '\n');
}

if (LOG_FILE) followFile(LOG_FILE);
else followLogcat();
process.stdout.write('\x1b[?25l');
process.on('exit', () => process.stdout.write('\x1b[?25h'));
process.on('SIGINT', () => process.exit(0));
setInterval(render, 250);
render();
