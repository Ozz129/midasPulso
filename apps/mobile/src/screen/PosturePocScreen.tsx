import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { JOINTS, type Feedback, type SessionSnapshot } from '../assessment';
import { usePoseDetection } from '../pose/usePoseDetection';
import { emitTelemetry } from '../telemetry';
import { formatDeg, JOINT_LABEL, REFERENCE_STEPS, SETUP_TIPS, SIDE_LABEL, statusMessage } from './copy';
import { colors, radius, space } from './theme';
import { usePostureSession, type PipelineStats } from './usePostureSession';
import { useVoiceGuide } from './useVoiceGuide';

export function PosturePocScreen() {
  const { hasPermission, requestPermission, status } = useCameraPermission();

  if (!hasPermission) {
    return <PermissionView canAsk={status === 'not-determined'} onRequest={requestPermission} />;
  }
  return <CameraSession />;
}

function CameraSession() {
  useKeepAwake(); // el teléfono queda fijo durante la prueba
  const insets = useSafeAreaInsets();
  const [position, setPosition] = useState<'front' | 'back'>('front');
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  // Para probar a distancia y sin ayuda: guía por voz y guardado automático de la referencia.
  const [voiceOn, setVoiceOn] = useState(true);
  const [soloMode, setSoloMode] = useState(true);
  const device = useCameraDevice(position);
  const droppedRef = useRef(0);
  const getDroppedFrames = useCallback(() => droppedRef.current, []);
  const { snapshot, stats, tolerance, onSample, confirmReference, retakeReference, setTolerance } =
    usePostureSession(getDroppedFrames);
  const detector = usePoseDetection(onSample);
  useVoiceGuide(snapshot, { enabled: voiceOn && detector.status === 'ready', soloMode });

  useEffect(() => {
    droppedRef.current = detector.droppedFrames;
  }, [detector.droppedFrames]);

  // Estado del detector y de la cámara para el monitor de escritorio.
  const detectorError = detector.error?.message;
  useEffect(() => {
    emitTelemetry('detector', { status: detector.status, error: detectorError ?? null });
  }, [detector.status, detectorError]);
  useEffect(() => {
    emitTelemetry('event', {
      level: device ? 'info' : 'warn',
      text: device ? `Cámara ${position === 'front' ? 'frontal' : 'trasera'} activa` : `Sin cámara ${position}`,
    });
  }, [device, position]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  // Anuncia cada nueva indicación a VoiceOver.
  const feedbackMessage = snapshot.feedback?.message;
  useEffect(() => {
    if (feedbackMessage) AccessibilityInfo.announceForAccessibility(feedbackMessage);
  }, [feedbackMessage, snapshot.repetitions]);

  return (
    <View style={styles.root}>
      {device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={appActive}
          outputs={[detector.frameOutput]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={styles.body}>No hay cámara {position === 'front' ? 'frontal' : 'trasera'} disponible.</Text>
        </View>
      )}

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.headerRow}>
          <Text style={styles.brand} accessibilityRole="header">
            MYDAS <Text style={styles.brandAccent}>PULSO</Text>
          </Text>
          <View style={styles.headerActions}>
            <SmallButton
              label={position === 'front' ? 'Cámara trasera' : 'Cámara frontal'}
              onPress={() => setPosition((current) => (current === 'front' ? 'back' : 'front'))}
            />
            <SmallButton
              label={showDiagnostics ? 'Ocultar datos' : 'Datos'}
              onPress={() => setShowDiagnostics((current) => !current)}
            />
          </View>
        </View>
        <View style={styles.headerRow}>
          <PhaseSteps phase={snapshot.phase} />
          <View style={styles.headerActions}>
            <ToggleButton label="Voz" value={voiceOn} onToggle={() => setVoiceOn((current) => !current)} />
            <ToggleButton label="Modo solo" value={soloMode} onToggle={() => setSoloMode((current) => !current)} />
          </View>
        </View>
        <VisibilityRow snapshot={snapshot} />
        {showDiagnostics && (
          <Diagnostics
            snapshot={snapshot}
            stats={stats}
            dropped={detector.droppedFrames}
            tolerance={tolerance}
            onTolerance={setTolerance}
          />
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.md }]}>
        {detector.status !== 'ready' ? (
          <Text style={styles.body} accessibilityLiveRegion="polite">
            {detector.status === 'loading'
              ? 'Preparando la detección de postura…'
              : `No se pudo iniciar la detección: ${detector.error?.message ?? 'error desconocido'}`}
          </Text>
        ) : snapshot.phase === 'review' ? (
          <ReviewPanel
            snapshot={snapshot}
            onConfirm={confirmReference}
            onRetake={retakeReference}
            autoSaveSeconds={soloMode ? 5 : null}
          />
        ) : (
          <>
            {snapshot.phase === 'test' && (
              <FeedbackBanner feedback={snapshot.feedback} visibilityLost={snapshot.visibilityLost} />
            )}
            <Text style={styles.status} accessibilityLiveRegion="polite">
              {statusMessage(snapshot)}
            </Text>
            {snapshot.phase === 'reference' ? (
              <View style={styles.tips}>
                <Text style={styles.sectionTitle}>Paso 1 · Capturar referencia del coach</Text>
                {REFERENCE_STEPS.map((step, index) => (
                  <Text key={step} style={styles.step1}>
                    {index + 1}. {step}
                  </Text>
                ))}
                {SETUP_TIPS.map((tip) => (
                  <Text key={tip} style={styles.tip}>
                    • {tip}
                  </Text>
                ))}
              </View>
            ) : (
              snapshot.reference && (
                <View style={styles.referenceRow}>
                  <Text style={styles.caption}>
                    Referencia · rodilla {formatDeg(snapshot.reference.kneeAngle)} · tronco{' '}
                    {formatDeg(snapshot.reference.trunkLean)} · lado {SIDE_LABEL[snapshot.reference.side]} · ±
                    {tolerance}° · {snapshot.repetitions} rep.
                  </Text>
                  <SmallButton label="Cambiar referencia" onPress={retakeReference} />
                </View>
              )
            )}
          </>
        )}
      </View>
    </View>
  );
}

