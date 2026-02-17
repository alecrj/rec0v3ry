/**
 * Drizzle Kit Configuration
 *
 * Used for generating migrations and managing schema changes.
 * See: https://orm.drizzle.team/kit-docs/config-reference
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/server/db/schema',
  out: './src/server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
