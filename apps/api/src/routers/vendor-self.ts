import { TRPCError } from '@trpc/server';
import { and, count, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { schema } from '@dahab/db';
import type { Database } from '@dahab/db';

import { requireDatabase } from '../database.ts';
import { requireVendorPermission } from '../trpc.ts';
import type { Context } from '../context.ts';

/**
 * The operator looking after its own shop window: the profile, the stories,
 * the team, and what travellers have said.
 *
 * Every procedure is `requireVendorPermission`, which pins `ctx.vendorId` from
 * the session. No procedure here takes an operator id as input, and every
 * write that names a row by id — a picture, a story, a review, a team member —
 * re-checks that the row belongs to that operator before touching it. An id
 * guessed or copied from another operator's page gets NOT_FOUND, never a
 * change, and never a different error that would confirm the row exists.
 *
 * Unlike the admin console, nothing here asks for a reason. The people using
 * this are running a dive centre, often from a phone on a boat, and a reason
 * field on "change my logo" is friction with no reader. Consequential acts are
 * still written to the audit log — adding and removing a team member above
 * all — with the operator dashboard named as where they came from.
 */

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

async function audit(
  tx: Database,
  ctx: Context,
  entry: {
    entityTable: string;
    entityId: string;
    action: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  },
): Promise<void> {
  await tx.insert(schema.auditLog).values({
    actorUserId: ctx.session?.userId ?? null,
    actorKind: 'user',
    actorLabel: 'operator dashboard',
    entityTable: entry.entityTable,
    entityId: entry.entityId,
    action: entry.action,
    reason: null,
    beforeJson: entry.before,
    afterJson: entry.after,
    requestId: ctx.requestId,
    createdAt: ctx.now,
  });
}

/** A file this operator uploaded, still present. The only way media is attached. */
async function ownMedia(db: Database, vendorId: string, mediaId: string) {
  const [media] = await db
    .select({
      id: schema.mediaUploads.id,
      kind: schema.mediaUploads.kind,
      url: schema.mediaUploads.url,
    })
    .from(schema.mediaUploads)
    .where(
      and(
        eq(schema.mediaUploads.id, mediaId),
        eq(schema.mediaUploads.vendorId, vendorId),
        isNull(schema.mediaUploads.deletedAt),
      ),
    )
    .limit(1);
  if (media === undefined) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'No such upload for this operator.' });
  }
  return media;
}

const okSchema = z.object({ ok: z.literal(true) });

/** Plain text, trimmed; empty means "clear it". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

const storySchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['image', 'video']),
  url: z.string(),
  caption: z.string().nullable(),
  postedAt: z.string(),
  expiresAt: z.string(),
  pinned: z.boolean(),
  /** Still showing to travellers today. */
  live: z.boolean(),
  views: z.number().int(),
  authorName: z.string().nullable(),
  /** The signed-in person posted it, so they may take it down. */
  mine: z.boolean(),
});

