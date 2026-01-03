// const {
//   getSentryExpoConfig
// } = require("@sentry/react-native/metro");
const { getDefaultConfig } = require('expo/metro-config');
const path = require("path");

const config = getDefaultConfig(__dirname);
// const config = getSentryExpoConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
...transformer,
babelTransformerPath: require.resolve("react-native-svg-transformer"),
}

config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...resolver.sourceExts, "svg"],
    
    // Use mock for Firebase in Expo Go
    resolveRequest: (context, moduleName, platform) => {
      // Always redirect Firebase imports to mock - it's safe and works everywhere
      if (moduleName === '@react-native-firebase/analytics') {
        return {
          filePath: path.resolve(__dirname, 'mocks/firebase-analytics.js'),
          type: 'sourceFile',
        };
      }
      
      // Use default resolver for everything else
      return context.resolveRequest(context, moduleName, platform);
    },
  };

module.exports = config;