import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createTestContext } from '../src/context';
import { createLogger } from '../src/logger';
import { appRouter } from '../src/routers/index';
import { createCallerFactory } from '../src/trpc';

/**
 * Regression cover for the two logging bugs Session 1 found and fixed.
 *
 *   1. The API logger redacted every tRPC error code, because `code` was on the
 *      redaction list for OTP codes. `errorCode` is the one field you open the
 *      logs for; it must reach the line intact.
 *
 *   2. A Zod failure serialised its whole rejected input into the warn log,
 *      which is how a phone number ends up in a log file. Validation failures
 *      must log the field path and the issue code and nothing the caller typed.
 *      This is a PII-leak class, not a one-off.
 */

beforeAll(() => {
  process.env['AUTH_SECRET'] = 'test-secret-that-is-long-enough-to-be-accepted-here';
});

/** Capture everything the logger writes to stdout and stderr for one block. */
function captureLog(): { lines: () => string[]; restore: () => void } {
  const chunks: string[] = [];
  const sink = (chunk: unknown): boolean => {
    chunks.push(String(chunk));
    return true;
  };
  const out = vi.spyOn(process.stdout, 'write').mockImplementation(sink as never);
  const err = vi.spyOn(process.stderr, 'write').mockImplementation(sink as never);
  return {
    lines: () => chunks.join('').split('\n').filter(Boolean),
    restore: () => {
      out.mockRestore();
      err.mockRestore();
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('an error-code field survives redaction', () => {
  it('does not carry a redaction key that would blank an error code', () => {
    // `errorCode` is what tRPC failures log. `code` was removed from the list
    // precisely because it double-booked as "error code"; if either comes
    // back, the logs go blind on failure.
    const capture = captureLog();
    const log = createLogger('info');
    log.warn('rpc failed', { errorCode: 'BAD_REQUEST', code: 'BAD_REQUEST' });
    const [line] = capture.lines();
    capture.restore();

    const parsed = JSON.parse(line ?? '{}') as Record<string, unknown>;
    expect(parsed['errorCode']).toBe('BAD_REQUEST');
    expect(parsed['code']).toBe('BAD_REQUEST');
    expect(JSON.stringify(parsed)).not.toContain('[redacted]');
  });

  it('carries the real error code through a failing call, not a placeholder', async () => {
    const capture = captureLog();
    const caller = createCallerFactory(appRouter)(createTestContext({ session: null }));
    await expect(caller.auth.session()).rejects.toThrow();
    const failure = capture
      .lines()
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((entry) => entry['message'] === 'rpc failed');
    capture.restore();

    expect(failure).toBeDefined();
    expect(failure?.['errorCode']).toBe('UNAUTHORIZED');
    expect(failure?.['errorCode']).not.toBe('[redacted]');
  });

  it('still redacts an actual one-time code', () => {
    const capture = captureLog();
    createLogger('info').info('otp issued', { otpCode: '123456', phone: '+201001234567' });
    const [line] = capture.lines();
    capture.restore();

    const parsed = JSON.parse(line ?? '{}') as Record<string, unknown>;
    expect(parsed['otpCode']).toBe('[redacted]');
    expect(parsed['phone']).toBe('[redacted]');
    expect(line).not.toContain('123456');
    expect(line).not.toContain('+201001234567');
  });
});

describe('a Zod failure logs the field and the reason, never the rejected value', () => {
  it('keeps a phone-shaped rejected input out of the warn line', async () => {
    const capture = captureLog();
    const caller = createCallerFactory(appRouter)(createTestContext());
    // deviceId is z.string().min(8); this value is a plausible phone number and
    // far too short. The old code put the whole issue array — value included —
    // into `message` at warn level.
    const leaky = '+2010';
    await expect(caller.auth.guest({ deviceId: leaky })).rejects.toThrow();

    const failure = capture
      .lines()
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((entry) => entry['message'] === 'rpc failed');
    capture.restore();

    expect(failure).toBeDefined();
    // The field path and the issue code are there.
    expect(String(failure?.['reason'])).toMatch(/deviceId/);
    expect(String(failure?.['reason'])).toMatch(/too_small/);
    // The value the caller typed is not — anywhere on the line.
    expect(JSON.stringify(failure)).not.toContain(leaky);
  });

  it('the full detail with the value is opt-in at debug only', async () => {
    const capture = captureLog();
    // Default level is info, so the debug line must not be emitted at all.
    const caller = createCallerFactory(appRouter)(createTestContext());
    const leaky = '+2010';
    await expect(caller.auth.guest({ deviceId: leaky })).rejects.toThrow();
    const debugLine = capture
      .lines()
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((entry) => entry['message'] === 'rpc failure detail');
    capture.restore();

    expect(debugLine).toBeUndefined();
  });
});
