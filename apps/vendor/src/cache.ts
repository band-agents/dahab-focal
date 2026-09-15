import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * The last good answer, kept so the app still works with no signal.
 *
 * CLAUDE.md: "Mobile signal in Dahab is patchy. Offline is a designed state,
 * not an error." The Blue Hole road drops out most mornings between Assalah
 * and the rim, which is exactly where a guide opens the manifest — so a
 * screen that can only say "no signal" is useless at the one moment it is
 * needed most.
 *
 * Two backings, because the platforms offer different things and neither is a
 * reasonable stand-in for the other:
 *
 * - **On a phone: the app's document directory**, through expo-file-system.
 *   A manifest is several kilobytes of JSON and there is no size limit worth
 *   worrying about.
 * - **On the web: `localStorage`.**
 *
 * Deliberately *not* the keychain, which is where the credentials go. These
 * are manifests and service lists; putting rows a guide reads forty times a
 * morning behind a biometric prompt would be absurd, and Android's secure
 * store caps a value at 2 kB — smaller than a single boat's manifest.
 *
 * Every cached answer carries **when it was taken**. A guide reading a
 * manifest has to know whether it is four seconds old or from yesterday
 * morning: a stale manifest presented as current is how somebody gets left
 * standing on the shore.
 */

const PREFIX = 'dahab.vendor.cache.';
const isWeb = Platform.OS === 'web';

/** Beyond this, a cached answer is shown with its age rather than plainly. */
export const STALE_AFTER_MS = 15 * 60 * 1000;

export interface Cached<T> {
  readonly data: T;
  /** Milliseconds since the epoch, from the device's own clock. */
  readonly at: number;
}

/** `…/Documents/cache/` — created on first write, never assumed to exist. */
function directory(): string | null {
  const base = FileSystem.documentDirectory;
  return base === null ? null : `${base}cache/`;
}

function fileFor(key: string): string | null {
  const dir = directory();
  // The key is ours, not a caller's, but encoding it keeps a future key with
  // a slash in it from silently writing outside the directory.
  return dir === null ? null : `${dir}${encodeURIComponent(key)}.json`;
}

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    let raw: string | null = null;

    if (isWeb) {
      raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(PREFIX + key);
    } else {
      const file = fileFor(key);
      if (file === null) return null;
      const info = await FileSystem.getInfoAsync(file);
      if (!info.exists) return null;
      raw = await FileSystem.readAsStringAsync(file);
    }

    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<Cached<T>>;
    if (typeof parsed.at !== 'number' || parsed.data === undefined) return null;
    return { data: parsed.data as T, at: parsed.at };
  } catch {
    // A half-written file or a cleared store reads as "nothing cached". The
    // caller then shows its own offline notice, which is the honest outcome.
    return null;
  }
}

export async function writeCache<T>(key: string, data: T, at = Date.now()): Promise<void> {
  const payload = JSON.stringify({ data, at });
  try {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(PREFIX + key, payload);
      return;
    }
    const dir = directory();
    const file = fileFor(key);
    if (dir === null || file === null) return;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    await FileSystem.writeAsStringAsync(file, payload);
  } catch {
    // A full disk is not worth failing a request that already succeeded over.
  }
}

/**
 * Everything cached, dropped on sign-out.
 *
 * One phone at a dive centre is several guides. The next person to sign in
 * must not find the last one's manifest sitting there.
 */
export async function clearCache(): Promise<void> {
  try {
    if (isWeb) {
      if (typeof localStorage === 'undefined') return;
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(PREFIX)) localStorage.removeItem(key);
      }
      return;
    }
    const dir = directory();
    if (dir === null) return;
    await FileSystem.deleteAsync(dir, { idempotent: true });
  } catch {
    // Nothing useful to do, and the next sign-in overwrites it anyway.
  }
}
