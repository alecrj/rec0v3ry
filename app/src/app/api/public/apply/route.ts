/**
 * Public Apply API
 * POST /api/public/apply
 *
 * Creates a new lead from a public intake form submission.
 * No authentication required — this is the public-facing intake endpoint.
 *
 * Accepts optional propertyId or propertySlug to pre-assign house preference.
 */

import { NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { organizations, properties } from '@/server/db/schema/orgs';
import { leads } from '@/server/db/schema/residents';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const applySchema = z.object({
  orgSlug: z.string().min(1),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  preferredMoveInDate: z.string().optional(),
  propertyId: z.string().uuid().optional(),
  propertySlug: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = applySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Look up the org by slug
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(
        and(
          eq(organizations.slug, input.orgSlug),
          isNull(organizations.deleted_at)
        )
      )
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Resolve property/house preference if provided
    let housePreferenceId: string | undefined;

    if (input.propertyId) {
      // Verify property belongs to this org
      const [prop] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(
          and(
            eq(properties.id, input.propertyId),
            eq(properties.org_id, org.id),
            isNull(properties.deleted_at)
          )
        )
        .limit(1);

      if (prop) {
        // Use propertyId as the house preference context (stored in notes for now)
        housePreferenceId = undefined; // house_preference_id references houses, not properties
      }
    } else if (input.propertySlug) {
      // Look up property by slug
      const [prop] = await db
        .select({ id: properties.id, name: properties.name })
        .from(properties)
        .where(
          and(
            eq(properties.slug, input.propertySlug),
            eq(properties.org_id, org.id),
            isNull(properties.deleted_at)
          )
        )
        .limit(1);

      if (!prop) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }
    }

    // Build notes — include property context if specified
    let notes = input.notes ?? '';
    if (input.propertySlug || input.propertyId) {
      const propertyRef = input.propertySlug ?? input.propertyId;
      const prefix = `Applied via property: ${propertyRef}`;
      notes = notes ? `${prefix}\n${notes}` : prefix;
    }

    // Create the lead
    const [lead] = await db
      .insert(leads)
      .values({
        org_id: org.id,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        source: input.source ?? 'Intake Form',
        preferred_move_in_date: input.preferredMoveInDate,
        house_preference_id: housePreferenceId,
        notes: notes || null,
        status: 'new',
      })
      .returning({ id: leads.id });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error('[Public Apply] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
