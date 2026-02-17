/**
 * Root App Router
 *
 * Merges all module routers into a single tRPC router.
 * Source: docs/02_ARCHITECTURE.md Section 5 (tRPC API Architecture)
 */

import { router } from '../trpc';
import { consentRouter } from './consent';
import { adminRouter } from './admin';
import { orgRouter } from './org';
import { userRouter } from './user';
import { disclosureRouter } from './disclosure';
import { breachRouter } from './breach';
import { auditRouter } from './audit';
import { breakGlassRouter } from './breakGlass';
import { invoiceRouter } from './invoice';
import { paymentRouter } from './payment';
import { ledgerRouter } from './ledger';
import { rateRouter } from './rate';
import { stripeRouter } from './stripe';
import { payerRouter } from './payer';
import { documentRouter } from './document';
import { esignRouter } from './esign';
import { propertyRouter } from './property';
import { occupancyRouter } from './occupancy';
import { leadRouter } from './lead';
import { admissionRouter } from './admission';
// Sprint 13-14: House Operations
import { choreRouter } from './chore';
import { meetingRouter } from './meeting';
import { passRouter } from './pass';
import { curfewRouter } from './curfew';
import { drugTestRouter } from './drugTest';
import { incidentRouter } from './incident';
import { checkInRouter } from './checkIn';
// Sprint 15-16: Messaging
import { conversationRouter } from './conversation';
import { messageRouter } from './message';
import { announcementRouter } from './announcement';
// Sprint 17-18: Advanced Ops
import { drugTestScheduleRouter } from './drugTestSchedule';
import { maintenanceRouter } from './maintenance';
import { familyPortalRouter } from './familyPortal';
// Sprint 19: Reporting
import { reportingRouter } from './reporting';

/**
 * Main application router
 * All module routers are merged here
 *
 * Note: The old complianceRouter (compliance.ts) was removed.
 * Its functionality is now covered by the standalone routers:
 *   - disclosure (disclosure.ts) — disclosure tracking + accounting
 *   - audit (audit.ts) — audit log queries + chain verification
 *   - breach (breach.ts) — breach incident CRUD
 */
export const appRouter = router({
  consent: consentRouter,
  admin: adminRouter,
  org: orgRouter,
  user: userRouter,
  disclosure: disclosureRouter,
  breach: breachRouter,
  audit: auditRouter,
  breakGlass: breakGlassRouter,
  invoice: invoiceRouter,
  payment: paymentRouter,
  ledger: ledgerRouter,
  rate: rateRouter,
  stripe: stripeRouter,
  payer: payerRouter,
  document: documentRouter,
  esign: esignRouter,
  property: propertyRouter,
  occupancy: occupancyRouter,
  lead: leadRouter,
  admission: admissionRouter,
  // Sprint 13-14: House Operations
  chore: choreRouter,
  meeting: meetingRouter,
  pass: passRouter,
  curfew: curfewRouter,
  drugTest: drugTestRouter,
  incident: incidentRouter,
  checkIn: checkInRouter,
  // Sprint 15-16: Messaging
  conversation: conversationRouter,
  message: messageRouter,
  announcement: announcementRouter,
  // Sprint 17-18: Advanced Ops
  drugTestSchedule: drugTestScheduleRouter,
  maintenance: maintenanceRouter,
  familyPortal: familyPortalRouter,
  // Sprint 19: Reporting
  reporting: reportingRouter,
});

/**
 * Export type definition for use in client
 */
export type AppRouter = typeof appRouter;
