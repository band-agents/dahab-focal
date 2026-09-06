import { beforeEach, describe, expect, it, vi } from 'vitest';

import { firstStrongDirection, isolate, isolateIfForeign, stripIsolation } from '../src/bidi';
import { byDirection, directionSign, shouldMirrorIcon } from '../src/direction';
import { directionOf, isRtl, resolveLocale, type Direction } from '../src/locales';
import {
  applyDirectionChange,
  planDirectionChange,
  registerRtlPlatform,
  type RtlPlatformAdapter,
} from '../src/rtl-runtime';

describe('direction is derived, never guessed', () => {
  it('knows which locales are RTL', () => {
    expect(directionOf('ar-EG')).toBe('rtl');
    expect(isRtl('ar-EG')).toBe(true);
    for (const locale of ['en-GB', 'ru-RU', 'it-IT', 'fr-FR', 'es-ES', 'de-DE'] as const) {
      expect(isRtl(locale)).toBe(false);
    }
  });

  it('resolves an arbitrary device tag onto one of ours', () => {
    expect(resolveLocale('ar')).toBe('ar-EG');
    expect(resolveLocale('ar-SA')).toBe('ar-EG');
    expect(resolveLocale('en-US')).toBe('en-GB');
    expect(resolveLocale('pt-BR')).toBe('en-GB');
    expect(resolveLocale(undefined)).toBe('en-GB');
    expect(resolveLocale('ar-EG-u-nu-latn')).toBe('ar-EG');
  });

  it('picks the start-side value without a hand-written ternary', () => {
    expect(byDirection('ltr', { ltr: 'left edge', rtl: 'right edge' })).toBe('left edge');
    expect(byDirection('rtl', { ltr: 'left edge', rtl: 'right edge' })).toBe('right edge');
    expect(directionSign('ltr')).toBe(1);
    expect(directionSign('rtl')).toBe(-1);
  });
});

describe('icon mirroring', () => {
  it('mirrors navigational icons in RTL and leaves physical objects alone', () => {
    // A chevron points through the interface, so it mirrors.
    expect(shouldMirrorIcon('rtl', false)).toBe(true);
    // Fins, a camera, a compass, a play triangle: noFlip, never mirrored.
    expect(shouldMirrorIcon('rtl', true)).toBe(false);
    // Nothing mirrors in LTR.
    expect(shouldMirrorIcon('ltr', false)).toBe(false);
    expect(shouldMirrorIcon('ltr', true)).toBe(false);
  });
});

describe('bidi isolation', () => {
  it('detects the direction a run would resolve to', () => {
    expect(firstStrongDirection('Blue Hole')).toBe('ltr');
    expect(firstStrongDirection('الغطس')).toBe('rtl');
    expect(firstStrongDirection('Русский')).toBe('ltr');
    expect(firstStrongDirection('08:00')).toBe('neutral');
  });

  it('wraps a run in FSI/PDI and strips back cleanly', () => {
    const wrapped = isolate('Blue Hole');
    expect(wrapped.codePointAt(0)).toBe(0x2068);
    expect(wrapped.codePointAt(wrapped.length - 1)).toBe(0x2069);
    expect(stripIsolation(wrapped)).toBe('Blue Hole');
  });

  it('only isolates a run whose script differs from the paragraph', () => {
    // Latin site name inside an Arabic paragraph: isolate.
    expect(isolateIfForeign('Blue Hole', 'rtl')).not.toBe('Blue Hole');
    // Arabic inside Arabic: leave it alone, no stray control characters.
    expect(isolateIfForeign('الغطس', 'rtl')).toBe('الغطس');
    // Neutral digits carry no direction of their own.
    expect(isolateIfForeign('08:00', 'rtl')).toBe('08:00');
  });

  it('does not double-wrap', () => {
    const once = isolate('Fanous Divers');
    expect(isolateIfForeign(once, 'rtl')).toBe(once);
  });
});

describe('runtime direction switching', () => {
  function makeAdapter(overrides: Partial<RtlPlatformAdapter> = {}): {
    adapter: RtlPlatformAdapter;
    state: { direction: Direction; reloads: number };
  } {
    const state = { direction: 'ltr' as Direction, reloads: 0 };
    const adapter: RtlPlatformAdapter = {
      name: 'test',
      currentLayoutDirection: () => state.direction,
      requiresReload: () => true,
      setLayoutDirection: (direction) => {
        state.direction = direction;
      },
      reload: async () => {
        state.reloads += 1;
      },
      ...overrides,
    };
    return { adapter, state };
  }

  beforeEach(() => {
    registerRtlPlatform(makeAdapter().adapter);
  });

  it('plans a no-op when the platform is already laid out correctly', () => {
    const { adapter } = makeAdapter();
    registerRtlPlatform(adapter);
    const plan = planDirectionChange('de-DE');
    expect(plan).toMatchObject({ from: 'ltr', to: 'ltr', noop: true, reloadRequired: false });
  });

  it('plans a reload when React Native has to flip the native flag', () => {
    const { adapter } = makeAdapter();
    registerRtlPlatform(adapter);
    const plan = planDirectionChange('ar-EG');
    expect(plan).toMatchObject({ from: 'ltr', to: 'rtl', noop: false, reloadRequired: true });
  });

  it('sets the flag, lets the caller paint, then reloads — in that order', async () => {
    const { adapter, state } = makeAdapter();
    registerRtlPlatform(adapter);

    const order: string[] = [];
    await applyDirectionChange('ar-EG', {
      beforeReload: () => {
        // The flag must already be set when the transition paints, otherwise
        // the app is briefly half-flipped.
        expect(state.direction).toBe('rtl');
        order.push('beforeReload');
      },
    });

    expect(order).toEqual(['beforeReload']);
    expect(state.reloads).toBe(1);
  });

  it('does not reload when the caller is only previewing', async () => {
    const { adapter, state } = makeAdapter();
    registerRtlPlatform(adapter);
    await applyDirectionChange('ar-EG', { skipReload: true });
    expect(state.direction).toBe('rtl');
    expect(state.reloads).toBe(0);
  });

  it('never reloads on web, where the flag takes effect immediately', async () => {
    const { adapter, state } = makeAdapter({ requiresReload: () => false });
    registerRtlPlatform(adapter);
    const plan = await applyDirectionChange('ar-EG');
    expect(plan.reloadRequired).toBe(false);
    expect(state.direction).toBe('rtl');
    expect(state.reloads).toBe(0);
  });

  it('leaves the app consistent when the caller throws before the reload', async () => {
    const { adapter, state } = makeAdapter();
    registerRtlPlatform(adapter);
    const boom = vi.fn(() => {
      throw new Error('could not persist preference');
    });
    await expect(applyDirectionChange('ar-EG', { beforeReload: boom })).rejects.toThrow(
      /could not persist/,
    );
    expect(state.reloads).toBe(0);
  });
});
