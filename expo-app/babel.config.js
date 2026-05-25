module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['@tamagui/babel-plugin', { disableExtraction: true, disableDebugAttr: true }],
  ],
};
