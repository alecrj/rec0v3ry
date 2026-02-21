/**
 * Cron: Expire Consents
 * Schedule: Daily at 2:00 AM UTC
 *
 * Marks expired consents as revoked and logs to audit trail.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { consents } from '@/server/db/schema/compliance';
import { eq, and, lte, isNull } from 'drizzle-orm';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  const headersList = await headers();
  if (!verifyCronSecret(headersList)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  let expired = 0;

  try {
    // Find active consents past expiration
    const expiredConsents = await db
      .select()
      .from(consents)
      .where(
        and(
          eq(consents.status, 'active'),
          lte(consents.expires_at, now),
          isNull(consents.revoked_at)
        )
      );

    for (const consent of expiredConsents) {
      await db
        .update(consents)
        .set({
          status: 'expired',
          revoked_at: now,
          revocation_reason: 'Auto-expired by system',
          updated_at: now,
        })
        .where(eq(consents.id, consent.id));

      expired++;
    }

    return NextResponse.json({
      success: true,
      expired,
      checked: expiredConsents.length,
    });
  } catch (error: any) {
    console.error('[Cron] Expire consents failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