export const vendorSelfRouter = {
  // ── The shop window ──────────────────────────────────────────────────────

  /**
   * Everything a traveller sees about this operator, plus what is missing.
   *
   * `missing` is the checklist the dashboard turns into "finish your profile".
   * An operator with no logo, no cover and no words about themselves loses the
   * comparison to one that has them before the price is ever read, and they
   * should be told so in the same place they fix it.
   */
  profile: requireVendorPermission('vendor.readOwn')
    .output(
      z.object({
        id: z.string().uuid(),
        displayName: z.string(),
        tagline: z.string().nullable(),
        about: z.string().nullable(),
        logoUrl: z.string().nullable(),
        coverUrl: z.string().nullable(),
        phone: z.string().nullable(),
        whatsapp: z.string().nullable(),
        email: z.string().nullable(),
        website: z.string().nullable(),
        addressLine: z.string().nullable(),
        neighborhood: z.string().nullable(),
        status: z.enum(['applied', 'inReview', 'active', 'suspended', 'closed']),
        verification: z.enum(['pending', 'inReview', 'verified', 'rejected', 'expired']),
        ratingHundredths: z.number().int().nullable(),
        reviews: z.number().int(),
        missing: z.array(
          z.enum(['logo', 'cover', 'tagline', 'about', 'phone', 'whatsapp', 'story']),
        ),
      }),
    )
    .query(async ({ ctx }) => {
      const db = requireDatabase(ctx.db);

      const [vendor] = await db
        .select()
        .from(schema.vendors)
        .where(eq(schema.vendors.id, ctx.vendorId))
        .limit(1);
      if (vendor === undefined) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'This operator no longer exists.' });
      }

      const [[reviewStats], [liveStories]] = await Promise.all([
        db
          .select({
            total: count(),
            ratingHundredths: sql<number | null>`round(avg(${schema.reviews.rating}) * 100)::int`,
          })
          .from(schema.reviews)
          .where(
            and(
              eq(schema.reviews.vendorId, ctx.vendorId),
              eq(schema.reviews.moderationStatus, 'published'),
            ),
          ),
        db
          .select({ total: count() })
          .from(schema.vendorStories)
          .where(
            and(
              eq(schema.vendorStories.vendorId, ctx.vendorId),
              isNull(schema.vendorStories.deletedAt),
              or(
                gt(schema.vendorStories.expiresAt, ctx.now),
                isNotNull(schema.vendorStories.pinnedAt),
              ),
            ),
          ),
      ]);

      const missing: ('logo' | 'cover' | 'tagline' | 'about' | 'phone' | 'whatsapp' | 'story')[] =
        [];
      if (vendor.logoUrl === null) missing.push('logo');
      if (vendor.coverUrl === null) missing.push('cover');
      if (vendor.tagline === null) missing.push('tagline');
      if (vendor.about === null) missing.push('about');
      if (vendor.phone === null) missing.push('phone');
      if (vendor.whatsapp === null) missing.push('whatsapp');
      if (Number(liveStories?.total ?? 0) === 0) missing.push('story');

      const reviews = Number(reviewStats?.total ?? 0);
      return {
        id: vendor.id,
        displayName: vendor.displayName,
        tagline: vendor.tagline,
        about: vendor.about,
        logoUrl: vendor.logoUrl,
        coverUrl: vendor.coverUrl,
        phone: vendor.phone,
        whatsapp: vendor.whatsapp,
        email: vendor.email,
        website: vendor.website,
        addressLine: vendor.addressLine,
        neighborhood: vendor.neighborhood,
        status: vendor.status,
        verification: vendor.verificationStatus,
        ratingHundredths:
          reviews === 0 || reviewStats?.ratingHundredths == null
            ? null
            : Number(reviewStats.ratingHundredths),
        reviews,
        missing,
      };
    }),

  /**
   * Edit the words and the ways to reach the operator.
   *
   * The name is not editable here. A dive centre renaming itself is a change
   * the platform's verification was done against, so it goes through the
   * platform team — the dashboard says so beside the name rather than simply
   * not offering it.
   */
  updateProfile: requireVendorPermission('vendor.writeOwn')
    .input(
      z.object({
        tagline: optionalText(140),
        about: optionalText(2000),
        phone: optionalText(20),
        whatsapp: optionalText(20),
        email: z
          .string()
          .trim()
          .toLowerCase()
          .max(320)
          .transform((value) => (value === '' ? null : value))
          .pipe(z.string().email().nullable())
          .nullable()
          .optional(),
        website: optionalText(200),
        addressLine: optionalText(300),
      }),
    )
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const changes = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
      );
      if (Object.keys(changes).length === 0) return { ok: true as const };

      await db.transaction(async (tx) => {
        await tx
          .update(schema.vendors)
          .set({ ...changes, updatedAt: ctx.now })
          .where(eq(schema.vendors.id, ctx.vendorId));
        await audit(tx, ctx, {
          entityTable: 'vendors',
          entityId: ctx.vendorId,
          action: 'vendor.profile.update',
          before: {},
          after: changes,
        });
      });
      return { ok: true as const };
    }),

  /** Put an uploaded picture in the logo or cover slot, or clear the slot. */
  setProfileImage: requireVendorPermission('vendor.writeOwn')
    .input(
      z.object({
        slot: z.enum(['logo', 'cover']),
        /** Null clears the slot. */
        mediaId: z.string().uuid().nullable(),
      }),
    )
    .output(z.object({ ok: z.literal(true), url: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      let url: string | null = null;
      if (input.mediaId !== null) {
        const media = await ownMedia(db, ctx.vendorId, input.mediaId);
        if (media.kind !== 'image') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A logo or cover has to be a photo.' });
        }
        url = media.url;
      }

      await db
        .update(schema.vendors)
        .set({
          ...(input.slot === 'logo' ? { logoUrl: url } : { coverUrl: url }),
          updatedAt: ctx.now,
        })
        .where(eq(schema.vendors.id, ctx.vendorId));
      return { ok: true as const, url };
    }),

  // ── The person signed in ─────────────────────────────────────────────────

  me: requireVendorPermission('vendor.readOwn')
    .output(
      z.object({
        id: z.string().uuid(),
        displayName: z.string().nullable(),
        avatarUrl: z.string().nullable(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        isOwner: z.boolean(),
      }),
    )
    .query(async ({ ctx }) => {
      const db = requireDatabase(ctx.db);
      const userId = ctx.session?.userId;
      if (userId === null || userId === undefined) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in again.' });
      }
      const [row] = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          phone: schema.users.phone,
          displayName: schema.userProfiles.displayName,
          avatarUrl: schema.userProfiles.avatarUrl,
        })
        .from(schema.users)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
        .where(eq(schema.users.id, userId))
        .limit(1);
      if (row === undefined) throw new TRPCError({ code: 'NOT_FOUND', message: 'No such account.' });
      return {
        ...row,
        isOwner: ctx.session?.roles.includes('vendorOwner') === true,
      };
    }),

  /** Change your own name and picture. Anybody on the team, for themselves. */
  updateMe: requireVendorPermission('vendor.readOwn')
    .input(
      z.object({
        displayName: z.string().trim().min(1).max(80).optional(),
        /** An uploaded photo to use; null removes the picture. */
        avatarMediaId: z.string().uuid().nullable().optional(),
      }),
    )
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const userId = ctx.session?.userId;
      if (userId === null || userId === undefined) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in again.' });
      }

      let avatarUrl: string | null | undefined;
      if (input.avatarMediaId === null) avatarUrl = null;
      else if (input.avatarMediaId !== undefined) {
        const media = await ownMedia(db, ctx.vendorId, input.avatarMediaId);
        if (media.kind !== 'image') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'A profile picture has to be a photo.' });
        }
        avatarUrl = media.url;
      }

      const values = {
        ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
        ...(avatarUrl === undefined ? {} : { avatarUrl }),
      };
      if (Object.keys(values).length === 0) return { ok: true as const };

      const [existing] = await db
        .select({ id: schema.userProfiles.id })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, userId))
        .limit(1);
      if (existing === undefined) {
        await db
          .insert(schema.userProfiles)
          .values({ userId, ...values, createdAt: ctx.now, updatedAt: ctx.now });
      } else {
        await db
          .update(schema.userProfiles)
          .set({ ...values, updatedAt: ctx.now })
          .where(eq(schema.userProfiles.userId, userId));
      }
      return { ok: true as const };
    }),

  // ── Stories ──────────────────────────────────────────────────────────────

  /** What is showing now, and what has been pinned — newest first. */
  stories: requireVendorPermission('vendor.readOwn')
    .output(z.array(storySchema))
    .query(async ({ ctx }) => {
      const db = requireDatabase(ctx.db);
      const rows = await db
        .select({
          id: schema.vendorStories.id,
          kind: schema.mediaUploads.kind,
          url: schema.mediaUploads.url,
          caption: schema.vendorStories.caption,
          createdAt: schema.vendorStories.createdAt,
          expiresAt: schema.vendorStories.expiresAt,
          pinnedAt: schema.vendorStories.pinnedAt,
          views: schema.vendorStories.views,
          authorUserId: schema.vendorStories.authorUserId,
          authorName: schema.userProfiles.displayName,
        })
        .from(schema.vendorStories)
        .innerJoin(schema.mediaUploads, eq(schema.mediaUploads.id, schema.vendorStories.mediaId))
        .leftJoin(
          schema.userProfiles,
          eq(schema.userProfiles.userId, schema.vendorStories.authorUserId),
        )
        .where(
          and(
            eq(schema.vendorStories.vendorId, ctx.vendorId),
            isNull(schema.vendorStories.deletedAt),
            or(
              gt(schema.vendorStories.expiresAt, ctx.now),
              isNotNull(schema.vendorStories.pinnedAt),
            ),
          ),
        )
        .orderBy(desc(schema.vendorStories.createdAt))
        .limit(100);

      const me = ctx.session?.userId ?? null;
      return rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        url: row.url,
        caption: row.caption,
        postedAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        pinned: row.pinnedAt !== null,
        live: row.expiresAt.getTime() > ctx.now.getTime(),
        views: row.views,
        authorName: row.authorName,
        mine: me !== null && row.authorUserId === me,
      }));
    }),

  /** Post an uploaded photo or video as a story. Up for 24 hours. */
  postStory: requireVendorPermission('story.post')
    .input(
      z.object({
        mediaId: z.string().uuid(),
        caption: optionalText(200),
      }),
    )
    .output(z.object({ id: z.string().uuid(), expiresAt: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      await ownMedia(db, ctx.vendorId, input.mediaId);

      // A file can be one story, not ten. Posting the same upload twice is a
      // double tap, not an intention.
      const [already] = await db
        .select({ id: schema.vendorStories.id })
        .from(schema.vendorStories)
        .where(
          and(
            eq(schema.vendorStories.mediaId, input.mediaId),
            isNull(schema.vendorStories.deletedAt),
          ),
        )
        .limit(1);
      if (already !== undefined) {
        throw new TRPCError({ code: 'CONFLICT', message: 'That has already been posted.' });
      }

      const expiresAt = new Date(ctx.now.getTime() + STORY_LIFETIME_MS);
      const [row] = await db
        .insert(schema.vendorStories)
        .values({
          vendorId: ctx.vendorId,
          authorUserId: ctx.session?.userId ?? null,
          mediaId: input.mediaId,
          caption: input.caption ?? null,
          expiresAt,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        })
        .returning({ id: schema.vendorStories.id });

      if (row === undefined) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'The story was not posted.' });
      }
      return { id: row.id, expiresAt: expiresAt.toISOString() };
    }),

  /** Keep a story on the profile after its day, or stop keeping it. Owner only. */
  pinStory: requireVendorPermission('vendor.writeOwn')
    .input(z.object({ storyId: z.string().uuid(), pinned: z.boolean() }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const updated = await db
        .update(schema.vendorStories)
        .set({ pinnedAt: input.pinned ? ctx.now : null, updatedAt: ctx.now })
        .where(
          and(
            eq(schema.vendorStories.id, input.storyId),
            eq(schema.vendorStories.vendorId, ctx.vendorId),
            isNull(schema.vendorStories.deletedAt),
          ),
        )
        .returning({ id: schema.vendorStories.id });
      if (updated.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No such story.' });
      }
      return { ok: true as const };
    }),

  /**
   * Take a story down. The person who posted it can, and so can the owner —
   * a guide cannot remove a colleague's post, but the owner can remove
   * anything on their own shop window.
   */
  deleteStory: requireVendorPermission('story.post')
    .input(z.object({ storyId: z.string().uuid() }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const [story] = await db
        .select({ id: schema.vendorStories.id, authorUserId: schema.vendorStories.authorUserId })
        .from(schema.vendorStories)
        .where(
          and(
            eq(schema.vendorStories.id, input.storyId),
            eq(schema.vendorStories.vendorId, ctx.vendorId),
            isNull(schema.vendorStories.deletedAt),
          ),
        )
        .limit(1);
      if (story === undefined) throw new TRPCError({ code: 'NOT_FOUND', message: 'No such story.' });

      const isOwner = ctx.session?.roles.includes('vendorOwner') === true;
      const isAuthor = story.authorUserId !== null && story.authorUserId === ctx.session?.userId;
      if (!isOwner && !isAuthor) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the person who posted it, or the owner, can take it down.',
        });
      }

      await db
        .update(schema.vendorStories)
        .set({ deletedAt: ctx.now, updatedAt: ctx.now })
        .where(eq(schema.vendorStories.id, story.id));
      return { ok: true as const };
    }),

  // ── The team ─────────────────────────────────────────────────────────────

  /**
   * Everyone who can sign in for this operator.
   *
   * These are `user_roles` scoped to the vendor — the same rows the admin
   * console shows under "accounts under this one" and the same rows every
   * permission check reads, so what the owner sees here is exactly who can
   * act for them.
   */
  team: requireVendorPermission('vendor.readOwn')
    .output(
      z.array(
        z.object({
          userId: z.string().uuid(),
          displayName: z.string().nullable(),
          avatarUrl: z.string().nullable(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          role: z.enum(['vendorOwner', 'vendorStaff']),
          isMe: z.boolean(),
          suspended: z.boolean(),
          since: z.string(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDatabase(ctx.db);
      const rows = await db
        .select({
          userId: schema.users.id,
          email: schema.users.email,
          phone: schema.users.phone,
          deletedAt: schema.users.deletedAt,
          displayName: schema.userProfiles.displayName,
          avatarUrl: schema.userProfiles.avatarUrl,
          role: schema.userRoles.role,
          since: schema.userRoles.createdAt,
        })
        .from(schema.userRoles)
        .innerJoin(schema.users, eq(schema.users.id, schema.userRoles.userId))
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
        .where(
          and(
            eq(schema.userRoles.vendorId, ctx.vendorId),
            inArray(schema.userRoles.role, ['vendorOwner', 'vendorStaff']),
          ),
        )
        .orderBy(schema.userRoles.role, schema.userRoles.createdAt);

      return rows.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        email: row.email,
        phone: row.phone,
        role: row.role as 'vendorOwner' | 'vendorStaff',
        isMe: row.userId === ctx.session?.userId,
        suspended: row.deletedAt !== null,
        since: row.since.toISOString(),
      }));
    }),

  /**
   * Add somebody to the team.
   *
   * By phone number, because that is what a dive centre has for its guides —
   * and a phone is also how they sign in, with a one-time code and no password
   * to forget. If the number already belongs to an account, that account joins;
   * otherwise one is made.
   *
   * An owner can add staff and nothing else. Making a second owner, or
   * anybody an admin, is the platform team's act and is not reachable from
   * here — that is what `role.grant` exists to keep narrow.
   */
  addTeamMember: requireVendorPermission('staff.manage')
    .input(
      z.object({
        phone: z
          .string()
          .trim()
          .regex(/^\+[1-9]\d{6,18}$/, 'A phone number must start with + and the country code.'),
        displayName: z.string().trim().min(1).max(80),
      }),
    )
    .output(z.object({ userId: z.string().uuid(), created: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        let [account] = await tx
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.phone, input.phone))
          .limit(1);
        const created = account === undefined;

        if (account === undefined) {
          [account] = await tx
            .insert(schema.users)
            .values({ phone: input.phone, isGuest: false, createdAt: ctx.now, updatedAt: ctx.now })
            .returning({ id: schema.users.id });
          if (account === undefined) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'The account was not made.' });
          }
          await tx.insert(schema.userProfiles).values({
            userId: account.id,
            displayName: input.displayName,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          });
        }

        const [already] = await tx
          .select({ id: schema.userRoles.id })
          .from(schema.userRoles)
          .where(
            and(
              eq(schema.userRoles.userId, account.id),
              eq(schema.userRoles.vendorId, ctx.vendorId),
            ),
          )
          .limit(1);
        if (already !== undefined) {
          throw new TRPCError({ code: 'CONFLICT', message: 'This person is already on the team.' });
        }

        await tx.insert(schema.userRoles).values({
          userId: account.id,
          role: 'vendorStaff',
          vendorId: ctx.vendorId,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        });

        await audit(tx, ctx, {
          entityTable: 'user_roles',
          entityId: account.id,
          action: 'team.add',
          before: {},
          after: { role: 'vendorStaff', vendorId: ctx.vendorId, created },
        });

        return { userId: account.id, created };
      });
    }),

  /**
   * Take somebody off the team. Their account stays — it may be a traveller
   * too — and only their role at this operator goes. The owner cannot be
   * removed from here, and nobody can remove themselves by accident.
   */
  removeTeamMember: requireVendorPermission('staff.manage')
    .input(z.object({ userId: z.string().uuid() }))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      if (input.userId === ctx.session?.userId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'You cannot remove yourself.' });
      }

      return db.transaction(async (tx) => {
        const removed = await tx
          .delete(schema.userRoles)
          .where(
            and(
              eq(schema.userRoles.userId, input.userId),
              eq(schema.userRoles.vendorId, ctx.vendorId),
              eq(schema.userRoles.role, 'vendorStaff'),
            ),
          )
          .returning({ id: schema.userRoles.id });
        if (removed.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'That person is not on the team.' });
        }

        // End their sessions too: a guide taken off the team keeps a token
        // that says they are staff until it expires otherwise.
        await tx
          .update(schema.sessions)
          .set({ revokedAt: ctx.now })
          .where(and(eq(schema.sessions.userId, input.userId), isNull(schema.sessions.revokedAt)));

        await audit(tx, ctx, {
          entityTable: 'user_roles',
          entityId: input.userId,
          action: 'team.remove',
          before: { role: 'vendorStaff', vendorId: ctx.vendorId },
          after: {},
        });
        return { ok: true as const };
      });
    }),

  // ── What travellers said ─────────────────────────────────────────────────

  reviews: requireVendorPermission('vendor.readOwn')
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          rating: z.number().int(),
          title: z.string().nullable(),
          body: z.string().nullable(),
          travelerName: z.string().nullable(),
          postedAt: z.string(),
          reply: z.string().nullable(),
          repliedAt: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const db = requireDatabase(ctx.db);
      const rows = await db
        .select({
          id: schema.reviews.id,
          rating: schema.reviews.rating,
          createdAt: schema.reviews.createdAt,
          reply: schema.reviews.vendorReply,
          repliedAt: schema.reviews.vendorRepliedAt,
          travelerName: schema.userProfiles.displayName,
          // The review in the language it was written in. A translation is a
          // courtesy to other travellers; the operator replies to what was said.
          title: schema.reviewTranslations.title,
          body: schema.reviewTranslations.body,
        })
        .from(schema.reviews)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.reviews.userId))
        .leftJoin(
          schema.reviewTranslations,
          and(
            eq(schema.reviewTranslations.reviewId, schema.reviews.id),
            eq(schema.reviewTranslations.locale, schema.reviews.sourceLocale),
          ),
        )
        .where(
          and(
            eq(schema.reviews.vendorId, ctx.vendorId),
            eq(schema.reviews.moderationStatus, 'published'),
          ),
        )
        .orderBy(desc(schema.reviews.createdAt))
        .limit(200);

      return rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        title: row.title,
        body: row.body,
        // First name only. An operator has no need of a traveller's surname to
        // thank them, and a reply that addresses someone in full reads as a
        // company talking to a case number.
        travelerName: row.travelerName === null ? null : (row.travelerName.split(' ')[0] ?? null),
        postedAt: row.createdAt.toISOString(),
        reply: row.reply,
        repliedAt: row.repliedAt?.toISOString() ?? null,
      }));
    }),

  /** Answer a review, or change the answer. Public, so it is the owner's voice. */
  replyToReview: requireVendorPermission('vendor.writeOwn')
    .input(
      z.object({
        reviewId: z.string().uuid(),
        reply: z.string().trim().min(2).max(1000),
      }),
    )
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const updated = await db
        .update(schema.reviews)
        .set({ vendorReply: input.reply, vendorRepliedAt: ctx.now, updatedAt: ctx.now })
        .where(
          and(eq(schema.reviews.id, input.reviewId), eq(schema.reviews.vendorId, ctx.vendorId)),
        )
        .returning({ id: schema.reviews.id });
      if (updated.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No such review.' });
      }
      return { ok: true as const };
    }),
};
