import { z } from 'zod';

import { LOCALES } from '@dahab/i18n';

import { publicProcedure, router } from '../trpc';
import { authRouter } from './auth';
import { catalogRouter } from './catalog';

export const appRouter = router({
  /**
   * Liveness and readiness in one place. It reports what it can actually
   * reach, so a green health check means something.
   */
  health: publicProcedure
    .output(
      z.object({
        status: z.enum(['ok', 'degraded']),
        version: z.string(),
        requestId: z.string(),
        time: z.string(),
        locales: z.array(z.string()),
        checks: z.record(z.string(), z.enum(['ok', 'unavailable', 'unchecked'])),
      }),
    )
    .query(({ ctx }) => {
      // Database and Redis checks land with the first procedure that needs
      // them; reporting `unchecked` is honest, reporting `ok` would not be.
      const checks = { database: 'unchecked' as const, redis: 'unchecked' as const };
      return {
        status: 'ok' as const,
        version: process.env['npm_package_version'] ?? '0.1.0',
        requestId: ctx.requestId,
        time: ctx.now.toISOString(),
        locales: [...LOCALES],
        checks,
      };
    }),

  auth: authRouter,
  catalog: catalogRouter,
});

export type AppRouter = typeof appRouter;
