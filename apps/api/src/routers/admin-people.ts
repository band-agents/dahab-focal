import { TRPCError } from '@trpc/server';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';

import { currencySchema } from '@dahab/api-contract';
import { schema } from '@dahab/db';
import { SOURCE_LOCALE } from '@dahab/i18n';

import { requirePermission } from '../trpc.ts';
import { asCurrency, cairoDay, requireDb } from './_shared.ts';

/**
 * Travellers, and the operator record seen whole.
 *
 * Two gaps this closes, both of which were invisible from the console because
 * the console had no screen that would have shown them.
 *
 * `users`, `user_profiles`, `certifications`, `medical_info`,
 * `emergency_contacts` and `sessions` were all in the schema and seeded, and
 * not one query read any of them. `user.readAny` has been in the permission
 * matrix since the first commit and nothing had ever asked for it. The
 * platform could suspend an operator and refund a booking, but the person
 * those things happened to had no page — so "check a traveller's account"
 * was not a feature that had been forgotten, it was one that had never been
 * possible.
 *
 * And an operator could be listed but not opened. The roster answered "who is
 * licensed to run in Dahab"; nothing answered "what is the state of Fanous
 * Divers right now", which is the question an admin actually has, and which
 * needs papers, staff, services, today's departures, money owed and open
 * incidents in one place rather than spread over six screens that each show a
 * slice of every operator.
 */


/** Rating lives in hundredths so it never touches the float path. */
const personSchema = z.object({
  id: z.string().uuid(),
  /** Null for a guest who has never claimed their session. */
  displayName: z.string().nullable(),
  /** ISO 3166-1 alpha-2. Drives the resident rate and the no-fly warning. */
  countryCode: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  isGuest: z.boolean(),
  joined: z.string(),
  bookings: z.number().int(),
  /** Certifications on file that nobody has checked yet. */
  certificationsPending: z.number().int(),
  /**
   * A declaration on the medical questionnaire needs a doctor's sign-off and
   * the clearance is missing or lapsed. This is the one flag on the roster,
   * because it is the one that stops someone diving on the day.
   */
  clearanceOutstanding: z.boolean(),
  /** Locked out by the failed-sign-in counter, or soft-deleted. */
  suspended: z.boolean(),
  /**
   * Every role this account holds.
   *
   * The roster started as travellers only and that was wrong: the console's
   * own admin account, the operator owners and the guides are all rows in
   * `users`, and "manage users and check their accounts" plainly includes
   * the account that can suspend an operator. Hiding them would also hide the
   * one list where somebody can see who holds admin.
   */
  roles: z.array(z.string()),
});

const certificationSchema = z.object({
  id: z.string().uuid(),
  agency: z.string(),
  level: z.string(),
  certificateNumber: z.string().nullable(),
  issuedOn: z.string().nullable(),
  expiresOn: z.string().nullable(),
  maxDepthMetres: z.string().nullable(),
  verificationStatus: z.enum(['pending', 'inReview', 'verified', 'rejected', 'expired']),
});

const personBookingSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  serviceTitle: z.string(),
  vendorId: z.string().uuid(),
  vendorName: z.string(),
  startsAt: z.string(),
  status: z.string(),
  totalMinor: z.number().int(),
  currency: currencySchema,
});

