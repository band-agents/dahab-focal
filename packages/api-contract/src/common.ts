import { z } from 'zod';

import { CURRENCIES, LOCALES, NUMBERING_SYSTEMS } from '@dahab/i18n/server';

/**
 * Shared primitives. Every boundary in the system — tRPC input, tRPC output,
 * a row read back from Postgres, a webhook body — parses through one of these.
 */

/** UUID v7 everywhere: time-ordered, so it indexes like a serial but does not leak counts. */
export const idSchema = z.string().uuid();
export type Id = z.infer<typeof idSchema>;

/**
 * Branded ids, so a vendorId cannot be passed where a serviceId is expected.
 * The brand exists only in the type system; the runtime value is the string.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * The brand is on the *output* only: you hand the schema a plain string and
 * get a branded value back. That keeps callers — seeds, fixtures, tRPC
 * clients — free of cast noise while still making it a type error to pass a
 * parsed VendorId where a ServiceId belongs.
 */
export function brandedId<B extends string>(_brand: B) {
  return idSchema as unknown as z.ZodType<Brand<string, B>, z.ZodTypeDef, string>;
}

export const vendorIdSchema = brandedId('VendorId');
export const serviceIdSchema = brandedId('ServiceId');
export const categoryIdSchema = brandedId('CategoryId');
export const bookingIdSchema = brandedId('BookingId');
export const userIdSchema = brandedId('UserId');
export const optionIdSchema = brandedId('OptionId');
export const optionGroupIdSchema = brandedId('OptionGroupId');
export const variantIdSchema = brandedId('VariantId');
export const tierIdSchema = brandedId('TierId');
export const pricingRuleIdSchema = brandedId('PricingRuleId');
export const resourceIdSchema = brandedId('ResourceId');
export const diveSiteIdSchema = brandedId('DiveSiteId');

export type VendorId = z.infer<typeof vendorIdSchema>;
export type ServiceId = z.infer<typeof serviceIdSchema>;
export type CategoryId = z.infer<typeof categoryIdSchema>;
export type BookingId = z.infer<typeof bookingIdSchema>;
export type UserId = z.infer<typeof userIdSchema>;
export type OptionId = z.infer<typeof optionIdSchema>;
export type OptionGroupId = z.infer<typeof optionGroupIdSchema>;
export type VariantId = z.infer<typeof variantIdSchema>;
export type TierId = z.infer<typeof tierIdSchema>;
export type PricingRuleId = z.infer<typeof pricingRuleIdSchema>;
export type ResourceId = z.infer<typeof resourceIdSchema>;
export type DiveSiteId = z.infer<typeof diveSiteIdSchema>;

export const localeSchema = z.enum(LOCALES);
export const currencySchema = z.enum(CURRENCIES);
export const numberingSystemSchema = z.enum(NUMBERING_SYSTEMS);

/**
 * Money on the wire is the same shape it is in the database and in memory:
 * an integer count of minor units plus an ISO code. A float never crosses a
 * boundary, so a float can never be persisted.
 */
export const moneySchema = z
  .object({
    amount: z
      .number()
      .int('Money must be an integer count of minor units, never a float.')
      .safe(),
    currency: currencySchema,
  })
  .strict();
export type MoneyInput = z.infer<typeof moneySchema>;

/** An instant, always UTC. Rendering in Africa/Cairo happens at the edge. */
export const instantSchema = z.coerce.date();

/** A calendar day with no time and no zone: an availability date, an expiry. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD calendar date.');
export type DateOnly = z.infer<typeof dateOnlySchema>;

/** Minutes past midnight, Cairo. 08:00 is 480 — the Blue Hole first departure. */
export const timeOfDaySchema = z.number().int().min(0).max(1439);

/**
 * ISO-8601 weekday numbering: 1 Monday … 7 Sunday. Friday (5) and Saturday (6)
 * are the Egyptian weekend, which matters to day-of-week pricing.
 */
export const isoWeekdaySchema = z.number().int().min(1).max(7);
export type IsoWeekday = z.infer<typeof isoWeekdaySchema>;

export const EGYPTIAN_WEEKEND: readonly IsoWeekday[] = [5, 6];

export const paginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().optional(),
  })
  .strict();

export const localizedTextSchema = z.object({
  locale: localeSchema,
  value: z.string().min(1),
});

/** A geographic point, WGS-84. Dahab sits around 28.50 N, 34.51 E. */
export const pointSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();
export type Point = z.infer<typeof pointSchema>;
