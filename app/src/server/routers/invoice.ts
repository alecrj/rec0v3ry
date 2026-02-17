/**
 * Invoice Router
 *
 * Invoice CRUD operations for billing management.
 * Source: docs/05_PAYMENTS.md Section 2 (Invoice Management)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../db/client';
import { invoices, invoiceLineItems } from '../db/schema/payments';
import { organizations } from '../db/schema/orgs';
import { eq, and, isNull, desc, gte, lte, sql } from 'drizzle-orm';
import { NotFoundError, InvalidInputError } from '@/lib/errors';

/**
 * Invoice list filters schema
 */
const listInvoicesSchema = z.object({
  residentId: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending', 'paid', 'partially_paid', 'overdue', 'void', 'written_off']).optional(),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().uuid().optional(),
});

/**
 * Create invoice input schema
 */
const createInvoiceSchema = z.object({
  residentId: z.string().uuid(),
  admissionId: z.string().uuid().optional(),
  issueDate: z.string(), // ISO date YYYY-MM-DD
  dueDate: z.string(), // ISO date YYYY-MM-DD
  taxAmount: z.string().optional(), // Decimal string
  notes: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    paymentType: z.enum(['rent', 'security_deposit', 'program_fee', 'service_fee', 'damage', 'late_fee', 'other']),
    quantity: z.number().int().min(1).default(1),
    unitPrice: z.string(), // Decimal string
    startDate: z.string().optional(), // ISO date
    endDate: z.string().optional(), // ISO date
    metadata: z.record(z.string(), z.any()).optional(),
  })).min(1),
});

/**
 * Add line item input schema
 */