export const adminPeopleRouter = {
  /**
   * The traveller roster.
   *
   * Guests are excluded by default. A guest row is a cart that has not been
   * claimed — there are many, they have no name and no contact details, and
   * listing them buries the people an admin is actually looking for.
   */
  people: requirePermission('user.readAny')
    .input(
      z
        .object({
          includeGuests: z.boolean().default(false),
          limit: z.number().int().min(1).max(200).default(100),
        })
        .default({}),
    )
    .output(z.array(personSchema))
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);

      // Counted in SQL rather than by fetching the rows: a traveller with
      // forty bookings should not become forty rows nobody displays.
      const bookingCounts = db
        .select({
          userId: schema.bookings.userId,
          bookings: count(schema.bookings.id).as('bookings'),
        })
        .from(schema.bookings)
        .groupBy(schema.bookings.userId)
        .as('booking_counts');

      const pendingCerts = db
        .select({
          userId: schema.certifications.userId,
          pending: count(schema.certifications.id).as('pending'),
        })
        .from(schema.certifications)
        .where(eq(schema.certifications.verificationStatus, 'pending'))
        .groupBy(schema.certifications.userId)
        .as('pending_certs');

      // Roles aggregated in SQL. An account with three roles must stay one
      // row: joining the table directly would triple it and the count above
      // the list would disagree with the list.
      const roleRows = db
        .select({
          userId: schema.userRoles.userId,
          roles: sql<string[]>`array_agg(distinct ${schema.userRoles.role})`.as('roles'),
        })
        .from(schema.userRoles)
        .groupBy(schema.userRoles.userId)
        .as('role_rows');

      const rows = await db
        .select({
          id: schema.users.id,
          roles: roleRows.roles,
          displayName: schema.userProfiles.displayName,
          countryCode: schema.userProfiles.countryCode,
          email: schema.users.email,
          phone: schema.users.phone,
          isGuest: schema.users.isGuest,
          joined: schema.users.createdAt,
          lockedUntil: schema.users.lockedUntil,
          deletedAt: schema.users.deletedAt,
          bookings: bookingCounts.bookings,
          certificationsPending: pendingCerts.pending,
          requiresClearance: schema.medicalInfo.requiresPhysicianClearance,
          clearanceUrl: schema.medicalInfo.physicianClearanceUrl,
          clearanceExpiresOn: schema.medicalInfo.clearanceExpiresOn,
        })
        .from(schema.users)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
        .leftJoin(schema.medicalInfo, eq(schema.medicalInfo.userId, schema.users.id))
        .leftJoin(bookingCounts, eq(bookingCounts.userId, schema.users.id))
        .leftJoin(pendingCerts, eq(pendingCerts.userId, schema.users.id))
        .leftJoin(roleRows, eq(roleRows.userId, schema.users.id))
        .where(input.includeGuests ? undefined : eq(schema.users.isGuest, false))
        .orderBy(desc(schema.users.createdAt))
        .limit(input.limit);

      const today = cairoDay(ctx.now);

      return rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        countryCode: row.countryCode,
        email: row.email,
        phone: row.phone,
        isGuest: row.isGuest,
        roles: row.roles ?? [],
        joined: row.joined.toISOString(),
        bookings: Number(row.bookings ?? 0),
        certificationsPending: Number(row.certificationsPending ?? 0),
        clearanceOutstanding:
          row.requiresClearance === true &&
          (row.clearanceUrl === null ||
            (row.clearanceExpiresOn !== null && row.clearanceExpiresOn < today)),
        suspended:
          row.deletedAt !== null ||
          (row.lockedUntil !== null && row.lockedUntil.getTime() > ctx.now.getTime()),
      }));
    }),

  /** One traveller, with everything an admin answering a question needs. */
  person: requirePermission('user.readAny')
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        person: personSchema,
        locale: z.string().nullable(),
        currency: z.string().nullable(),
        certifications: z.array(certificationSchema),
        medical: z
          .object({
            requiresPhysicianClearance: z.boolean(),
            hasClearanceOnFile: z.boolean(),
            clearanceExpiresOn: z.string().nullable(),
            /** How many questionnaire answers were yes. Never the answers. */
            declaredCount: z.number().int(),
            hasAllergies: z.boolean(),
            hasMedications: z.boolean(),
          })
          .nullable(),
        /** Presence only — the number is read at 3 a.m., not browsed. */
        emergencyContacts: z.number().int(),
        bookings: z.array(personBookingSchema),
        spend: z.object({
          currency: currencySchema,
          paidMinor: z.number().int(),
          refundedMinor: z.number().int(),
        }),
        activeSessions: z.number().int(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);

      const [account] = await db
        .select({
          id: schema.users.id,
          displayName: schema.userProfiles.displayName,
          countryCode: schema.userProfiles.countryCode,
          email: schema.users.email,
          phone: schema.users.phone,
          isGuest: schema.users.isGuest,
          joined: schema.users.createdAt,
          lockedUntil: schema.users.lockedUntil,
          deletedAt: schema.users.deletedAt,
          locale: schema.userPreferences.locale,
          currency: schema.userPreferences.currency,
        })
        .from(schema.users)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.users.id))
        .leftJoin(schema.userPreferences, eq(schema.userPreferences.userId, schema.users.id))
        .where(eq(schema.users.id, input.id))
        .limit(1);

      const roleRows = await db
        .select({ role: schema.userRoles.role })
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, input.id));

      if (account === undefined) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No such person.' });
      }

      // The traveller's own locale is not what the console reads in, so the
      // title is resolved for the admin's locale with the source as fallback
      // — the same pair the bookings screen uses.
      const wanted = alias(schema.serviceTranslations, 'wanted_title');
      const fallback = alias(schema.serviceTranslations, 'fallback_title');

      const [certifications, medicalRows, contactRows, bookingRows, sessionRows] =
        await Promise.all([
          db
            .select()
            .from(schema.certifications)
            .where(eq(schema.certifications.userId, input.id))
            .orderBy(desc(schema.certifications.issuedOn)),
          db.select().from(schema.medicalInfo).where(eq(schema.medicalInfo.userId, input.id)),
          db
            .select({ total: count(schema.emergencyContacts.id) })
            .from(schema.emergencyContacts)
            .where(eq(schema.emergencyContacts.userId, input.id)),
          db
            .select({
              id: schema.bookings.id,
              reference: schema.bookings.reference,
              title: sql<string>`coalesce(${wanted.title}, ${fallback.title})`,
              vendorId: schema.vendors.id,
              vendorName: schema.vendors.displayName,
              startsAt: schema.bookings.startsAt,
              status: schema.bookings.status,
              totalMinor: schema.bookings.totalAmount,
              currency: schema.bookings.totalCurrency,
            })
            .from(schema.bookings)
            .innerJoin(schema.vendors, eq(schema.vendors.id, schema.bookings.vendorId))
            .innerJoin(schema.services, eq(schema.services.id, schema.bookings.serviceId))
            .leftJoin(
              wanted,
              and(eq(wanted.serviceId, schema.services.id), eq(wanted.locale, ctx.locale)),
            )
            .leftJoin(
              fallback,
              and(eq(fallback.serviceId, schema.services.id), eq(fallback.locale, SOURCE_LOCALE)),
            )
            .where(eq(schema.bookings.userId, input.id))
            .orderBy(desc(schema.bookings.startsAt)),
          db
            .select({ total: count(schema.sessions.id) })
            .from(schema.sessions)
            .where(
              and(
                eq(schema.sessions.userId, input.id),
                isNull(schema.sessions.revokedAt),
                sql`${schema.sessions.expiresAt} > ${ctx.now}`,
              ),
            ),
        ]);

      const today = cairoDay(ctx.now);
      const medical = medicalRows[0];
      const clearanceOutstanding =
        medical !== undefined &&
        medical.requiresPhysicianClearance &&
        (medical.physicianClearanceUrl === null ||
          (medical.clearanceExpiresOn !== null && medical.clearanceExpiresOn < today));

      /*
       * Money is summed off the bookings already fetched rather than in a
       * second query: they are the same rows, and a second aggregate that
       * could disagree with the list beneath it is how a console loses an
       * operator's trust in every other number on the page.
       */
      const currency = asCurrency(bookingRows[0]?.currency ?? 'EGP');
      // Money that actually changed hands. A booking still awaiting payment
      // has none, and the three cancellation statuses are three different
      // facts about why — none of which is "paid".
      const UNPAID = new Set([
        'pendingPayment',
        'cancelledByTraveler',
        'cancelledByVendor',
        'cancelledByWeather',
      ]);
      const paidMinor = bookingRows
        .filter((row) => !UNPAID.has(row.status))
        .reduce((total, row) => total + Number(row.totalMinor), 0);
      const refundedMinor = bookingRows
        .filter((row) => row.status === 'refunded')
        .reduce((total, row) => total + Number(row.totalMinor), 0);

      return {
        person: {
          id: account.id,
          displayName: account.displayName,
          countryCode: account.countryCode,
          email: account.email,
          phone: account.phone,
          isGuest: account.isGuest,
          roles: roleRows.map((row) => row.role),
          joined: account.joined.toISOString(),
          bookings: bookingRows.length,
          certificationsPending: certifications.filter(
            (row) => row.verificationStatus === 'pending',
          ).length,
          clearanceOutstanding,
          suspended:
            account.deletedAt !== null ||
            (account.lockedUntil !== null && account.lockedUntil.getTime() > ctx.now.getTime()),
        },
        locale: account.locale,
        currency: account.currency,
        certifications: certifications.map((row) => ({
          id: row.id,
          agency: row.agency,
          level: row.level,
          certificateNumber: row.certificateNumber,
          issuedOn: row.issuedOn,
          expiresOn: row.expiresOn,
          maxDepthMetres: row.maxDepthMetres,
          verificationStatus: row.verificationStatus,
        })),
        medical:
          medical === undefined
            ? null
            : {
                requiresPhysicianClearance: medical.requiresPhysicianClearance,
                hasClearanceOnFile: medical.physicianClearanceUrl !== null,
                clearanceExpiresOn: medical.clearanceExpiresOn,
                // The count, never the answers. An admin needs to know a
                // declaration exists and whether it is cleared; the specific
                // conditions are the operator-on-the-day's business and the
                // traveller's, and reading them here would be a disclosure
                // nobody consented to.
                declaredCount: Object.values(medical.declarations).filter(Boolean).length,
                hasAllergies: medical.allergies !== null && medical.allergies.length > 0,
                hasMedications: medical.medications !== null && medical.medications.length > 0,
              },
        emergencyContacts: Number(contactRows[0]?.total ?? 0),
        bookings: bookingRows.map((row) => ({
          id: row.id,
          reference: row.reference,
          serviceTitle: row.title,
          vendorId: row.vendorId,
          vendorName: row.vendorName,
          startsAt: row.startsAt.toISOString(),
          status: row.status,
          totalMinor: Number(row.totalMinor),
          currency: asCurrency(row.currency),
        })),
        spend: { currency, paidMinor, refundedMinor },
        activeSessions: Number(sessionRows[0]?.total ?? 0),
      };
    }),

  /** One operator, seen whole. */
  vendor: requirePermission('vendor.readAny')
    .input(z.object({ id: z.string().uuid() }))
    .output(
      z.object({
        id: z.string().uuid(),
        displayName: z.string(),
        legalName: z.string().nullable(),
        neighborhood: z.string().nullable(),
        status: z.enum(['applied', 'inReview', 'active', 'suspended', 'closed']),
        joined: z.string(),
        ratingHundredths: z.number().int().nullable(),
        reviews: z.number().int(),
        documents: z.array(
          z.object({
            id: z.string().uuid(),
            type: z.string(),
            status: z.enum(['pending', 'inReview', 'verified', 'rejected', 'expired']),
            issuer: z.string().nullable(),
            documentNumber: z.string().nullable(),
            issuedOn: z.string().nullable(),
            expiresOn: z.string().nullable(),
            blocksPublishing: z.boolean(),
          }),
        ),
        staff: z.array(
          z.object({
            id: z.string().uuid(),
            fullName: z.string(),
            jobTitle: z.string().nullable(),
            isActive: z.boolean(),
            /** Ratings on file that lapse inside 90 days, or already have. */
            certificationsExpiring: z.number().int(),
          }),
        ),
        services: z.object({ total: z.number().int(), published: z.number().int() }),
        today: z.object({
          departures: z.number().int(),
          seatsBooked: z.number().int(),
          capacity: z.number().int(),
        }),
        openIncidents: z.number().int(),
        payout: z.object({
          currency: currencySchema,
          dueMinor: z.number().int(),
          /** Null until a payout has ever been raised for this operator. */
          periodEnd: z.string().nullable(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);

      const [vendor] = await db
        .select({
          id: schema.vendors.id,
          displayName: schema.vendors.displayName,
          legalName: schema.vendors.legalName,
          neighborhood: schema.vendors.neighborhood,
          status: schema.vendors.status,
          joined: schema.vendors.createdAt,
        })
        .from(schema.vendors)
        .where(eq(schema.vendors.id, input.id))
        .limit(1);

      if (vendor === undefined) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No such operator.' });
      }

      const today = cairoDay(ctx.now);
      /** Ninety days is the widest band the expiry board uses. */
      const horizon = new Date(ctx.now.getTime() + 90 * 86_400_000).toISOString().slice(0, 10);

      const [documents, staffRows, serviceRows, reviewRows, incidentRows, payoutRows, slotRows] =
        await Promise.all([
          db
            .select()
            .from(schema.vendorDocuments)
            .where(eq(schema.vendorDocuments.vendorId, input.id))
            .orderBy(schema.vendorDocuments.expiresOn),
          /*
           * Staff and their lapsing ratings in one query rather than one per
           * head. A guide whose Rescue rating ran out is the operator's
           * problem and the platform's liability, so the count is computed
           * here — an earlier draft of this returned a hardcoded zero, which
           * would have read on screen as "no certificates expiring".
           */
          db
            .select({
              id: schema.staff.id,
              fullName: schema.staff.fullName,
              jobTitle: schema.staff.jobTitle,
              isActive: schema.staff.isActive,
              expiring: sql<number>`count(${schema.staffCertifications.id}) filter (
                where ${schema.staffCertifications.expiresOn} is not null
                  and ${schema.staffCertifications.expiresOn} <= ${horizon}
              )`.as('expiring'),
            })
            .from(schema.staff)
            .leftJoin(
              schema.staffCertifications,
              eq(schema.staffCertifications.staffId, schema.staff.id),
            )
            .where(and(eq(schema.staff.vendorId, input.id), isNull(schema.staff.deletedAt)))
            .groupBy(
              schema.staff.id,
              schema.staff.fullName,
              schema.staff.jobTitle,
              schema.staff.isActive,
            ),
          db
            .select({ status: schema.services.status })
            .from(schema.services)
            .where(and(eq(schema.services.vendorId, input.id), isNull(schema.services.deletedAt))),
          // Published reviews only: one hidden by moderation must not move a
          // public rating. Same rule as the roster, so the two cannot disagree.
          db
            .select({
              total: count(),
              ratingHundredths:
                sql<number>`round(avg(${schema.reviews.rating}) * 100)::int`.as('rating_hundredths'),
            })
            .from(schema.reviews)
            .where(
              and(
                eq(schema.reviews.vendorId, input.id),
                eq(schema.reviews.moderationStatus, 'published'),
              ),
            ),
          db
            .select({ total: count() })
            .from(schema.incidents)
            .where(
              and(eq(schema.incidents.vendorId, input.id), isNull(schema.incidents.resolution)),
            ),
          db
            .select({
              amount: schema.payouts.amount,
              currency: schema.payouts.currency,
              periodEnd: schema.payouts.periodEnd,
            })
            .from(schema.payouts)
            .where(
              and(
                eq(schema.payouts.vendorId, input.id),
                inArray(schema.payouts.status, ['scheduled', 'processing']),
              ),
            )
            .orderBy(schema.payouts.periodEnd),
          // Today's boats, counted off the same slot rows the departures
          // screen reads, and filtered by local date rather than by a UTC
          // window — a 06:00 Cairo departure is 04:00 UTC, and a UTC day
          // boundary puts it on the wrong date twice a year.
          db
            .select({
              departures: count(),
              booked: sql<number>`coalesce(sum(${schema.availabilitySlots.bookedCount}), 0)::int`,
              capacity: sql<number>`coalesce(sum(${schema.availabilitySlots.capacity}), 0)::int`,
            })
            .from(schema.availabilitySlots)
            .innerJoin(schema.services, eq(schema.services.id, schema.availabilitySlots.serviceId))
            .where(
              and(
                eq(schema.services.vendorId, input.id),
                eq(schema.availabilitySlots.localDate, today),
                eq(schema.availabilitySlots.isCancelled, false),
              ),
            ),
        ]);

      const reviews = Number(reviewRows[0]?.total ?? 0);

      return {
        id: vendor.id,
        displayName: vendor.displayName,
        legalName: vendor.legalName,
        neighborhood: vendor.neighborhood,
        status: vendor.status,
        joined: vendor.joined.toISOString(),
        // Hundredths, so the average never touches the float path on the way
        // to the screen. No reviews reads as null, never as a zero: an
        // operator nobody has rated is not an operator rated nought.
        ratingHundredths:
          reviews === 0 || reviewRows[0]?.ratingHundredths == null
            ? null
            : Number(reviewRows[0].ratingHundredths),
        reviews,
        documents: documents.map((row) => ({
          id: row.id,
          type: row.type,
          status: row.verificationStatus,
          issuer: row.issuer,
          documentNumber: row.documentNumber,
          issuedOn: row.issuedOn,
          expiresOn: row.expiresOn,
          blocksPublishing: row.blocksPublishing,
        })),
        staff: staffRows.map((row) => ({
          id: row.id,
          fullName: row.fullName,
          jobTitle: row.jobTitle,
          isActive: row.isActive,
          certificationsExpiring: Number(row.expiring ?? 0),
        })),
        services: {
          total: serviceRows.length,
          published: serviceRows.filter((row) => row.status === 'published').length,
        },
        today: {
          departures: Number(slotRows[0]?.departures ?? 0),
          seatsBooked: Number(slotRows[0]?.booked ?? 0),
          capacity: Number(slotRows[0]?.capacity ?? 0),
        },
        openIncidents: Number(incidentRows[0]?.total ?? 0),
        payout: {
          currency: asCurrency(payoutRows[0]?.currency ?? 'EGP'),
          dueMinor: payoutRows.reduce((total, row) => total + Number(row.amount), 0),
          periodEnd: payoutRows[0]?.periodEnd?.toISOString() ?? null,
        },
      };
    }),
};
