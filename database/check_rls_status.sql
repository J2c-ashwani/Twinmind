-- Run in Supabase SQL Editor after migrations.
-- This checks both launch blockers:
-- 1. public app tables with RLS still disabled
-- 2. public app tables with RLS enabled but zero policies

SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relrowsecurity ASC, c.relname ASC;

-- Tables returned here still have RLS disabled.
SELECT
    n.nspname AS schema_name,
    c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname ASC;

-- Tables returned here have RLS enabled but no policies.
-- This is secure by default, but it can break app reads/writes.
SELECT
    schemaname AS schema_name,
    tablename AS table_name
FROM pg_tables t
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = t.schemaname
        AND p.tablename = t.tablename
  )
ORDER BY tablename ASC;

-- Full policy inventory for review.
SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    policyname AS policy_name,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename ASC, policyname ASC;
