module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      // Must stay last, same as react-native-reanimated's own requirement.
      'react-native-reanimated/plugin',
    ],
  };
};
