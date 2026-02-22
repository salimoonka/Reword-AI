/**
 * Expo Config Plugin — Android Keyboard (InputMethodService)
 *
 * This plugin runs during `expo prebuild` / EAS Build and:
 *   1. Injects the RewordKeyboardService <service> into AndroidManifest.xml
 *   2. Adds INTERNET & VIBRATE permissions
 *   3. Appends Kotlin-coroutines + Gson dependencies to app/build.gradle
 *   4. Copies the native Kotlin source files & resources into the generated
 *      android project so Gradle can compile them.
 *   5. Merges keyboard-specific strings into res/values/strings.xml
 *   6. Registers the SharedStoragePackage in MainApplication
 */

const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively copy a directory tree */
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// 1.  AndroidManifest — service + permissions
// ---------------------------------------------------------------------------

function addKeyboardService(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;

    // --- Permissions ---------------------------------------------------
    const perms = manifest.manifest['uses-permission'] || [];
    const ensurePerm = (name) => {
      if (!perms.some((p) => p.$?.['android:name'] === name)) {
        perms.push({ $: { 'android:name': name } });
      }
    };
    ensurePerm('android.permission.INTERNET');
    ensurePerm('android.permission.VIBRATE');
    manifest.manifest['uses-permission'] = perms;

    // --- Service -------------------------------------------------------
    const app = manifest.manifest.application?.[0];
    if (!app) return mod;

    app.service = app.service || [];

    // Guard against duplicate if plugin runs twice
    const alreadyAdded = app.service.some(
      (s) => s.$?.['android:name'] === 'ai.reword.keyboard.RewordKeyboardService'
    );
    if (!alreadyAdded) {
      app.service.push({
        $: {
          'android:name': 'ai.reword.keyboard.RewordKeyboardService',
          'android:label': '@string/keyboard_name',
          'android:permission': 'android.permission.BIND_INPUT_METHOD',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.view.InputMethod' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.view.im',
              'android:resource': '@xml/method',
            },
          },
        ],
      });
    }

    return mod;
  });
}

// ---------------------------------------------------------------------------
// 2.  app/build.gradle — Kotlin coroutines + Gson
// ---------------------------------------------------------------------------

function addGradleDependencies(config) {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    const deps = [
      "implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'",
      "implementation 'com.google.code.gson:gson:2.10.1'",
    ];

    for (const dep of deps) {
      if (!contents.includes(dep)) {
        // Insert after the opening of the `dependencies {` block
        contents = contents.replace(
          /dependencies\s*\{/,
          `dependencies {\n    ${dep}`
        );
      }
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

// ---------------------------------------------------------------------------
// 3.  Copy native source files & resources (withDangerousMod)
// ---------------------------------------------------------------------------

function copyNativeKeyboardFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const platformRoot = mod.modRequest.platformProjectRoot; // android/

      const srcBase = path.join(projectRoot, 'plugins', 'keyboard-src');
      const mainDir = path.join(platformRoot, 'app', 'src', 'main');

      // --- Kotlin sources -----------------------------------------------
      const javaSrc = path.join(srcBase, 'java');
      const javaDst = path.join(mainDir, 'java');
      if (fs.existsSync(javaSrc)) {
        copyDirSync(javaSrc, javaDst);
        console.log('[withAndroidKeyboard] Copied Kotlin keyboard sources');
      }

      // --- res/xml/method.xml -------------------------------------------
      const xmlSrc = path.join(srcBase, 'res', 'xml');
      const xmlDst = path.join(mainDir, 'res', 'xml');
      if (fs.existsSync(xmlSrc)) {
        copyDirSync(xmlSrc, xmlDst);
        console.log('[withAndroidKeyboard] Copied res/xml resources');
      }

      // --- Merge keyboard strings into res/values/strings.xml -----------
      const keyboardStringsPath = path.join(srcBase, 'res', 'values', 'strings.xml');
      const appStringsPath = path.join(mainDir, 'res', 'values', 'strings.xml');

      if (fs.existsSync(keyboardStringsPath)) {
        const keyboardXml = fs.readFileSync(keyboardStringsPath, 'utf-8');

        // Extract all <string> entries from keyboard strings.xml
        const stringRegex = /<string\s+name="([^"]+)">([\s\S]*?)<\/string>/g;
        const keyboardStrings = [];
        let match;
        while ((match = stringRegex.exec(keyboardXml)) !== null) {
          keyboardStrings.push({ name: match[1], value: match[2] });
        }

        if (fs.existsSync(appStringsPath)) {
          let appXml = fs.readFileSync(appStringsPath, 'utf-8');

          for (const { name, value } of keyboardStrings) {
            // Skip app_name — Expo sets it from app.json
            if (name === 'app_name') continue;

            // Only add if not already present
            if (!appXml.includes(`name="${name}"`)) {
              appXml = appXml.replace(
                '</resources>',
                `    <string name="${name}">${value}</string>\n</resources>`
              );
            }
          }

          fs.writeFileSync(appStringsPath, appXml, 'utf-8');
          console.log('[withAndroidKeyboard] Merged keyboard strings into strings.xml');
        } else {
          // No Expo-generated strings.xml yet — just copy ours
          fs.mkdirSync(path.dirname(appStringsPath), { recursive: true });
          fs.copyFileSync(keyboardStringsPath, appStringsPath);
          console.log('[withAndroidKeyboard] Created strings.xml from keyboard source');
        }
      }

      return mod;
    },
  ]);
}

// ---------------------------------------------------------------------------
// 4.  Register SharedStoragePackage in MainApplication (React Native bridge)
// ---------------------------------------------------------------------------

function registerNativePackage(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;

    const importLine = 'import ai.reword.keyboard.bridge.SharedStoragePackage';
    const addCall = 'add(SharedStoragePackage())';

    // Add import if missing
    if (!contents.includes(importLine)) {
      // Insert import after the last existing import
      contents = contents.replace(
        /(import [^\n]+\n)(?!import)/,
        `$1${importLine}\n`
      );
    }

    // Add package registration if missing
    if (!contents.includes('SharedStoragePackage()')) {
      // Pattern 1: Expo's default `.packages.apply { ... }` block
      if (contents.includes('packages.apply')) {
        contents = contents.replace(
          /(packages\.apply\s*\{)/,
          `$1\n              ${addCall}`
        );
      }
      // Pattern 2: `val packages = PackageList(this).packages`
      else if (contents.includes('PackageList(this).packages')) {
        contents = contents.replace(
          /(val packages\s*=\s*PackageList\(this\)\.packages)/,
          `$1\n        packages.add(SharedStoragePackage())`
        );
      }
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

// ---------------------------------------------------------------------------
// Main plugin
// ---------------------------------------------------------------------------

function withAndroidKeyboard(config) {
  config = addKeyboardService(config);
  config = addGradleDependencies(config);
  config = copyNativeKeyboardFiles(config);
  config = registerNativePackage(config);
  return config;
}

module.exports = withAndroidKeyboard;
