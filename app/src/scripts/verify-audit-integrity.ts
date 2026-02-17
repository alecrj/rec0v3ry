#!/usr/bin/env npx tsx
/**
 * Audit Log Integrity Verification Script
 * Sprint 20: Launch Prep
 *
 * Verifies the HMAC hash chain integrity of audit logs.
 * Per 04_COMPLIANCE.md T10: Audit log hash chain integrity verification
 *
 * Usage:
 *   npx tsx src/scripts/verify-audit-integrity.ts [--org-id=<id>] [--from-date=<date>] [--verbose]
 */

import { createHmac } from 'crypto';

// Types
interface AuditLogEntry {
  id: string;
  org_id: string;
  actor_user_id: string | null;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  sensitivity_level: string;
  description: string;
  metadata: Record<string, unknown> | null;
  actor_ip_address: string | null;
  previous_log_hash: string | null;
  current_log_hash: string | null;
  created_at: Date;
}

interface VerificationResult {
  total_entries: number;
  verified_entries: number;
  broken_links: BrokenLink[];
  first_entry_date: Date | null;
  last_entry_date: Date | null;
  duration_ms: number;
  is_valid: boolean;
}

interface BrokenLink {
  entry_id: string;
  entry_date: Date;
  expected_previous_hash: string | null;
  actual_previous_hash: string | null;
  issue: string;
}

// Parse CLI arguments
function parseArgs(): { orgId?: string; fromDate?: Date; verbose: boolean } {
  const args = process.argv.slice(2);
  let orgId: string | undefined;
  let fromDate: Date | undefined;
  let verbose = false;

  for (const arg of args) {
    if (arg.startsWith('--org-id=')) {
      orgId = arg.split('=')[1];
    } else if (arg.startsWith('--from-date=')) {
      fromDate = new Date(arg.split('=')[1]);
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    }
  }

  return { orgId, fromDate, verbose };
}

// Get HMAC key from environment
function getHmacKey(): string {
  const key = process.env.AUDIT_LOG_HMAC_KEY;
  if (!key) {
    throw new Error('AUDIT_LOG_HMAC_KEY environment variable not set');
  }
  return key;
}

// Calculate expected hash for an audit entry
function calculateHash(entry: Omit<AuditLogEntry, 'current_log_hash'>, hmacKey: string): string {
  const payload = JSON.stringify({
    id: entry.id,
    org_id: entry.org_id,
    actor_user_id: entry.actor_user_id,
    actor_type: entry.actor_type,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id,
    sensitivity_level: entry.sensitivity_level,
    description: entry.description,
    metadata: entry.metadata,
    actor_ip_address: entry.actor_ip_address,
    previous_log_hash: entry.previous_log_hash,
    created_at: entry.created_at.toISOString(),
  });

  return createHmac('sha256', hmacKey).update(payload).digest('hex');
}

// Fetch audit log entries from database
async function fetchAuditLogs(
  orgId?: string,
  fromDate?: Date
): Promise<AuditLogEntry[]> {
  // Dynamic import to handle module resolution
  const { db } = await import('../server/db/client');
  const { auditLogs } = await import('../server/db/schema');
  const { eq, gte, and, asc } = await import('drizzle-orm');

  let query = db
    .select()
    .from(auditLogs)
    .orderBy(asc(auditLogs.created_at))
    .$dynamic();

  const conditions = [];

  if (orgId) {
    conditions.push(eq(auditLogs.org_id, orgId));
  }

  if (fromDate) {
    conditions.push(gte(auditLogs.created_at, fromDate));
  }

  if (conditions.length > 0) {
    query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
  }

  const results = await query;

  return results.map((row) => ({
    id: row.id,
    org_id: row.org_id,
    actor_user_id: row.actor_user_id,
    actor_type: row.actor_type,
    action: row.action,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    sensitivity_level: row.sensitivity_level,
    description: row.description,
    metadata: (row.metadata as Record<string, unknown>) || null,
    actor_ip_address: row.actor_ip_address,
    previous_log_hash: row.previous_log_hash,
    current_log_hash: row.current_log_hash,
    created_at: row.created_at,
  }));
}

