const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Shim native-only modules that can't resolve in Expo Go
const SHIM_MODULES = {
  'react-native-nitro-modules': path.resolve(
    __dirname,
    'src/shims/react-native-nitro-modules.js',
  ),
};

const originalResolveRequest = config.resolver?.resolveRequest;

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (SHIM_MODULES[moduleName]) {
      return {
        filePath: SHIM_MODULES[moduleName],
        type: 'sourceFile',
      };
    }
    // Fall back to the default resolver
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
