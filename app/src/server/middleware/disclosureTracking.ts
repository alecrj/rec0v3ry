/**
 * Disclosure Tracking Middleware
 *
 * Automatically creates disclosure records when Part 2 data is accessed.
 * Source: docs/04_COMPLIANCE.md Section 3.2 (Disclosure Tracking)
 */

import { middleware } from '../trpc-init';
import { consentDisclosures } from '../db/schema/compliance';

/**
 * Auto-disclosure tracking middleware
 * Wraps Part 2 procedures and logs data access
 *
 * NOTE: This middleware should be added to part2Procedure in trpc.ts
 * It runs AFTER the procedure completes successfully and logs the access
 */
export const disclosureTrackingMiddleware = middleware(async ({ ctx, next, meta, path }) => {
  // Execute the procedure
  const result = await next({ ctx });

  // After successful execution, log the disclosure
  // Only log if this is a Part 2 data access (indicated by meta)
  const metaResource = (meta as any)?.resource;
  const isPart2Data = metaResource === 'consent' ||
                       metaResource === 'disclosure' ||
                       path.includes('part2');

  if (isPart2Data && ctx.user && result) {
    try {
      // Extract resident ID from the result or context
      // This is a simplified implementation - in production, you'd need to:
      // 1. Parse the result to find affected resident IDs
      // 2. Check if there's an active consent
      // 3. Log each distinct disclosure

      const residentId = (result as any)?.residentId || (result as any)?.resident_id;
      const consentId = (ctx as any)?.consentId; // Set by consentMiddleware

      if (residentId && consentId) {
        // Create disclosure record
        await ctx.db.insert(consentDisclosures).values({
          org_id: (ctx as any).orgId,
          consent_id: consentId,
          resident_id: residentId,
          disclosed_to_name: `${ctx.user.firstName} ${ctx.user.lastName}`,
          disclosed_to_organization: 'Internal Staff',
          disclosure_purpose: 'treatment', // Could be inferred from meta.permission
          information_disclosed: `API Access: ${path}`, // Should be encrypted
          disclosure_method: 'portal',
          disclosed_at: new Date(),
          disclosed_by: ctx.user.id,
        });
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to create disclosure record:', error);
    }
  }

  return result;
});

/**
 * Helper to manually create a disclosure record
 * Use this in procedures that access Part 2 data
 */
export async function logDisclosure(
  db: any,
  params: {
    orgId: string;
    consentId: string;
    residentId: string;
    disclosedToName: string;
    disclosedToOrganization?: string;
    purpose: 'treatment' | 'payment' | 'healthcare_operations' | 'research' | 'audit' | 'court_order' | 'medical_emergency' | 'crime_on_premises' | 'other';
    informationDisclosed: string;
    disclosureMethod: 'email' | 'fax' | 'phone' | 'in_person' | 'portal';
    disclosedBy: string;
    notes?: string;
  }
) {
  await db.insert(consentDisclosures).values({
    org_id: params.orgId,
    consent_id: params.consentId,
    resident_id: params.residentId,
    disclosed_to_name: params.disclosedToName, // Should be encrypted
    disclosed_to_organization: params.disclosedToOrganization || null,
    disclosure_purpose: params.purpose,
    information_disclosed: params.informationDisclosed, // Should be encrypted
    disclosure_method: params.disclosureMethod,
    disclosed_at: new Date(),
    disclosed_by: params.disclosedBy,
    notes: params.notes || null,
  });
}
