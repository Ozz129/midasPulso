// Config plugin: compila los shaders Vulkan de las librerías nativas en Android.
//
// Por qué: react-native-vision-camera-resizer redimensiona los fotogramas en la GPU
// con un shader (src/main/shaders/Resizer.comp) que AGP debe compilar a
// shaders/Resizer.comp.spv. Desde AGP 8 la función `shaders` viene apagada por
// defecto y la librería no la enciende; además AGP 9 exige `glslc.dir`. Sin esto la
// app falla en tiempo de ejecución con "Failed to open Vulkan shader asset".
//
// Qué hace (en cualquier sistema operativo):
// 1. Activa buildFeatures.shaders en las librerías que tienen src/main/shaders.
// 2. Escribe glslc.dir en android/local.properties apuntando al glslc del NDK.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { withDangerousMod, withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// @mydas-pulso/android-shaders';

const ROOT_SNIPPET = `
${MARKER}
subprojects { sub ->
  sub.plugins.withId('com.android.library') {
    if (new File(sub.projectDir, 'src/main/shaders').exists()) {
      sub.androidComponents.finalizeDsl { ext -> ext.buildFeatures.shaders = true }
    }
  }
}
`;

function androidSdkDir() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv) return fromEnv;
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Android', 'sdk');
  return path.join(os.homedir(), 'Android', 'Sdk');
}

/** Versión de NDK que usa React Native (gradle/libs.versions.toml). */
function reactNativeNdkVersion(projectRoot) {
  const toml = path.join(path.dirname(require.resolve('react-native/package.json', { paths: [projectRoot] })), 'gradle', 'libs.versions.toml');
  const match = fs.readFileSync(toml, 'utf8').match(/^ndkVersion\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error(`No se encontró ndkVersion en ${toml}`);
  return match[1];
}

function glslcDir(projectRoot) {
  const host = { win32: 'windows-x86_64', darwin: 'darwin-x86_64' }[process.platform] ?? 'linux-x86_64';
  return path.join(androidSdkDir(), 'ndk', reactNativeNdkVersion(projectRoot), 'shader-tools', host);
}

/** Añade o reemplaza `key=value` en un archivo .properties. */
function setProperty(file, key, value) {
  const escaped = value.replace(/\\/g, '/'); // Java .properties: barras normales, sin escapes
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  const kept = lines.filter((line) => line.trim() !== '' && !line.startsWith(`${key}=`));
  fs.writeFileSync(file, [...kept, `${key}=${escaped}`].join('\n') + '\n');
}

module.exports = function withAndroidShaders(config) {
  config = withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language === 'groovy' && !mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += ROOT_SNIPPET;
    }
    return mod;
  });
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const { projectRoot, platformProjectRoot } = mod.modRequest;
      setProperty(path.join(platformProjectRoot, 'local.properties'), 'glslc.dir', glslcDir(projectRoot));
      return mod;
    },
  ]);
};
