# L12 — Tenant Middleware: Establishing the RLS Context

**Module**: M05 — Server Architecture  
**Type**: Applied  
**Estimated time**: 25 minutes

---

## What `requireWorkspace` Does

The tenant middleware (`requireWorkspace`) bridges the authentication layer and the database layer:

1. **Validates** that the `workspaceId` route param is a valid UUID
2. **Verifies** that the authenticated user has an active membership in that workspace
3. **Sets** the PostgreSQL session variable `app.current_workspace_id` (activating RLS)
4. **Attaches** `req.workspace = { id, role }` for downstream handlers

Without this middleware, a handler would need to do all four of these steps itself — in every handler. With it, any handler behind `requireWorkspace` can assume `req.workspace` is populated and RLS is active.

---

## The Complete Implementation

```typescript
// server/src/middleware/tenant.ts
import type { RequestHandler } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { getClient } from '../db/pool'  // Raw pg client for SET LOCAL
import { workspace_members } from '../db/schema'
import { and, eq } from 'drizzle-orm'

const workspaceIdSchema = z.object({
  workspaceId: z.string().uuid()
})

export const requireWorkspace: RequestHandler = async (req, res, next) => {
  // 1. Validate the route param
  const parsed = workspaceIdSchema.safeParse(req.params)
  if (!parsed.success) {
    next(new Error('WORKSPACE_ACCESS_DENIED'))
    return
  }

  const { workspaceId } = parsed.data

  // 2. Verify the authenticated user has membership
  const membership = await db.query.workspace_members.findFirst({
    where: and(
      eq(workspace_members.workspace_id, workspaceId),
      eq(workspace_members.user_id, req.user!.id)
    )
  })

  if (!membership) {
    next(new Error('WORKSPACE_ACCESS_DENIED'))
    return
  }

  // 3. Set the RLS context for this transaction
  //    SET LOCAL scopes the variable to the current transaction only
  await db.execute(
    sql`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`
  )

  // 4. Attach workspace context for handlers
  req.workspace = {
    id: workspaceId,
    role: membership.role
  }

  next()
}
```

---

## Understanding `SET LOCAL` vs `SET`

The third argument to `set_config()` controls scope:

```sql
-- SET (false): variable persists for the entire connection/session
SELECT set_config('app.current_workspace_id', 'xxx', false);

-- SET LOCAL (true): variable is reset when the current transaction ends
SELECT set_config('app.current_workspace_id', 'xxx', true);
```

Meridian always uses `true` (SET LOCAL). Here's why this matters:

Express uses a PostgreSQL connection pool. A connection handles request A (workspace X), then is returned to the pool. When request B picks up that connection, if `SET` was used, request B would inherit workspace X's context — a data isolation violation.

With `SET LOCAL`, the workspace context is cleared when the transaction ends (or the connection is returned to the pool). Request B starts with no workspace context set, and RLS blocks all access until `requireWorkspace` sets the correct context.

---

## The `sql` Tagged Template

```typescript
import { sql } from 'drizzle-orm'

await db.execute(sql`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`)
```

The `sql` tagged template from Drizzle ORM properly parameterizes values. The `${workspaceId}` placeholder is passed as a parameter, not string-interpolated into the SQL. This is safe against SQL injection.

> Never write: `await db.execute(`SELECT set_config('app.current_workspace_id', '${workspaceId}', true)`)` — this is a SQL injection vector.

---

## Role-Based Access Control (Using `req.workspace.role`)

Once `requireWorkspace` attaches `req.workspace`, handlers can check the role for operations that require elevated permissions:

```typescript
// A route handler that requires 'admin' or 'owner' role
router.delete('/:pageId', async (req, res, next) => {
  if (!['admin', 'owner'].includes(req.workspace!.role)) {
    next(new Error('WORKSPACE_ACCESS_DENIED'))
    return
  }
  // ... delete logic
})
```

The role check is explicit in the handler, not buried in middleware. This makes authorization intent visible in code review.

---

## What Happens When `requireWorkspace` Is Missing

If a route that modifies workspace data doesn't have `requireWorkspace`:

```typescript
// ❌ Missing requireWorkspace
app.use('/api/workspaces/:workspaceId/pages', pageRouter)

// In pageRouter:
router.get('/', async (req, res) => {
  // req.workspace is undefined
  // app.current_workspace_id is not set
  // RLS is active but current_setting returns NULL
  // Query returns 0 rows — silent failure, not an error
  const allPages = await db.select().from(pages)
  res.json(allPages)  // Returns [] — looks correct but is a bug
})
```

This is a subtle failure mode: RLS is active, so the query returns empty instead of all pages — it looks like the endpoint works but returns no data. The missing middleware causes a silent access control misconfiguration.

Always verify `requireWorkspace` is in the middleware chain for any route that reads or writes workspace-scoped tables.

---

## Key Points

- `requireWorkspace` does four things in order: validate UUID, verify membership, set RLS context, attach `req.workspace`.
- Always use `true` (SET LOCAL) for `set_config`. `false` would persist the workspace context across requests on a pooled connection.
- Use the `sql` tagged template for the `set_config` call — never string-interpolate the workspace ID.
- `req.workspace.role` enables role checks in handlers without re-querying the DB.
- Missing `requireWorkspace` causes silent empty results under RLS — not an error, which makes it harder to detect.
- The RLS + tenant middleware combination means workspace isolation is enforced at two levels: application (membership check) and database (RLS policy).
