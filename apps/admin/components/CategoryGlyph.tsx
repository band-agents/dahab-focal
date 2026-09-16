import { CategoryMark, Mark } from '@dahab/ui-web';
import type { CategoryMarkName } from '@dahab/ui-web';

/**
 * The mark for a category, addressed by the slug the database uses.
 *
 * The design board draws twelve category marks and the seeded taxonomy has
 * twelve categories, but they are not the same twelve: the board includes
 * `foodCooking`, which CLAUDE.md rules out ("experiences, not food"), and the
 * taxonomy includes `photography`, which the board never drew. Rather than
 * quietly redraw a mark — the one thing the design system forbids — the
 * eleven that match use their own mark and photography borrows the generic
 * `camera`. Logged in docs/CANVAS-FIXES.md as owed back to the board.
 */
const CATEGORY_MARK: Readonly<Record<string, CategoryMarkName>> = {
  'scuba-diving': 'diving',
  freediving: 'freediving',
  snorkeling: 'snorkeling',
  'desert-safari': 'desertSafari',
  kitesurfing: 'kiteWatersports',
  'wellness-yoga': 'wellnessYoga',
  'bedouin-culture': 'bedouinCulture',
  'boat-trips': 'boatSea',
  'courses-certifications': 'courses',
  'gear-rental': 'rentals',
  transfers: 'transfers',
};

export function CategoryGlyph({
  slug,
  size = 24,
}: {
  readonly slug: string;
  readonly size?: number;
}) {
  const name = CATEGORY_MARK[slug];
  if (name === undefined) return <Mark name="camera" size={size} />;
  return <CategoryMark name={name} size={size} />;
}
