import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Role, Session } from '@dahab/api-contract';
import type { Locale } from '@dahab/i18n';

import type { Database } from '@dahab/db';

import { getDatabase } from './database.ts';
import { logger as rootLogger, type Logger } from './logger.ts';
import { localeFrom, verifyAccessToken } from './auth/tokens.ts';

/**
 * The per-request context.
 *
 * Every request has a request id whether or not the caller supplied one, and
 * it is on every log line and in every error envelope — so a screenshot of a
 * failure is enough to find what happened.
 */

export interface Context {
  readonly requestId: string;
  readonly logger: Logger;
  readonly session: Session | null;
  readonly locale: Locale;
  readonly now: Date;
  /**
   * Null when DATABASE_URL is absent. A procedure that needs it says so with
   * a 503 rather than throwing a connection error at the caller — the two
   * read very differently in a log.
   */
  readonly db: Database | null;
}

function headerValue(request: IncomingMessage, name: string): string | undefined {
  const raw = request.headers[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

export function createContext(options: {
  req: IncomingMessage;
  res: ServerResponse;
  now?: Date;
}): Context {
  const { req, res } = options;
  const requestId = headerValue(req, 'x-request-id') ?? randomUUID();
  res.setHeader('x-request-id', requestId);

  const locale = localeFrom(headerValue(req, 'accept-language'));
  const logger = rootLogger.child({ requestId });

  const authorization = headerValue(req, 'authorization');
  const session = authorization === undefined ? null : sessionFrom(authorization, logger);

  return {
    requestId,
    logger,
    session,
    locale: session === null ? locale : (session as { locale?: Locale }).locale ?? locale,
    now: options.now ?? new Date(),
    db: getDatabase(),
  };
}

/**
 * The same context, for a request that arrives as a web `Request` — the
 * API running as a serverless function (see ./http/fetch-handler.ts) rather
 * than on node:http. Everything a procedure sees is identical.
 */
export function createFetchContext(options: { req: Request; resHeaders: Headers; now?: Date }): Context {
  const { req, resHeaders } = options;
  const requestId = req.headers.get('x-request-id') ?? randomUUID();
  resHeaders.set('x-request-id', requestId);

  const locale = localeFrom(req.headers.get('accept-language') ?? undefined);
  const logger = rootLogger.child({ requestId });

  const authorization = req.headers.get('authorization') ?? undefined;
  const session = authorization === undefined ? null : sessionFrom(authorization, logger);

  return {
    requestId,
    logger,
    session,
    locale: session === null ? locale : (session as { locale?: Locale }).locale ?? locale,
    now: options.now ?? new Date(),
    db: getDatabase(),
  };
}

function sessionFrom(authorization: string, logger: Logger): Session | null {
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || token === undefined) return null;

  const result = verifyAccessToken(token);
  if (!result.ok) {
    // An expired token is ordinary and must not be logged as an error; the
    // client is expected to refresh and retry.
    logger.debug('rejected access token', { reason: result.reason });
    return null;
  }

  const { payload } = result;
  return {
    id: payload.sessionId,
    userId: payload.userId as Session['userId'],
    roles: payload.roles as [Role, ...Role[]],
    vendorId: payload.vendorId as Session['vendorId'],
    isGuest: payload.isGuest,
    expiresAt: new Date(payload.exp * 1000),
  };
}

/** For tests and for the vendor-side simulator: a context with no HTTP. */
export function createTestContext(overrides: Partial<Context> = {}): Context {
  return {
    requestId: randomUUID(),
    logger: rootLogger.child({ test: true }),
    session: null,
    locale: 'en-GB',
    now: new Date('2026-03-19T06:00:00Z'),
    db: null,
    ...overrides,
  };
}
