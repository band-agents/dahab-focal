/**
 * Which band an expiry date falls in.
 *
 * Extracted from the screen so it can be tested: the banding decides what an
 * operator sees as "expired" versus "inside 7 days", and an off-by-one here
 * means a permit that lapsed this morning shows as still valid.
 *
 * Measured in whole UTC days against an explicit `now` rather than
 * `Date.now()`, so a test pins the answer — and because Egypt observes DST,
 * nothing here may do arithmetic in local time.
 */

export type Band = 'expired' | 'within7' | 'within30' | 'within90';

export const BANDS: readonly Band[] = ['expired', 'within7', 'within30', 'within90'];

export const BAND_LABEL: Record<Band, string> = {
  expired: 'admin.expiry.expired',
  within7: 'admin.expiry.within7',
  within30: 'admin.expiry.within30',
  within90: 'admin.expiry.within90',
};

const MS_PER_DAY = 86_400_000;

/**
 * Returns null for a document that does not expire, and for one beyond the
 * furthest band — the board shows four windows, not everything ever.
 */
export function bandFor(expiresOn: string | null, now: Date): Band | null {
  if (expiresOn === null) return null;

  const due = Date.parse(`${expiresOn}T00:00:00Z`);
  if (Number.isNaN(due)) return null;

  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const days = Math.round((due - today) / MS_PER_DAY);

  // Today counts as still valid: a permit expiring today has not lapsed until
  // tomorrow, and an operator told otherwise cancels a departure for nothing.
  if (days < 0) return 'expired';
  if (days <= 7) return 'within7';
  if (days <= 30) return 'within30';
  if (days <= 90) return 'within90';
  return null;
}
