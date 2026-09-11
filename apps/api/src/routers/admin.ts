import { TRPCError } from '@trpc/server';
import { and, asc, count, desc, eq, isNotNull, lte, sql } from 'drizzle-orm';
import { z } from 'zod';

import { schema } from '@dahab/db';

import { requirePermission, router } from '../trpc';
import type { Context } from '../context';

/**
 * The admin console's reads.
 *
 * Every procedure is gated by the permission it actually needs, never by a
 * role check — `vendor.readAny` and `audit.read` are different answers to
 * different questions, and the matrix in @dahab/api-contract is the single
 * place either is decided.
 *
 * These are reads only. The writes an admin performs (verify, suspend,
 * cancel a departure, reverse a ledger entry) each carry a reason and an
 * audit row, so they want their own pass rather than being bolted on here.
 */

/** A procedure that needs the database says so honestly. */
function requireDb(ctx: Context) {
  if (ctx.db === null) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'The database is not configured. Set DATABASE_URL and run `pnpm db:migrate && pnpm db:seed`.',
    });
  }
  return ctx.db;
}

const vendorSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  neighborhood: z.string().nullable(),
  status: z.enum(['applied', 'inReview', 'active', 'suspended', 'closed']),
  services: z.number().int(),
  staff: z.number().int(),
  joined: z.string(),
});

const documentSchema = z.object({
  id: z.string().uuid(),
  vendorId: z.string().uuid(),
  vendorName: z.string(),
  type: z.string(),
  status: z.enum(['pending', 'inReview', 'verified', 'rejected', 'expired']),
  expiresOn: z.string().nullable(),
  /**
   * SCHEMA GAP: `vendor_documents` records the document number and the date
   * it was issued, but not the issuing BODY — which the console's verification
   * queue wants to show ("South Sinai Governorate", "CDWS"). Returned as null
   * until the column exists rather than derived from the type, which would be
   * a guess dressed as data.
   */
  issuer: z.string().nullable(),
  documentNumber: z.string().nullable(),
  issuedOn: z.string().nullable(),
});

