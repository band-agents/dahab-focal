import { eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../client.ts';
import {
  attributeDefinitions,
  availabilitySlots,
  bookingParticipants,
  bookingStatusHistory,
  bookings,
  categories,
  diveSites,
  disputes,
  featureFlags,
  incidents,
  ledgerEntries,
  payments,
  payouts,
  refunds,
  resourceCertifications,
  resources,
  reviewTranslations,
  reviews,
  serviceAttributeValues,
  serviceDiveSites,
  serviceTranslations,
  services,
  staff,
  staffCertifications,
  users,
  vendorPayoutAccounts,
  vendors,
} from '../schema/index.ts';
import { SEED_TODAY, inDays } from './dahab.ts';
import {
  BOOKINGS,
  CHILD_RATE_BASIS_POINTS,
  DISPUTES,
  FEATURE_FLAGS,
  INCIDENTS,
  PRICE_PER_ADULT_MINOR,
  RESIDENT_RATE_BASIS_POINTS,
  RESOURCES,
  REVIEWS,
  SERVICES,
  SERVICE_DIVE_SITES,
  SLOTS,
  STAFF,
  STUDENT_RATE_BASIS_POINTS,
  TRAVELERS,
  cairoAt,
  commissionMinor,
  hoursAgo,
  paymentFeeMinor,
} from './operations.ts';
import type { SeedBooking, SeedParticipantKind } from './operations.ts';

/**
 * Writing the operating week.
 *
 * Split from the data it writes so the two can be read separately: what
 * happened in Dahab is one question, and how it lands in eleven tables is
 * another.
 *
 * Every step here deletes its own rows before re-inserting them. Bookings,
 * payments and ledger entries have no natural key to upsert on — a traveller
 * can book the same trip twice — so idempotence comes from replacing the
 * seeded set rather than from `onConflictDoUpdate`. Anything a person later
 * creates through the console sits outside these references and survives.
 */

/** Money is EGP throughout the seed. One currency, stated once. */
const CURRENCY = 'EGP';

const BASIS_POINTS = 10_000;

/**
 * How long before a departure the money moves.
 *
 * A traveller pays when they book, not when they step onto the boat, and the
 * ledger has to say so: a payout period is a range of dates money moved in,
 * and dating a capture to the departure would put it in the wrong fortnight.
 * Three days keeps every seeded booking inside one payout period or the
 * other, with nothing falling between them.
 */
const PAID_DAYS_BEFORE = 3;

/** The instant a booking was charged. */
function chargedAt(booking: SeedBooking): Date {
  return cairoAt(booking.dayOffset - PAID_DAYS_BEFORE, '12:00');
}

/**
 * The instant a refund was processed.
 *
 * The day after the charge rather than the day of the trip: every refund in
 * this seed is for something cancelled in advance — weather, or a traveller
 * changing plans — and a refund that landed in a later payout period than the
 * capture it reverses would make both periods read as though they did not
 * balance, when the books as a whole still would.
 */
function refundedAt(booking: SeedBooking): Date {
  return cairoAt(booking.dayOffset - PAID_DAYS_BEFORE + 1, '10:00');
}

type Ids = Map<string, string>;

/**
 * Seats held versus heads billed.
 *
 * An infant and an accompanying instructor are not charged but do take a
 * place on the boat, which is the whole reason the manifest and the invoice
 * disagree. Mirrors PARTICIPANT_RULES in @dahab/api-contract.
 */
const PARTICIPANT_RULES: Record<
  SeedParticipantKind,
  { chargeable: boolean; occupiesCapacity: boolean }
> = {
  adult: { chargeable: true, occupiesCapacity: true },
  child: { chargeable: true, occupiesCapacity: true },
  student: { chargeable: true, occupiesCapacity: true },
  resident: { chargeable: true, occupiesCapacity: true },
  infant: { chargeable: false, occupiesCapacity: true },
  instructor: { chargeable: false, occupiesCapacity: true },
};

const RATE_BASIS_POINTS: Record<SeedParticipantKind, number> = {
  adult: BASIS_POINTS,
  child: CHILD_RATE_BASIS_POINTS,
  student: STUDENT_RATE_BASIS_POINTS,
  resident: RESIDENT_RATE_BASIS_POINTS,
  infant: 0,
  instructor: 0,
};

function seatsHeld(booking: SeedBooking): number {
  let seats = 0;
  for (const [kind, count] of Object.entries(booking.party)) {
    if (PARTICIPANT_RULES[kind as SeedParticipantKind].occupiesCapacity) seats += count;
  }
  return seats;
}

/**
 * The price breakdown stored verbatim on the booking.
 *
 * A quote has to be reproducible years later, by which time the pricing rules
 * behind it will have changed, so the lines are written down rather than
 * recomputed on read. The per-head rates are the ones in `operations.ts`; the
 * sum is asserted against the booking's own total, because a breakdown that
 * does not add up to what was charged is worse than no breakdown.
 */
function priceBreakdown(booking: SeedBooking): Record<string, unknown> {
  const unit = PRICE_PER_ADULT_MINOR[booking.serviceSlug];
  if (unit === undefined) {
    throw new Error(`No adult price for service ${booking.serviceSlug}`);
  }

  const lines = Object.entries(booking.party).map(([kind, count]) => {
    const rate = RATE_BASIS_POINTS[kind as SeedParticipantKind];
    const unitMinor = Math.round((unit * rate) / BASIS_POINTS);
    return {
      kind,
      count,
      unitAmountMinor: unitMinor,
      amountMinor: unitMinor * count,
      rateBasisPoints: rate,
    };
  });

  const subtotal = lines.reduce((total, line) => total + line.amountMinor, 0);
  if (subtotal !== booking.totalMinor) {
    throw new Error(
      `${booking.reference}: breakdown sums to ${subtotal} but the total is ${booking.totalMinor}`,
    );
  }

  return {
    currency: CURRENCY,
    adultUnitAmountMinor: unit,
    lines,
    subtotalMinor: subtotal,
    totalMinor: booking.totalMinor,
    computedBy: 'seed',
  };
}

/** Which money rows a booking in this state should have. */
function moneyShape(status: SeedBooking['status']): {
  payment: 'captured' | 'authorized' | 'pending' | null;
  refundFull: boolean;
} {
  switch (status) {
    case 'pendingPayment':
      return { payment: 'pending', refundFull: false };
    case 'awaitingVendor':
      return { payment: 'authorized', refundFull: false };
    case 'refunded':
    case 'cancelledByWeather':
    case 'cancelledByVendor':
      return { payment: 'captured', refundFull: true };
    case 'cancelledByTraveler':
      return { payment: 'captured', refundFull: true };
    default:
      return { payment: 'captured', refundFull: false };
  }
}

// --- Steps ----------------------------------------------------------------

async function vendorIds(db: Database): Promise<Ids> {
  const rows = await db.select({ id: vendors.id, slug: vendors.slug }).from(vendors);
  return new Map(rows.map((row) => [row.slug, row.id]));
}

async function categoryIds(db: Database): Promise<Ids> {
  const rows = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  return new Map(rows.map((row) => [row.slug, row.id]));
}

/**
 * The travellers.
 *
 * Upserted on email like the placeholder vendor owners, so re-seeding reuses
 * the same person rather than orphaning last run's bookings. `.invalid` is the
 * reserved TLD — nothing here can be mailed by accident.
 */
async function seedTravelers(db: Database): Promise<Ids> {
  const ids: Ids = new Map();
  for (const traveler of TRAVELERS) {
    const [row] = await db
      .insert(users)
      .values({
        email: `traveler+${traveler.key}@seed.dahabfocal.invalid`,
        phone: traveler.phone,
        isGuest: false,
      })
      .onConflictDoUpdate({ target: users.email, set: { updatedAt: new Date() } })
      .returning({ id: users.id });
    if (row !== undefined) ids.set(traveler.key, row.id);
  }
  return ids;
}

async function seedStaff(db: Database, vendorId: Ids): Promise<number> {
  const ids = [...vendorId.values()];
  if (ids.length > 0) await db.delete(staff).where(inArray(staff.vendorId, ids));

  let count = 0;
  for (const person of STAFF) {
    const vendor = vendorId.get(person.vendorSlug);
    if (vendor === undefined) continue;

    const [row] = await db
      .insert(staff)
      .values({
        vendorId: vendor,
        fullName: person.fullName,
        jobTitle: person.jobTitle,
        languages: [...person.languages],
        isActive: true,
      })
      .returning({ id: staff.id });
    if (row === undefined) continue;
    count += 1;

    if (person.certification !== null) {
      await db.insert(staffCertifications).values({
        staffId: row.id,
        agency: person.certification.agency,
        level: person.certification.level,
        certificateNumber: person.certification.number,
        expiresOn: inDays(person.certification.expiresInDays),
        verificationStatus: 'verified',
      });
    }
  }
  return count;
}

async function seedResources(db: Database, vendorId: Ids): Promise<Ids> {
  const ids = [...vendorId.values()];
  if (ids.length > 0) await db.delete(resources).where(inArray(resources.vendorId, ids));

  const byKey: Ids = new Map();
  for (const resource of RESOURCES) {
    const vendor = vendorId.get(resource.vendorSlug);
    if (vendor === undefined) continue;

    const [row] = await db
      .insert(resources)
      .values({
        vendorId: vendor,
        kind: resource.kind,
        name: resource.name,
        identifier: resource.identifier,
        capacity: resource.capacity,
        specifications: resource.specifications,
      })
      .returning({ id: resources.id });
    if (row === undefined) continue;
    byKey.set(resource.key, row.id);

    if (resource.certification !== null) {
      await db.insert(resourceCertifications).values({
        resourceId: row.id,
        kind: resource.certification.kind,
        certificateNumber: resource.certification.number,
        expiresOn: inDays(resource.certification.expiresInDays),
      });
    }
  }
  return byKey;
}

/**
 * Services, their translations, and the answers behind every comparable
 * attribute.
 *
 * The attribute answers are the load-bearing part: `attribute_definitions`
 * plus `service_attribute_values` is what the traveller comparison engine
 * reads, and the catalogue screen's "how many services carry a value for
 * this" count is only meaningful once something actually does.
 */
async function seedServices(
  db: Database,
  vendorId: Ids,
  categoryId: Ids,
): Promise<{ ids: Ids; translations: number; attributeValues: number }> {
  const byKey: Ids = new Map();
  let translationCount = 0;
  let valueCount = 0;

  for (const service of SERVICES) {
    const vendor = vendorId.get(service.vendorSlug);
    const category = categoryId.get(service.categorySlug);
    if (vendor === undefined || category === undefined) continue;

    const createdAt = new Date(SEED_TODAY.getTime() - service.submittedDaysAgo * 86_400_000);
    const [row] = await db
      .insert(services)
      .values({
        vendorId: vendor,
        categoryId: category,
        status: service.status,
        slug: service.slug,
        durationMinutes: service.durationMinutes,
        minParticipants: service.minParticipants,
        maxParticipants: service.maxParticipants,
        bookingCutoffHours: service.bookingCutoffHours,
        noFlyHours: service.noFlyHours,
        createdAt,
        updatedAt: createdAt,
      })
      .onConflictDoUpdate({
        target: [services.vendorId, services.slug],
        set: {
          categoryId: category,
          status: service.status,
          durationMinutes: service.durationMinutes,
          minParticipants: service.minParticipants,
          maxParticipants: service.maxParticipants,
          bookingCutoffHours: service.bookingCutoffHours,
          noFlyHours: service.noFlyHours,
          createdAt,
          updatedAt: new Date(),
        },
      })
      .returning({ id: services.id });
    if (row === undefined) continue;
    byKey.set(service.slug, row.id);

    for (const translation of service.translations) {
      await db
        .insert(serviceTranslations)
        .values({
          serviceId: row.id,
          locale: translation.locale,
          title: translation.title,
          description: translation.description,
          status: translation.origin,
        })
        .onConflictDoUpdate({
          target: [serviceTranslations.serviceId, serviceTranslations.locale],
          set: {
            title: translation.title,
            description: translation.description,
            status: translation.origin,
            updatedAt: new Date(),
          },
        });
      translationCount += 1;
    }

    const definitions = await db
      .select({
        id: attributeDefinitions.id,
        key: attributeDefinitions.key,
        dataType: attributeDefinitions.dataType,
      })
      .from(attributeDefinitions)
      .where(eq(attributeDefinitions.categoryId, category));

    for (const definition of definitions) {
      const answer = service.attributes[definition.key];
      if (answer === undefined) continue;

      // One value column is set and the rest stay null — the table's own
      // check constraint enforces it, so a wrong branch here fails loudly
      // rather than storing a half-answer.
      const columns: {
        valueText?: string;
        valueNumber?: number;
        valueBool?: boolean;
        valueJson?: unknown;
        normalizedNumber?: number;
      } = {};

      if (typeof answer === 'boolean') {
        columns.valueBool = answer;
      } else if (typeof answer === 'number') {
        columns.valueNumber = answer;
        columns.normalizedNumber = answer;
      } else if (Array.isArray(answer)) {
        columns.valueJson = [...answer];
      } else {
        columns.valueText = String(answer);
      }

      await db
        .insert(serviceAttributeValues)
        .values({ serviceId: row.id, attributeDefinitionId: definition.id, ...columns })
        .onConflictDoUpdate({
          target: [serviceAttributeValues.serviceId, serviceAttributeValues.attributeDefinitionId],
          set: { ...columns, updatedAt: new Date() },
        });
      valueCount += 1;
    }
  }

  await linkDiveSites(db, byKey);
  return { ids: byKey, translations: translationCount, attributeValues: valueCount };
}

async function linkDiveSites(db: Database, serviceId: Ids): Promise<void> {
  const rows = await db.select({ id: diveSites.id, slug: diveSites.slug }).from(diveSites);
  const siteId = new Map(rows.map((row) => [row.slug, row.id]));

  for (const [serviceSlug, siteSlugs] of Object.entries(SERVICE_DIVE_SITES)) {
    const service = serviceId.get(serviceSlug);
    if (service === undefined) continue;

    await db.delete(serviceDiveSites).where(eq(serviceDiveSites.serviceId, service));
    for (const [index, siteSlug] of siteSlugs.entries()) {
      const site = siteId.get(siteSlug);
      if (site === undefined) continue;
      await db
        .insert(serviceDiveSites)
        .values({ serviceId: service, diveSiteId: site, sortOrder: index });
    }
  }
}

async function seedSlots(db: Database, serviceId: Ids, resourceId: Ids): Promise<Ids> {
  const ids = [...serviceId.values()];
  if (ids.length > 0) {
    // Last run's bookings still point at last run's departures, and the
    // foreign key is not ON DELETE CASCADE — deliberately, because losing a
    // booking because somebody tidied a slot would be a data-loss bug. They
    // are detached here and replaced wholesale a few steps later.
    await db
      .update(bookings)
      .set({ slotId: null })
      .where(
        sql`${bookings.slotId} IN (
          SELECT id FROM availability_slots WHERE service_id = ANY(${sql.param(ids)}::uuid[])
        )`,
      );
    await db.delete(availabilitySlots).where(inArray(availabilitySlots.serviceId, ids));
  }

  const byKey: Ids = new Map();
  for (const slot of SLOTS) {
    const service = serviceId.get(slot.serviceSlug);
    if (service === undefined) continue;

    const startsAt = cairoAt(slot.dayOffset, slot.startTime);
    const [row] = await db
      .insert(availabilitySlots)
      .values({
        serviceId: service,
        startsAt,
        endsAt: new Date(startsAt.getTime() + slot.durationMinutes * 60_000),
        localDate: inDays(slot.dayOffset),
        capacity: slot.capacity,
        bookedCount: 0,
        resourceId: slot.resourceKey === null ? null : (resourceId.get(slot.resourceKey) ?? null),
      })
      .returning({ id: availabilitySlots.id });
    if (row !== undefined) byKey.set(slot.key, row.id);
  }
  return byKey;
}

/**
 * Bookings, the people on them, the money they moved, and the trail.
 *
 * The ledger is the part worth reading twice. Every event writes a group of
 * rows that sum to zero — that is what makes a balance a SUM over an account
 * rather than a number somebody keeps up to date by hand, and it is the only
 * arrangement that reconciles against six payment providers.
 */
async function seedBookings(
  db: Database,
  vendorId: Ids,
  serviceId: Ids,
  travelerId: Ids,
  slotId: Ids,
): Promise<{
  bookings: number;
  participants: number;
  payments: number;
  refunds: number;
  ledgerEntries: number;
}> {
  const references = BOOKINGS.map((booking) => booking.reference);
  const existing = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(inArray(bookings.reference, references));
  const staleIds = existing.map((row) => row.id);

  if (staleIds.length > 0) {
    // Order matters: the ledger references payments and refunds, refunds
    // reference payments, and everything references the booking.
    await db.delete(ledgerEntries).where(inArray(ledgerEntries.bookingId, staleIds));
    await db.delete(refunds).where(inArray(refunds.bookingId, staleIds));
    await db.delete(reviews).where(inArray(reviews.bookingId, staleIds));
    await db.delete(disputes).where(inArray(disputes.bookingId, staleIds));
    await db.update(incidents).set({ bookingId: null }).where(inArray(incidents.bookingId, staleIds));
    await db.delete(payments).where(inArray(payments.bookingId, staleIds));
    await db.delete(bookings).where(inArray(bookings.id, staleIds));
  }

  const counts = { bookings: 0, participants: 0, payments: 0, refunds: 0, ledgerEntries: 0 };
  const seatsPerSlot = new Map<string, number>();

  for (const booking of BOOKINGS) {
    const vendor = vendorId.get(booking.vendorSlug);
    const service = serviceId.get(booking.serviceSlug);
    const traveler = travelerId.get(booking.travelerKey);
    if (vendor === undefined || service === undefined || traveler === undefined) continue;

    const startsAt = cairoAt(booking.dayOffset, booking.startTime);
    const slot = booking.slotKey === null ? null : (slotId.get(booking.slotKey) ?? null);
    const travelerLocale =
      TRAVELERS.find((person) => person.key === booking.travelerKey)?.locale ?? 'en-GB';

    const [row] = await db
      .insert(bookings)
      .values({
        reference: booking.reference,
        userId: traveler,
        vendorId: vendor,
        serviceId: service,
        slotId: slot,
        status: booking.status,
        startsAt,
        localDate: inDays(booking.dayOffset),
        priceBreakdown: priceBreakdown(booking),
        totalAmount: booking.totalMinor,
        totalCurrency: CURRENCY,
        partyAdults: booking.party.adult ?? 0,
        partyChildren: booking.party.child ?? 0,
        partyInfants: booking.party.infant ?? 0,
        partyStudents: booking.party.student ?? 0,
        partyResidents: booking.party.resident ?? 0,
        locale: travelerLocale,
        travelerNote: booking.travelerNote,
        confirmedAt: booking.status === 'pendingPayment' ? null : startsAt,
        completedAt: booking.status === 'completed' ? startsAt : null,
        cancelledAt: booking.status.startsWith('cancelled') ? startsAt : null,
      })
      .returning({ id: bookings.id });
    if (row === undefined) continue;
    counts.bookings += 1;

    if (slot !== null && !booking.status.startsWith('cancelled') && booking.status !== 'noShow') {
      seatsPerSlot.set(booking.slotKey ?? '', (seatsPerSlot.get(booking.slotKey ?? '') ?? 0) + seatsHeld(booking));
    }

    // The manifest. Only the person who booked is named: companion names are
    // collected at check-in, and inventing them here would put fiction on a
    // document a skipper reads.
    const travelerName =
      TRAVELERS.find((person) => person.key === booking.travelerKey)?.fullName ?? 'Traveller';
    let seat = 0;
    for (const [kind, count] of Object.entries(booking.party)) {
      for (let index = 0; index < count; index += 1) {
        seat += 1;
        await db.insert(bookingParticipants).values({
          bookingId: row.id,
          userId: seat === 1 ? traveler : null,
          kind: kind as SeedParticipantKind,
          fullName: seat === 1 ? travelerName : 'Name pending check-in',
          // Sofía's own note says her last dive was over a year ago, which is
          // exactly what the refresher rule reads.
          lastDiveOn:
            booking.reference === 'DF-4468' && seat === 1 ? inDays(-426) : null,
        });
        counts.participants += 1;
      }
    }

    await db.insert(bookingStatusHistory).values({
      bookingId: row.id,
      fromStatus: null,
      toStatus: booking.status,
      actorKind: 'system',
      reasonKey: 'seed.initialState',
      note: 'Written by the operational seed, not by a person.',
    });

    const shape = moneyShape(booking.status);
    if (shape.payment === null) continue;

    const paidAt = chargedAt(booking);
    const [payment] = await db
      .insert(payments)
      .values({
        bookingId: row.id,
        userId: traveler,
        provider: booking.provider,
        status:
          shape.payment === 'captured'
            ? shape.refundFull
              ? 'refunded'
              : 'captured'
            : shape.payment === 'authorized'
              ? 'authorized'
              : 'pending',
        amount: booking.totalMinor,
        currency: CURRENCY,
        providerReference: `${booking.provider.toUpperCase()}-${booking.reference}`,
        idempotencyKey: `seed-${booking.reference}`,
        authorizedAt: paidAt,
        capturedAt: shape.payment === 'captured' ? paidAt : null,
        createdAt: paidAt,
        updatedAt: paidAt,
      })
      .returning({ id: payments.id });
    if (payment === undefined) continue;
    counts.payments += 1;

    if (shape.payment !== 'captured') continue;

    const commission = commissionMinor(booking.totalMinor);
    const fee = paymentFeeMinor(booking.totalMinor);

    counts.ledgerEntries += await writeGroup(db, 'bookingConfirmed', paidAt, [
      { account: 'travelerReceivable', amount: booking.totalMinor },
      { account: 'vendorPayable', amount: -(booking.totalMinor - commission) },
      { account: 'platformCommission', amount: -commission },
    ], { bookingId: row.id, vendorId: vendor, paymentId: payment.id });

    counts.ledgerEntries += await writeGroup(db, 'paymentCaptured', paidAt, [
      { account: 'providerClearing', amount: booking.totalMinor },
      { account: 'travelerReceivable', amount: -booking.totalMinor },
    ], { bookingId: row.id, vendorId: vendor, paymentId: payment.id });

    counts.ledgerEntries += await writeGroup(db, 'paymentFeeCharged', paidAt, [
      { account: 'paymentFees', amount: fee },
      { account: 'providerClearing', amount: -fee },
    ], { bookingId: row.id, vendorId: vendor, paymentId: payment.id });

    if (!shape.refundFull) continue;

    const returnedAt = refundedAt(booking);
    const [refund] = await db
      .insert(refunds)
      .values({
        paymentId: payment.id,
        bookingId: row.id,
        amount: booking.totalMinor,
        currency: CURRENCY,
        reasonKey:
          booking.status === 'cancelledByWeather'
            ? 'refund.reason.weather'
            : 'refund.reason.travelerCancelled',
        idempotencyKey: `seed-refund-${booking.reference}`,
        status: 'refunded',
        providerReference: `${booking.provider.toUpperCase()}-RF-${booking.reference}`,
        processedAt: returnedAt,
        createdAt: returnedAt,
        updatedAt: returnedAt,
      })
      .returning({ id: refunds.id });
    if (refund === undefined) continue;
    counts.refunds += 1;

    // The commission comes back too: the platform does not keep its cut of a
    // trip that never ran.
    counts.ledgerEntries += await writeGroup(db, 'refundIssued', returnedAt, [
      { account: 'vendorPayable', amount: booking.totalMinor - commission },
      { account: 'platformCommission', amount: commission },
      { account: 'refundsPayable', amount: -booking.totalMinor },
    ], { bookingId: row.id, vendorId: vendor, paymentId: payment.id, refundId: refund.id });
  }

  for (const [key, seats] of seatsPerSlot) {
    const id = slotId.get(key);
    if (id === undefined) continue;
    await db.update(availabilitySlots).set({ bookedCount: seats }).where(eq(availabilitySlots.id, id));
  }

  return counts;
}

/** One business event, as rows that sum to zero. */
async function writeGroup(
  db: Database,
  eventKind: string,
  occurredAt: Date,
  legs: readonly {
    account:
      | 'travelerReceivable'
      | 'providerClearing'
      | 'platformCash'
      | 'vendorPayable'
      | 'platformCommission'
      | 'paymentFees'
      | 'refundsPayable'
      | 'taxPayable';
    amount: number;
  }[],
  links: {
    bookingId?: string;
    vendorId?: string;
    paymentId?: string;
    refundId?: string;
    payoutId?: string;
  },
): Promise<number> {
  const sum = legs.reduce((total, leg) => total + leg.amount, 0);
  if (sum !== 0) {
    throw new Error(`Ledger group ${eventKind} does not balance: ${sum}`);
  }

  const [group] = await db.execute<{ id: string }>(sql`SELECT uuid_generate_v7() AS id`);
  const entryGroupId = group?.id;
  if (entryGroupId === undefined) throw new Error('Could not mint a ledger group id');

  await db.insert(ledgerEntries).values(
    legs.map((leg) => ({
      entryGroupId,
      account: leg.account,
      amount: leg.amount,
      currency: CURRENCY,
      eventKind,
      occurredAt,
      ...links,
    })),
  );
  return legs.length;
}

/**
 * Payouts.
 *
 * One paid, covering the three weeks that closed a week ago, and one still
 * scheduled for the week just gone — which is what gives the money screen a
 * balance owed rather than only a history.
 *
 * A period is a range of dates money MOVED in, not dates trips ran on, so
 * bookings are bucketed by when they were charged. The two periods between
 * them cover every charge in the seed with nothing falling between.
 */
async function seedPayouts(db: Database, vendorId: Ids): Promise<number> {
  const ids = [...vendorId.values()];
  if (ids.length > 0) {
    // The payout's own ledger legs reference it, and the foreign key is not
    // ON DELETE CASCADE — an append-only ledger must not lose rows because
    // something upstream was re-created — so they go first.
    await db
      .delete(ledgerEntries)
      .where(
        sql`${ledgerEntries.payoutId} IN (
          SELECT id FROM payouts WHERE vendor_id = ANY(${sql.param(ids)}::uuid[])
        )`,
      );
    await db.delete(payouts).where(inArray(payouts.vendorId, ids));
    await db.delete(vendorPayoutAccounts).where(inArray(vendorPayoutAccounts.vendorId, ids));
  }

  const periods = [
    { from: -28, to: -8, status: 'paid' as const },
    { from: -7, to: 0, status: 'scheduled' as const },
  ];

  let count = 0;
  for (const [slug, vendor] of vendorId) {
    const earned = BOOKINGS.filter(
      (booking) => booking.vendorSlug === slug && moneyShape(booking.status).payment === 'captured',
    );
    if (earned.length === 0) continue;

    const [account] = await db
      .insert(vendorPayoutAccounts)
      .values({
        vendorId: vendor,
        provider: 'instapay',
        accountLast4: slug.slice(-4).replace(/\D/g, '0').padStart(4, '0'),
        // A provider-side handle, not a bank number. The real one never
        // reaches this database.
        accountToken: `seed-payout-token-${slug}`,
        accountHolder: slug,
        isDefault: true,
        verificationStatus: 'verified',
      })
      .returning({ id: vendorPayoutAccounts.id });
    if (account === undefined) continue;

    for (const period of periods) {
      // Bucketed by the day the charge landed, which is what the ledger's own
      // `occurred_at` holds — so the console can derive gross and commission
      // for the same window and have them add up to this net.
      const inPeriod = earned.filter((booking) => {
        const charged = booking.dayOffset - PAID_DAYS_BEFORE;
        return (
          charged >= period.from &&
          charged <= period.to &&
          !moneyShape(booking.status).refundFull
        );
      });
      const net = inPeriod.reduce(
        (total, booking) => total + booking.totalMinor - commissionMinor(booking.totalMinor),
        0,
      );
      if (net === 0) continue;

      const periodEnd = cairoAt(period.to, '23:59');
      const [payout] = await db
        .insert(payouts)
        .values({
          vendorId: vendor,
          payoutAccountId: account.id,
          amount: net,
          currency: CURRENCY,
          status: period.status,
          periodStart: cairoAt(period.from, '00:00'),
          periodEnd,
          providerReference: period.status === 'paid' ? `INSTAPAY-PO-${slug}` : null,
          paidAt: period.status === 'paid' ? cairoAt(period.to + 1, '12:00') : null,
        })
        .returning({ id: payouts.id });
      if (payout === undefined) continue;
      count += 1;

      // Only a payout that has actually been paid moves money. A scheduled
      // one is a plan, and a plan has no place in a ledger.
      if (period.status !== 'paid') continue;
      await writeGroup(db, 'payoutPaid', cairoAt(period.to + 1, '12:00'), [
        { account: 'vendorPayable', amount: net },
        { account: 'platformCash', amount: -net },
      ], { vendorId: vendor, payoutId: payout.id });
    }
  }
  return count;
}

async function seedReviews(db: Database): Promise<number> {
  let count = 0;
  for (const review of REVIEWS) {
    const [booking] = await db
      .select({
        id: bookings.id,
        userId: bookings.userId,
        serviceId: bookings.serviceId,
        vendorId: bookings.vendorId,
        startsAt: bookings.startsAt,
      })
      .from(bookings)
      .where(eq(bookings.reference, review.bookingReference));
    if (booking === undefined) continue;

    const writtenAt = new Date(booking.startsAt.getTime() + 86_400_000);
    const [row] = await db
      .insert(reviews)
      .values({
        bookingId: booking.id,
        userId: booking.userId,
        serviceId: booking.serviceId,
        vendorId: booking.vendorId,
        rating: review.rating,
        sourceLocale: review.sourceLocale,
        moderationStatus: review.moderationStatus,
        vendorReply: review.vendorReply,
        vendorRepliedAt: review.vendorReply === null ? null : new Date(writtenAt.getTime() + 86_400_000),
        createdAt: writtenAt,
        updatedAt: writtenAt,
      })
      .returning({ id: reviews.id });
    if (row === undefined) continue;
    count += 1;

    await db.insert(reviewTranslations).values({
      reviewId: row.id,
      locale: review.sourceLocale,
      title: review.title,
      body: review.body,
      origin: 'human',
    });

    if (review.english !== null) {
      await db.insert(reviewTranslations).values({
        reviewId: row.id,
        locale: 'en-GB',
        title: review.english.title,
        body: review.english.body,
        origin: 'machine',
      });
    }
  }
  return count;
}

async function seedIncidents(db: Database, vendorId: Ids): Promise<number> {
  const references = INCIDENTS.map((incident) => incident.reference);
  await db.delete(incidents).where(inArray(incidents.reference, references));

  let count = 0;
  for (const incident of INCIDENTS) {
    const vendor = vendorId.get(incident.vendorSlug);
    if (vendor === undefined) continue;

    let bookingId: string | null = null;
    if (incident.bookingReference !== null) {
      const [booking] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.reference, incident.bookingReference));
      bookingId = booking?.id ?? null;
    }

    await db.insert(incidents).values({
      reference: incident.reference,
      vendorId: vendor,
      bookingId,
      kind: incident.kind,
      severity: incident.severity,
      occurredAt: hoursAgo(incident.hoursAgo),
      narrative: incident.narrative,
      chamberTreatment: incident.chamberTreatment,
      // The site is always recorded, whether or not there was a dive profile
      // to go with it: "where" is the first question an investigation asks.
      diveProfile: { ...(incident.diveProfile ?? {}), site: incident.site },
      resolvedAt: incident.resolvedHoursAgo === null ? null : hoursAgo(incident.resolvedHoursAgo),
      resolution: incident.resolution,
    });
    count += 1;
  }
  return count;
}

