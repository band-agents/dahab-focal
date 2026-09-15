import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { and, eq, isNull } from 'drizzle-orm';

import {
  PERMISSIONS_BY_ROLE,
  emailStartSchema,
  guestSessionSchema,
  oauthCallbackSchema,
  passwordSignInSchema,
  phoneStartSchema,
  phoneVerifySchema,
  roleSchema,
  sessionSchema,
} from '@dahab/api-contract';
import { schema } from '@dahab/db';
import { LOCALE_DESCRIPTORS, resolveLocale } from '@dahab/i18n';

import { requireDatabase } from '../database.ts';
import {
  DUMMY_HASH,
  LOCKOUT_MINUTES,
  MAX_FAILED_SIGN_INS,
  hashPassword,
  needsRehash,
  verifyPassword,
} from '../auth/password.ts';
import {
  createSession,
  isSessionLive,
  refreshSession,
  revokeSession,
  rolesFor,
} from '../auth/sessions.ts';

import {
  ACCESS_TOKEN_TTL_SECONDS,
  issueAccessToken,
  issueRefreshToken,
  newSessionId,
} from '../auth/tokens.ts';
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  generateOtp,
  hashOtp,
  normalisePhone,
  resolveOtpTransport,
} from '../auth/otp.ts';
import { publicProcedure, router, sessionProcedure } from '../trpc.ts';

/**
 * Authentication.
 *
 * Two doors, on purpose, into two different surfaces:
 *
 *   - **Staff sign in with an email and a password** (`passwordSignIn`). The
 *     console has no phone in the loop and faces the open internet, so this
 *     one is fully persisted — sessions rows, rotation, revocation, lockout.
 *   - **Travellers sign in with a one-time code** (`phoneStart` /
 *     `phoneVerify`) and never hold a password to lose. That path still needs
 *     its challenge table wired and an SMS gateway chosen; every place it
 *     will touch the database is marked below.
 *
 * Plus a guest session that can later be claimed, so a cart survives an app
 * restart without a second identity being created for the same person.
 */

const credentialsSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresInSeconds: z.number().int(),
  session: sessionSchema,
});

function issueGuestCredentials(locale: string) {
  const sessionId = newSessionId();
  const resolvedLocale = resolveLocale(locale);
  const refresh = issueRefreshToken();

  const accessToken = issueAccessToken({
    sessionId,
    userId: null,
    roles: ['guest'],
    vendorId: null,
    isGuest: true,
    locale: resolvedLocale,
  });

  return {
    accessToken,
    refreshToken: refresh.token,
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    session: {
      id: sessionId,
      userId: null,
      roles: ['guest' as const],
      vendorId: null,
      isGuest: true,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000),
    },
  };
}

