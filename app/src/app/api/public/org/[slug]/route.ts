/**
 * Public Org Lookup API
 * GET /api/public/org/[slug]
 *
 * Returns org branding and list of properties for use on public intake forms.
 * No authentication required — only returns non-sensitive public info.
 */

import { NextResponse } from 'next/server';
import { db } from '@/server/db/client';
import { organizations, properties } from '@/server/db/schema/orgs';
import { eq, and, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }

    // Look up org by slug
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        settings: organizations.settings,
      })
      .from(organizations)
      .where(
        and(
          eq(organizations.slug, slug),
          isNull(organizations.deleted_at)
        )
      )
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Extract public settings (logo URL from settings jsonb)
    const settings = org.settings as Record<string, unknown> | null;
    const logoUrl = (settings?.logo_url as string | undefined) ?? null;

    // Get all active properties for this org
    const orgProperties = await db
      .select({
        id: properties.id,
        name: properties.name,
        slug: properties.slug,
        city: properties.city,
        state: properties.state,
      })
      .from(properties)
      .where(
        and(
          eq(properties.org_id, org.id),
          isNull(properties.deleted_at)
        )
      )
      .orderBy(properties.name);

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo_url: logoUrl,
      properties: orgProperties,
    });
  } catch (error) {
    console.error('[Public Org Lookup] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