async function seedDisputes(db: Database): Promise<number> {
  let count = 0;
  for (const dispute of DISPUTES) {
    const [booking] = await db
      .select({ id: bookings.id, userId: bookings.userId })
      .from(bookings)
      .where(eq(bookings.reference, dispute.bookingReference));
    if (booking === undefined) continue;

    await db.insert(disputes).values({
      bookingId: booking.id,
      raisedByUserId: booking.userId,
      status: dispute.status,
      reasonKey: dispute.reasonKey,
      description: dispute.description,
      claimedAmount: dispute.claimedMinor,
      claimedCurrency: dispute.claimedMinor === null ? null : CURRENCY,
      resolvedAmount: dispute.resolvedMinor,
      resolvedCurrency: dispute.resolvedMinor === null ? null : CURRENCY,
      resolvedAt: dispute.resolvedHoursAgo === null ? null : hoursAgo(dispute.resolvedHoursAgo),
      resolutionNote: dispute.resolutionNote,
      createdAt: hoursAgo(dispute.openedHoursAgo),
      updatedAt: hoursAgo(dispute.resolvedHoursAgo ?? dispute.openedHoursAgo),
    });
    count += 1;
  }
  return count;
}

async function seedFeatureFlags(db: Database): Promise<number> {
  for (const flag of FEATURE_FLAGS) {
    await db
      .insert(featureFlags)
      .values({
        key: flag.key,
        description: flag.description,
        isEnabled: flag.isEnabled,
        rolloutPercentage: flag.rolloutPercentage,
      })
      .onConflictDoUpdate({
        target: featureFlags.key,
        set: {
          description: flag.description,
          isEnabled: flag.isEnabled,
          rolloutPercentage: flag.rolloutPercentage,
          updatedAt: new Date(),
        },
      });
  }
  return FEATURE_FLAGS.length;
}

