# L11 — Zod Validation as the API Security Boundary

**Module**: M05 — Server Architecture  
**Type**: Core  
**Estimated time**: 25 minutes

---

## What Happens Without Zod

Without input validation, a route handler operates on data it cannot trust:

```typescript
// ❌ No validation — dangerous
app.post('/api/workspaces/:workspaceId/pages', async (req, res) => {
  const { title, parentId } = req.body  // title could be anything
  // What if title is 10MB of text? Or an object? Or undefined?
  // What if parentId is "'; DROP TABLE pages; --"?
  await db.insert(pages).values({ title, parent_id: parentId, ... })
})
```

Zod validation creates a hard wall between the untrusted HTTP request and the trusted application logic.

---

## The Non-Negotiable Rule

> Every API route validates input with a Zod schema **before touching anything else**.

This means Zod runs before the database query, before business logic, and before any other computation. The only thing that runs before Zod is the authentication and workspace middleware.

---

## The Validation Pattern

```typescript
// server/src/routes/page.ts
import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { pages } from '../db/schema'

const router = Router({ mergeParams: true })

const createPageSchema = z.object({
  title: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
  icon: z.string().max(2).optional()
})

router.post('/', async (req, res, next) => {
  // 1. Validate input — FIRST, before anything else
  const parsed = createPageSchema.safeParse(req.body)
  if (!parsed.success) {
    next(parsed.error)  // ZodError → error handler → 400
    return
  }

  const { title, parentId, icon } = parsed.data

  // 2. Now the data is trusted — proceed with DB operations
  const [page] = await db.insert(pages).values({
    workspace_id: req.workspace!.id,
    creator_user_id: req.user!.id,
    title,
    parent_id: parentId ?? null,
    icon: icon ?? null
  }).returning()

  res.status(201).json(page)
})
```

`safeParse` returns `{ success: true, data: ... }` or `{ success: false, error: ZodError }`. Using `safeParse` instead of `parse` avoids try/catch — the error is in the return value.

---

## Validating Route Parameters

Route parameters are strings. A `workspaceId` URL param can be validated to ensure it is a UUID before being used in a database query:

```typescript
// server/src/middleware/tenant.ts
const workspaceIdSchema = z.object({
  workspaceId: z.string().uuid()
})

export const requireWorkspace: RequestHandler = async (req, res, next) => {
  // Validate the param is a valid UUID before any DB work
  const parsed = workspaceIdSchema.safeParse(req.params)
  if (!parsed.success) {
    next(new Error('WORKSPACE_ACCESS_DENIED'))
    return
  }

  const { workspaceId } = parsed.data
  // ... continue with membership check
}
```

Without this check, a request to `/api/workspaces/not-a-uuid/pages` would cause a PostgreSQL error when trying to use the invalid UUID as a query parameter. The error message from PostgreSQL might expose internal details. Validate first, fail cleanly.

---

## Common Schema Patterns

### String constraints

```typescript
z.string().min(1)           // non-empty
z.string().max(255)         // bounded length
z.string().email()          // email format
z.string().uuid()           // UUID format
z.string().trim().min(1)    // strip whitespace, then require non-empty
```

### Enums

```typescript
const tierSchema = z.enum(['session', 'medium', 'deep'])
// Only allows those exact strings
```

### Optional vs nullable

```typescript
z.string().optional()   // { value?: string }    — key may be absent
z.string().nullable()   // { value: string | null } — key must be present, can be null
z.string().nullish()    // { value?: string | null }  — either absent or null
```

### Nested objects

```typescript
const blockSchema = z.object({
  type: z.enum(['paragraph', 'heading1', 'code', 'todo']),
  content: z.object({
    text: z.string(),
    attrs: z.record(z.unknown()).optional()
  }),
  position: z.number().int().nonnegative()
})
```

---

## What Zod Does NOT Do

Zod validates **structure and type**. It does not:

- Verify that a `parentId` UUID exists in the database (use a DB query for that)
- Prevent SQL injection (parameterized queries via Drizzle do that)
- Validate business rules ("a page cannot be its own parent")
- Check authorization ("can this user access this workspace")

Zod establishes: "This input has the right shape." The application must separately establish: "This input is authorized and business-valid."

---

## Centralizing Error Formatting in the Error Handler

```typescript
// server/src/middleware/errorHandler.ts (excerpt)
if (err instanceof ZodError) {
  res.status(400).json({
    error: 'VALIDATION_ERROR',
    details: err.flatten().fieldErrors
  })
  return
}
```

`err.flatten().fieldErrors` produces a clean object:
```json
{
  "error": "VALIDATION_ERROR",
  "details": {
    "title": ["String must contain at least 1 character(s)"],
    "parentId": ["Invalid uuid"]
  }
}
```

This format is consistent across every route without duplicating formatting code.

---

## Key Points

- Zod validates input at the route boundary, before any DB queries or business logic.
- `safeParse` returns a discriminated union — no try/catch needed.
- Route params (like `workspaceId`) must also be validated — they are strings from the URL, not trusted UUIDs.
- Use `z.string().uuid()` for UUID params to fail cleanly before hitting the database.
- Zod validates structure; authorization, business rules, and existence checks are separate concerns.
- One `ZodError instanceof` check in the error handler handles validation failures for every route.
