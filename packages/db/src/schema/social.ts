import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { bookings } from './booking';
import { attributeDefinitions, services } from './catalog';
import { users } from './identity';
import { vendors } from './vendors';
import { localeEnum, primaryId, timestamps } from './_shared';

/** SOCIAL — reviews, questions, and the messages between the two sides. */

export const moderationStatusEnum = pgEnum('moderation_status', [
  'published',
  'pendingReview',
  'hidden',
  'removed',
]);

export const reviews = pgTable(
  'reviews',
  {
    id: primaryId(),
    /** A review requires a completed booking. No booking, no review. */
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id),
    /** 1 to 5. Held as a smallint with a check, not as a float average. */
    rating: smallint('rating').notNull(),
    /** The locale the review was written in, for the translation pipeline. */
    sourceLocale: localeEnum('source_locale').notNull(),
    moderationStatus: moderationStatusEnum('moderation_status').notNull().default('published'),
    moderatedBy: uuid('moderated_by').references(() => users.id),
    moderatedAt: timestamp('moderated_at', { withTimezone: true, mode: 'date' }),
    vendorReply: text('vendor_reply'),
    vendorRepliedAt: timestamp('vendor_replied_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    // One review per booking: the thing being reviewed is the trip that
    // happened, not the listing in general.
    uniqueIndex('reviews_booking_key').on(table.bookingId),
    index('reviews_service_idx').on(table.serviceId, table.moderationStatus),
    index('reviews_vendor_idx').on(table.vendorId),
    check('reviews_rating_range', sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

/**
 * Per-attribute scores, keyed to the same attribute_definitions the
 * comparison engine reads. "Was the guide ratio what was advertised?" is
 * answerable because the question and the claim share a definition.
 */
export const reviewAttributeScores = pgTable(
  'review_attribute_scores',
  {
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    attributeDefinitionId: uuid('attribute_definition_id')
      .notNull()
      .references(() => attributeDefinitions.id, { onDelete: 'cascade' }),
    score: smallint('score').notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.reviewId, table.attributeDefinitionId] }),
    check('review_attribute_scores_range', sql`${table.score} BETWEEN 1 AND 5`),
  ],
);

export const reviewTranslations = pgTable(
  'review_translations',
  {
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: varchar('title', { length: 160 }),
    body: text('body').notNull(),
    /** machine or human, so the UI can offer "show original". */
    origin: varchar('origin', { length: 20 }).notNull().default('human'),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.reviewId, table.locale] })],
);

export const questionsAnswers = pgTable(
  'questions_answers',
  {
    id: primaryId(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    askedByUserId: uuid('asked_by_user_id')
      .notNull()
      .references(() => users.id),
    question: text('question').notNull(),
    sourceLocale: localeEnum('source_locale').notNull(),
    answer: text('answer'),
    answeredByUserId: uuid('answered_by_user_id').references(() => users.id),
    answeredAt: timestamp('answered_at', { withTimezone: true, mode: 'date' }),
    moderationStatus: moderationStatusEnum('moderation_status').notNull().default('published'),
    /** Pinned answers surface above the rest on the listing. */
    isPinned: boolean('is_pinned').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('questions_answers_service_idx').on(table.serviceId, table.moderationStatus)],
);

export const messageThreads = pgTable(
  'message_threads',
  {
    id: primaryId(),
    /** A thread is always about something: a booking, or a listing enquiry. */
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }),
    travelerUserId: uuid('traveler_user_id')
      .notNull()
      .references(() => users.id),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true, mode: 'date' }),
    travelerUnreadCount: integer('traveler_unread_count').notNull().default(0),
    vendorUnreadCount: integer('vendor_unread_count').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index('message_threads_traveler_idx').on(table.travelerUserId, table.lastMessageAt),
    index('message_threads_vendor_idx').on(table.vendorId, table.lastMessageAt),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: primaryId(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => messageThreads.id, { onDelete: 'cascade' }),
    senderUserId: uuid('sender_user_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    sourceLocale: localeEnum('source_locale').notNull(),
    /**
     * Signal in Dahab is patchy, so a message is written locally with a
     * client id and reconciled on reconnect rather than being lost or
     * duplicated. Offline is a designed state (CLAUDE.md).
     */
    clientMessageId: varchar('client_message_id', { length: 64 }),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    moderationStatus: moderationStatusEnum('moderation_status').notNull().default('published'),
    ...timestamps,
  },
  (table) => [
    index('messages_thread_idx').on(table.threadId, table.createdAt),
    uniqueIndex('messages_client_id_key').on(table.senderUserId, table.clientMessageId),
  ],
);

/**
 * A Russian traveler and an Egyptian skipper do not share a language. Each
 * message carries its translations so both sides read their own, with the
 * original always one tap away.
 */
export const messageTranslations = pgTable(
  'message_translations',
  {
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    body: text('body').notNull(),
    origin: varchar('origin', { length: 20 }).notNull().default('machine'),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.messageId, table.locale] })],
);

export const reviewsRelations = relations(reviews, ({ many, one }) => ({
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
  service: one(services, { fields: [reviews.serviceId], references: [services.id] }),
  attributeScores: many(reviewAttributeScores),
  translations: many(reviewTranslations),
}));

export const messageThreadsRelations = relations(messageThreads, ({ many, one }) => ({
  vendor: one(vendors, { fields: [messageThreads.vendorId], references: [vendors.id] }),
  messages: many(messages),
}));
