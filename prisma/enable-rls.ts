/**
 * Enable Row-Level Security (RLS) on every table in the public schema.
 *
 * Supabase exposes the `public` schema through PostgREST, so any table without
 * RLS is readable/writable by anyone with the project's anon key. This script
 * enables RLS on all public tables, which denies the `anon`/`authenticated`
 * API roles by default while leaving the app untouched: Prisma connects as the
 * `postgres` table-owner role, which bypasses (non-forced) RLS.
 *
 * It is idempotent and dynamic — re-running is a no-op and future tables are
 * covered automatically. Prisma `db push` does not manage RLS, so this runs as
 * a separate step after the schema is pushed (see the `build` script).
 *
 * Usage:
 *   npx tsx prisma/enable-rls.ts   (or: npm run db:rls)
 */

import { Pool } from 'pg'

// Prefer the direct connection for DDL (more reliable than the pgbouncer pool).
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error('DIRECT_URL / DATABASE_URL not set. Cannot enable RLS.')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  max: 1,
  ssl: { rejectUnauthorized: false },
})

async function enableRls() {
  console.log('=== Enabling Row-Level Security on all public tables ===\n')

  const { rows } = await pool.query<{ tablename: string }>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '\\_prisma%'
      AND tablename NOT LIKE '\\_booking_lead_migration'
    ORDER BY tablename
  `)

  if (rows.length === 0) {
    console.log('No public tables found. Nothing to do.')
    return
  }

  let enabled = 0
  for (const { tablename } of rows) {
    // ENABLE (not FORCE) so the owning `postgres` role used by Prisma still
    // bypasses RLS. ENABLE on an already-enabled table is a no-op.
    await pool.query(`ALTER TABLE public."${tablename}" ENABLE ROW LEVEL SECURITY`)
    enabled++
    console.log(`  RLS enabled: public.${tablename}`)
  }

  console.log(`\nDone. RLS enabled on ${enabled} table(s).`)
}

enableRls()
  .catch((e) => {
    console.error('Failed to enable RLS:', e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