export const authRouter = router({
  /**
   * A guest session is a real session with a real id, so a cart survives an
   * app restart and an abandoned checkout can be resumed — and so signing in
   * later claims that work rather than creating a second identity.
   */
  guest: publicProcedure
    .input(guestSessionSchema)
    .output(credentialsSchema)
    .mutation(({ input, ctx }) => {
      ctx.logger.info('guest session issued', { deviceId: input.deviceId.slice(0, 8) });
      return issueGuestCredentials(input.locale ?? ctx.locale);
    }),

  /**
   * The console's sign-in.
   *
   * Every failure — unknown address, wrong password, locked account — returns
   * the same message and takes the same time. Distinguishing them turns the
   * form into an oracle for which addresses have accounts, and the first
   * thing anyone does with that is spray passwords at the ones that do.
   */
  passwordSignIn: publicProcedure
    .input(passwordSignInSchema)
    .output(credentialsSchema)
    .mutation(async ({ input, ctx }) => {
      const db = requireDatabase(ctx.db);
      const email = input.email.trim().toLowerCase();

      const [user] = await db
        .select({
          id: schema.users.id,
          passwordHash: schema.users.passwordHash,
          failedSignInCount: schema.users.failedSignInCount,
          lockedUntil: schema.users.lockedUntil,
        })
        .from(schema.users)
        .where(and(eq(schema.users.email, email), isNull(schema.users.deletedAt)))
        .limit(1);

      const locked =
        user?.lockedUntil !== null &&
        user?.lockedUntil !== undefined &&
        user.lockedUntil.getTime() > ctx.now.getTime();

      // Verified even when there is no user and even when the account is
      // locked, so all three paths cost the same scrypt work. Returning early
      // here is the timing leak this whole procedure is shaped around.
      const matched = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);

      if (user === undefined || user.passwordHash === null || locked || !matched) {
        if (user !== undefined && !locked && !matched) {
          const failures = user.failedSignInCount + 1;
          await db
            .update(schema.users)
            .set({
              failedSignInCount: failures,
              lockedUntil:
                failures >= MAX_FAILED_SIGN_INS
                  ? new Date(ctx.now.getTime() + LOCKOUT_MINUTES * 60_000)
                  : null,
              updatedAt: ctx.now,
            })
            .where(eq(schema.users.id, user.id));
        }
        // Logged with the address so a real lockout can be investigated, at
        // warn rather than info because a run of these is the signal.
        ctx.logger.warn('sign-in refused', { email, locked, known: user !== undefined });
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'That email and password do not match an account.',
        });
      }

      const { roles, vendorId } = await rolesFor(db, user.id);

      const [preferences] = await db
        .select({ locale: schema.userPreferences.locale })
        .from(schema.userPreferences)
        .where(eq(schema.userPreferences.userId, user.id))
        .limit(1);

      await db
        .update(schema.users)
        .set({
          failedSignInCount: 0,
          lockedUntil: null,
          // Raising the scrypt cost later must not lock anyone out, so a
          // correct password is re-hashed at the current parameters on the
          // way through rather than at some migration nobody runs.
          ...(needsRehash(user.passwordHash)
            ? { passwordHash: await hashPassword(input.password), passwordUpdatedAt: ctx.now }
            : {}),
          updatedAt: ctx.now,
        })
        .where(eq(schema.users.id, user.id));

      ctx.logger.info('signed in', { userId: user.id, roles });

      return createSession(
        db,
        {
          userId: user.id,
          roles,
          vendorId,
          locale: preferences?.locale ?? ctx.locale,
        },
        ctx.now,
      );
    }),

  /**
   * Trades a refresh token for a new pair, rotating the old one out. The
   * console calls this rather than holding a long-lived credential.
   */
  refresh: publicProcedure
    .input(z.object({ refreshToken: z.string().min(1) }).strict())
    .output(credentialsSchema)
    .mutation(async ({ input, ctx }) => {
      const db = requireDatabase(ctx.db);
      const outcome = await refreshSession(db, input.refreshToken, ctx.now);
      if (!outcome.ok) {
        ctx.logger.warn('refresh refused', { reason: outcome.reason });
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'That session has ended. Sign in again.',
        });
      }
      return outcome.credentials;
    }),

  phoneStart: publicProcedure
    .input(phoneStartSchema)
    .output(
      z.object({
        expiresInSeconds: z.number().int(),
        resendAfterSeconds: z.number().int(),
        /** So the UI can say "we texted +20 10•• •• 42" without holding it. */
        maskedDestination: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const phone = normalisePhone(input.phone);
      const code = generateOtp();
      const locale = resolveLocale(input.locale ?? ctx.locale);

      // TODO(persistence): insert into otp_challenges with hashOtp(code, phone),
      // an expiry of OTP_TTL_SECONDS and an attempt counter starting at zero.
      // Rate limiting keys on the destination, not on the IP: a hostel's
      // shared connection is one IP and forty travelers.
      void hashOtp(code, phone);

      const transport = resolveOtpTransport();
      await transport.send({ to: phone, code, locale });

      return {
        expiresInSeconds: OTP_TTL_SECONDS,
        resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
        maskedDestination: `${phone.slice(0, 5)}${'•'.repeat(Math.max(0, phone.length - 7))}${phone.slice(-2)}`,
      };
    }),

  phoneVerify: publicProcedure
    .input(phoneVerifySchema)
    .output(credentialsSchema)
    .mutation(({ input }) => {
      // TODO(persistence): look up the live challenge for this destination,
      // increment attempts, compare in constant time with verifyOtp(), and
      // reject after OTP_MAX_ATTEMPTS. Then upsert the user, and — when
      // guestSessionId is present — reassign that guest's cart rather than
      // creating a second identity.
      void input;
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message:
          'Phone verification needs the identity tables wired up. The flow, the contract and the transport are in place.',
      });
    }),

  emailStart: publicProcedure
    .input(emailStartSchema)
    .output(z.object({ expiresInSeconds: z.number().int() }))
    .mutation(({ input, ctx }) => {
      void input;
      void ctx;
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Email sign-in needs a mail transport, which is a later session.',
      });
    }),

  oauthCallback: publicProcedure
    .input(oauthCallbackSchema)
    .output(credentialsSchema)
    .mutation(({ input }) => {
      void input;
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message:
          'Apple and Google sign-in need their provider credentials, which are not part of the foundation.',
      });
    }),

  /** Who am I, and what may I do? The client renders affordances from this. */
  session: sessionProcedure
    .output(
      z.object({
        session: sessionSchema,
        permissions: z.array(z.string()),
        locale: z.string(),
        direction: z.enum(['ltr', 'rtl']),
        /**
         * Who the console says is signed in. Null for a guest, and null when
         * the row has no address — a phone-only account is the normal case
         * for a traveller, and the caller has to render that rather than an
         * empty string that looks like a bug.
         */
        email: z.string().nullable(),
        /** Their own name, for a greeting. Null when the profile has none. */
        displayName: z.string().nullable(),
        /** The operator this session acts for, when it acts for exactly one. */
        vendorName: z.string().nullable(),
      }),
    )
    .query(async ({ ctx }) => {
      const session = ctx.session;
      if (session === null) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No session.' });
      }
      // An access token verifies on its signature alone, which is what makes
      // it cheap — and what makes revocation invisible to it for up to its
      // fifteen minutes. This is the one call that pays for a round trip to
      // find out, and it is the call the console makes on every request, so
      // signing a device out takes effect there immediately.
      if (!session.isGuest && ctx.db !== null) {
        const live = await isSessionLive(ctx.db, session.id, ctx.now);
        if (!live) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'That session has ended.' });
        }
      }
      const permissions = new Set<string>();
      for (const role of session.roles) {
        for (const permission of PERMISSIONS_BY_ROLE[role]) permissions.add(permission);
      }

      let email: string | null = null;
      let displayName: string | null = null;
      if (session.userId !== null && ctx.db !== null) {
        const [row] = await ctx.db
          .select({
            email: schema.users.email,
            displayName: schema.userProfiles.displayName,
          })
          .from(schema.users)
          .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
          .where(eq(schema.users.id, session.userId))
          .limit(1);
        email = row?.email ?? null;
        displayName = row?.displayName ?? null;
      }

      let vendorName: string | null = null;
      if (session.vendorId !== null && ctx.db !== null) {
        const [row] = await ctx.db
          .select({ displayName: schema.vendors.displayName })
          .from(schema.vendors)
          .where(eq(schema.vendors.id, session.vendorId))
          .limit(1);
        vendorName = row?.displayName ?? null;
      }

      return {
        session,
        permissions: [...permissions].sort(),
        locale: ctx.locale,
        direction: LOCALE_DESCRIPTORS[ctx.locale].direction,
        email,
        displayName,
        vendorName,
      };
    }),

  /** The permission matrix, so the admin can show it rather than describe it. */
  permissionMatrix: publicProcedure
    .output(z.record(roleSchema, z.array(z.string())))
    // Copied out of the readonly source so the wire type is plain arrays;
    // the matrix itself stays immutable.
    .query(() =>
      Object.fromEntries(
        Object.entries(PERMISSIONS_BY_ROLE).map(([role, permissions]) => [role, [...permissions]]),
      ),
    ),

  signOut: sessionProcedure
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      const sessionId = ctx.session?.id;
      // A guest session has no row to revoke; it expires on its own and there
      // is nothing to take away. Signing out of one is still a success.
      if (sessionId !== undefined && ctx.db !== null) {
        await revokeSession(ctx.db, sessionId, ctx.now);
      }
      ctx.logger.info('sign out', { sessionId });
      return { ok: true as const };
    }),
});
