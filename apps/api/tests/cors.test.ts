import { describe, expect, it } from 'vitest';

import { isAllowedOrigin, parseOrigins } from '../src/cors';

/**
 * Who may call this API from a browser.
 *
 * The failure this guards against is not subtle: `*` beside
 * `Access-Control-Allow-Credentials`, or a production build that quietly
 * trusts anything, lets a page on someone else's domain make authenticated
 * calls with an operator's session. None of that shows up on a screen.
 */

const listed = parseOrigins('https://operators.dahabfocal.com, https://app.dahabfocal.com');

describe('in production, nothing is implicit', () => {
  const allows = (origin: string) => isAllowedOrigin(origin, listed, true);

  it('allows exactly what CORS_ORIGINS names', () => {
    expect(allows('https://operators.dahabfocal.com')).toBe(true);
    expect(allows('https://app.dahabfocal.com')).toBe(true);
  });

  it('refuses localhost', () => {
    // The whole point of the development convenience is that it stops at the
    // production boundary. A deployed API trusting localhost trusts every
    // developer machine that can reach it.
    for (const origin of [
      'http://localhost:4320',
      'http://127.0.0.1:4310',
      'https://localhost',
      'http://[::1]:8081',
    ]) {
      expect(allows(origin), `${origin} must be refused in production`).toBe(false);
    }
  });

  it('refuses a lookalike of an allowed origin', () => {
    for (const origin of [
      'https://operators.dahabfocal.com.evil.example',
      'https://evil.example/https://operators.dahabfocal.com',
      'http://operators.dahabfocal.com',
      'https://operators.dahabfocal.com:8443',
    ]) {
      expect(allows(origin), `${origin} must be refused`).toBe(false);
    }
  });
});

describe('in development, this machine is allowed without being listed', () => {
  const allows = (origin: string) => isAllowedOrigin(origin, parseOrigins(undefined), false);

  it('allows loopback on any port, under either scheme', () => {
    // Three spellings of the same machine, which a browser treats as three
    // different origins; and Expo hands out a new port whenever one is busy.
    for (const origin of [
      'http://localhost:4320',
      'http://localhost:8081',
      'http://127.0.0.1:4330',
      'https://localhost:4310',
      'http://[::1]:4320',
      'http://localhost',
    ]) {
      expect(allows(origin), `${origin} should be allowed in development`).toBe(true);
    }
  });

  it('still refuses anything that is not this machine', () => {
    for (const origin of [
      'https://evil.example',
      'http://localhost.evil.example',
      'http://127.0.0.1.evil.example',
      'http://notlocalhost:4320',
    ]) {
      expect(allows(origin), `${origin} must be refused even in development`).toBe(false);
    }
  });
});

describe('parseOrigins', () => {
  it('is empty when the variable is unset or blank', () => {
    expect(parseOrigins(undefined).size).toBe(0);
    expect(parseOrigins('').size).toBe(0);
    expect(parseOrigins('  ,  , ').size).toBe(0);
  });

  it('trims whatever spacing the deploy platform pasted in', () => {
    const origins = parseOrigins(' https://a.example ,https://b.example');
    expect([...origins]).toEqual(['https://a.example', 'https://b.example']);
  });
});
