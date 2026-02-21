/**
 * RBAC Middleware
 *
 * Role-based access control with 9-role permission matrix.
 * Source: docs/04_COMPLIANCE.md Section 6 (Access Control & RBAC)
 */

import { TRPCError } from '@trpc/server';
import { middleware } from '../trpc-init';
import type { UserRole, PermissionAction, ResourceType } from '@/lib/types/index';
import { ForbiddenError } from '@/lib/errors';

/**
 * Permission definition
 */
interface Permission {
  action: PermissionAction;
  resource: ResourceType;
}

/**
 * RBAC Permission Matrix
 * Source: docs/04_COMPLIANCE.md Section 6.2
 *
 * Format: role -> resource -> allowed actions
 */
const PERMISSION_MATRIX: Record<
  UserRole,
  Partial<Record<ResourceType, PermissionAction[]>>
> = {
  platform_admin: {
    // System-wide access, but NO PHI/Part 2 access
    org: ['read'],
    property: ['read'],
    house: ['read'],
    user: ['create', 'read', 'update', 'delete'],
    audit_log: ['read', 'export'],
  },

  org_owner: {
    // Full org access
    org: ['read', 'update'],
    property: ['create', 'read', 'update', 'delete'],
    house: ['create', 'read', 'update', 'delete'],
    resident: ['create', 'read', 'update', 'delete', 'export'],
    bed: ['create', 'read', 'update', 'delete'],
    admission: ['create', 'read', 'update', 'delete'],
    invoice: ['create', 'read', 'update', 'delete', 'export'],
    payment: ['create', 'read', 'update', 'delete', 'export'],
    ledger: ['read', 'export'],
    report: ['read', 'export'],
    chore: ['create', 'read', 'update', 'delete'],
    meeting: ['create', 'read', 'update', 'delete'],
    pass: ['create', 'read', 'update', 'delete'],
    drug_test: ['create', 'read', 'update', 'delete'], // Consent-gated
    incident: ['create', 'read', 'update', 'delete'],
    document: ['create', 'read', 'update', 'delete', 'print', 'export'],
    message: ['create', 'read', 'update', 'delete'],
    consent: ['create', 'read', 'update'], // Cannot delete consents
    disclosure: ['read', 'export'],
    audit_log: ['read'],
    user: ['create', 'read', 'update', 'delete'],
  },

  org_admin: {
    // Org-level admin, limited billing access
    org: ['read', 'update'],
    property: ['create', 'read', 'update', 'delete'],
    house: ['create', 'read', 'update', 'delete'],
    resident: ['create', 'read', 'update', 'delete', 'export'],
    bed: ['create', 'read', 'update', 'delete'],
    admission: ['create', 'read', 'update', 'delete'],
    invoice: ['read', 'export'],
    payment: ['read', 'export'],
    ledger: ['read'],
    report: ['read', 'export'],
    chore: ['create', 'read', 'update', 'delete'],
    meeting: ['create', 'read', 'update', 'delete'],
    pass: ['create', 'read', 'update', 'delete'],
    drug_test: ['create', 'read', 'update', 'delete'], // Consent-gated
    incident: ['create', 'read', 'update', 'delete'],
    document: ['create', 'read', 'update', 'delete', 'print', 'export'],
    message: ['create', 'read', 'update', 'delete'],
    consent: ['create', 'read', 'update'],
    disclosure: ['read', 'export'],
    user: ['create', 'read', 'update'],
  },

  property_manager: {
    // Full CRUD on assigned properties
    property: ['read', 'update'],
    house: ['create', 'read', 'update', 'delete'],
    resident: ['create', 'read', 'update', 'delete', 'export'],
    bed: ['create', 'read', 'update', 'delete'],
    admission: ['create', 'read', 'update', 'delete'],
    invoice: ['create', 'read', 'update', 'export'],
    payment: ['create', 'read', 'update', 'export'],
    ledger: ['read'],
    report: ['read'],
    chore: ['create', 'read', 'update', 'delete'],
    meeting: ['create', 'read', 'update', 'delete'],
    pass: ['create', 'read', 'update', 'delete'],
    drug_test: ['create', 'read', 'update', 'delete'], // Consent-gated
    incident: ['create', 'read', 'update', 'delete'],
    document: ['create', 'read', 'update', 'delete', 'print'],
    message: ['create', 'read', 'update'],
    consent: ['create', 'read', 'update'],
    disclosure: ['read'],
  },

  house_manager: {
    // Full CRUD on assigned houses
    house: ['read', 'update'],
    resident: ['create', 'read', 'update', 'delete', 'export'],
    bed: ['create', 'read', 'update', 'delete'],
    admission: ['create', 'read', 'update', 'delete'],
    invoice: ['create', 'read', 'update'],
    payment: ['create', 'read', 'update'],
    ledger: ['read'],
    report: ['read'],
    chore: ['create', 'read', 'update', 'delete'],
    meeting: ['create', 'read', 'update', 'delete'],
    pass: ['create', 'read', 'update', 'delete'],
    drug_test: ['create', 'read', 'update', 'delete'], // Consent-gated
    incident: ['create', 'read', 'update', 'delete'],
    document: ['create', 'read', 'update', 'print'],
    message: ['create', 'read', 'update'],
    consent: ['create', 'read', 'update'],
    disclosure: ['read'],
  },

  staff: {
    // Limited operational role
    house: ['read'],
    resident: ['read'], // Limited fields only
    bed: ['read'],
    chore: ['read', 'update'], // Can mark own chores complete
    meeting: ['read', 'update'], // Can mark attendance
    pass: ['read'],
    incident: ['create', 'read'], // Can report incidents
    message: ['create', 'read'],
  },

  resident: {
    // Own records only
    resident: ['read'], // Own record
    invoice: ['read'], // Own invoices
    payment: ['create', 'read'], // Can make payments
    chore: ['read', 'update'], // Own chores
    meeting: ['read'], // Own meetings
    pass: ['create', 'read'], // Can request passes
    document: ['read'], // Own documents
    message: ['create', 'read'], // Own messages
    consent: ['read', 'update'], // Can revoke own consents
    disclosure: ['read'], // Can request accounting
  },

  family_member: {
    // Consent-gated access to designated resident
    resident: ['read'], // Consent-gated
    invoice: ['read'], // Consent-gated
    payment: ['read'], // Consent-gated
    document: ['read'], // Consent-gated
    message: ['create', 'read'], // Consent-gated
  },

  referral_partner: {
    // Consent-gated access to referred residents
    resident: ['read'], // Consent-gated, limited fields
    admission: ['read'], // Status of referrals
    document: ['read'], // Consent-gated
  },
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  action: PermissionAction,
  resource: ResourceType
): boolean {
  const rolePermissions = PERMISSION_MATRIX[role];
  if (!rolePermissions) {
    return false;
  }

  const resourceActions = rolePermissions[resource];
  if (!resourceActions) {
    return false;
  }

  return resourceActions.includes(action);
}

