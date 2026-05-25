const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add CSS support for web (tamagui metro-plugin is not needed for native)
config.resolver.sourceExts = [...new Set([...config.resolver.sourceExts, 'css'])];

module.exports = config;
