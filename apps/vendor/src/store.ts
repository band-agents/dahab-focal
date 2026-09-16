import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Where the operator's credentials live.
 *
 * Two stores, because the two platforms offer genuinely different things and
 * pretending otherwise would mean using the weaker one everywhere:
 *
 * - **On a phone: the keychain.** iOS Keychain and Android's EncryptedSharedPreferences,
 *   through `expo-secure-store`. The token is encrypted at rest, held per app,
 *   and gone when the app is uninstalled. This is the one that matters —
 *   a dive centre's phone is shared, dropped, and occasionally stolen.
 * - **On the web: `localStorage`.** Readable by any script that reaches the
 *   page, which is a real weakness and is why the console uses httpOnly
 *   cookies instead. The operator app cannot: it is a client calling an API,
 *   and a cookie it cannot read is a cookie it cannot send. Named here rather
 *   than left to be discovered.
 *
 * Both are **synchronous**. That is load-bearing: the session is read at
 * module scope so the first paint is already Arabic, and an async read would
 * mean a flash of English on the one surface that must never show it.
 * `SecureStore.getItem` has been synchronous since SDK 50.
 */

const isWeb = Platform.OS === 'web';

export function readRaw(key: string): string | null {
  try {
    if (isWeb) {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    }
    return SecureStore.getItem(key);
  } catch {
    // A locked keychain, a private window, a browser with site data blocked —
    // all read as "not signed in" rather than crashing at launch, which is the
    // worst possible moment for it.
    return null;
  }
}

export function writeRaw(key: string, value: string): void {
  try {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    SecureStore.setItem(key, value);
  } catch {
    // Failing to persist means they sign in again next launch. Worth not
    // crashing over, and there is nowhere better to put it.
  }
}

export function removeRaw(key: string): void {
  try {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    // The async delete is the only one SecureStore offers. Signing out does
    // not wait for it: the in-memory session is dropped first, so the UI is
    // already signed out whether or not the write lands.
    void SecureStore.deleteItemAsync(key);
  } catch {
    // Same reasoning as above.
  }
}
