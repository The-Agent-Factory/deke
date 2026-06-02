-- Enable Row-Level Security (RLS) on every table in the public schema.
--
-- WHY THIS EXISTS
-- ---------------
-- Supabase auto-generates a REST/GraphQL API (PostgREST) over the `public`
-- schema. Any table there is reachable by the `anon` / `authenticated` roles
-- by anyone holding the project's anon key + URL. The Supabase security linter
-- (`rls_disabled_in_public`) flags every table that does not have RLS enabled.
--
-- This app accesses the database ONLY through Prisma, connecting as the
-- privileged `postgres` role. Enabling RLS *without* policies denies the
-- PostgREST `anon`/`authenticated` roles by default, while the table owner
-- (`postgres`, used by Prisma) bypasses RLS — so the application is unaffected.
--
-- We intentionally do NOT use FORCE ROW LEVEL SECURITY, which would also
-- restrict the owning role and break Prisma.
--
-- This block is idempotent and dynamic: it covers every current and future
-- table in `public` (ENABLE on an already-enabled table is a no-op), so new
-- Prisma models are protected automatically. Prisma `db push` does not manage
-- RLS, which is why this runs as a separate step after the schema is pushed.
--
-- Run manually in the Supabase SQL editor, or via `npm run db:rls`.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '\_prisma%'
      AND tablename NOT LIKE '\_booking_lead_migration'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    RAISE NOTICE 'RLS enabled on public.%', r.tablename;
  END LOOP;
END $$;
