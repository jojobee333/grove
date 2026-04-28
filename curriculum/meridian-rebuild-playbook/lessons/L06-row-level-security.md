# L06 — Row-Level Security: Tenant Isolation at the Database Layer

**Module**: M03 — Database Architecture  
**Type**: Core  
**Estimated time**: 30 minutes

---

## Why RLS, Not Query Filters

Query-filter isolation looks like this:

```sql
-- Developer A remembers the filter
SELECT * FROM pages WHERE workspace_id = $1 AND id = $2;

-- Developer B forgets the filter (a bug)
SELECT * FROM pages WHERE id = $2;
-- Returns a page from ANY workspace
```

In a multi-tenant system with many developers and many queries, this approach fails eventually. RLS is the alternative: enforce the filter at the database storage engine level, below any application code.

---

## How RLS Works in Meridian

The pattern has three parts:

1. **Schema**: Set `app.current_workspace_id` in the session context before running queries
2. **Middleware**: The tenant middleware (`requireWorkspace`) sets this value per-request
3. **Policy**: The RLS policy reads this value and restricts rows accordingly

### Part 1: Enable RLS on a Table

```sql
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
```

Enabling RLS without creating a policy denies all access by default (for non-superusers). A policy must be created explicitly.

### Part 2: Create the Workspace Isolation Policy

```sql
CREATE POLICY workspace_isolation ON pages
  AS RESTRICTIVE
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
```

- `AS RESTRICTIVE` — This policy is additive with other policies in a restricting way. Even if a permissive policy allows access, this restrictive policy can deny it. Use `RESTRICTIVE` for security policies.
- `current_setting('app.current_workspace_id', true)` — reads the session-level configuration variable. The second argument (`true`) means "return NULL if the variable is not set" rather than throwing an error.

### Part 3: Set the Context Variable in the Tenant Middleware

```typescript
// server/src/middleware/tenant.ts
await client.query('SELECT set_config($1, $2, true)', [
  'app.current_workspace_id',
  workspaceId
])
```

The third argument (`true`) means `SET LOCAL` — the variable is only set for the current transaction, not the entire session. This is critical: if the connection is returned to the pool after the request, the next request using that connection does not inherit the previous workspace context.

---

## Applying RLS to All Workspace-Scoped Tables

Every table that has a `workspace_id` column needs RLS enabled and the policy created. In Meridian, that is: `pages`, `blocks`, `block_versions`, `workspace_members`, `user_memory`, `memory_graph`, `audit_log`.

```sql
-- Apply to all workspace-scoped tables
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_graph ENABLE ROW LEVEL SECURITY;

-- workspace_isolation policy for each table
CREATE POLICY workspace_isolation ON pages
  AS RESTRICTIVE
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);

CREATE POLICY workspace_isolation ON blocks
  AS RESTRICTIVE
  USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid);

-- ... and so on for each table
```

For `memory_graph`, the `workspace_id` is propagated through the joined `user_memory` rows. An alternative is to add a direct `workspace_id` column on `memory_graph` for simpler RLS — which Meridian does.

---

## Critical Security Rule: BYPASSRLS Must Never Be Granted

PostgreSQL superusers and roles with `BYPASSRLS` bypass all RLS policies. The application database user must never hold either.

```sql
-- Verify the app user does NOT have BYPASSRLS
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'meridian_app';
-- rolbypassrls should be false
```

During development, PostgreSQL is often run as the `postgres` superuser. This means RLS is bypassed in development! To test RLS correctly, create a non-superuser role:

```sql
CREATE ROLE meridian_app LOGIN PASSWORD 'app_password';
GRANT CONNECT ON DATABASE meridian TO meridian_app;
GRANT USAGE ON SCHEMA public TO meridian_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO meridian_app;
-- Do NOT grant SUPERUSER or BYPASSRLS
```

Then use `meridian_app`'s credentials in the application's `DATABASE_URL`.

---

## Testing That RLS Actually Works

After setting up RLS, verify it with a direct SQL test:

```sql
-- Create two workspaces and a page in workspace A
INSERT INTO workspaces (id, name, slug, owner_user_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Workspace A', 'workspace-a', '<user_id>'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Workspace B', 'workspace-b', '<user_id>');

INSERT INTO pages (workspace_id, creator_user_id, title) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '<user_id>', 'Secret Page A');

-- Set the context to workspace B
SELECT set_config('app.current_workspace_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

-- This should return 0 rows (RLS blocks the cross-tenant read)
SELECT * FROM pages;
```

If `SELECT * FROM pages` returns any rows while the context is set to workspace B, RLS is not working correctly. Verify that: (a) RLS is enabled on the table, (b) the policy is `RESTRICTIVE`, (c) the user is not a superuser.

---

## FK Constraints Bypass RLS — Expected Behavior

PostgreSQL FK constraint checks bypass RLS intentionally. When you insert a block with `workspace_id = X`, the FK check against `workspaces(id)` bypasses RLS to verify the workspace exists. This is documented behavior, not a vulnerability. It does not expose workspace data — it only verifies the FK target exists.

---

## Key Points

- RLS enforces tenant isolation below the application layer — application bugs that omit WHERE clauses still get the correct result.
- Use `AS RESTRICTIVE` for security policies. `AS PERMISSIVE` is the default and additive; a restrictive policy can deny access that permissive policies would allow.
- `set_config('app.current_workspace_id', workspaceId, true)` — the third argument (`true`) means SET LOCAL, scoped to the current transaction only.
- Enable RLS on ALL workspace-scoped tables: pages, blocks, block_versions, workspace_members, user_memory, memory_graph, audit_log.
- The app DB user must never have SUPERUSER or BYPASSRLS.
- Test RLS by setting the context to workspace B and verifying workspace A's data is not returned.
