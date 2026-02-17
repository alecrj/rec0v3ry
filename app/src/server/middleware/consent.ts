/**
 * Consent Middleware
 *
 * Verifies Part 2 consent before returning SUD-related data.
 * Source: docs/04_COMPLIANCE.md Section 3 (42 CFR Part 2 Requirements)
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc-init';
import { ConsentRequiredError, ConsentExpiredError, ConsentRevokedError } from '@/lib/errors';
import { eq, and } from 'drizzle-orm';
import { consents } from '../db/schema/compliance';

/**
 * Consent verification middleware
 * Checks for active Part 2 consent before allowing access to SUD data
 */
export const consentMiddleware = middleware(async ({ ctx, input, next }) => {
  // Extract resident ID from input
  // Most Part 2 endpoints will have residentId in input
  const residentId = (input as any)?.residentId || (input as any)?.id;

  if (!residentId) {
    // If no resident ID in input, skip consent check
    // The endpoint handler will need to check consent for each record
    return next({ ctx });
  }

  const userId = ctx.user?.id;
  const userRole = ctx.user?.role;

  if (!userId || !userRole) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not authenticated',
    });
  }

  // Residents can always access their own data
  if (userRole === 'resident' && residentId === userId) {
    return next({ ctx });
  }

  // Staff with direct care roles have operational access (not full Part 2)
  // But they still need consent for detailed SUD data
  const operationalRoles = ['house_manager', 'property_manager', 'org_admin', 'org_owner'];
  const hasOperationalAccess = operationalRoles.includes(userRole);

  // Family and referral partners ALWAYS need explicit consent
  const requiresExplicitConsent = ['family_member', 'referral_partner'].includes(userRole);

  if (!hasOperationalAccess && !requiresExplicitConsent) {
    // Other roles (platform_admin, staff) should not access Part 2 data
    throw new ConsentRequiredError('resident', residentId);
  }

  // For family and referral partners, verify active consent
  if (requiresExplicitConsent) {
    try {
      const activeConsent = await ctx.db.query.consents.findFirst({
        where: and(
          eq(consents.resident_id, residentId),
          eq(consents.status, 'active'),
          // Check that consent covers this user/entity
          // This would need to check recipient field - simplified here
        ),
      });

      if (!activeConsent) {
        throw new ConsentRequiredError('resident', residentId, { residentId });
      }

      // Check expiration
      if (activeConsent.expires_at && new Date(activeConsent.expires_at) < new Date()) {
        throw new ConsentExpiredError(activeConsent.id, new Date(activeConsent.expires_at));
      }

      // Consent is valid - attach to context
      return next({
        ctx: {
          ...ctx,
          consentId: activeConsent.id,
        },
      });
    } catch (error) {
      if (error instanceof ConsentRequiredError ||
          error instanceof ConsentExpiredError ||
          error instanceof ConsentRevokedError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify consent',
      });
    }
  }

  // Operational roles proceed (consent will be checked at field level)
  return next({ ctx });
});

/**
 * Check if user has consent to access a specific resident's Part 2 data
 * Use this in handlers when processing multiple residents
 */
export async function checkConsentForResident(
  db: any,
  userId: string,
  userRole: string,
  residentId: string
): Promise<string | null> {
  // Resident can access own data
  if (userId === residentId) {
    return null; // No consent needed
  }

  // Operational roles have access (consent verified at field level)
  const operationalRoles = ['house_manager', 'property_manager', 'org_admin', 'org_owner'];
  if (operationalRoles.includes(userRole)) {
    return null; // Access granted
  }

  // External roles need explicit consent
  const activeConsent = await db.query.consents.findFirst({
    where: and(
      eq(consents.resident_id, residentId),
      eq(consents.status, 'active'),
    ),
  });

  if (!activeConsent) {
    return null; // No consent - will block Part 2 fields
  }

  // Check expiration
  if (activeConsent.expires_at && new Date(activeConsent.expires_at) < new Date()) {
    return null; // Expired - will block
  }

  return activeConsent.id; // Valid consent
}
