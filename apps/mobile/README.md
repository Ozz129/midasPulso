# Pulso Mobile — PoC de postura

Prueba de concepto: un coach captura una **postura de referencia** de sentadilla y la app la compara **en tiempo real** con la sentadilla de un usuario, usando la cámara del teléfono. Todo se procesa en el dispositivo. Sin cuentas, sin Core, sin red.

## Stack y por qué

| Pieza | Elección |
| --- | --- |
| App | Expo SDK 58 · React Native 0.88 · TypeScript, con **development build** (no Expo Go) |
| Cámara y fotogramas en vivo | `react-native-vision-camera` 5 (`useFrameOutput`) + `-worklets` + `-resizer` (redimensionado en GPU) |
| Detección de puntos corporales | **MoveNet SinglePose Lightning int8** (Google, Apache 2.0) con `react-native-fast-tflite` 3 |
| Lógica de evaluación | TypeScript puro en `src/assessment/` (sin React Native), probada con Vitest |

VisionCamera 5 no trae detección de pose propia. MoveNet sobre fast-tflite funciona en iOS y Android sin escribir código nativo, por eso se eligió frente a un plugin propio en Swift sobre Apple Vision. Ambas librerías nativas exigen un development build.

Modelo verificado sobre el archivo (`assets/models/movenet-singlepose-lightning-int8.tflite`, SHA-256 `cd7cc22f…bb105`): entrada `uint8 [1,192,192,3]`, salida `float32 [1,1,17,3]` (y, x, confianza).

## Estructura

```
apps/mobile/
  App.tsx                  Entrada: SafeArea + pantalla del PoC
  src/
    pose/                  Cámara y detección (React Native)
      usePoseDetection.ts  Fotograma → resize 192×192 (contain) → MoveNet → 17 puntos
      movenet.ts           Decodificación de la salida y corrección de orientación (puro, probado)
    assessment/            Evaluación en TypeScript puro, reutilizable en web
      geometry.ts          Ángulo en un vértice, inclinación respecto a la vertical
      metrics.ts           Rodilla (cadera–rodilla–tobillo) y tronco (hombro–cadera)
      evaluation.ts        Comparación con la referencia (±15°) y una sola indicación
      squatDetector.ts     Llegada abajo tras descenso + pausa estable; rearme de pie
      session.ts           Fases: referencia → revisión → prueba
      config.ts            Tolerancia y umbrales configurables
    screen/                Pantalla única (UI)
  assets/models/           Modelo MoveNet
```

## Cómo evalúa

1. **Puntos requeridos** de un lado del cuerpo: hombro, cadera, rodilla y tobillo, con confianza ≥ 0,3.
2. **Ángulo de rodilla**: interior en la rodilla entre cadera y tobillo (180° = pierna extendida). **Tronco**: inclinación de cadera→hombro respecto a la vertical (0° = erguido).
3. **Posición inferior**: tras estar de pie (rodilla ≥ 160°), la rodilla baja de 145° y la persona se queda quieta **700 ms**. «Quieta» se mide de forma robusta frente al temblor del detector:
   - la dispersión (desviación absoluta mediana) de cada ángulo es ≤ 8° en la rodilla y ≤ 6° en el tronco;
   - la tendencia (pendiente de Theil-Sen) cambia como máximo 8° y 7° en la ventana, para no confundir una bajada lenta con la pausa;
   - un fotograma suelto sin puntos no reinicia la pausa.

   El valor evaluado es la mediana de la ventana. Se evalúa una sola vez por repetición; para la siguiente hay que volver de pie. Estos valores se calibraron con lecturas reales de una Galaxy Tab Active3 (MoveNet a ~12 fps; quieto, la rodilla oscila ±5° con saltos de hasta ±15°).
4. **Feedback**: tolerancia **±15° por ángulo** (ajustable en «Datos»). Dentro → «Postura dentro del objetivo». Si hay desviaciones, se muestra solo la que más excede su tolerancia:
   - Rodilla más extendida → «Baja más: flexiona más las rodillas»
   - Rodilla más flexionada → «No bajes tanto: sube un poco la cadera»
   - Tronco más inclinado → «Endereza el tronco: te estás inclinando de más»
   - Tronco más vertical → «Inclina un poco más el tronco hacia delante»
5. **Visibilidad**: si faltan puntos requeridos durante más de 300 ms (o la persona muestra el otro lado), se retira el resultado y se pide ajustar la posición. Al recuperarla hay que volver de pie antes de evaluar otra vez.

Los fotogramas se analizan y se liberan en el hilo de la cámara; solo los 17 puntos cruzan a JS. La referencia vive en memoria durante la sesión.

Todos los umbrales están en `src/assessment/config.ts`.

## Comandos (desde la raíz del monorepo)

| Comando | Qué hace |
| --- | --- |
| `npm run test -w @mydas-pulso/mobile` | Pruebas de reglas con puntos conocidos (Vitest) |
| `npm run typecheck -w @mydas-pulso/mobile` | TypeScript |
| `npm run lint -w @mydas-pulso/mobile` | oxlint |
| `npm run doctor -w @mydas-pulso/mobile` | `expo-doctor`: dependencias y configuración |
| `npm run dev:mobile` | Servidor de desarrollo para el development build (`expo start --dev-client`) |

## Abrir la app en un iPhone físico

La app usa módulos nativos: **no funciona en Expo Go**. Hace falta instalar un development build una vez; después, los cambios de JavaScript llegan por el servidor de desarrollo. Hay que volver a compilar solo si cambian dependencias nativas o `app.json`.

### Opción A — Desde Windows con EAS Build (en la nube)

Requisitos:
- Cuenta de Expo (gratuita).
- **Membresía de pago del Apple Developer Program**: la instalación en dispositivos (distribución interna *ad hoc*) la exige.
- iPhone con iOS 16 o superior: activa **Modo de desarrollador** (Ajustes › Privacidad y seguridad › Modo de desarrollador) tras instalar la app.
- iPhone y PC en la misma red Wi-Fi para conectar con el servidor de desarrollo.

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest device:create          # registra el iPhone (abre un enlace/QR en el teléfono)
npx eas-cli@latest build --profile development --platform ios
```

EAS pide iniciar sesión con la cuenta de Apple y gestiona certificados y perfil *ad hoc*. Al terminar, abre en el iPhone el enlace o QR de la compilación para instalarla. Con membresías nuevas, Apple puede tardar 24–72 h en habilitar un dispositivo recién registrado.

Luego, en la raíz del repo:

```bash
npm run dev:mobile
```

Abre «Pulso PoC» en el iPhone y elige el servidor que aparece en la pantalla del development build, o escanea el QR que imprime la terminal.

### Opción B — En una Mac con Xcode

Requisitos: macOS con Xcode, iPhone conectado por cable y en Modo de desarrollador. Para firmar basta una cuenta Apple en Xcode (equipo personal gratuito; el perfil caduca a los 7 días) o el equipo de pago.

```bash
npm install                                # en la raíz
npm run ios:device                         # = expo run:ios --device (genera ios/, compila e instala)
```

La carpeta `ios/` se genera (Continuous Native Generation) y está en `.gitignore`: no se edita a mano; la configuración vive en `app.json` y los config plugins.

## Estado

Las reglas, la orquestación y la decodificación de MoveNet tienen pruebas automáticas. **La captura con cámara real en iPhone queda pendiente de validar en el dispositivo** con el protocolo de [PROTOCOLO-PRUEBA.md](PROTOCOLO-PRUEBA.md).
