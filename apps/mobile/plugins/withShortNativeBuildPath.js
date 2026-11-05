// Config plugin: compilación nativa en Windows con rutas largas.
//
// Por qué: AGP compila el C++ en node_modules/<lib>/android/.cxx (y en app/.cxx), y
// ninja añade la ruta absoluta de cada fuente al nombre de los objetos. En este
// monorepo algunas rutas superan los 260 caracteres de Windows (hasta ≈359).
//
// Qué hace (solo en Windows; en macOS/Linux no cambia nada):
// 1. Usa CMake 3.31.6, cuyo ninja admite rutas largas. Requiere activar una vez
//    LongPathsEnabled en Windows (ver apps/mobile/README.md).
// 2. Compila en %USERPROFILE%\.cx\<id>, una carpeta corta, para dejar margen.
const { withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// @mydas-pulso/short-native-build-path';
const CMAKE_VERSION = '3.31.6';

// Cuerpo común: ajusta el CMake de un módulo dentro de finalizeDsl.
const configure = (projectRef) => `
    def cmake = ext.externalNativeBuild.cmake
    if (cmake.path != null) {
      cmake.version = '${CMAKE_VERSION}'
      // Id corto y estable por módulo para no colisionar entre proyectos.
      def id = Integer.toHexString(${projectRef}.projectDir.canonicalPath.hashCode())
      cmake.buildStagingDirectory = new File(new File(System.getProperty('user.home'), '.cx'), id)
    }`;

const IS_WINDOWS = `System.getProperty('os.name').toLowerCase().contains('windows')`;

// Librerías: se configuran desde el build.gradle raíz, antes de que se evalúen.
const ROOT_SNIPPET = `
${MARKER}
if (${IS_WINDOWS}) {
  subprojects { sub ->
    sub.plugins.withId('com.android.library') {
      sub.androidComponents.finalizeDsl { ext ->${configure('sub')}
      }
    }
  }
}
`;

// App: se evalúa antes que el script raíz, así que se configura en su propio build.gradle.
const APP_SNIPPET = `
${MARKER}
if (${IS_WINDOWS}) {
  androidComponents.finalizeDsl { ext ->${configure('project')}
  }
}
`;

const append = (snippet) => (mod) => {
  if (mod.modResults.language === 'groovy' && !mod.modResults.contents.includes(MARKER)) {
    mod.modResults.contents += snippet;
  }
  return mod;
};

module.exports = function withShortNativeBuildPath(config) {
  config = withProjectBuildGradle(config, append(ROOT_SNIPPET));
  return withAppBuildGradle(config, append(APP_SNIPPET));
};
