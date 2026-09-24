import { sql } from 'drizzle-orm';
import { bigint, char, customType, pgEnum, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Column vocabulary shared by every table.
 *
 * Three rules are enforced here rather than remembered:
 *   - money is a bigint of minor units plus an ISO code, never a float and
 *     never the Postgres `money` type, whose behaviour depends on lc_monetary
 *   - every instant is `timestamptz`, stored UTC; Cairo is a rendering
 *     concern, and Egypt observes DST again as of 2023
 *   - ids are UUID v7, so they sort by creation time and index like a serial
 *     without leaking how many rows exist
 */

/**
 * uuid_generate_v7() is created by the first migration. Postgres 18 ships
 * uuidv7() natively; this wrapper keeps the schema identical on 16 and 18.
 */
export const primaryId = (name = 'id') =>
  uuid(name)
    .primaryKey()
    .default(sql`uuid_generate_v7()`);

export const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow();

/** Soft delete. A booking, a review and a vendor are never truly removed. */
export const deletedAt = () =>
  timestamp('deleted_at', { withTimezone: true, mode: 'date' });

export const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
};

/**
 * Money is always a pair of columns, spelled out at each use site so the
 * amount and its currency are impossible to read separately in a query.
 *
 * `bigint` with `mode: 'number'` is safe here: 2^53 - 1 piastres is roughly
 * 90 trillion EGP, and every value is an integer by construction.
 */
export const moneyAmount = (column: string) => bigint(column, { mode: 'number' });
export const moneyCurrency = (column: string) => char(column, { length: 3 });

/**
 * PostGIS geography, WGS-84. `geography` rather than `geometry` so distance
 * comes back in metres on a spheroid — "experiences within 3 km of my stay"
 * has to be true on the ground, not on a projected plane.
 */
export const geographyPoint = customType<{
  data: { latitude: number; longitude: number };
  driverData: string;
  config: never;
}>({
  dataType() {
    return 'geography(Point, 4326)';
  },
  toDriver(value) {
    // SRID-tagged WKT. Longitude first: PostGIS reads X then Y.
    return `SRID=4326;POINT(${value.longitude} ${value.latitude})`;
  },
  fromDriver(value) {
    // A plain column read comes back as hex EWKB, which is what Postgres
    // sends for geography unless the query wraps it in ST_AsText. Selecting
    // a whole row with this column in it used to throw here.
    const wkb = pointFromHexEwkb(value);
    if (wkb !== null) return wkb;
    const match = /POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i.exec(value);
    if (match === null) {
      throw new Error(`Could not read a point from PostGIS output: ${value}`);
    }
    return { longitude: Number(match[1]), latitude: Number(match[2]) };
  },
});

/**
 * Reads a point out of (E)WKB hex: a byte-order byte, a type word whose low
 * bits are 1 for Point and whose 0x20000000 flag says an SRID follows, then X
 * and Y as doubles. Null for anything that is not a 2D point in that form.
 */
export function pointFromHexEwkb(hex: string): { latitude: number; longitude: number } | null {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < 42) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  const little = view.getUint8(0) === 1;
  const type = view.getUint32(1, little);
  if ((type & 0xff) !== 1) return null;
  const offset = (type & 0x20000000) !== 0 ? 9 : 5;
  if (bytes.length < offset + 16) return null;
  return {
    longitude: view.getFloat64(offset, little),
    latitude: view.getFloat64(offset + 8, little),
  };
}

export const geographyPolygon = customType<{
  data: string;
  driverData: string;
  config: never;
}>({
  dataType() {
    return 'geography(Polygon, 4326)';
  },
});

// --- Enums shared across domains -----------------------------------------

export const localeEnum = pgEnum('locale', [
  'en-GB',
  'ar-EG',
  'ru-RU',
  'it-IT',
  'fr-FR',
  'es-ES',
  'de-DE',
]);

export const currencyEnum = pgEnum('currency_code', ['EGP', 'EUR', 'USD', 'GBP']);

export const numberingSystemEnum = pgEnum('numbering_system', ['latn', 'arab']);

export const themeEnum = pgEnum('theme_preference', ['light', 'dark', 'system']);

export const roleEnum = pgEnum('role', [
  'guest',
  'traveler',
  'vendorOwner',
  'vendorStaff',
  'admin',
]);

/**
 * Verification is a three-state review, not a boolean: a permit that has been
 * looked at and rejected is a different thing from one nobody has opened.
 */
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'inReview',
  'verified',
  'rejected',
  'expired',
]);

export const serviceStatusEnum = pgEnum('service_status', [
  'draft',
  'underReview',
  'published',
  'paused',
  'archived',
  'rejected',
]);

export const participantKindEnum = pgEnum('participant_kind', [
  'adult',
  'child',
  'infant',
  'student',
  'resident',
  'instructor',
]);

export const attributeDataTypeEnum = pgEnum('attribute_data_type', [
  'text',
  'longText',
  'number',
  'measure',
  'boolean',
  'enum',
  'multiEnum',
  'duration',
  'date',
]);
