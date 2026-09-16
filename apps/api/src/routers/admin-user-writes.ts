import { TRPCError } from '@trpc/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { canAny, roleSchema } from '@dahab/api-contract';
import { schema } from '@dahab/db';
import type { Database } from '@dahab/db';

import { requireDatabase } from '../database.ts';
import { requirePermission } from '../trpc.ts';
import type { Context } from '../context.ts';

/**
 * Accounts: create, edit, suspend, and who reports to whom.
 *
 * The same three rules as every other write in this console — a reason, one
 * transaction, an audit row carrying both sides — plus two that only apply
 * here, because this file is the privilege-escalation surface.
 *
 * **No password ever crosses this boundary.** `createUser` makes the row and
 * the roles and stops. A traveller and a centre's staff sign in by one-time
 * code, so for them that is the whole story; console staff need a password,
 * and that is still set by `pnpm staff:create`, which prompts for it in a
 * terminal and never puts it in a form, a request body or a log. A console
 * that could set somebody's password is a console whose own compromise hands
 * over every account on the platform.
 *
 * **Granting is not managing.** `user.manage` suspends and edits; `role.grant`
 * promotes. They are separate permissions because anyone who can grant a role
 * can grant themselves every other permission that exists, and that act should
 * be withholdable on its own.
 *
 * The parent/child relationship people expect from "sub-users" is not a column
 * on `users`. It is `user_roles.vendor_id`: a centre owner holds `vendorOwner`
 * scoped to Fanous Divers, and the guides beneath them hold `vendorStaff`
 * scoped to the same vendor. One mechanism covers both the case somebody means
 * by "staff under an operator" and the case they mean by "sub-admins", and
 * neither needs a second hierarchy that could disagree with the first.
 */

const MIN_REASON = 8;
const reasonSchema = z.string().trim().min(MIN_REASON).max(2000);
const okSchema = z.object({ ok: z.literal(true) });

async function audit(
  tx: Database,
  ctx: Context,
  entry: {
    entityTable: string;
    entityId: string;
    action: string;
    reason: string;
    before: Record<string, unknown>;
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
    beforeJson: entry.before,
    afterJson: entry.after,
    requestId: ctx.requestId,
    createdAt: ctx.now,
  });
}

/** E.164. Egypt is +20, but travellers arrive from everywhere. */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,18}$/, 'A phone number must be in E.164 form, starting with +.');

const emailSchema = z.string().trim().toLowerCase().email().max(320);

/**
 * A role, and the operator it is scoped to.
 *
 * `vendorOwner` and `vendorStaff` are meaningless without a vendor — a guide
 * is a guide *at* somewhere — and `admin` and `traveler` are meaningless with
 * one. Enforced here rather than trusted, because a `vendorStaff` row with a
 * null vendor is an account that passes a role check and then sees nothing,
 * which is the hardest kind of bug to recognise from a support ticket.
 */
const roleGrantSchema = z
  .object({ role: roleSchema, vendorId: z.string().uuid().optional() })
  .refine(
    (value) =>
      value.role === 'vendorOwner' || value.role === 'vendorStaff'
        ? value.vendorId !== undefined
        : value.vendorId === undefined,
    {
      message:
        'vendorOwner and vendorStaff must name the operator they are scoped to; admin, traveler and guest must not.',
    },
  );

