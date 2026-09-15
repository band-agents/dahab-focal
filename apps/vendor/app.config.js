const tokens = require('@dahab/tokens/tokens.json');

/**
 * The operator app's native configuration.
 *
 * A `.js` config rather than `app.json` for one reason: the splash background
 * and the adaptive icon's ground are **colours**, and this project's rule is
 * that a colour is defined in `tokens.json` and nowhere else. A JSON config
 * cannot import, so those two values would have been hexes typed into a file
 * `pnpm lint:hardcoded` does not even scan — the exact shape of drift the
 * rule exists to prevent.
 */

/** @param {string} name */
const color = (name) => {
  const entry = tokens.color.light[name];
  if (entry === undefined) throw new Error(`No colour token called ${name}.`);
  return entry.value;
};

module.exports = {
  expo: {
    name: 'Dahab Focal for operators',
    slug: 'dahab-focal-vendor',
    version: '0.1.0',
    scheme: 'dahabfocalvendor',
    // A guide holds this one-handed at the dock. There is no landscape layout
    // and pretending otherwise would just let the manifest reflow badly.
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      // `contain`, not `cover`: the mark has deliberate breathing room around
      // it and cropping would cut the offset silhouette off.
      resizeMode: 'contain',
      backgroundColor: color('cream-50'),
    },

    ios: {
      /**
       * Permanent once the app is first published to the App Store — Apple
       * does not allow it to change. Worth a deliberate look before the first
       * submission; trivially changeable until then.
       */
      bundleIdentifier: 'com.dahabfocal.operators',
      supportsTablet: false,
      infoPlist: {
        // The full name does not fit under a home-screen icon.
        CFBundleDisplayName: 'Dahab Focal',
        // Arabic is the default and the app ships all seven; without this iOS
        // will refuse to show a locale the device is not itself set to.
        CFBundleAllowMixedLocalizations: true,
        // True of this app: HTTPS only, no bespoke cryptography. Declaring it
        // skips the export-compliance question on every single submission.
        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      package: 'com.dahabfocal.operators',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: color('info-surface'),
      },
      // Android 15 draws edge to edge whether an app opts in or not. Saying so
      // means the insets are reported correctly rather than the content
      // sitting under the system bars — which is what `Screen` then pads for.
      edgeToEdgeEnabled: true,
    },

    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },

    plugins: [
      'expo-router',

      /**
       * The three typefaces, registered under the names the design system
       * already uses — `Baloo 2`, `Rubik`, `Baloo Bhaijaan 2` — so one name
       * resolves on both platforms and the Tailwind config needs no
       * per-platform branch.
       *
       * These are the **TTFs** in `fonts/native`, not the woff2 the web
       * pipeline fetches: React Native cannot read woff2 at all, and one that
       * found its way in here would register without complaint and then draw
       * the system font on every screen.
       *
       * Rubik is declared with its three weights because the design uses
       * 300/400/500 and native will not interpolate a variable face reliably
       * across both platforms. `packages/tokens/tests/fonts-native.test.ts`
       * asserts each of these carries the scripts it has to.
       */
      [
        'expo-font',
        {
          fonts: [
            {
              fontFamily: 'Rubik',
              fontDefinitions: [
                { path: './assets/fonts/Rubik-Light.ttf', weight: 300 },
                { path: './assets/fonts/Rubik-Regular.ttf', weight: 400 },
                { path: './assets/fonts/Rubik-Medium.ttf', weight: 500 },
              ],
            },
            {
              fontFamily: 'Baloo 2',
              fontDefinitions: [
                { path: './assets/fonts/Baloo2-SemiBold.ttf', weight: 600 },
              ],
            },
            {
              fontFamily: 'Baloo Bhaijaan 2',
              fontDefinitions: [
                {
                  path: './assets/fonts/BalooBhaijaan2-SemiBold.ttf',
                  weight: 600,
                },
              ],
            },
          ],
        },
      ],

      // expo-secure-store's plugin declares the Face ID usage string iOS
      // requires before the keychain can be unlocked biometrically.
      'expo-secure-store',
    ],

    experiments: {
      typedRoutes: true,
    },
  },
};
