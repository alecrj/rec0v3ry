/**
 * Public Application API
 * POST /api/public/apply
 *
 * No auth required. Accepts application data + org slug.
 * Creates a lead in the pipeline with status='new'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { organizations } from '@/server/db/schema/orgs';
import { leads } from '@/server/db/schema/residents';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

const applySchema = z.object({
  slug: z.string().min(1),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  referralSourceId: z.string().uuid().optional(),
  source: z.string().optional(),
  substanceHistory: z.string().optional(),
  desiredMoveInDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = applySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid application data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { slug, firstName, lastName, phone, email, referralSourceId, source, substanceHistory, desiredMoveInDate, notes } = parsed.data;

    // Look up org by slug
    const [org] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(
        and(
          eq(organizations.slug, slug),
          isNull(organizations.deleted_at)
        )
      )
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Build notes with substance history if provided
    const combinedNotes = [
      substanceHistory ? `Substance History: ${substanceHistory}` : null,
      notes ? `Additional Notes: ${notes}` : null,
    ].filter(Boolean).join('\n\n') || undefined;

    // Create lead
    const [lead] = await db
      .insert(leads)
      .values({
        org_id: org.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        email: email || null,
        source: source || 'Online Application',
        referral_source_id: referralSourceId || null,
        preferred_move_in_date: desiredMoveInDate || null,
        notes: combinedNotes || null,
        status: 'new',
      })
      .returning({ id: leads.id });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      orgName: org.name,
    });
  } catch (error) {
    console.error('Public apply error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
