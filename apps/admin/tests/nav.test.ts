import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { neighborhoodKey } from '../lib/nav';

/**
 * An area's slug as the key its name lives under.
 *
 * The slugs are the ones the seed writes to `neighborhoods` and to
 * `vendors.neighborhood`; the operator form now lets an admin pick any of the
 * six, so every one of them has to resolve to a key the catalogue has —
 * otherwise the roster prints the key itself.
 */
const SEEDED_AREAS = [
  'assalah',
  'masbat',
  'mashraba',
  'eel-garden-quarter',
  'lighthouse-quarter',
  'blue-beach',
] as const;

const catalogue = JSON.parse(
  readFileSync(join(__dirname, '../../../packages/i18n/messages/en-GB.json'), 'utf8'),
) as { neighborhood: Record<string, string> };

describe('neighbourhood names', () => {
  it.each(SEEDED_AREAS)('finds a name for %s', (slug) => {
    const key = neighborhoodKey(slug);
    const name = catalogue.neighborhood[key.slice('neighborhood.'.length)];
    expect(name, `${slug} → ${key}`).toBeTypeOf('string');
  });
});
