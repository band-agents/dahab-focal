import { API_URL } from './apiUrl';
import { readStored, writeStored } from './auth';

/**
 * Trading the refresh token in for a new pair.
 *
 * The access token lasts fifteen minutes. Without this the app signs a guide
 * out in the middle of a morning — not at a sensible moment, but at whatever
 * moment they next pull the manifest, which on a dive boat is the worst one
 * available. The console gets this from its middleware; this app had nothing.
 *
 * **One refresh at a time.** Four screens loading at once means four 401s at
 * once, and four refreshes would rotate the token four times — three of them
 * racing to store a value the others have already replaced, leaving the app
 * holding a token the server has spent. The in-flight promise is shared so
 * they all wait on the same one.
 */

let inFlight: Promise<boolean> | null = null;

async function rotate(): Promise<boolean> {
  const stored = readStored();
  if (stored === null) return false;

  try {
    const response = await fetch(`${API_URL}/auth.refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    });
    const payload = (await response.json()) as {
      result?: { data?: { accessToken: string; refreshToken: string } };
    };
    const credentials = payload.result?.data;
    if (credentials === undefined) return false;

    // Everything else about the session is unchanged — the role and the
    // vendor came from the account and a rotation does not alter either.
    writeStored({
      ...stored,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
    });
    return true;
  } catch {
    // No signal. Not a sign-out: the caller falls through to its cache, and
    // the token is still good once the connection comes back.
    return false;
  }
}

export function refreshSession(): Promise<boolean> {
  inFlight ??= rotate().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
