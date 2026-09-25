import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import {
  MIN_OPERATOR_PASSWORD_LENGTH,
  canAny,
  operatorPasswordSchema,
  usernameSchema,
} from '@dahab/api-contract';
import { schema } from '@dahab/db';
import type { Database } from '@dahab/db';

import { endSessions, takenLoginField } from '../auth/logins.ts';
import { hashPassword } from '../auth/password.ts';
import { requireDatabase } from '../database.ts';
import { requirePermission } from '../trpc.ts';
import type { Context } from '../context.ts';

/**
 * Operator logins, made and mended from Sky Eye.
 *
 * The one place the console sets a password — and only an operator's. The
 * rest of the console keeps its rule that no password crosses it
 * (`admin-user-writes.ts`), because a console that can set passwords is a
 * console whose compromise hands over the accounts it can set them for. The
 * business asked for operator logins to be made here, so the exception is
 * drawn as tightly as it can be:
 *
 *   - **Operator accounts only.** Every procedure refuses an account that
 *     holds `admin`, so nothing here can take over the console itself.
 *   - **A reason, one transaction, an audit row** — as every console write —
 *     and the audit row says a password was set, never what it was.
 *   - **Sessions end** when a password is reset, so a login somebody else
 *     knew stops working everywhere at once.
 */

const reasonSchema = z.string().trim().min(8).max(2000);
const okSchema = z.object({ ok: z.literal(true) });
const takenSchema = z.object({ ok: z.literal(false), taken: z.enum(['username', 'email', 'phone']) });

async function audit(
  tx: Database,
  ctx: Context,
  entry: { entityId: string; action: string; reason: string; before: Record<string, unknown>; after: Record<string, unknown> },
): Promise<void> {
  await tx.insert(schema.auditLog).values({
    actorUserId: ctx.session?.userId ?? null,
    actorKind: 'user',
    actorLabel: ctx.session?.roles.join(',') ?? null,
    entityTable: 'users',
    entityId: entry.entityId,
    action: entry.action,
    reason: entry.reason,
    beforeJson: entry.before,
    afterJson: entry.after,
    requestId: ctx.requestId,
    createdAt: ctx.now,
  });
}

/** Refuses any account that holds `admin`. */
async function assertOperatorAccount(db: Database, userId: string): Promise<void> {
  const roles = await db
    .select({ role: schema.userRoles.role })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId));
  if (roles.some((row) => row.role === 'admin')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Console accounts are not managed here. Use pnpm staff:create.',
    });
  }
  if (!roles.some((row) => row.role === 'vendorOwner' || row.role === 'vendorStaff')) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This account is not part of any operator.' });
  }
}

