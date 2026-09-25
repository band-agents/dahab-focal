import { createServer } from 'node:http';

import { createHTTPHandler } from '@trpc/server/adapters/standalone';

import { configProblems } from './config.ts';
import { closeDatabase, probeDatabase } from './database.ts';
import { isAllowedOrigin, parseOrigins } from './cors.ts';
import { createContext } from './context.ts';
import { logger } from './logger.ts';
import { handleServe, handleUpload } from './media/routes.ts';
import { appRouter } from './routers/index.ts';

/**
 * The standalone adapter, on node:http. No web framework: tRPC is the main
 * surface, and a framework would add routing we do not use and middleware we
 * would have to keep in step with the tRPC middleware we do use. The one
 * exception is files — see the two `/media` routes below.
 */

const port = Number(process.env['PORT'] ?? 4000);
const environment = process.env['NODE_ENV'] ?? 'development';
const isProduction = environment === 'production';

/**
 * Refuse to boot rather than fail every sign-in. The rules are in
 * ./config.ts, shared with the serverless handler.
 */
function requireEnvironment(): void {
  const problems = configProblems();
  if (problems.length > 0) {
    for (const problem of problems) logger.error('refusing to start', { problem });
    process.exit(1);
  }
}

/**
 * Cross-origin access, allowlisted.
 *
 * The admin console renders on a server and calls this from there, so it
 * needs no CORS at all. The browser surfaces do, and the wrong answer here —
 * `*` beside `Access-Control-Allow-Credentials` — is the one that lets any
 * page on the internet make authenticated calls with a visitor's session.
 * The rule itself lives in ./cors.ts, where it is tested.
 */
const allowedOrigins = parseOrigins(process.env['CORS_ORIGINS']);

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
  const allowed =
    typeof origin === 'string' && isAllowedOrigin(origin, allowedOrigins, isProduction);

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

  /*
   * Files. Two routes that are not tRPC because a video is not JSON: a raw
   * upload, and reads from the local store. Both are answered here and never
   * reach the tRPC handler. See ./media/routes.ts.
   */
  const path = (req.url ?? '').split('?')[0] ?? '';
  if (req.method === 'POST' && path === '/media') {
    handleUpload(req, res).catch((error: unknown) => {
      logger.error('upload failed', { message: String(error) });
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    return;
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && path.startsWith('/media/')) {
    handleServe(req, res).catch((error: unknown) => {
      logger.error('media read failed', { message: String(error) });
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
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
  // Said out loud, so it is obvious in the log which mode this process is in.
  loopbackAllowed: !isProduction,
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
