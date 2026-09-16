import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the API is, from wherever this app happens to be running.
 *
 * `127.0.0.1` means *this device*. On a laptop browser that is the machine
 * running the API and everything works; on a phone it is the phone, and every
 * request fails with no explanation an operator could act on. This is the
 * single most common way a working app looks broken the first time it is
 * opened on a handset.
 *
 * So the host is derived rather than assumed:
 *
 *  1. `EXPO_PUBLIC_DAHAB_API_URL` wins if it is set — that is the production
 *     answer and the escape hatch.
 *  2. Otherwise, in development, take the host Expo is already serving this
 *     bundle from (`hostUri` is `192.168.1.13:8081` when a phone is on the
 *     same network) and point at port 4000 on it. The phone reached Metro
 *     over that address, so it can reach the API over it too.
 *  3. Failing both, `127.0.0.1:4000` — correct on a laptop, and the only
 *     sensible guess left.
 */

/** The port `apps/api` listens on by default, and what `.env.example` documents. */
const API_PORT = 4000;

function fromExpoHost(): string | null {
  // `hostUri` is only present while Metro is serving; a standalone build has
  // no dev server and must be told where the API is.
  const hostUri: unknown =
    Constants.expoConfig?.hostUri ??
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;

  if (typeof hostUri !== 'string' || hostUri === '') return null;

  const host = hostUri.split(':')[0];
  if (host === undefined || host === '') return null;
  return `http://${host}:${API_PORT}`;
}

function resolve(): string {
  const configured = process.env['EXPO_PUBLIC_DAHAB_API_URL'];
  if (configured !== undefined && configured !== '') return configured;

  // On the web the page's own origin already proves what the laptop can
  // reach, and localhost is right there.
  if (Platform.OS !== 'web') {
    const derived = fromExpoHost();
    if (derived !== null) return derived;
  }

  return `http://127.0.0.1:${API_PORT}`;
}

export const API_URL = resolve();