const addLineItemSchema = z.object({
  invoiceId: z.string().uuid(),
  description: z.string().min(1),
  paymentType: z.enum(['rent', 'security_deposit', 'program_fee', 'service_fee', 'damage', 'late_fee', 'other']),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.string(), // Decimal string
  startDate: z.string().optional(), // ISO date
  endDate: z.string().optional(), // ISO date
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Invoice router
 */
export const invoiceRouter = router({
  /**
   * List invoices with pagination and filters
   */
  list: protectedProcedure
    .meta({ permission: 'invoice:read', resource: 'invoice' })
    .input(listInvoicesSchema)
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const conditions = [
        eq(invoices.org_id, orgId),
        isNull(invoices.deleted_at),
      ];

      if (input.residentId) {
        conditions.push(eq(invoices.resident_id, input.residentId));
      }

      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }

      if (input.dateFrom) {
        conditions.push(gte(invoices.issue_date, input.dateFrom));
      }

      if (input.dateTo) {
        conditions.push(lte(invoices.issue_date, input.dateTo));
      }

      if (input.cursor) {
        conditions.push(sql`${invoices.id} > ${input.cursor}`);
      }

      const items = await db.query.invoices.findMany({
        where: and(...conditions),
        orderBy: [desc(invoices.created_at)],
        limit: input.limit + 1, // Get one extra to determine if there are more
        with: {
          resident: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: results,
        nextCursor: hasMore ? results[results.length - 1]?.id : null,
      };
    }),

  /**
   * Get invoice by ID with line items
   */
  getById: protectedProcedure
    .meta({ permission: 'invoice:read', resource: 'invoice' })
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const invoice = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, input.id),
          eq(invoices.org_id, orgId),
          isNull(invoices.deleted_at)
        ),
        with: {
          lineItems: true,
          resident: {
            columns: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
          admission: {
            columns: {
              id: true,
              admission_date: true,
              status: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundError('Invoice', input.id);
      }

      return invoice;
    }),

  /**
   * Create invoice with line items
   * Auto-generates invoice_number: INV-{orgShortCode}-{seq}
   */
  create: protectedProcedure
    .meta({ permission: 'invoice:create', resource: 'invoice' })
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Get org slug for invoice number
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
        columns: { slug: true },
      });

      if (!org) {
        throw new InvalidInputError('Organization not found');
      }

      // Calculate subtotal from line items
      const subtotal = input.lineItems.reduce((sum, item) => {
        const itemTotal = parseFloat(item.unitPrice) * item.quantity;
        return sum + itemTotal;
      }, 0);

      const taxAmount = input.taxAmount ? parseFloat(input.taxAmount) : 0;
      const total = subtotal + taxAmount;

      // Generate invoice number (simple sequential - in production use atomic counter)
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(
          and(
            eq(invoices.org_id, orgId),
            isNull(invoices.deleted_at)
          )
        );
      const invoiceCount = countResult[0]?.count || 0;
      const invoiceNumber = `INV-${org.slug.toUpperCase()}-${(invoiceCount + 1).toString().padStart(5, '0')}`;

      // Create invoice in transaction
      const [invoice] = await db.transaction(async (tx) => {
        // Create invoice
        const [newInvoice] = await tx
          .insert(invoices)
          .values({
            org_id: orgId,
            resident_id: input.residentId,
            admission_id: input.admissionId || null,
            invoice_number: invoiceNumber,
            status: 'draft',
            issue_date: input.issueDate,
            due_date: input.dueDate,
            subtotal: subtotal.toFixed(2),
            tax_amount: taxAmount.toFixed(2),
            total: total.toFixed(2),
            amount_paid: '0',
            amount_due: total.toFixed(2),
            notes: input.notes || null,
            created_by: userId,
            updated_by: userId,
          })
          .returning();

        // Create line items
        await tx.insert(invoiceLineItems).values(
          input.lineItems.map((item) => ({
            invoice_id: newInvoice.id,
            description: item.description,
            payment_type: item.paymentType,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            amount: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
            start_date: item.startDate || null,
            end_date: item.endDate || null,
            metadata: item.metadata || null,
          }))
        );

        return [newInvoice];
      });

      // Return with line items
      return db.query.invoices.findFirst({
        where: eq(invoices.id, invoice.id),
        with: { lineItems: true },
      });
    }),

  /**
   * Send invoice (mark as pending)
   */
  send: protectedProcedure
    .meta({ permission: 'invoice:update', resource: 'invoice' })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Check invoice exists and is draft
      const existing = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, input.id),
          eq(invoices.org_id, orgId),
          isNull(invoices.deleted_at)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Invoice', input.id);
      }

      if (existing.status !== 'draft') {
        throw new InvalidInputError('Only draft invoices can be sent');
      }

      // Update to pending
      const [updated] = await db
        .update(invoices)
        .set({
          status: 'pending',
          updated_by: userId,
        })
        .where(eq(invoices.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Void invoice
   */
  void: protectedProcedure
    .meta({ permission: 'invoice:delete', resource: 'invoice' })
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Check invoice exists
      const existing = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, input.id),
          eq(invoices.org_id, orgId),
          isNull(invoices.deleted_at)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Invoice', input.id);
      }

      if (existing.status === 'void') {
        throw new InvalidInputError('Invoice is already void');
      }

      // Mark as void
      const [updated] = await db
        .update(invoices)
        .set({
          status: 'void',
          updated_by: userId,
        })
        .where(eq(invoices.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Add line item to draft invoice
   */
  addLineItem: protectedProcedure
    .meta({ permission: 'invoice:update', resource: 'invoice' })
    .input(addLineItemSchema)
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Check invoice exists and is draft
      const existing = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, input.invoiceId),
          eq(invoices.org_id, orgId),
          isNull(invoices.deleted_at)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Invoice', input.invoiceId);
      }

      if (existing.status !== 'draft') {
        throw new InvalidInputError('Can only add line items to draft invoices');
      }

      // Add line item and recalculate totals
      await db.transaction(async (tx) => {
        // Add line item
        await tx.insert(invoiceLineItems).values({
          invoice_id: input.invoiceId,
          description: input.description,
          payment_type: input.paymentType,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          amount: (parseFloat(input.unitPrice) * input.quantity).toFixed(2),
          start_date: input.startDate || null,
          end_date: input.endDate || null,
          metadata: input.metadata || null,
        });

        // Recalculate totals
        const allLineItems = await tx.query.invoiceLineItems.findMany({
          where: eq(invoiceLineItems.invoice_id, input.invoiceId),
        });

        const subtotal = allLineItems.reduce((sum, item) => {
          return sum + parseFloat(item.amount);
        }, 0);

        const taxAmount = parseFloat(existing.tax_amount || '0');
        const total = subtotal + taxAmount;

        await tx
          .update(invoices)
          .set({
            subtotal: subtotal.toFixed(2),
            total: total.toFixed(2),
            amount_due: (total - parseFloat(existing.amount_paid || '0')).toFixed(2),
            updated_by: userId,
          })
          .where(eq(invoices.id, input.invoiceId));
      });

      // Return updated invoice with line items
      return db.query.invoices.findFirst({
        where: eq(invoices.id, input.invoiceId),
        with: { lineItems: true },
      });
    }),

  /**
   * Remove line item from draft invoice
   */
  removeLineItem: protectedProcedure
    .meta({ permission: 'invoice:update', resource: 'invoice' })
    .input(z.object({
      invoiceId: z.string().uuid(),
      lineItemId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = (ctx as any).orgId as string;
      const userId = ctx.user!.id;

      // Check invoice exists and is draft
      const existing = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, input.invoiceId),
          eq(invoices.org_id, orgId),
          isNull(invoices.deleted_at)
        ),
      });

      if (!existing) {
        throw new NotFoundError('Invoice', input.invoiceId);
      }

      if (existing.status !== 'draft') {
        throw new InvalidInputError('Can only remove line items from draft invoices');
      }

      // Remove line item and recalculate totals
      await db.transaction(async (tx) => {
        // Delete line item
        await tx
          .delete(invoiceLineItems)
          .where(eq(invoiceLineItems.id, input.lineItemId));

        // Recalculate totals
        const remainingLineItems = await tx.query.invoiceLineItems.findMany({
          where: eq(invoiceLineItems.invoice_id, input.invoiceId),
        });

        const subtotal = remainingLineItems.reduce((sum, item) => {
          return sum + parseFloat(item.amount);
        }, 0);

        const taxAmount = parseFloat(existing.tax_amount || '0');
        const total = subtotal + taxAmount;

        await tx
          .update(invoices)
          .set({
            subtotal: subtotal.toFixed(2),
            total: total.toFixed(2),
            amount_due: (total - parseFloat(existing.amount_paid || '0')).toFixed(2),
            updated_by: userId,
          })
          .where(eq(invoices.id, input.invoiceId));
      });

      // Return updated invoice with line items
      return db.query.invoices.findFirst({
        where: eq(invoices.id, input.invoiceId),
        with: { lineItems: true },
      });
    }),
});