/**
 * Require a specific permission
 * Throws ForbiddenError if user lacks permission
 */
export function requirePermission(
  role: UserRole,
  action: PermissionAction,
  resource: ResourceType
): void {
  if (!hasPermission(role, action, resource)) {
    throw new ForbiddenError(
      `Role '${role}' does not have permission to ${action} ${resource}`,
      { requiredPermission: `${action}:${resource}`, userRole: role }
    );
  }
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  const rolePermissions = PERMISSION_MATRIX[role];
  if (!rolePermissions) {
    return [];
  }

  const permissions: Permission[] = [];
  for (const [resource, actions] of Object.entries(rolePermissions)) {
    for (const action of actions) {
      permissions.push({
        action,
        resource: resource as ResourceType,
      });
    }
  }

  return permissions;
}

/**
 * RBAC Middleware
 * Checks if user has permission for the current operation
 *
 * Usage in router:
 * .meta({ permission: "resident:read" })
 */
export const rbacMiddleware = middleware(async ({ ctx, meta, next }) => {
  // Extract permission from meta
  const permission = (meta as Record<string, unknown> | undefined)?.permission as string | undefined;

  if (!permission) {
    // No permission specified - allow (for endpoints that handle RBAC internally)
    return next({ ctx });
  }

  // Parse permission string: "resource:action"
  const [resource, action] = permission.split(':') as [ResourceType, PermissionAction];

  if (!resource || !action) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Invalid permission format in endpoint meta',
    });
  }

  // Get user role
  const userRole = ctx.user?.role as UserRole | undefined;

  if (!userRole) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User role not assigned',
    });
  }

  // Check permission
  if (!hasPermission(userRole, action, resource)) {
    throw new ForbiddenError(
      `Insufficient permissions to ${action} ${resource}`,
      {
        requiredPermission: permission,
        userRole,
      }
    );
  }

  // Permission granted - continue
  return next({
    ctx: {
      ...ctx,
      permission: { action, resource },
    },
  });
});

/**
 * Export permission checking utilities
 */
export { hasPermission as checkPermission };
