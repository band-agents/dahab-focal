import { createHTTPServer } from '@trpc/server/adapters/standalone';

import { createContext } from './context';
import { logger } from './logger';
import { appRouter } from './routers/index';

/**
 * The standalone adapter, on node:http. No web framework: tRPC is the only
 * surface, and a framework would add routing we do not use and middleware we
 * would have to keep in step with the tRPC middleware we do use.
 */

const port = Number(process.env['PORT'] ?? 4000);

const server = createHTTPServer({
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

server.listen(port);
logger.info('api listening', {
  port,
  environment: process.env['NODE_ENV'] ?? 'development',
  timezone: 'stored UTC, rendered Africa/Cairo',
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info('shutting down', { signal });
    server.close(() => process.exit(0));
  });
}
