import { createServer } from 'node:http';

import { createHTTPHandler } from '@trpc/server/adapters/standalone';

import { closeDatabase, probeDatabase } from './database.ts';
import { createContext } from './context.ts';
import { logger } from './logger.ts';
import { appRouter } from './routers/index.ts';

/**
 * The standalone adapter, on node:http. No web framework: tRPC is the only
 * surface, and a framework would add routing we do not use and middleware we
 * would have to keep in step with the tRPC middleware we do use.
 */

const port = Number(process.env['PORT'] ?? 4000);
const environment = process.env['NODE_ENV'] ?? 'development';
const isProduction = environment === 'production';

/**
 * Refuse to boot rather than fail every sign-in.
 *
 * `AUTH_SECRET` is read lazily, when a token is signed or verified — so
 * without this check a server with no secret starts happily, answers its
 * health check, and then 500s on every authenticated request. A process that
 * will not come up is a deploy that fails loudly; a process that comes up
 * broken is an outage nobody is paged for.
 */
function requireEnvironment(): void {
  const problems: string[] = [];

  const secret = process.env['AUTH_SECRET'];
  if (secret === undefined || secret.length < 32) {
    problems.push('AUTH_SECRET must be set and at least 32 characters (openssl rand -base64 48)');
  }
  if (isProduction && secret === 'replace-me-before-running-anywhere-real') {
    problems.push('AUTH_SECRET is still the placeholder from .env.example');
  }
  if (isProduction && process.env['DATABASE_URL'] === undefined) {
    problems.push('DATABASE_URL must be set in production');
  }
  // The console transport prints one-time codes into the log. It refuses to
  // construct in production on its own; this says so at boot instead of at
  // the first sign-in attempt.
  if (isProduction && (process.env['OTP_TRANSPORT'] ?? 'console') === 'console') {
    problems.push('OTP_TRANSPORT=console logs every one-time code; set a real gateway');
  }

  if (problems.length > 0) {
    for (const problem of problems) logger.error('refusing to start', { problem });
    process.exit(1);
  }
}

/**
 * Cross-origin access, allowlisted and off by default.
 *
 * The admin console renders on a server and calls this from there, so it
 * needs no CORS at all. The browser surfaces will, and the wrong answer here
 * — `*` beside `Access-Control-Allow-Credentials` — is the one that lets any
 * page on the internet make authenticated calls with a visitor's cookie. So
 * origins are named explicitly in CORS_ORIGINS, and an unlisted one gets no
 * header rather than a permissive one.
 */
const allowedOrigins = new Set(
  (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== ''),
);

requireEnvironment();

const handler = createHTTPHandler({
  router: appRouter,
  createContext,
  onError({ error, path, ctx }) {
    // Client errors are the caller's problem and are already logged by the
    // rpc middleware; server errors are ours and get the stack.
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      (ctx?.logger ?? logger).error('unhandled error', {
        path,
        message: error.message,
        stack: error.stack,
      });
    }
  },
});

/**
 * The http server is ours and tRPC is what it delegates to, rather than the
 * other way round. Two things made that necessary, and both were found by
 * actually sending the requests:
 *
 *   - a preflight `OPTIONS` reached tRPC and came back 415, so every
 *     cross-origin POST would have failed before it was sent
 *   - tRPC sets its own `Vary` last, overwriting `Vary: Origin` — which is
 *     what stops a shared cache handing one origin's CORS headers to another
 */
const server = createServer((req, res) => {
  const origin = req.headers.origin;
  const allowed = typeof origin === 'string' && allowedOrigins.has(origin);

  if (allowed) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('access-control-allow-headers', 'authorization, content-type');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    // Answered here and never passed on: tRPC has no route for it.
    res.writeHead(allowed ? 204 : 403, { vary: 'Origin' });
    res.end();
    return;
  }

  // tRPC sets its own `Vary` when it responds, replacing anything already
  // there, so `Origin` is added at the last moment before the headers go out
  // rather than up front where it would be overwritten.
  const writeHead = res.writeHead.bind(res);
  res.writeHead = ((...args: Parameters<typeof writeHead>) => {
    const existing = String(res.getHeader('vary') ?? '');
    if (!existing.includes('Origin')) {
      res.setHeader('vary', existing === '' ? 'Origin' : `${existing}, Origin`);
    }
    return writeHead(...args);
  }) as typeof res.writeHead;

  handler(req, res);
});

server.listen(port);
logger.info('api listening', {
  port,
  environment,
  corsOrigins: [...allowedOrigins],
  timezone: 'stored UTC, rendered Africa/Cairo',
});

// Logged once at boot rather than left to the first request: a deploy where
// the database is unreachable should say so in the first ten lines of its log.
void probeDatabase().then((database) => {
  logger[database === 'ok' ? 'info' : 'warn']('database at boot', { database });
});

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutting down', { signal });
    server.close(() => {
      // The pool holds open sockets; a container that exits without closing
      // them leaves connections on the database until they time out, and a
      // rolling deploy can exhaust the limit before the old process is gone.
      void closeDatabase().finally(() => process.exit(0));
    });
  });
}
