import { z } from 'zod';

import {
  CATEGORY_SLUGS,
  attributeDefinitionSchema,
  categorySchema,
  paginationSchema,
  pointSchema,
} from '@dahab/api-contract';

import { publicProcedure, requirePermission, router } from '../trpc.ts';

/**
 * Catalogue reads — the only business surface this session exposes, because
 * the auth flow and the gallery need something real to point at.
 *
 * The shapes are the contract. The queries behind them are marked and will be
 * Drizzle reads against @dahab/db; nothing here invents data.
 */

const nearbyInputSchema = z
  .object({
    /** Where the traveler is staying. */
    origin: pointSchema,
    /** Metres. "Experiences within 3 km of my stay" is 3000. */
    radiusMetres: z.number().int().min(100).max(50_000).default(3000),
    categorySlug: z.enum(CATEGORY_SLUGS).optional(),
  })
  .merge(paginationSchema);

export const catalogRouter = router({
  /** The twelve categories, with their token names and icons. */
  categories: publicProcedure
    .output(z.array(categorySchema))
    .query(() => {
      // TODO(persistence): select from categories where is_active, ordered by
      // sort_order. Returned empty rather than faked, so a caller can tell the
      // difference between "no categories" and "not wired up yet".
      return [];
    }),

  /**
   * The attribute schema for a category. This is what the vendor service
   * builder renders as a form and what the traveler comparison engine reads —
   * one query, three surfaces (CLAUDE.md).
   */
  attributeDefinitions: publicProcedure
    .input(z.object({ categorySlug: z.enum(CATEGORY_SLUGS), comparableOnly: z.boolean().default(false) }))
    .output(z.array(attributeDefinitionSchema))
    .query(({ input }) => {
      // TODO(persistence): join attribute_definitions to categories on slug,
      // filter on is_comparable when comparableOnly, order by comparison_group
      // then comparison_order.
      void input;
      return [];
    }),

  /**
   * A real spatial query, not a client-side filter: ST_DWithin against the
   * GIST index on services' vendor location.
   */
  nearby: publicProcedure
    .input(nearbyInputSchema)
    .output(
      z.object({
        items: z.array(z.object({ serviceId: z.string().uuid(), metres: z.number().int() })),
        nextCursor: z.string().nullable(),
      }),
    )
    .query(({ input }) => {
      // TODO(persistence):
      //   SELECT s.id,
      //          ST_Distance(v.location, ST_MakePoint($lon,$lat)::geography)::int AS metres
      //   FROM services s JOIN vendors v ON v.id = s.vendor_id
      //   WHERE s.status = 'published'
      //     AND ST_DWithin(v.location, ST_MakePoint($lon,$lat)::geography, $radius)
      //   ORDER BY metres
      void input;
      return { items: [], nextCursor: null };
    }),

  /** The dive sites, for the map and for the certification gate. */
  diveSites: publicProcedure
    .output(
      z.array(
        z.object({
          slug: z.string(),
          nameKey: z.string(),
          location: pointSchema,
          difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'technical']),
          maxDepthMetres: z.number().int().nullable(),
          requiresCertification: z.string().nullable(),
        }),
      ),
    )
    .query(() => {
      // TODO(persistence): select from dive_sites.
      return [];
    }),

  /**
   * Publishing is gated on a permission, not on a role, so vendor staff can
   * draft a listing and only an owner can put it live.
   */
  publish: requirePermission('catalog.publish')
    .input(z.object({ serviceId: z.string().uuid() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(({ input, ctx }) => {
      ctx.logger.info('service publish requested', { serviceId: input.serviceId });
      // TODO(persistence): transition services.status to 'underReview' and
      // write an audit_log row.
      return { ok: true as const };
    }),
});
