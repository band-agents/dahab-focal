import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './identity.ts';
import {
  deletedAt,
  geographyPoint,
  primaryId,
  timestamps,
  verificationStatusEnum,
} from './_shared.ts';

/**
 * VENDORS — the operators, their people, their kit, and every document that
 * expires. Expiry is the theme of this file: a permit, an insurance
 * certificate, a staff rating and a tank's hydrostatic test all lapse, and
 * every one of them must surface before it does rather than on the morning
 * a boat is due out (CLAUDE.md).
 */

export const vendorStatusEnum = pgEnum('vendor_status', [
  'applied',
  'inReview',
  'active',
  'suspended',
  'closed',
]);

export const vendors = pgTable(
  'vendors',
  {
    id: primaryId(),
    slug: varchar('slug', { length: 80 }).notNull(),
    legalName: varchar('legal_name', { length: 200 }).notNull(),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    status: vendorStatusEnum('status').notNull().default('applied'),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id),
    /** Assalah, Masbat, Mashraba, Eel Garden, Lighthouse, Blue Beach. */
    neighborhood: varchar('neighborhood', { length: 60 }),
    location: geographyPoint('location'),
    addressLine: text('address_line'),
    phone: varchar('phone', { length: 20 }),
    whatsapp: varchar('whatsapp', { length: 20 }),
    email: varchar('email', { length: 320 }),
    website: text('website'),
    /** Egyptian commercial register and tax card numbers. */
    commercialRegisterNo: varchar('commercial_register_no', { length: 40 }),
    taxCardNo: varchar('tax_card_no', { length: 40 }),
    /** Chamber of Diving and Watersports membership, where it applies. */
    cdwsMembershipNo: varchar('cdws_membership_no', { length: 40 }),
    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('pending'),
    /** Ramadan and the Friday-Saturday weekend shift these. */
    operatingHours: jsonb('operating_hours').$type<Record<string, unknown>>(),
    ...timestamps,
    deletedAt: deletedAt(),
  },
  (table) => [
    uniqueIndex('vendors_slug_key').on(table.slug),
    index('vendors_status_idx').on(table.status),
    index('vendors_location_gix').using('gist', table.location),
  ],
);

export const vendorDocumentTypeEnum = pgEnum('vendor_document_type', [
  'commercialRegister',
  'taxCard',
  'operatingPermit',
  'cdwsLicence',
  'diveAgencyAffiliation',
  'publicLiabilityInsurance',
  'boatLicence',
  'vehicleLicence',
  'other',
]);

/**
 * Every document carries an expiry and a reviewer. `expiresOn` is indexed on
 * its own because the nightly job that warns about lapsing paperwork reads
 * exactly that column across every vendor.
 */
export const vendorDocuments = pgTable(
  'vendor_documents',
  {
    id: primaryId(),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    type: vendorDocumentTypeEnum('type').notNull(),
    fileUrl: text('file_url').notNull(),
    documentNumber: varchar('document_number', { length: 80 }),
    /**
     * Who issued it — "South Sinai Governorate", "CDWS", "Misr Insurance".
     * The admin verification queue shows this, and it cannot be derived from
     * the type: two operating permits can come from different authorities.
     */
    issuer: varchar('issuer', { length: 160 }),
    issuedOn: date('issued_on'),
    expiresOn: date('expires_on'),
    /**
     * Whether a lapse STOPS the operator rather than merely warning them. An
     * expired public liability certificate blocks publishing; an overdue tank
     * test does not, it blocks that cylinder. Stored per document because the
     * answer depends on the vendor's own licence mix, not only on the type.
     */
    blocksPublishing: boolean('blocks_publishing').notNull().default(false),
    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    rejectionReason: text('rejection_reason'),
    ...timestamps,
  },
  (table) => [
    index('vendor_documents_vendor_idx').on(table.vendorId),
    index('vendor_documents_expiry_idx').on(table.expiresOn),
    index('vendor_documents_review_idx').on(table.verificationStatus),
  ],
);

export const payoutProviderEnum = pgEnum('payout_provider', [
  'paymob',
  'kashier',
  'paypal',
  'fawry',
  'instapay',
  'wise',
  'bankTransfer',
]);

export const vendorPayoutAccounts = pgTable(
  'vendor_payout_accounts',
  {
    id: primaryId(),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    provider: payoutProviderEnum('provider').notNull(),
    /** Never the full number: last four plus a provider-side token. */
    accountLast4: varchar('account_last4', { length: 4 }),
    accountToken: text('account_token').notNull(),
    accountHolder: varchar('account_holder', { length: 200 }),
    isDefault: boolean('is_default').notNull().default(false),
    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('pending'),
    ...timestamps,
  },
  (table) => [index('vendor_payout_accounts_vendor_idx').on(table.vendorId)],
);