// Verify the hash chain
async function verifyHashChain(
  entries: AuditLogEntry[],
  hmacKey: string,
  verbose: boolean
): Promise<VerificationResult> {
  const startTime = Date.now();
  const brokenLinks: BrokenLink[] = [];
  let verifiedCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const prevEntry = i > 0 ? entries[i - 1] : null;

    // Verify hash chain link
    if (prevEntry) {
      if (entry.previous_log_hash !== prevEntry.current_log_hash) {
        brokenLinks.push({
          entry_id: entry.id,
          entry_date: entry.created_at,
          expected_previous_hash: prevEntry.current_log_hash,
          actual_previous_hash: entry.previous_log_hash,
          issue: 'Hash chain broken: previous_log_hash does not match previous entry current_log_hash',
        });
      }
    } else if (entry.previous_log_hash !== null) {
      // First entry should have null previous_log_hash (per org)
      // Only flag if this is truly the first entry for this org
      const isFirstForOrg = !entries.slice(0, i).some((e) => e.org_id === entry.org_id);
      if (isFirstForOrg && entry.previous_log_hash !== null) {
        brokenLinks.push({
          entry_id: entry.id,
          entry_date: entry.created_at,
          expected_previous_hash: 'null',
          actual_previous_hash: entry.previous_log_hash,
          issue: 'First entry for org should have null previous_log_hash',
        });
      }
    }

    // Verify current hash
    const expectedHash = calculateHash(
      {
        id: entry.id,
        org_id: entry.org_id,
        actor_user_id: entry.actor_user_id,
        actor_type: entry.actor_type,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        sensitivity_level: entry.sensitivity_level,
        description: entry.description,
        metadata: entry.metadata,
        actor_ip_address: entry.actor_ip_address,
        previous_log_hash: entry.previous_log_hash,
        created_at: entry.created_at,
      },
      hmacKey
    );

    if (expectedHash !== entry.current_log_hash) {
      brokenLinks.push({
        entry_id: entry.id,
        entry_date: entry.created_at,
        expected_previous_hash: expectedHash,
        actual_previous_hash: entry.current_log_hash,
        issue: 'Content hash mismatch: entry may have been tampered with',
      });
    } else {
      verifiedCount++;
    }

    // Progress logging
    if (verbose && i > 0 && i % 10000 === 0) {
      console.log(`  Verified ${i.toLocaleString()} / ${entries.length.toLocaleString()} entries...`);
    }
  }

  return {
    total_entries: entries.length,
    verified_entries: verifiedCount,
    broken_links: brokenLinks,
    first_entry_date: entries.length > 0 ? entries[0].created_at : null,
    last_entry_date: entries.length > 0 ? entries[entries.length - 1].created_at : null,
    duration_ms: Date.now() - startTime,
    is_valid: brokenLinks.length === 0,
  };
}

// Format result for output
function formatResult(result: VerificationResult): string {
  const lines: string[] = [
    '',
    '═══════════════════════════════════════════════════════════════',
    '           AUDIT LOG INTEGRITY VERIFICATION REPORT             ',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Status: ${result.is_valid ? '✅ VERIFIED' : '❌ INTEGRITY FAILURE'}`,
    '',
    'Summary:',
    `  Total entries:      ${result.total_entries.toLocaleString()}`,
    `  Verified entries:   ${result.verified_entries.toLocaleString()}`,
    `  Broken links:       ${result.broken_links.length}`,
    `  Duration:           ${(result.duration_ms / 1000).toFixed(2)}s`,
    '',
  ];

  if (result.first_entry_date && result.last_entry_date) {
    lines.push('Date Range:');
    lines.push(`  From: ${result.first_entry_date.toISOString()}`);
    lines.push(`  To:   ${result.last_entry_date.toISOString()}`);
    lines.push('');
  }

  if (result.broken_links.length > 0) {
    lines.push('Broken Links (first 10):');
    lines.push('');

    for (const link of result.broken_links.slice(0, 10)) {
      lines.push(`  Entry ID: ${link.entry_id}`);
      lines.push(`  Date:     ${link.entry_date.toISOString()}`);
      lines.push(`  Issue:    ${link.issue}`);
      lines.push('');
    }

    if (result.broken_links.length > 10) {
      lines.push(`  ... and ${result.broken_links.length - 10} more broken links`);
      lines.push('');
    }
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

// Main execution
async function main(): Promise<void> {
  const { orgId, fromDate, verbose } = parseArgs();

  console.log('\n🔍 Audit Log Integrity Verification');
  console.log('────────────────────────────────────');

  if (orgId) console.log(`  Org ID: ${orgId}`);
  if (fromDate) console.log(`  From:   ${fromDate.toISOString()}`);
  console.log('');

  try {
    const hmacKey = getHmacKey();

    console.log('📥 Fetching audit log entries...');
    const entries = await fetchAuditLogs(orgId, fromDate);
    console.log(`  Found ${entries.length.toLocaleString()} entries\n`);

    if (entries.length === 0) {
      console.log('ℹ️  No audit log entries found matching criteria.');
      process.exit(0);
    }

    console.log('🔐 Verifying hash chain integrity...');
    const result = await verifyHashChain(entries, hmacKey, verbose);

    console.log(formatResult(result));

    // Exit with error code if integrity check failed
    if (!result.is_valid) {
      console.error('⚠️  CRITICAL: Audit log integrity check FAILED');
      console.error('   This may indicate data tampering or system malfunction.');
      console.error('   Investigate immediately per incident response procedures.');
      process.exit(1);
    }

    console.log('✅ Audit log integrity verified successfully.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  }
}

main();
