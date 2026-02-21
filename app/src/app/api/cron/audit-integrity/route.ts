/**
 * Cron: Audit Log Integrity Check
 * Schedule: Weekly on Sunday at 3:00 AM UTC
 *
 * Verifies the HMAC hash chain integrity of the audit log.
 * Reports any breaks in the chain.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/server/db/client';
import { auditLogs } from '@/server/db/schema/audit';
import { asc, sql } from 'drizzle-orm';
import crypto from 'crypto';

function verifyCronSecret(headersList: Headers): boolean {
  const auth = headersList.get('authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  const headersList = await headers();
  if (!verifyCronSecret(headersList)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hmacKey = process.env.AUDIT_LOG_HMAC_KEY;
  if (!hmacKey) {
    return NextResponse.json({ error: 'AUDIT_LOG_HMAC_KEY not configured' }, { status: 500 });
  }

  try {
    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs);

    // Verify chain in batches
    let verified = 0;
    let broken = 0;
    const brokenIds: string[] = [];
    const batchSize = 1000;
    let offset = 0;
    let prevHash: string | null = null;

    while (offset < count) {
      const batch = await db
        .select()
        .from(auditLogs)
        .orderBy(asc(auditLogs.created_at), asc(auditLogs.id))
        .limit(batchSize)
        .offset(offset);

      for (const entry of batch) {
        if (entry.previous_log_hash !== null && entry.previous_log_hash !== prevHash) {
          broken++;
          brokenIds.push(entry.id);
        }

        // Compute expected hash for this entry
        const payload: string = JSON.stringify({
          id: entry.id,
          action: entry.action,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id,
          previous_log_hash: entry.previous_log_hash,
          created_at: entry.created_at?.toISOString(),
        });

        prevHash = crypto
          .createHmac('sha256', hmacKey)
          .update(payload)
          .digest('hex');

        verified++;
      }

      offset += batchSize;
    }

    const status = broken === 0 ? 'intact' : 'compromised';

    console.log(`[Cron] Audit integrity check: ${status} (${verified} verified, ${broken} broken)`);

    return NextResponse.json({
      success: true,
      status,
      totalEntries: count,
      verified,
      broken,
      brokenIds: brokenIds.slice(0, 10), // First 10 broken IDs
    });
  } catch (error: any) {
    console.error('[Cron] Audit integrity check failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