export const adminRouter = router({
  /**
   * The roster, with the two counts the list actually shows. Counting in SQL
   * rather than in JS keeps a vendor with four hundred services from arriving
   * as four hundred rows nobody renders.
   */
  vendors: requirePermission('vendor.readAny')
    .output(z.array(vendorSchema))
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);

      const serviceCounts = db
        .select({
          vendorId: schema.services.vendorId,
          total: count().as('total'),
        })
        .from(schema.services)
        .groupBy(schema.services.vendorId)
        .as('service_counts');

      const staffCounts = db
        .select({
          vendorId: schema.staff.vendorId,
          total: count().as('total'),
        })
        .from(schema.staff)
        .groupBy(schema.staff.vendorId)
        .as('staff_counts');

      const rows = await db
        .select({
          id: schema.vendors.id,
          displayName: schema.vendors.displayName,
          neighborhood: schema.vendors.neighborhood,
          status: schema.vendors.status,
          createdAt: schema.vendors.createdAt,
          services: serviceCounts.total,
          staff: staffCounts.total,
        })
        .from(schema.vendors)
        .leftJoin(serviceCounts, eq(serviceCounts.vendorId, schema.vendors.id))
        .leftJoin(staffCounts, eq(staffCounts.vendorId, schema.vendors.id))
        .orderBy(asc(schema.vendors.displayName));

      return rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        neighborhood: row.neighborhood,
        status: row.status,
        services: Number(row.services ?? 0),
        staff: Number(row.staff ?? 0),
        joined: row.createdAt.toISOString(),
      }));
    }),

  /** Documents the platform still owes an answer on. */
  verificationQueue: requirePermission('vendor.verify')
    .output(z.array(documentSchema))
    .query(async ({ ctx }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select({
          id: schema.vendorDocuments.id,
          vendorId: schema.vendorDocuments.vendorId,
          vendorName: schema.vendors.displayName,
          type: schema.vendorDocuments.type,
          status: schema.vendorDocuments.verificationStatus,
          expiresOn: schema.vendorDocuments.expiresOn,
          documentNumber: schema.vendorDocuments.documentNumber,
          issuedOn: schema.vendorDocuments.issuedOn,
        })
        .from(schema.vendorDocuments)
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.vendorDocuments.vendorId))
        .where(
          sql`${schema.vendorDocuments.verificationStatus} in ('pending', 'inReview', 'rejected')`,
        )
        .orderBy(asc(schema.vendorDocuments.createdAt));

      return rows.map(toDocument);
    }),

  /**
   * Everything that lapses, ordered by how little time is left.
   *
   * The window is a parameter rather than four fixed queries: the console
   * groups into bands, but "what expires in the next N days" is the question
   * the database is actually being asked.
   */
  expiring: requirePermission('vendor.readAny')
    .input(z.object({ withinDays: z.number().int().min(1).max(365).default(90) }))
    .output(z.array(documentSchema))
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      // Compared in SQL against the request's own `now`, so a fixed clock in a
      // test produces a fixed answer, and nothing does date arithmetic in
      // local time.
      const horizon = new Date(ctx.now.getTime() + input.withinDays * 86_400_000);

      const rows = await db
        .select({
          id: schema.vendorDocuments.id,
          vendorId: schema.vendorDocuments.vendorId,
          vendorName: schema.vendors.displayName,
          type: schema.vendorDocuments.type,
          status: schema.vendorDocuments.verificationStatus,
          expiresOn: schema.vendorDocuments.expiresOn,
          documentNumber: schema.vendorDocuments.documentNumber,
          issuedOn: schema.vendorDocuments.issuedOn,
        })
        .from(schema.vendorDocuments)
        .innerJoin(schema.vendors, eq(schema.vendors.id, schema.vendorDocuments.vendorId))
        .where(
          and(
            isNotNull(schema.vendorDocuments.expiresOn),
            lte(schema.vendorDocuments.expiresOn, horizon.toISOString().slice(0, 10)),
          ),
        )
        .orderBy(asc(schema.vendorDocuments.expiresOn));

      return rows.map(toDocument);
    }),

  /**
   * The comparable attribute set for a category, with how many services carry
   * a value for each — the number that tells an admin what retiring one costs.
   */
  attributeUsage: requirePermission('taxonomy.manage')
    .input(z.object({ categorySlug: z.string().min(1) }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          key: z.string(),
          dataType: z.string(),
          unit: z.string().nullable(),
          isComparable: z.boolean(),
          comparisonGroup: z.string().nullable(),
          valuesOnServices: z.number().int(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);

      const usage = db
        .select({
          definitionId: schema.serviceAttributeValues.attributeDefinitionId,
          total: count().as('total'),
        })
        .from(schema.serviceAttributeValues)
        .groupBy(schema.serviceAttributeValues.attributeDefinitionId)
        .as('usage');

      const rows = await db
        .select({
          id: schema.attributeDefinitions.id,
          key: schema.attributeDefinitions.key,
          dataType: schema.attributeDefinitions.dataType,
          unit: schema.attributeDefinitions.unit,
          isComparable: schema.attributeDefinitions.isComparable,
          comparisonGroup: schema.attributeDefinitions.comparisonGroup,
          valuesOnServices: usage.total,
        })
        .from(schema.attributeDefinitions)
        .innerJoin(
          schema.categories,
          eq(schema.categories.id, schema.attributeDefinitions.categoryId),
        )
        .leftJoin(usage, eq(usage.definitionId, schema.attributeDefinitions.id))
        .where(eq(schema.categories.slug, input.categorySlug))
        .orderBy(
          asc(schema.attributeDefinitions.comparisonOrder),
          asc(schema.attributeDefinitions.key),
        );

      return rows.map((row) => ({
        id: row.id,
        key: row.key,
        dataType: row.dataType,
        unit: row.unit,
        isComparable: row.isComparable,
        comparisonGroup: row.comparisonGroup,
        valuesOnServices: Number(row.valuesOnServices ?? 0),
      }));
    }),

  /** The audit trail. Newest first, because that is how it is read. */
  audit: requirePermission('audit.read')
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          at: z.string(),
          actor: z.string().nullable(),
          action: z.string(),
          entity: z.string(),
          /**
           * SCHEMA GAP: `audit_log` carries beforeJson/afterJson but no
           * dedicated reason column, and the console's design requires a
           * consequential action to record why. Read out of afterJson where a
           * writer put one there, null otherwise — and the column is worth
           * adding rather than relying on that convention.
           */
          reason: z.string().nullable(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const db = requireDb(ctx);
      const rows = await db
        .select()
        .from(schema.auditLog)
        .orderBy(desc(schema.auditLog.createdAt))
        .limit(input.limit);

      return rows.map((row) => ({
        id: row.id,
        at: row.createdAt.toISOString(),
        actor: row.actorLabel ?? row.actorUserId,
        action: row.action,
        entity: `${row.entityTable}:${row.entityId}`,
        reason: typeof row.afterJson?.['reason'] === 'string' ? row.afterJson['reason'] : null,
      }));
    }),
});

function toDocument(row: {
  id: string;
  vendorId: string;
  vendorName: string;
  type: string;
  status: 'pending' | 'inReview' | 'verified' | 'rejected' | 'expired';
  expiresOn: string | null;
  documentNumber: string | null;
  issuedOn: string | null;
}) {
  return {
    id: row.id,
    vendorId: row.vendorId,
    vendorName: row.vendorName,
    type: row.type,
    status: row.status,
    expiresOn: row.expiresOn,
    issuer: null,
    documentNumber: row.documentNumber,
    issuedOn: row.issuedOn,
  };
}
