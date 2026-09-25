import { z } from 'zod';

import { LOCALES } from '@dahab/i18n/server';

import { probeDatabase } from '../database.ts';
import { publicProcedure, router } from '../trpc.ts';
import { adminRouter } from './admin.ts';
import { authRouter } from './auth.ts';
import { catalogRouter } from './catalog.ts';
import { vendorRouter } from './vendor.ts';

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
    .query(async ({ ctx }) => {
      // The database is really probed now. Redis still lands with the first
      // procedure that needs it; reporting `unchecked` is honest, reporting
      // `ok` would not be.
      const database = await probeDatabase();
      const checks = { database, redis: 'unchecked' as const };
      return {
        status: database === 'ok' ? ('ok' as const) : ('degraded' as const),
        version: process.env['npm_package_version'] ?? '0.1.0',
        requestId: ctx.requestId,
        time: ctx.now.toISOString(),
        locales: [...LOCALES],
        checks,
      };
    }),

  auth: authRouter,
  catalog: catalogRouter,
  admin: adminRouter,
  /**
   * The operator app. Every procedure pins its vendor from the session, so
   * no caller can ask for another operator's rows.
   */
  vendor: vendorRouter,
});

export type AppRouter = typeof appRouter;
