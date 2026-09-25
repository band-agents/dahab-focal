import { TRPCError } from '@trpc/server';
import { asc, sql } from 'drizzle-orm';
import { z } from 'zod';

import { canAny } from '@dahab/api-contract';
import { schema } from '@dahab/db';
import type { Database } from '@dahab/db';

import { requireDatabase } from '../database.ts';
import { requirePermission } from '../trpc.ts';
import type { Context } from '../context.ts';

/**
 * Onboarding an operator from Sky Eye: the centre, and the person who owns it.
 *
 * Until this, the only way a dive centre reached the platform was the seed.
 * Creating one makes three rows in one transaction — the owner's account, the
 * `vendors` row that points at it (`owner_user_id` is NOT NULL, so there is no
 * order in which a centre can exist without its owner), and the
 * `vendorOwner` role scoped to the new centre, which is what makes the owner
 * a "sub-user" of it the same way every guide is.
 *
 * **No password here.** The owner's login — a username and a first password
 * — is made by a separate step on the operator's page, which the operator
 * dashboard work owns (`admin-logins.ts` on that branch). This procedure only
 * decides that the centre and its owner exist. An account created here can
 * be found and seen, and cannot be signed in to until that step runs.
 *
 * A new centre starts `applied`, with its verification `pending` and no
 * papers. It cannot publish anything until its documents are verified —
 * which is the job of the queue on the operators screen, not of this one.
 */

const MIN_REASON = 8;
const reasonSchema = z.string().trim().min(MIN_REASON).max(2000);

/** E.164, as everywhere else. Egypt is +20; an owner may be from anywhere. */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,18}$/, 'A phone number must be in E.164 form, starting with +.');
const emailSchema = z.string().trim().toLowerCase().email().max(320);

const createVendorInput = z.object({
  displayName: z.string().trim().min(1).max(120),
  legalName: z.string().trim().min(1).max(200),
  /** A `neighborhoods.slug`. Checked against the table, not trusted. */
  neighborhood: z.string().trim().min(1).max(60),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  owner: z
    .object({
      displayName: z.string().trim().min(1).max(80),
      phone: phoneSchema.optional(),
      email: emailSchema.optional(),
    })
    .refine((owner) => owner.phone !== undefined || owner.email !== undefined, {
      message: 'The owner needs a phone number or an email — an account nobody can reach cannot be handed over.',
    }),
  reason: reasonSchema,
});

/**
 * What already exists. Answered as data rather than thrown, so the screen can
 * say which field clashed instead of a generic "someone got there first".
 */
const takenSchema = z.object({
  ok: z.literal(false),
  taken: z.enum(['name', 'ownerEmail', 'ownerPhone']),
});

/**
 * A slug from a display name: "Fanous Divers" → `fanous-divers`.
 *
 * An Arabic-only name has no Latin letters to make one from, so it falls back
 * to the legal name and then to `operator`; the number suffix below keeps any
 * of them unique. The slug is an identifier, never shown — the display name
 * is what every screen prints.
 */
export function slugFor(...candidates: readonly string[]): string {
  for (const candidate of candidates) {
    const slug = candidate
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '');
    if (slug.length >= 2) return slug;
  }
  return 'operator';
}

