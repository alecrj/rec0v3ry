/**
 * Plaid Client
 *
 * Bank account connection for automated expense tracking.
 * Uses lazy Proxy pattern (same as stripe.ts) to avoid build-time crashes.
 *
 * Architecture: docs/11_PRODUCT_RESET_PLAN.md Phase C (Expense Tracking)
 */

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Lazy-initialized Plaid client
let _plaid: PlaidApi | null = null;

function getPlaid(): PlaidApi {
  if (!_plaid) {
    const configuration = new Configuration({
      basePath: process.env.PLAID_ENV === 'production'
        ? PlaidEnvironments.production
        : PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
          'PLAID-SECRET': process.env.PLAID_SECRET!,
        },
      },
    });
    _plaid = new PlaidApi(configuration);
  }
  return _plaid;
}

// Proxy for lazy access — same pattern as db/client.ts and stripe.ts
export const plaidClient = new Proxy({} as PlaidApi, {
  get(_target, prop, receiver) {
    return Reflect.get(getPlaid(), prop, receiver);
  },
});
