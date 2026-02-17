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
 * Context created for each request
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  const user = await currentUser();

  return {
    db,
    user: user ? {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      orgId: user.publicMetadata?.orgId as string | undefined,
      role: user.publicMetadata?.role as string | undefined,
    } : null,
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
