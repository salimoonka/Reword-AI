/**
 * Shim for react-native-nitro-modules
 * 
 * react-native-iap v14+ depends on Nitro Modules which require native code.
 * In Expo Go, native modules aren't available, so we provide this shim
 * to allow Metro bundling to succeed. IAP operations will gracefully
 * no-op at runtime via our service wrapper.
 */

const NitroModules = {
  createHybridObject: (name) => {
    console.warn(`[NitroModules shim] createHybridObject("${name}") called – native module unavailable (Expo Go)`);
    return new Proxy({}, {
      get: (_target, prop) => {
        if (typeof prop === 'string') {
          return () => {
            throw new Error(`NitroModules: native module "${name}" is not available in Expo Go`);
          };
        }
        return undefined;
      },
    });
  },
  hasHybridObject: () => false,
};

module.exports = { NitroModules };
module.exports.NitroModules = NitroModules;
module.exports.default = NitroModules;
