/**
 * Database Client
 *
 * Drizzle ORM connection to PostgreSQL (Neon).
 * Source: docs/02_ARCHITECTURE.md Section 2 (Tech Stack)
 */

import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

/**
 * Lazy-initialized database connection.
 * Avoids connecting at module load time (which breaks next build).
 */
let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const sql = neon(connectionString);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

/**
 * Convenience export — calls getDb() on access.
 * Use getDb() directly in contexts where lazy init matters.
 */
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

/**
 * Type export for use in context
 */
export type Database = NeonHttpDatabase<typeof schema>;