function PermissionView({ canAsk, onRequest }: { canAsk: boolean; onRequest: () => Promise<boolean> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, styles.permission, { paddingTop: insets.top + space.xl }]}>
      <Text style={styles.brand} accessibilityRole="header">
        MYDAS <Text style={styles.brandAccent}>PULSO</Text>
      </Text>
      <Text style={styles.title}>Necesitamos la cámara</Text>
      <Text style={styles.body}>
        La app analiza tu postura en este teléfono, en tiempo real. Los fotogramas se procesan en el dispositivo y
        se descartan al instante: no se guardan ni se envían.
      </Text>
      {canAsk ? (
        <PrimaryButton label="Permitir cámara" onPress={() => void onRequest()} />
      ) : (
        <>
          <Text style={styles.body}>El acceso a la cámara está desactivado. Actívalo en Ajustes para continuar.</Text>
          <PrimaryButton label="Abrir Ajustes" onPress={() => void Linking.openSettings()} />
        </>
      )}
    </View>
  );
}

function PhaseSteps({ phase }: { phase: SessionSnapshot['phase'] }) {
  const steps = [
    { key: 'reference', label: '1 Referencia', active: phase === 'reference' || phase === 'review' },
    { key: 'test', label: '2 Prueba', active: phase === 'test' },
  ];
  return (
    <View style={styles.steps} accessibilityRole="tablist">
      {steps.map((step) => (
        <View
          key={step.key}
          style={[styles.step, step.active && styles.stepActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: step.active }}
        >
          <Text style={[styles.stepText, step.active && styles.stepTextActive]}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
}

function VisibilityRow({ snapshot }: { snapshot: SessionSnapshot }) {
  const side = snapshot.side ?? snapshot.reference?.side;
  return (
    <View style={styles.visibility} accessible accessibilityLabel={visibilityLabel(snapshot)}>
      <Text style={styles.caption}>{side ? `Lado ${SIDE_LABEL[side]}` : 'Lado —'}</Text>
      {JOINTS.map((joint) => {
        const visible = snapshot.visibility[joint];
        return (
          <View key={joint} style={[styles.chip, visible ? styles.chipOk : styles.chipMissing]}>
            <Text style={styles.chipText}>
              {visible ? '✓' : '✕'} {JOINT_LABEL[joint]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function visibilityLabel(snapshot: SessionSnapshot): string {
  const visible = JOINTS.filter((joint) => snapshot.visibility[joint]).map((joint) => JOINT_LABEL[joint]);
  return visible.length === 4 ? 'Puntos corporales visibles' : `Visibles: ${visible.join(', ') || 'ninguno'}`;
}

function FeedbackBanner({ feedback, visibilityLost }: { feedback: Feedback | null; visibilityLost: boolean }) {
  if (visibilityLost || !feedback) return null;
  const within = feedback.kind === 'within';
  return (
    <View
      style={[styles.feedback, within ? styles.feedbackOk : styles.feedbackWarn]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={styles.feedbackIcon} accessibilityElementsHidden importantForAccessibility="no">
        {within ? '✓' : '!'}
      </Text>
      <View style={styles.flex}>
        <Text style={styles.feedbackText}>{feedback.message}</Text>
        {feedback.kind === 'deviation' && (
          <Text style={styles.feedbackDetail}>
            {feedback.metric === 'knee' ? 'Rodilla' : 'Tronco'} {feedback.deltaDeg > 0 ? '+' : ''}
            {Math.round(feedback.deltaDeg)}° respecto a la referencia
          </Text>
        )}
      </View>
    </View>
  );
}

function ReviewPanel({
  snapshot,
  onConfirm,
  onRetake,
  autoSaveSeconds,
}: {
  snapshot: SessionSnapshot;
  onConfirm: () => void;
  onRetake: () => void;
  /** Modo solo: guarda sola tras esta cuenta regresiva (null = esperar al botón). */
  autoSaveSeconds: number | null;
}) {
  const candidate = snapshot.candidate;
  // El panel se monta con cada captura: la cuenta parte de ese momento.
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const remaining =
    autoSaveSeconds === null ? null : Math.max(0, autoSaveSeconds - Math.floor((now - startedAt) / 1000));

  useEffect(() => {
    if (autoSaveSeconds === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [autoSaveSeconds]);

  useEffect(() => {
    if (remaining === 0) onConfirm();
  }, [remaining, onConfirm]);

  if (!candidate) return null;
  return (
    <View style={styles.review} accessibilityLiveRegion="polite">
      <Text style={styles.sectionTitle}>Referencia capturada</Text>
      <Text style={styles.reviewValues}>
        Rodilla {formatDeg(candidate.kneeAngle)} · Tronco {formatDeg(candidate.trunkLean)}
      </Text>
      {remaining !== null && remaining > 0 && (
        <Text style={styles.countdown}>Se guarda sola en {remaining} s</Text>
      )}
      <Text style={styles.caption}>
        Lado {SIDE_LABEL[candidate.side]}. El usuario debe mostrar este mismo lado a la cámara.
      </Text>
      <View style={styles.reviewActions}>
        <SecondaryButton label="Repetir captura" onPress={onRetake} grow />
        <PrimaryButton label={remaining !== null ? 'Guardar ahora' : 'Guardar referencia'} onPress={onConfirm} grow />
      </View>
    </View>
  );
}

function ToggleButton({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onToggle}
      style={({ pressed }) => [styles.small, value && styles.toggleOn, pressed && styles.pressed]}
    >
      <Text style={[styles.smallText, value && styles.toggleOnText]}>
        {label}: {value ? 'Sí' : 'No'}
      </Text>
    </Pressable>
  );
}

function Diagnostics({
  snapshot,
  stats,
  dropped,
  tolerance,
  onTolerance,
}: {
  snapshot: SessionSnapshot;
  stats: PipelineStats;
  dropped: number;
  tolerance: number;
  onTolerance: (value: number) => void;
}) {
  const live = snapshot.live;
  return (
    <ScrollView style={styles.diagnostics} contentContainerStyle={styles.diagnosticsContent}>
      <Text style={styles.mono}>
        Rodilla {live ? formatDeg(live.kneeAngle) : '—'} · Tronco {live ? formatDeg(live.trunkLean) : '—'} · fase{' '}
        {snapshot.stance}
      </Text>
      <Text style={styles.mono}>
        {stats.fps} fps · inferencia {stats.inferenceMs} ms · descartados {dropped} · orientación {stats.orientation}
      </Text>
      <Text style={styles.mono}>
        Respuesta última evaluación: {stats.responseMs === null ? '—' : `${stats.responseMs} ms`}
      </Text>
      <View style={styles.toleranceRow}>
        <Text style={styles.mono}>Tolerancia ±{tolerance}°</Text>
        <SmallButton label="−5°" onPress={() => onTolerance(tolerance - 5)} accessibilityLabel="Reducir tolerancia" />
        <SmallButton label="+5°" onPress={() => onTolerance(tolerance + 5)} accessibilityLabel="Aumentar tolerancia" />
      </View>
    </ScrollView>
  );
}

type ButtonProps = { label: string; /** Ocupa el espacio disponible en una fila. */ grow?: boolean } & Omit<
  PressableProps,
  'children' | 'style'
>;

function PrimaryButton({ label, grow, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [styles.button, styles.primary, grow && styles.grow, pressed && styles.pressed]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, grow, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [styles.button, styles.secondary, grow && styles.grow, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({ label, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      {...props}
      style={({ pressed }) => [styles.small, pressed && styles.pressed]}
    >
      <Text style={styles.smallText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  flex: { flex: 1 },
  top: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: colors.surfaceTranslucent,
    gap: space.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  headerActions: { flexDirection: 'row', gap: space.sm },
  brand: { color: colors.text, fontSize: 22, fontWeight: '800', fontStyle: 'italic', letterSpacing: 0.5 },
  brandAccent: { color: colors.accent },
  steps: { flexDirection: 'row', gap: space.sm },
  step: {
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepActive: { borderColor: colors.accent, backgroundColor: 'rgba(198, 246, 78, 0.15)' },
  stepText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  stepTextActive: { color: colors.accent },
  visibility: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs },
  chip: { paddingVertical: 2, paddingHorizontal: space.sm, borderRadius: radius.sm, borderWidth: 1 },
  chipOk: { borderColor: colors.success },
  chipMissing: { borderColor: colors.error, backgroundColor: 'rgba(255, 122, 122, 0.15)' },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.surfaceTranslucent,
    gap: space.md,
  },
  status: { color: colors.text, fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { color: colors.text, fontSize: 16, lineHeight: 22 },
  caption: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', fontStyle: 'italic' },
  sectionTitle: { color: colors.signature, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  tips: { gap: space.xs },
  tip: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  step1: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  referenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  feedbackOk: { borderColor: colors.success, backgroundColor: 'rgba(79, 209, 165, 0.18)' },
  feedbackWarn: { borderColor: colors.warning, backgroundColor: 'rgba(245, 185, 78, 0.18)' },
  feedbackIcon: { color: colors.text, fontSize: 34, fontWeight: '800', width: 36, textAlign: 'center' },
  feedbackText: { color: colors.text, fontSize: 26, fontWeight: '800', lineHeight: 31 },
  feedbackDetail: { color: colors.textSecondary, fontSize: 14, marginTop: 2 },
  review: { gap: space.sm },
  reviewValues: { color: colors.text, fontSize: 28, fontWeight: '800' },
  // En fila, los botones se reparten el ancho; en columna mantienen su altura.
  reviewActions: { flexDirection: 'row', gap: space.md, marginTop: space.xs },
  grow: { flex: 1 },
  diagnostics: { maxHeight: 140, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.sm },
  diagnosticsContent: { padding: space.sm, gap: 2 },
  mono: { color: colors.text, fontSize: 12, fontFamily: 'Menlo' },
  toleranceRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  permission: { padding: space.xl, gap: space.lg },
  button: {
    minHeight: 52,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  primaryText: { color: colors.onAccent, fontSize: 17, fontWeight: '800' },
  secondary: { borderWidth: 1.5, borderColor: colors.text },
  secondaryText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  small: {
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  toggleOn: { borderColor: colors.accent, backgroundColor: 'rgba(198, 246, 78, 0.15)' },
  toggleOnText: { color: colors.accent },
  countdown: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
