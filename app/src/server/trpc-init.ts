/**
 * tRPC Base Initialization
 *
 * Initializes tRPC, creates context, and exports base helpers.
 * Middleware files import from here (not trpc.ts) to avoid circular deps.
 *
 * Architecture: docs/02_ARCHITECTURE.md Section 5
 */

import { initTRPC } from '@trpc/server';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { currentUser } from '@clerk/nextjs/server';
import { db } from './db/client';

/**
 * User context available in all procedures
 */
export interface UserContext {
  /** Database user ID (UUID) - use this for created_by, updated_by, etc. */
  id: string;
  /** Clerk user ID - use for Clerk API calls only */
  clerkId: string;
  /** User email */
  email: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Organization ID */
  orgId: string | undefined;
  /** User role in the organization */
  role: string | undefined;
  /** Scope type (organization, property, house, resident) */
  scopeType: string | undefined;
  /** Scope ID */
  scopeId: string | undefined;
}

/**
 * Context created for each request
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  const clerkUser = await currentUser();

  let user: UserContext | null = null;

  if (clerkUser) {
    // Extract metadata set by setup-user API
    const metadata = clerkUser.publicMetadata as {
      dbUserId?: string;
      orgId?: string;
      role?: string;
      scopeType?: string;
      scopeId?: string;
    };

    user = {
      // Use DB user ID if available, fallback to Clerk ID (for backward compat)
      id: metadata.dbUserId || clerkUser.id,
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
      orgId: metadata.orgId,
      role: metadata.role,
      scopeType: metadata.scopeType,
      scopeId: metadata.scopeId,
    };
  }

  return {
    db,
    user,
    req: opts.req,
    resHeaders: opts.resHeaders,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialize tRPC with context type and superjson for Date serialization
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Base helpers — imported by middleware files
 */
export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;
export const mergeRouters = t.mergeRouters;
