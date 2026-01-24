module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: 
      [  // expo-router plugin
        'expo-router/babel',
        // react-native-reanimated plugin (if you use Reanimated). Keep it last.
        'react-native-worklets/plugin'],
  };
};