export const adminLoginsRouter = {
  /** Everybody who can open one operator's dashboard, and how they sign in. */
  vendorLogins: requirePermission('user.readAny')
    .input(z.object({ vendorId: z.string().uuid() }))
    .output(
      z.array(
        z.object({
          userId: z.string().uuid(),
          displayName: z.string().nullable(),
          username: z.string().nullable(),
          email: z.string().nullable(),
          phone: z.string().nullable(),
          role: z.enum(['vendorOwner', 'vendorStaff']),
          hasPassword: z.boolean(),
          suspended: z.boolean(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      const rows = await db
        .select({
          userId: schema.users.id,
          displayName: schema.userProfiles.displayName,
          username: schema.users.username,
          email: schema.users.email,
          phone: schema.users.phone,
          role: schema.userRoles.role,
          passwordHash: schema.users.passwordHash,
          deletedAt: schema.users.deletedAt,
        })
        .from(schema.userRoles)
        .innerJoin(schema.users, eq(schema.users.id, schema.userRoles.userId))
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
        .where(
          and(
            eq(schema.userRoles.vendorId, input.vendorId),
            inArray(schema.userRoles.role, ['vendorOwner', 'vendorStaff']),
          ),
        )
        .orderBy(schema.userRoles.role, schema.userRoles.createdAt);
      return rows.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        username: row.username,
        email: row.email,
        phone: row.phone,
        role: row.role as 'vendorOwner' | 'vendorStaff',
        hasPassword: row.passwordHash !== null,
        suspended: row.deletedAt !== null,
      }));
    }),

  /**
   * Make a login for an operator: an owner or a member of their team, with a
   * username and a first password to hand over. Always a new account — a name
   * or number that belongs to somebody already is answered with which one.
   * Needs `role.grant` as well as `user.manage`, because making it grants a role.
   */
  createVendorLogin: requirePermission('user.manage')
    .input(
      z.object({
        vendorId: z.string().uuid(),
        role: z.enum(['vendorOwner', 'vendorStaff']),
        displayName: z.string().trim().min(1).max(80),
        username: usernameSchema,
        password: operatorPasswordSchema,
        email: z.string().trim().toLowerCase().email().max(320).optional(),
        phone: z
          .string()
          .trim()
          .regex(/^\+[1-9]\d{6,18}$/, 'A phone number must be in E.164 form, starting with +.')
          .optional(),
        reason: reasonSchema,
      }),
    )
    .output(z.union([z.object({ ok: z.literal(true), userId: z.string().uuid() }), takenSchema]))
    .mutation(async ({ ctx, input }) => {
      if (!canAny(ctx.session?.roles ?? [], 'role.grant')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Making an operator login grants a role; this account cannot.' });
      }
      const db = requireDatabase(ctx.db);

      const [vendor] = await db
        .select({ id: schema.vendors.id })
        .from(schema.vendors)
        .where(eq(schema.vendors.id, input.vendorId))
        .limit(1);
      if (vendor === undefined) throw new TRPCError({ code: 'NOT_FOUND', message: 'No such operator.' });

      const taken = await takenLoginField(db, input);
      if (taken !== null) return { ok: false as const, taken };

      const passwordHash = await hashPassword(input.password, MIN_OPERATOR_PASSWORD_LENGTH);
      return db.transaction(async (tx) => {
        const [account] = await tx
          .insert(schema.users)
          .values({
            username: input.username,
            email: input.email ?? null,
            phone: input.phone ?? null,
            passwordHash,
            passwordUpdatedAt: ctx.now,
            isGuest: false,
            createdAt: ctx.now,
            updatedAt: ctx.now,
          })
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
        await tx.insert(schema.userRoles).values({
          userId: account.id,
          role: input.role,
          vendorId: input.vendorId,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        });
        await audit(tx, ctx, {
          entityId: account.id,
          action: 'login.create',
          reason: input.reason,
          before: {},
          after: { username: input.username, role: input.role, vendorId: input.vendorId, passwordSet: true },
        });
        return { ok: true as const, userId: account.id };
      });
    }),

  /**
   * Change an operator's username, give them a new password, or both — the
   * answer to "I forgot my password" and to a login that was made wrong.
   * Operator accounts only.
   */
  setVendorLogin: requirePermission('user.manage')
    .input(
      z
        .object({
          userId: z.string().uuid(),
          username: usernameSchema.optional(),
          newPassword: operatorPasswordSchema.optional(),
          reason: reasonSchema,
        })
        .refine((value) => value.username !== undefined || value.newPassword !== undefined, {
          message: 'Change the username, the password, or both.',
        }),
    )
    .output(z.union([okSchema, takenSchema]))
    .mutation(async ({ ctx, input }) => {
      const db = requireDatabase(ctx.db);
      await assertOperatorAccount(db, input.userId);

      if (input.username !== undefined) {
        const taken = await takenLoginField(db, { username: input.username }, input.userId);
        if (taken !== null) return { ok: false as const, taken };
      }

      const [before] = await db
        .select({ username: schema.users.username })
        .from(schema.users)
        .where(eq(schema.users.id, input.userId))
        .limit(1);
      if (before === undefined) throw new TRPCError({ code: 'NOT_FOUND', message: 'No such account.' });

      const passwordHash =
        input.newPassword === undefined ? undefined : await hashPassword(input.newPassword, MIN_OPERATOR_PASSWORD_LENGTH);

      await db.transaction(async (tx) => {
        await tx
          .update(schema.users)
          .set({
            ...(input.username === undefined ? {} : { username: input.username }),
            ...(passwordHash === undefined
              ? {}
              : { passwordHash, passwordUpdatedAt: ctx.now, failedSignInCount: 0, lockedUntil: null }),
            updatedAt: ctx.now,
          })
          .where(eq(schema.users.id, input.userId));
        if (passwordHash !== undefined) await endSessions(tx, input.userId, ctx.now);
        await audit(tx, ctx, {
          entityId: input.userId,
          action: 'login.update',
          reason: input.reason,
          before: { username: before.username },
          after: {
            username: input.username ?? before.username,
            passwordReset: passwordHash !== undefined,
          },
        });
      });
      return { ok: true as const };
    }),
};
