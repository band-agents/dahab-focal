import { describe, expect, it } from 'vitest';

import { pointFromHexEwkb } from '../src/schema/_shared.ts';

describe('geography points', () => {
  it('reads the hex EWKB Postgres sends for a plain column read', () => {
    // A vendor in Dahab, as the driver actually returned it.
    const point = pointFromHexEwkb('0101000020E6100000FCA9F1D24D42414089D2DEE00B833C40');
    expect(point?.longitude).toBeCloseTo(34.518, 3);
    expect(point?.latitude).toBeCloseTo(28.5119, 3);
  });

  it('reads plain WKB without an SRID', () => {
    const point = pointFromHexEwkb('0101000000FCA9F1D24D42414089D2DEE00B833C40');
    expect(point?.longitude).toBeCloseTo(34.518, 3);
  });

  it('refuses what is not a point', () => {
    expect(pointFromHexEwkb('POINT(34.5 28.5)')).toBeNull();
    // A LineString (type 2).
    expect(pointFromHexEwkb('0102000020E6100000FCA9F1D24D42414089D2DEE00B833C40')).toBeNull();
  });
});