export const adminUserWritesRouter = {
  /**
   * Create an account.
   *
   * Either an email or a phone — an account with neither cannot be signed in
   * to or contacted, and `users` already allows both to be null for the guest
   * carts that are not this. Roles are granted in the same transaction, so a
   * half-made account with no way to be anything never exists even for a
   * moment.
   */
  createUser: requirePermission('user.manage')
    .input(
      z
        .object({
          email: emailSchema.optional(),
          phone: phoneSchema.optional(),
          displayName: z.string().trim().min(1).max(80).optional(),
          /** ISO 3166-1 alpha-2. Drives the resident rate and the no-fly warning. */
          countryCode: z.string().trim().length(2).toUpperCase().optional(),
          roles: z.array(roleGrantSchema).max(4).default([]),
          reason: reasonSchema,
        })
        .refine((value) => value.email !== undefined || value.phone !== undefined, {
          message: 'An account needs an email or a phone number.',
        }),
    )
    .output(z.object({ id: z.string().uuid(), needsConsolePassword: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      /*
       * This procedure is gated on `user.manage`, and creating an account WITH
       * a role is also granting one — so the second permission is checked here,
       * against the same matrix `requirePermission` reads. Before the
       * transaction opens, so the refusal is about the request rather than a
       * rollback somebody has to read the log to understand.
       */
      if (input.roles.length > 0 && !canAny(ctx.session?.roles ?? [], 'role.grant')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'This account can create users but not grant roles. Create the account, then ask someone with role.grant to assign one.',
        });
      }

      return db.transaction(async (tx) => {
        for (const [column, value] of [
          ['email', input.email],
          ['phone', input.phone],
        ] as const) {
          if (value === undefined) continue;
          const [taken] = await tx
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(
              column === 'email' ? eq(schema.users.email, value) : eq(schema.users.phone, value),
            )
            .limit(1);
          if (taken !== undefined) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: `That ${column} already belongs to an account.`,
            });
          }
        }

        const [created] = await tx
          .insert(schema.users)
          .values({
            email: input.email ?? null,
            phone: input.phone ?? null,
            isGuest: false,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          })
          .returning({ id: schema.users.id });

        if (created === undefined) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'The account was not created.' });
        }

        if (input.displayName !== undefined || input.countryCode !== undefined) {
          await tx.insert(schema.userProfiles).values({
            userId: created.id,
            displayName: input.displayName ?? null,
            countryCode: input.countryCode ?? null,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          });
        }

        for (const grant of input.roles) {
          await tx.insert(schema.userRoles).values({
            userId: created.id,
            role: grant.role,
            vendorId: grant.vendorId ?? null,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          });
        }

        await audit(tx, ctx, {
          entityTable: 'users',
          entityId: created.id,
          action: 'user.create',
          reason: input.reason,
          before: {},
          after: {
            email: input.email ?? null,
            phone: input.phone ?? null,
            displayName: input.displayName ?? null,
            roles: input.roles,
          },
        });

        ctx.logger.info('account created', { userId: created.id, roles: input.roles.length });

        return {
          id: created.id,
          // An admin cannot sign in to the console until a password exists,
          // and it is not this endpoint's job to make one. Say so plainly
          // rather than leaving somebody to discover it at the sign-in form.
          needsConsolePassword: input.roles.some((grant) => grant.role === 'admin'),
        };
      });
    }),

  /** Edit the parts of an account that are not its roles or its state. */
  updateUser: requirePermission('user.manage')
    .input(
      z.object({
        userId: z.string().uuid(),
        displayName: z.string().trim().max(80).nullable().optional(),
        countryCode: z.string().trim().length(2).toUpperCase().nullable().optional(),
        email: emailSchema.nullable().optional(),
        phone: phoneSchema.nullable().optional(),
        reason: reasonSchema,
      }),
    )
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        const [account] = await tx
          .select({ id: schema.users.id, email: schema.users.email, phone: schema.users.phone })
          .from(schema.users)
          .where(eq(schema.users.id, input.userId))
          .limit(1);

        if (account === undefined) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No such account.' });
        }

        const contactChanges: Record<string, string | null> = {};
        if (input.email !== undefined) contactChanges['email'] = input.email;
        if (input.phone !== undefined) contactChanges['phone'] = input.phone;

        if (Object.keys(contactChanges).length > 0) {
          /*
           * Changing an email is changing how somebody signs in, so the
           * verification timestamp goes with it. Leaving `emailVerifiedAt`
           * standing would mark an address nobody has proved they own as
           * verified — and an admin typing a new address is not proof.
           */
          await tx
            .update(schema.users)
            .set({
              ...contactChanges,
              ...(input.email !== undefined ? { emailVerifiedAt: null } : {}),
              ...(input.phone !== undefined ? { phoneVerifiedAt: null } : {}),
              updatedAt: ctx.now,
            })
            .where(eq(schema.users.id, input.userId));
        }

        if (input.displayName !== undefined || input.countryCode !== undefined) {
          const profileValues = {
            ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
            ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
          };
          const [existing] = await tx
            .select({ id: schema.userProfiles.id })
            .from(schema.userProfiles)
            .where(eq(schema.userProfiles.userId, input.userId))
            .limit(1);

          if (existing === undefined) {
            await tx.insert(schema.userProfiles).values({
              userId: input.userId,
              displayName: input.displayName ?? null,
              countryCode: input.countryCode ?? null,
              createdAt: ctx.now,
              updatedAt: ctx.now,
            });
          } else {
            await tx
              .update(schema.userProfiles)
              .set({ ...profileValues, updatedAt: ctx.now })
              .where(eq(schema.userProfiles.userId, input.userId));
          }
        }

        await audit(tx, ctx, {
          entityTable: 'users',
          entityId: input.userId,
          action: 'user.update',
          reason: input.reason,
          before: { email: account.email, phone: account.phone },
          after: {
            ...contactChanges,
            ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
            ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
          },
        });

        return { ok: true as const };
      });
    }),

  /**
   * Grant a role, optionally scoped to an operator.
   *
   * This is how a sub-user is made: grant `vendorStaff` scoped to the vendor
   * whose owner they work under, and they appear beneath that operator
   * everywhere the console lists a team.
   */
  grantRole: requirePermission('role.grant')
    .input(z.object({ userId: z.string().uuid(), reason: reasonSchema }).and(roleGrantSchema))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        const [account] = await tx
          .select({ id: schema.users.id, isGuest: schema.users.isGuest })
          .from(schema.users)
          .where(eq(schema.users.id, input.userId))
          .limit(1);

        if (account === undefined) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No such account.' });
        }
        if (account.isGuest) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'A guest cart cannot hold a role. The account has to be claimed first.',
          });
        }

        if (input.vendorId !== undefined) {
          const [vendor] = await tx
            .select({ id: schema.vendors.id })
            .from(schema.vendors)
            .where(eq(schema.vendors.id, input.vendorId))
            .limit(1);
          if (vendor === undefined) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'No such operator.' });
          }
        }

        const [existing] = await tx
          .select({ id: schema.userRoles.id })
          .from(schema.userRoles)
          .where(
            and(
              eq(schema.userRoles.userId, input.userId),
              eq(schema.userRoles.role, input.role),
              input.vendorId === undefined
                ? isNull(schema.userRoles.vendorId)
                : eq(schema.userRoles.vendorId, input.vendorId),
            ),
          )
          .limit(1);

        if (existing !== undefined) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This account already holds that role. Reload the page.',
          });
        }

        await tx.insert(schema.userRoles).values({
          userId: input.userId,
          role: input.role,
          vendorId: input.vendorId ?? null,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        });

        await audit(tx, ctx, {
          entityTable: 'user_roles',
          entityId: input.userId,
          action: 'role.grant',
          reason: input.reason,
          before: {},
          after: { role: input.role, vendorId: input.vendorId ?? null },
        });

        ctx.logger.warn('role granted', {
          userId: input.userId,
          role: input.role,
          vendorId: input.vendorId ?? null,
        });
        return { ok: true as const };
      });
    }),

  /** Take a role away. */
  revokeRole: requirePermission('role.grant')
    .input(z.object({ userId: z.string().uuid(), reason: reasonSchema }).and(roleGrantSchema))
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        /*
         * The last admin may not revoke their own last admin role. A platform
         * with nobody who can grant a role is a platform whose only way back
         * is a database console — and the person most likely to do this is an
         * admin tidying up their own account.
         */
        if (input.role === 'admin') {
          const admins = await tx
            .select({ userId: schema.userRoles.userId })
            .from(schema.userRoles)
            .where(eq(schema.userRoles.role, 'admin'));
          if (admins.length <= 1) {
            throw new TRPCError({
              code: 'PRECONDITION_FAILED',
              message:
                'This is the last admin on the platform. Grant admin to somebody else before revoking this one.',
            });
          }
        }

        const deleted = await tx
          .delete(schema.userRoles)
          .where(
            and(
              eq(schema.userRoles.userId, input.userId),
              eq(schema.userRoles.role, input.role),
              input.vendorId === undefined
                ? isNull(schema.userRoles.vendorId)
                : eq(schema.userRoles.vendorId, input.vendorId),
            ),
          )
          .returning({ id: schema.userRoles.id });

        if (deleted.length === 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This account does not hold that role. Reload the page.',
          });
        }

        await audit(tx, ctx, {
          entityTable: 'user_roles',
          entityId: input.userId,
          action: 'role.revoke',
          reason: input.reason,
          before: { role: input.role, vendorId: input.vendorId ?? null },
          after: {},
        });

        ctx.logger.warn('role revoked', { userId: input.userId, role: input.role });
        return { ok: true as const };
      });
    }),

  /**
   * Suspend an account, or lift a suspension.
   *
   * Suspending revokes every live session in the same transaction: an account
   * that is suspended but still holds a valid refresh token is not suspended,
   * it is suspended in about fifteen minutes.
   *
   * Nothing is deleted. `audit_log` has a foreign key onto the actor, and
   * removing a person removes the record of what they approved — which is the
   * reason `staff:create --disable` exists rather than a delete.
   */
  setUserSuspended: requirePermission('user.manage')
    .input(
      z.object({
        userId: z.string().uuid(),
        suspended: z.boolean(),
        reason: reasonSchema,
      }),
    )
    .output(z.object({ ok: z.literal(true), sessionsRevoked: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        const [account] = await tx
          .select({ id: schema.users.id, deletedAt: schema.users.deletedAt })
          .from(schema.users)
          .where(eq(schema.users.id, input.userId))
          .limit(1);

        if (account === undefined) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No such account.' });
        }
        if ((account.deletedAt !== null) === input.suspended) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: input.suspended
              ? 'This account is already suspended. Reload the page.'
              : 'This account is not suspended. Reload the page.',
          });
        }

        // Suspending your own account locks you out of the console with no
        // way back in. It is always a mistake and never a decision.
        if (input.suspended && ctx.session?.userId === input.userId) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'You cannot suspend the account you are signed in with.',
          });
        }

        await tx
          .update(schema.users)
          .set({ deletedAt: input.suspended ? ctx.now : null, updatedAt: ctx.now })
          .where(eq(schema.users.id, input.userId));

        let sessionsRevoked = 0;
        if (input.suspended) {
          const revoked = await tx
            .update(schema.sessions)
            .set({ revokedAt: ctx.now })
            .where(and(eq(schema.sessions.userId, input.userId), isNull(schema.sessions.revokedAt)))
            .returning({ id: schema.sessions.id });
          sessionsRevoked = revoked.length;
        }

        await audit(tx, ctx, {
          entityTable: 'users',
          entityId: input.userId,
          action: input.suspended ? 'user.suspend' : 'user.restore',
          reason: input.reason,
          before: { suspended: account.deletedAt !== null },
          after: { suspended: input.suspended, sessionsRevoked },
        });

        ctx.logger.warn(input.suspended ? 'account suspended' : 'account restored', {
          userId: input.userId,
          sessionsRevoked,
        });
        return { ok: true as const, sessionsRevoked };
      });
    }),

  /** Sign an account out everywhere, without suspending it. */
  endUserSessions: requirePermission('user.manage')
    .input(z.object({ userId: z.string().uuid(), reason: reasonSchema }))
    .output(z.object({ ok: z.literal(true), sessionsRevoked: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        const revoked = await tx
          .update(schema.sessions)
          .set({ revokedAt: ctx.now })
          .where(and(eq(schema.sessions.userId, input.userId), isNull(schema.sessions.revokedAt)))
          .returning({ id: schema.sessions.id });

        if (revoked.length === 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This account has no live sessions. Reload the page.',
          });
        }

        await audit(tx, ctx, {
          entityTable: 'sessions',
          entityId: input.userId,
          action: 'user.endSessions',
          reason: input.reason,
          before: { liveSessions: revoked.length },
          after: { liveSessions: 0 },
        });

        return { ok: true as const, sessionsRevoked: revoked.length };
      });
    }),

  /**
   * Suspend an operator, or lift it.
   *
   * Suspending a vendor is not the same act as suspending the person who owns
   * it: the operator stops trading while the owner keeps their account, and
   * an admin who means one and does the other will find out from a phone call.
   * Two procedures, two permissions, two audit actions.
   */
  setVendorStatus: requirePermission('vendor.verify')
    .input(
      z.object({
        vendorId: z.string().uuid(),
        status: z.enum(['active', 'suspended', 'closed']),
        reason: reasonSchema,
      }),
    )
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);

      return db.transaction(async (tx) => {
        const [vendor] = await tx
          .select({ id: schema.vendors.id, status: schema.vendors.status })
          .from(schema.vendors)
          .where(eq(schema.vendors.id, input.vendorId))
          .limit(1);

        if (vendor === undefined) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No such operator.' });
        }
        if (vendor.status === input.status) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `This operator is already ${input.status}. Reload the page.`,
          });
        }

        await tx
          .update(schema.vendors)
          .set({ status: input.status, updatedAt: ctx.now })
          .where(eq(schema.vendors.id, input.vendorId));

        await audit(tx, ctx, {
          entityTable: 'vendors',
          entityId: vendor.id,
          action: `vendor.${input.status}`,
          reason: input.reason,
          before: { status: vendor.status },
          after: { status: input.status },
        });

        ctx.logger.warn('operator status changed', {
          vendorId: vendor.id,
          from: vendor.status,
          to: input.status,
        });
        return { ok: true as const };
      });
    }),
};
