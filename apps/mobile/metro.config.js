// Expo configura Metro automáticamente para el monorepo (npm workspaces).
// Solo se añade la extensión de los modelos TFLite como asset.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('tflite');

module.exports = config;
