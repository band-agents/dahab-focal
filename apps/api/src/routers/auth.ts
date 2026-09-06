import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import {
  PERMISSIONS_BY_ROLE,
  emailStartSchema,
  guestSessionSchema,
  oauthCallbackSchema,
  phoneStartSchema,
  phoneVerifySchema,
  roleSchema,
  sessionSchema,
} from '@dahab/api-contract';
import { LOCALE_DESCRIPTORS, resolveLocale } from '@dahab/i18n';

import {
  ACCESS_TOKEN_TTL_SECONDS,
  issueAccessToken,
  issueRefreshToken,
  newSessionId,
} from '../auth/tokens';
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  generateOtp,
  hashOtp,
  normalisePhone,
  resolveOtpTransport,
} from '../auth/otp';
import { publicProcedure, router, sessionProcedure } from '../trpc';

/**
 * Auth scaffolding.
 *
 * Phone OTP with Egypt as the default country code, email, Apple, Google, and
 * a guest session that can later be claimed. Persistence is deliberately not
 * wired yet — the procedures below are the contract and the flow, and every
 * place that will touch the database is marked. This session builds the
 * foundation, not the product.
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
      }),
    )
    .query(({ ctx }) => {
      const session = ctx.session;
      if (session === null) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'No session.' });
      }
      const permissions = new Set<string>();
      for (const role of session.roles) {
        for (const permission of PERMISSIONS_BY_ROLE[role]) permissions.add(permission);
      }
      return {
        session,
        permissions: [...permissions].sort(),
        locale: ctx.locale,
        direction: LOCALE_DESCRIPTORS[ctx.locale].direction,
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

  signOut: sessionProcedure.output(z.object({ ok: z.literal(true) })).mutation(({ ctx }) => {
    // TODO(persistence): set sessions.revoked_at for this session id. The
    // access token stays valid until it expires, which is why its TTL is 15
    // minutes and not a day.
    ctx.logger.info('sign out', { sessionId: ctx.session?.id });
    return { ok: true as const };
  }),
});
