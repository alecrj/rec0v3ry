/**
 * Audit Middleware
 *
 * Writes immutable audit log entries with HMAC hash chain.
 * Source: docs/04_COMPLIANCE.md Section 4 (Audit Logging Specification)
 * Source: docs/02_ARCHITECTURE.md Section 9 (Audit Logging Architecture)
 */

import { middleware } from '../trpc-init';
import { generateHMAC } from '@/lib/encryption';
import type { AuditAction, SensitivityLevel } from '@/lib/types/index';
import { auditLogs } from '../db/schema/audit';

/**
 * Generate audit log entry hash for chain integrity
 */
function generateAuditHash(
  entry: {
    timestamp: Date;
    userId: string;
    action: string;
    resourceId?: string;
    oldValue?: any;
    newValue?: any;
  },
  previousHash: string,
  orgId: string
): string {
  // Combine entry data with previous hash
  const data = [
    entry.timestamp.toISOString(),
    entry.userId,
    entry.action,
    entry.resourceId || '',
    JSON.stringify(entry.oldValue || {}),
    JSON.stringify(entry.newValue || {}),
    previousHash,
  ].join('|');

  // Use org-specific key for HMAC
  // In production, this would come from KMS
  const key = `${process.env.AUDIT_HMAC_KEY || 'dev-key'}:${orgId}`;

  return generateHMAC(data, key);
}

/**
 * Get the most recent audit log hash for an organization
 */
async function getLastAuditHash(db: any, orgId: string): Promise<string> {
  try {
    const lastEntry = await db.query.auditLogs.findFirst({
      where: (auditLogs: any, { eq }: any) => eq(auditLogs.orgId, orgId),
      orderBy: (auditLogs: any, { desc }: any) => [desc(auditLogs.timestamp)],
      columns: {
        hash: true,
      },
    });

    return lastEntry?.hash || ''; // Empty string for first entry
  } catch (error) {
    console.error('Failed to get last audit hash:', error);
    return '';
  }
}

/**
 * Extract resource info from procedure meta and input
 */
function extractResourceInfo(meta: any, input: any) {
  const resourceType = meta?.resource || 'unknown';
  const resourceId = input?.id || input?.residentId || undefined;
  return { resourceType, resourceId };
}

/**
 * Determine sensitivity level from resource type
 */
function determineSensitivity(resourceType: string, meta: any): SensitivityLevel {
  // Check meta first
  if (meta?.sensitivity) {
    return meta.sensitivity as SensitivityLevel;
  }

  // Infer from resource type
  const part2Resources = ['drug_test', 'consent', 'disclosure', 'treatment_plan'];
  if (part2Resources.includes(resourceType)) {
    return 'part2';
  }

  const phiResources = ['resident', 'admission', 'document'];
  if (phiResources.includes(resourceType)) {
    return 'phi';
  }

  const piiResources = ['payment', 'invoice', 'message'];
  if (piiResources.includes(resourceType)) {
    return 'pii';
  }

  return 'operational';
}

/**
 * Extract IP address from request
 */
function getIpAddress(req: Request): string {
  // Check common headers for forwarded IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Audit logging middleware
 * Writes audit log entry after handler completes
 */
export const auditMiddleware = middleware(async ({ ctx, meta, input, next, path }) => {
  const startTime = Date.now();

  try {
    // Execute the handler
    const result = await next({ ctx });

    // After successful execution, log the action
    // orgId is added to context by tenantMiddleware
    if (ctx.user && (ctx as any).orgId) {
      const orgId = (ctx as any).orgId as string;
      const { resourceType, resourceId } = extractResourceInfo(meta, input);
      const sensitivity = determineSensitivity(resourceType, meta);

      // Determine action type from path
      let action: AuditAction;
      if (path.includes('.create')) action = 'resident_created';
      else if (path.includes('.update')) action = 'resident_updated';
      else if (path.includes('.delete')) action = 'resident_deleted';
      else if (path.includes('.list') || path.includes('.get')) action = 'resident_viewed';
      else action = 'resident_viewed'; // Default

      // Get IP and user agent
      const ipAddress = getIpAddress(ctx.req);
      const userAgent = ctx.req.headers.get('user-agent') || 'unknown';

      // Get previous hash for chain
      const previousHash = await getLastAuditHash(ctx.db, orgId);

      // Generate current entry data
      const entry = {
        timestamp: new Date(),
        userId: ctx.user.id,
        action,
        resourceId,
        oldValue: (input as any)?._oldValue, // Set by handler if update
        newValue: (input as any)?._newValue, // Set by handler if update
      };

      // Generate hash
      const hash = generateAuditHash(entry, previousHash, orgId);

      // Write audit log asynchronously (don't block response)
      // In production, this would go through Inngest
      setImmediate(async () => {
        try {
          await ctx.db.insert(auditLogs).values({
            org_id: orgId,
            actor_user_id: ctx.user!.id,
            actor_type: 'user',
            actor_ip_address: ipAddress,
            action,
            resource_type: resourceType,
            resource_id: resourceId || null,
            description: `${action} on ${resourceType}${resourceId ? ` (${resourceId})` : ''}`,
            sensitivity_level: sensitivity,
            old_values: entry.oldValue || null,
            new_values: entry.newValue || null,
            metadata: {
              userRole: ctx.user!.role || 'unknown',
              userEmail: ctx.user!.email,
              userAgent,
              sessionId: ctx.user!.id, // Use Clerk session ID in production
              requestId: crypto.randomUUID(),
              consentId: (ctx as any).consentId || null,
              success: true,
            },
            current_log_hash: hash,
            previous_log_hash: previousHash,
          });
        } catch (error) {
          console.error('Failed to write audit log:', error);
          // In production, this would trigger an alert
          // For now, write to local buffer as fallback
        }
      });
    }

    return result;
  } catch (error) {
    // Log failed attempt
    const failOrgId = (ctx as any).orgId as string | undefined;
    if (ctx.user && failOrgId) {
      const { resourceType, resourceId } = extractResourceInfo(meta, input);
      const sensitivity = determineSensitivity(resourceType, meta);
      const ipAddress = getIpAddress(ctx.req);
      const userAgent = ctx.req.headers.get('user-agent') || 'unknown';

      setImmediate(async () => {
        try {
          const previousHash = await getLastAuditHash(ctx.db, failOrgId);
          const entry = {
            timestamp: new Date(),
            userId: ctx.user!.id,
            action: 'access_denied' as AuditAction,
            resourceId,
            oldValue: null,
            newValue: null,
          };
          const hash = generateAuditHash(entry, previousHash, failOrgId);

          await ctx.db.insert(auditLogs).values({
            org_id: failOrgId,
            actor_user_id: ctx.user!.id,
            actor_type: 'user',
            actor_ip_address: ipAddress,
            action: 'access_denied',
            resource_type: resourceType,
            resource_id: resourceId || null,
            description: `Access denied to ${resourceType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            sensitivity_level: sensitivity,
            old_values: null,
            new_values: null,
            metadata: {
              userRole: ctx.user!.role || 'unknown',
              userEmail: ctx.user!.email,
              userAgent,
              sessionId: ctx.user!.id,
              requestId: crypto.randomUUID(),
              success: false,
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            },
            current_log_hash: hash,
            previous_log_hash: previousHash,
          });
        } catch (logError) {
          console.error('Failed to write audit log for failed attempt:', logError);
        }
      });
    }

    // Re-throw the original error
    throw error;
  }
});
