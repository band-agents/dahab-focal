/**
 * Which origins may call this API from a browser.
 *
 * Its own module so it can be tested. The wrong answer here is the one that
 * lets any page on the internet make authenticated calls with a visitor's
 * session, and that is not a thing to leave uncovered.
 */

/**
 * `localhost`, `127.0.0.1` and `[::1]`, on any port, http or https.
 *
 * All three are the same machine and a browser treats them as three different
 * origins, so all three are matched.
 */
const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export function parseOrigins(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ''),
  );
}

/**
 * In development, anything on this machine is allowed without being listed.
 *
 * The operator app runs on 4320, the traveller app on 4330, and Expo picks a
 * new port whenever one is busy — so a fixed allowlist means the first thing
 * a developer sees is every request failing with "cannot reach the server",
 * which is not what went wrong and sends them looking at the network instead
 * of at CORS. It cost exactly that once.
 *
 * In production nothing is implicit: every origin must be named.
 */
export function isAllowedOrigin(
  origin: string,
  allowed: ReadonlySet<string>,
  isProduction: boolean,
): boolean {
  if (allowed.has(origin)) return true;
  return !isProduction && LOOPBACK.test(origin);
}