export interface OperationsCounts {
  readonly staff: number;
  readonly resources: number;
  readonly services: number;
  readonly serviceTranslations: number;
  readonly attributeValues: number;
  readonly slots: number;
  readonly bookings: number;
  readonly participants: number;
  readonly payments: number;
  readonly refunds: number;
  readonly ledgerEntries: number;
  readonly payouts: number;
  readonly reviews: number;
  readonly incidents: number;
  readonly disputes: number;
  readonly featureFlags: number;
}

export async function seedOperations(db: Database): Promise<OperationsCounts> {
  const vendorId = await vendorIds(db);
  const categoryId = await categoryIds(db);
  const travelerId = await seedTravelers(db);

  const staffCount = await seedStaff(db, vendorId);
  const resourceId = await seedResources(db, vendorId);
  const service = await seedServices(db, vendorId, categoryId);
  const slotId = await seedSlots(db, service.ids, resourceId);
  const booking = await seedBookings(db, vendorId, service.ids, travelerId, slotId);
  const payoutCount = await seedPayouts(db, vendorId);
  const reviewCount = await seedReviews(db);
  const incidentCount = await seedIncidents(db, vendorId);
  const disputeCount = await seedDisputes(db);
  const flagCount = await seedFeatureFlags(db);

  // The one assertion worth making out loud: if every group balanced, the
  // whole ledger balances, and a seed that quietly leaves it unbalanced would
  // make every figure on the money screen wrong in a way nobody would notice.
  const [balance] = await db.execute<{ total: string }>(
    sql`SELECT COALESCE(SUM(amount), 0)::text AS total FROM ledger_entries`,
  );
  if (balance !== undefined && balance.total !== '0') {
    throw new Error(`The ledger does not balance: ${balance.total}`);
  }

  return {
    staff: staffCount,
    resources: resourceId.size,
    services: service.ids.size,
    serviceTranslations: service.translations,
    attributeValues: service.attributeValues,
    slots: slotId.size,
    bookings: booking.bookings,
    participants: booking.participants,
    payments: booking.payments,
    refunds: booking.refunds,
    ledgerEntries: booking.ledgerEntries,
    payouts: payoutCount,
    reviews: reviewCount,
    incidents: incidentCount,
    disputes: disputeCount,
    featureFlags: flagCount,
  };
}
