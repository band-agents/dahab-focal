import { TRPCError, initTRPC } from '@trpc/server';
import { ZodError } from 'zod';

import { can, type Permission, type Role } from '@dahab/api-contract';

import type { Context } from './context.ts';

/**
 * The tRPC root, and the procedures every router builds on.
 *
 * Authorisation is a permission check, never a role check at the call site.
 * `requirePermission('catalog.publish')` reads the same matrix the vendor app
 * and the admin read, so the three cannot drift.
 */

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, ctx }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Every error carries the request id, so a screenshot from a traveler
        // is enough to find the log line.
        requestId: ctx?.requestId ?? null,
        // Field errors are returned separately from the message so a form can
        // attach them without parsing prose.
        fieldErrors:
          error.cause instanceof ZodError ? error.cause.flatten().fieldErrors : null,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

/**
 * A one-line description of why a call failed, safe to log: for a validation
 * error, the field paths and issue codes; for anything else, the first line
 * of the message, which we wrote ourselves.
 */
function summarise(error: { message: string; cause?: unknown }): string {
  if (error.cause instanceof ZodError) {
    return error.cause.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}:${issue.code}`)
      .join(', ')
      .slice(0, 300);
  }
  return error.message.split('\n')[0]?.slice(0, 200) ?? '';
}

/** Logs every call with its outcome and duration. */
const withLogging = middleware(async ({ ctx, path, type, next }) => {
  const startedAt = Date.now();
  const result = await next();
  const durationMs = Date.now() - startedAt;

  const fields = { path, type, durationMs, roles: ctx.session?.roles ?? ['guest'] };
  if (result.ok) {
    ctx.logger.info('rpc', fields);
  } else {
    // Kept short at warn level. A Zod failure's `message` is the whole issue
    // array serialised, which both floods the log and is how a phone number
    // ends up in it — so validation failures log their field paths and codes
    // and nothing the caller typed. Full detail is opt-in at debug.
    ctx.logger.warn('rpc failed', {
      ...fields,
      errorCode: result.error.code,
      reason: summarise(result.error),
    });
    ctx.logger.debug('rpc failure detail', { ...fields, message: result.error.message });
  }
  return result;
});

/** Open to anyone, including a client with no session at all. */
export const publicProcedure = t.procedure.use(withLogging);

const requireSession = middleware(({ ctx, next }) => {
  if (ctx.session === null) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'This needs a session. Start one with auth.guest or sign in.',
    });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * Any session, guest included. A guest can browse and hold a cart; anything
 * that creates an obligation needs a claimed account, which is expressed as a
 * permission rather than as a check on `isGuest`.
 */
export const sessionProcedure = publicProcedure.use(requireSession);

export function requirePermission(permission: Permission) {
  return sessionProcedure.use(
    middleware(({ ctx, next }) => {
      const roles: readonly Role[] = ctx.session?.roles ?? [];
      if (!roles.some((role) => can(role, permission))) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `This account cannot ${permission}.`,
        });
      }
      return next();
    }),
  );
}

/**
 * A vendor procedure additionally pins the call to one vendor. Passing a
 * vendorId the session does not act for is a 403, not an empty result —
 * an empty result would look like the vendor has no bookings.
 */
export function requireVendorPermission(permission: Permission) {
  return requirePermission(permission).use(
    middleware(({ ctx, next }) => {
      if (ctx.session?.vendorId === null || ctx.session?.vendorId === undefined) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This session is not acting for a vendor.',
        });
      }
      return next({ ctx: { ...ctx, vendorId: ctx.session.vendorId } });
    }),
  );
}
