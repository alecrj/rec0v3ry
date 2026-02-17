/**
 * Error Handling Utilities
 *
 * Typed error classes for structured error handling across the application.
 * Source: docs/02_ARCHITECTURE.md Section 5 (Error Handling)
 */

import { TRPCError } from '@trpc/server';
import { ErrorCode } from './types/index';

/**
 * Base application error with structured data
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(resourceType: string, resourceId?: string) {
    super(
      ErrorCode.NOT_FOUND,
      `${resourceType}${resourceId ? ` with ID ${resourceId}` : ''} not found`,
      { resourceType, resourceId }
    );
    this.name = 'NotFoundError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'NOT_FOUND',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Unauthorized error - no valid session
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message);
    this.name = 'UnauthorizedError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'UNAUTHORIZED',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Forbidden error - valid session but insufficient permissions
 */
export class ForbiddenError extends AppError {
  constructor(
    message = 'Insufficient permissions',
    data?: { requiredPermission?: string; userRole?: string }
  ) {
    super(ErrorCode.FORBIDDEN, message, data);
    this.name = 'ForbiddenError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Consent required error - Part 2 data access requires consent
 */
export class ConsentRequiredError extends AppError {
  constructor(
    resourceType: string,
    resourceId: string,
    data?: { residentId?: string }
  ) {
    super(
      ErrorCode.CONSENT_REQUIRED,
      `Active Part 2 consent required to access ${resourceType}`,
      { resourceType, resourceId, ...data }
    );
    this.name = 'ConsentRequiredError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Consent expired error
 */
export class ConsentExpiredError extends AppError {
  constructor(consentId: string, expirationDate: Date) {
    super(
      ErrorCode.CONSENT_EXPIRED,
      'Consent has expired',
      { consentId, expirationDate: expirationDate.toISOString() }
    );
    this.name = 'ConsentExpiredError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Consent revoked error
 */
export class ConsentRevokedError extends AppError {
  constructor(consentId: string, revokedAt: Date) {
    super(
      ErrorCode.CONSENT_REVOKED,
      'Consent has been revoked',
      { consentId, revokedAt: revokedAt.toISOString() }
    );
    this.name = 'ConsentRevokedError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Tenant mismatch error - cross-org access attempt
 */
export class TenantMismatchError extends AppError {
  constructor(userOrgId: string, resourceOrgId: string) {
    super(
      ErrorCode.TENANT_MISMATCH,
      'Resource belongs to different organization',
      { userOrgId, resourceOrgId }
    );
    this.name = 'TenantMismatchError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'FORBIDDEN',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Invalid input error
 */
export class InvalidInputError extends AppError {
  constructor(message: string, data?: Record<string, unknown>) {
    super(ErrorCode.INVALID_INPUT, message, data);
    this.name = 'InvalidInputError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Conflict error - duplicate or state conflict
 */
export class ConflictError extends AppError {
  constructor(message: string, data?: Record<string, unknown>) {
    super(ErrorCode.CONFLICT, message, data);
    this.name = 'ConflictError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'CONFLICT',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { retryAfter }
    );
    this.name = 'RateLimitError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: this.message,
      cause: this,
    });
  }
}

/**
 * Internal server error
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error', data?: Record<string, unknown>) {
    super(ErrorCode.INTERNAL_ERROR, message, data);
    this.name = 'InternalError';
  }

  toTRPCError(): TRPCError {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      cause: this,
    });
  }
}

/**
 * Convert any error to a TRPC error
 */
export function toTRPCError(error: unknown): TRPCError {
  // Check if error is one of our typed error classes with toTRPCError method
  if (
    error instanceof NotFoundError ||
    error instanceof UnauthorizedError ||
    error instanceof ForbiddenError ||
    error instanceof ConsentRequiredError ||
    error instanceof ConsentExpiredError ||
    error instanceof ConsentRevokedError ||
    error instanceof TenantMismatchError ||
    error instanceof InvalidInputError ||
    error instanceof ConflictError ||
    error instanceof RateLimitError ||
    error instanceof InternalError
  ) {
    return error.toTRPCError();
  }

  if (error instanceof TRPCError) {
    return error;
  }

  // Unknown error - log it but don't expose details
  console.error('Unexpected error:', error);

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}