/** The first of `base`, `base-2`, `base-3` … that no operator holds yet. */
export function pickSlug(base: string, used: ReadonlySet<string>): string {
  if (!used.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** The constraint a Postgres unique violation (23505) names, if that is what this is. */
function uniqueViolation(error: unknown): string | null {
  for (let current: unknown = error; current !== null && typeof current === 'object'; ) {
    const candidate = current as { code?: unknown; constraint_name?: unknown; cause?: unknown };
    if (candidate.code === '23505' && typeof candidate.constraint_name === 'string') {
      return candidate.constraint_name;
    }
    current = candidate.cause;
  }
  return null;
}

async function audit(
  tx: Database,
  ctx: Context,
  entry: {
    entityTable: string;
    entityId: string;
    action: string;
    reason: string;
    after: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(schema.auditLog).values({
    actorUserId: ctx.session?.userId ?? null,
    actorKind: 'user',
    actorLabel: ctx.session?.roles.join(',') ?? null,
    entityTable: entry.entityTable,
    entityId: entry.entityId,
    action: entry.action,
    reason: entry.reason,
    beforeJson: {},
    afterJson: entry.after,
    requestId: ctx.requestId,
    createdAt: ctx.now,
  });
}

export const adminOnboardingRouter = {
  /** The areas an operator can be placed in, for the form's picker. */
  neighborhoods: requirePermission('vendor.readAny')
    .output(z.array(z.object({ slug: z.string(), nameKey: z.string() })))
    .query(async ({ ctx }) => {
      const db = requireDatabase(ctx.db);
      return db
        .select({ slug: schema.neighborhoods.slug, nameKey: schema.neighborhoods.nameKey })
        .from(schema.neighborhoods)
        .orderBy(asc(schema.neighborhoods.slug));
    }),

  /**
   * A new operator and its owner.
   *
   * Gated on `vendor.create`, and on `role.grant` and `user.manage` as well —
   * checked before the transaction opens — because making the owner creates
   * an account and grants it a role, and neither act may ride in on the
   * back of a narrower permission.
   */
  createVendor: requirePermission('vendor.create')
    .input(createVendorInput)
    .output(
      z.union([
        z.object({ ok: z.literal(true), vendorId: z.string().uuid(), ownerUserId: z.string().uuid() }),
        takenSchema,
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const roles = ctx.session?.roles ?? [];
      if (!canAny(roles, 'role.grant') || !canAny(roles, 'user.manage')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Creating an operator creates its owner and grants them a role; this account cannot.',
        });
      }
      const db = requireDatabase(ctx.db);

      /*
       * Every check in ONE statement. Measured on 25 Sep: a query postgres-js
       * has not run on a connection before costs two round trips (it learns
       * the parameter types first), and several of them on one connection
       * queue behind each other — five separate checks took ~600 ms, this
       * takes ~150. They run before the transaction on purpose: a race
       * between the check and the insert is closed by the unique indexes on
       * email, phone and slug, which are caught below.
       */
      const base = slugFor(input.displayName, input.legalName);
      const [check] = await db.execute<{
        area_exists: boolean;
        name_taken: boolean;
        email_taken: boolean;
        phone_taken: boolean;
        slugs: string[] | null;
      }>(sql`
        SELECT
          EXISTS (SELECT 1 FROM neighborhoods n WHERE n.slug = ${input.neighborhood}) AS area_exists,
          -- The same centre entered twice is the likeliest mistake on this
          -- form, and a second "Fanous Divers" would split its bookings, its
          -- papers and its payouts between two rows.
          EXISTS (
            SELECT 1 FROM vendors v WHERE lower(v.display_name) = lower(${input.displayName})
          ) AS name_taken,
          EXISTS (SELECT 1 FROM users u WHERE u.email = ${input.owner.email ?? null}) AS email_taken,
          EXISTS (SELECT 1 FROM users u WHERE u.phone = ${input.owner.phone ?? null}) AS phone_taken,
          (
            SELECT array_agg(v.slug) FROM vendors v
            WHERE v.slug = ${base} OR v.slug LIKE ${`${base}-%`}
          ) AS slugs
      `);

      if (check === undefined || !check.area_exists) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No such neighbourhood.' });
      }
      if (check.name_taken) return { ok: false as const, taken: 'name' as const };
      if (check.email_taken) return { ok: false as const, taken: 'ownerEmail' as const };
      if (check.phone_taken) return { ok: false as const, taken: 'ownerPhone' as const };
      const slug = pickSlug(base, new Set(check.slugs ?? []));

      try {
        return await db.transaction(async (tx) => {
          const [owner] = await tx
            .insert(schema.users)
            .values({
              email: input.owner.email ?? null,
              phone: input.owner.phone ?? null,
              isGuest: false,
              createdAt: ctx.now,
              updatedAt: ctx.now,
            })
            .returning({ id: schema.users.id });
          if (owner === undefined) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'The owner was not created.' });
          }

          // Both need only the owner's id, so they go together; postgres-js
          // pipelines them on the transaction's one connection.
          const [, vendorRows] = await Promise.all([
            tx.insert(schema.userProfiles).values({
              userId: owner.id,
              displayName: input.owner.displayName,
              createdAt: ctx.now,
              updatedAt: ctx.now,
            }),
            tx
              .insert(schema.vendors)
              .values({
                slug,
                legalName: input.legalName,
                displayName: input.displayName,
                status: 'applied',
                verificationStatus: 'pending',
                ownerUserId: owner.id,
                neighborhood: input.neighborhood,
                phone: input.phone ?? null,
                email: input.email ?? null,
                createdAt: ctx.now,
                updatedAt: ctx.now,
              })
              .returning({ id: schema.vendors.id }),
          ]);
          const vendor = vendorRows[0];
          if (vendor === undefined) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'The operator was not created.' });
          }

          // The role, and two audit rows — one per thing that now exists, so
          // the centre's history and the owner's each start here.
          await Promise.all([
            tx.insert(schema.userRoles).values({
              userId: owner.id,
              role: 'vendorOwner',
              vendorId: vendor.id,
              createdAt: ctx.now,
              updatedAt: ctx.now,
            }),
            audit(tx, ctx, {
              entityTable: 'vendors',
              entityId: vendor.id,
              action: 'vendor.create',
              reason: input.reason,
              after: {
                displayName: input.displayName,
                legalName: input.legalName,
                slug,
                neighborhood: input.neighborhood,
                status: 'applied',
                ownerUserId: owner.id,
              },
            }),
            audit(tx, ctx, {
              entityTable: 'users',
              entityId: owner.id,
              action: 'user.create',
              reason: input.reason,
              after: {
                displayName: input.owner.displayName,
                email: input.owner.email ?? null,
                phone: input.owner.phone ?? null,
                roles: [{ role: 'vendorOwner', vendorId: vendor.id }],
              },
            }),
          ]);

          ctx.logger.info('operator created', { vendorId: vendor.id, ownerUserId: owner.id });
          return { ok: true as const, vendorId: vendor.id, ownerUserId: owner.id };
        });
      } catch (error) {
        // Somebody took the email, the phone or the slug between the checks
        // above and the insert. The index refused it; say which.
        const constraint = uniqueViolation(error);
        if (constraint === 'users_email_key') return { ok: false as const, taken: 'ownerEmail' as const };
        if (constraint === 'users_phone_key') return { ok: false as const, taken: 'ownerPhone' as const };
        if (constraint === 'vendors_slug_key') {
          throw new TRPCError({ code: 'CONFLICT', message: 'That operator was created a moment ago.' });
        }
        throw error;
      }
    }),
};
