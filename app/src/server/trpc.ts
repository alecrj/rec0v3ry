/**
 * tRPC Procedures
 *
 * Composes middleware into reusable procedure chains.
 * Re-exports base helpers from trpc-init.ts for convenience.
 *
 * Architecture: docs/02_ARCHITECTURE.md Section 5
 */

// Re-export base helpers so routers can import from './trpc'
export {
  createContext,
  router,
  middleware,
  publicProcedure,
  mergeRouters,
  type Context,
} from './trpc-init';

import { publicProcedure } from './trpc-init';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { rbacMiddleware } from './middleware/rbac';
import { consentMiddleware } from './middleware/consent';
import { auditMiddleware } from './middleware/audit';
import { redisclosureMiddleware } from './middleware/redisclosure';

/**
 * Base procedure: auth + tenant + audit
 * Applies to all authenticated endpoints
 */
export const baseProcedure = publicProcedure
  .use(authMiddleware)
  .use(tenantMiddleware)
  .use(auditMiddleware);

/**
 * Protected procedure: base + RBAC
 * Use for: standard authenticated endpoints with permission checks
 */
export const protectedProcedure = baseProcedure
  .use(rbacMiddleware);

/**
 * Part 2 procedure: protected + consent + redisclosure
 * Use for: endpoints accessing 42 CFR Part 2 protected SUD data
 */
export const part2Procedure = protectedProcedure
  .use(consentMiddleware)
  .use(redisclosureMiddleware);
