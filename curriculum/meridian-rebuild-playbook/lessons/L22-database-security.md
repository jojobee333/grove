# L22 — Database Security Layer: RLS Verification and Access Control

**Module**: M09 — Security Hardening  
**Type**: Core  
**Estimated time**: 25 minutes

---

## Security Is Not a Feature, It's a Layer

Security hardening is not a final step — it is verification that the security architecture was built correctly throughout. For the database layer, this means:

1. **Verifying RLS is active** on all workspace-scoped tables
2. **Verifying the app DB user cannot bypass RLS**
3. **Verifying FK constraints and CHECK constraints are enforced**
4. **Running adversarial queries** to prove cross-tenant access is blocked

---

## Verifying RLS Coverage

```sql
-- Check which tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected output — every workspace-scoped table should have `rowsecurity = true`:

```
tablename          | rowsecurity
-------------------+------------
audit_log          | true
block_versions     | true
blocks             | true
memory_graph       | true
pages              | true
user_memory        | true
workspace_members  | true
workspaces         | false  -- Workspaces are not scoped to themselves
users              | false  -- User records are not workspace-scoped
```

Any `false` value on a workspace-scoped table is a vulnerability.

---

## Verifying Policies Exist

```sql
-- List all RLS policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Verify that each workspace-scoped table has a `workspace_isolation` policy with `AS RESTRICTIVE`.

---

## The Adversarial Query Test

This test should be part of the automated test suite:

```typescript
// test/security/rls.test.ts
import { db } from '../../server/src/db'
import { sql } from 'drizzle-orm'
import { describe, it, expect, beforeAll } from 'vitest'

describe('RLS Workspace Isolation', () => {
  const workspaceA = '11111111-1111-1111-1111-111111111111'
  const workspaceB = '22222222-2222-2222-2222-222222222222'

  beforeAll(async () => {
    // Seed two workspaces and a page in workspace A
    // (test setup omitted for brevity)
  })

  it('should not return pages from workspace A when context is set to workspace B', async () => {
    // Set context to workspace B
    await db.execute(sql`
      SELECT set_config('app.current_workspace_id', ${workspaceB}, true)
    `)

    const pages = await db.execute(sql`
      SELECT * FROM pages WHERE workspace_id = ${workspaceA}
    `)

    // RLS should filter this to 0 rows
    expect(pages.rows).toHaveLength(0)
  })

  it('should return pages from workspace B when context is set to workspace B', async () => {
    await db.execute(sql`
      SELECT set_config('app.current_workspace_id', ${workspaceB}, true)
    `)

    const pages = await db.execute(sql`
      SELECT * FROM pages WHERE workspace_id = ${workspaceB}
    `)

    expect(pages.rows.length).toBeGreaterThan(0)
  })
})
```

---

## Verifying the App User Cannot Bypass RLS

```sql
-- Check that the app user does not have superuser or bypassrls
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles
WHERE rolname = 'meridian_app';

-- Expected output:
--  rolname     | rolsuper | rolbypassrls
-- -------------+----------+--------------
--  meridian_app | f        | f
```

Both must be `f` (false). If either is `true`, RLS is bypassed for that role.

---

## Principle of Least Privilege for the App User

```sql
-- The app user should have exactly these permissions
GRANT CONNECT ON DATABASE meridian TO meridian_app;
GRANT USAGE ON SCHEMA public TO meridian_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO meridian_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO meridian_app;

-- The app user should NOT have:
-- GRANT SUPERUSER TO meridian_app;  -- Never
-- GRANT BYPASSRLS TO meridian_app;  -- Never
-- GRANT CREATE ON SCHEMA public TO meridian_app;  -- Only needed for migrations
```

Schema migrations should be run by a separate, elevated DB user (or the `postgres` superuser) — not the application user.

---

## Checking for Unindexed Foreign Keys

Unindexed foreign keys cause performance problems (full scans on FK lookups) and can cause lock contention on deletes:

```sql
-- Find foreign keys without a supporting index
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND NOT EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE tablename = tc.table_name
  AND indexdef LIKE '%' || kcu.column_name || '%'
);
```

Every FK column (e.g., `workspace_id`, `user_id`, `page_id`) should have a supporting index.

---

## Key Points

- Run `pg_tables` to verify `rowsecurity = true` on all workspace-scoped tables.
- Run adversarial queries in the test suite: set context to workspace B, query workspace A's data, expect 0 rows.
- The app DB user must have `rolsuper = f` and `rolbypassrls = f` — verify this in CI.
- Schema migrations must be run by a separate, elevated role — not the application user.
- Unindexed foreign key columns cause lock contention and performance issues — audit them.