export const staff = pgTable(
  'staff',
  {
    id: primaryId(),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    /** Null until the guide claims their account; the row exists first. */
    userId: uuid('user_id').references(() => users.id),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    /** instructor, divemaster, guide, skipper, driver, receptionist. */
    jobTitle: varchar('job_title', { length: 80 }),
    phone: varchar('phone', { length: 20 }),
    languages: jsonb('languages').$type<string[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
    deletedAt: deletedAt(),
  },
  (table) => [index('staff_vendor_idx').on(table.vendorId)],
);

export const staffCertifications = pgTable(
  'staff_certifications',
  {
    id: primaryId(),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    agency: varchar('agency', { length: 40 }).notNull(),
    level: varchar('level', { length: 80 }).notNull(),
    certificateNumber: varchar('certificate_number', { length: 80 }),
    issuedOn: date('issued_on'),
    /** Instructor ratings and first-aid tickets both lapse annually. */
    expiresOn: date('expires_on'),
    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('pending'),
    ...timestamps,
  },
  (table) => [
    index('staff_certifications_staff_idx').on(table.staffId),
    index('staff_certifications_expiry_idx').on(table.expiresOn),
  ],
);

export const resourceKindEnum = pgEnum('resource_kind', [
  'boat',
  'vehicle',
  'tank',
  'kite',
  'board',
  'bcd',
  'regulator',
  'wetsuit',
  'camera',
  'other',
]);

/**
 * Physical capacity. A slot that says "8 places" is only true if there is a
 * boat with eight seats and enough tanks, which is why capacity can be tied
 * to a resource rather than to a number typed into a form.
 */
export const resources = pgTable(
  'resources',
  {
    id: primaryId(),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    kind: resourceKindEnum('kind').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    identifier: varchar('identifier', { length: 80 }),
    /** Seats on a boat, seats in a jeep, or 1 for a single item of kit. */
    capacity: integer('capacity').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    /** Tank size in litres, kite size in square metres, and so on. */
    specifications: jsonb('specifications').$type<Record<string, unknown>>(),
    ...timestamps,
    deletedAt: deletedAt(),
  },
  (table) => [index('resources_vendor_kind_idx').on(table.vendorId, table.kind)],
);

/**
 * Scuba cylinders carry a hydrostatic test date and a visual inspection date.
 * A tank out of test cannot legally be filled, so this is a hard gate on
 * availability, not a maintenance note.
 */
export const resourceCertifications = pgTable(
  'resource_certifications',
  {
    id: primaryId(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    /** hydrostaticTest, visualInspection, boatSafety, vehicleRoadworthiness. */
    kind: varchar('kind', { length: 60 }).notNull(),
    certificateNumber: varchar('certificate_number', { length: 80 }),
    testedOn: date('tested_on'),
    expiresOn: date('expires_on').notNull(),
    ...timestamps,
  },
  (table) => [
    index('resource_certifications_resource_idx').on(table.resourceId),
    index('resource_certifications_expiry_idx').on(table.expiresOn),
  ],
);

export const maintenanceLog = pgTable(
  'maintenance_log',
  {
    id: primaryId(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    performedOn: date('performed_on').notNull(),
    performedBy: varchar('performed_by', { length: 160 }),
    summary: text('summary').notNull(),
    /** True while the resource is out of service and cannot be scheduled. */
    tookOutOfService: boolean('took_out_of_service').notNull().default(false),
    returnedToServiceOn: date('returned_to_service_on'),
    ...timestamps,
  },
  (table) => [index('maintenance_log_resource_idx').on(table.resourceId, table.performedOn)],
);

export const vendorsRelations = relations(vendors, ({ many, one }) => ({
  owner: one(users, { fields: [vendors.ownerUserId], references: [users.id] }),
  documents: many(vendorDocuments),
  payoutAccounts: many(vendorPayoutAccounts),
  staff: many(staff),
  resources: many(resources),
}));

export const staffRelations = relations(staff, ({ many, one }) => ({
  vendor: one(vendors, { fields: [staff.vendorId], references: [vendors.id] }),
  certifications: many(staffCertifications),
}));

export const resourcesRelations = relations(resources, ({ many, one }) => ({
  vendor: one(vendors, { fields: [resources.vendorId], references: [vendors.id] }),
  certifications: many(resourceCertifications),
  maintenance: many(maintenanceLog),
}));
