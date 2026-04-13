# Four-Layer Security: Zod → JWT → bcrypt → RLS in Correct Order

**Module**: M08 · Security: Four Independent Layers
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C13 — Meridian's four security layers each cover a distinct attack surface and must execute in a specific dependency order

---

## The core idea

Meridian's security model has four independent layers: Zod validates input shape at the API boundary, JWT verifies identity and extracts workspace context, bcrypt protects credentials at rest, and PostgreSQL RLS enforces tenant isolation at the database engine. Each layer covers a distinct attack surface. The order is not arbitrary — later layers depend on earlier ones having succeeded. If JWT verification fails, `SET LOCAL` never runs; if `SET LOCAL` never runs, RLS rejects every query.

## Why it matters

Security layers that depend on each other must fail closed: if any earlier layer fails, all subsequent layers must be unreachable. This is defense-in-depth. Understanding the dependency order tells you what a misconfiguration looks like and how to audit that each layer is in place.

## A concrete example

**The full request lifecycle — four checkpoints**

```typescript
// server/src/app.ts — middleware stack, order is critical
import express from "express"
import { zodMiddleware } from "./middleware/zod"
import { jwtMiddleware } from "./middleware/jwt"
import { tenantMiddleware } from "./middleware/tenant"
import { rateLimiter } from "./middleware/rate-limit"

const app = express()
app.use(express.json())

// Layer 0: rate limiting (not one of the four, but prerequisite)
app.use(rateLimiter)

// The four layers are applied per-route, not globally
// because public routes (login, register) don't need JWT + tenant
app.use("/api/workspaces", jwtMiddleware, tenantMiddleware, workspaceRouter)
app.use("/api/documents", jwtMiddleware, tenantMiddleware, documentRouter)
app.use("/api/ai", jwtMiddleware, tenantMiddleware, aiRouter)

// Auth routes — no JWT required (these ARE the JWT issuance routes)
app.use("/api/auth", authRouter)
```

**Layer 1: Zod — input validation at the boundary**

```typescript
// server/src/middleware/validate.ts
import { z, ZodSchema } from "zod"
import { Request, Response, NextFunction } from "express"

// Factory: creates middleware that validates req.body against a schema
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body)

    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      })
      return
    }

    // Replace req.body with the parsed (safe, narrowed) result
    req.body = parsed.data
    next()
  }
}

// Usage in a route
router.post("/", validateBody(CreateDocumentSchema), async (req, res) => {
  // req.body is now typed as CreateDocumentInput
  // No SQL injection possible — Zod has validated and typed the input
})
```

**Layer 2: JWT — identity verification and workspace context extraction**

```typescript
// server/src/middleware/jwt.ts
import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is required")

export function jwtMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" })
    return
  }

  const token = authHeader.slice(7)

  try {
    // Verify signature AND check expiry
    // Using HS256 with explicit algorithm list — prevents alg:none attacks
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"], // NEVER omit — prevents alg substitution attacks
    }) as { userId: string; workspaceId: string }

    req.jwtPayload = payload
    next()
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}
```

**Layer 3: Tenant middleware — SET LOCAL before any query**

```typescript
// server/src/middleware/tenant.ts
import { db } from "../db"
import { sql } from "drizzle-orm"
import { Request, Response, NextFunction } from "express"

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // workspaceId ONLY from verified JWT — never from req.body
  const workspaceId = req.jwtPayload?.workspaceId

  if (!workspaceId) {
    res.status(401).json({ error: "No workspace context in token" })
    return
  }

  // SET LOCAL: scoped to this transaction only
  // If the connection is reused from a pool, the next transaction
  // starts without this setting — no cross-tenant leak from pool reuse
  await db.execute(sql`SET LOCAL app.current_workspace_id = ${workspaceId}`)

  req.workspace = { id: workspaceId }
  next()
}
```

**Layer 4: PostgreSQL RLS — enforced at the database engine**

```sql
-- db/migrations/rls.sql
-- Applied to every table that contains workspace-scoped data
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- The policy is evaluated by PostgreSQL for EVERY query
-- Even if application code forgets the WHERE clause, RLS blocks the leak
CREATE POLICY workspace_isolation ON documents
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);

CREATE POLICY workspace_isolation ON memories
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
```

**The dependency chain and failure modes**

```
Request arrives
  ↓
Zod validation fails? → 400 Bad Request (no JWT check)
  ↓
JWT invalid/expired? → 401 Unauthorized (no SET LOCAL)
  ↓
SET LOCAL fails? → 500 Server Error (no queries execute)
  ↓
RLS: workspace_id mismatch? → 0 rows (even if SET LOCAL missed by bug)
  ↓
Route handler executes with verified identity + scoped DB context
```

Each failure closes the door before the next layer is reached. [S013](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S013-jwt-rfc8725.md), [S003](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S003-postgresql-rls.md)

## Key points

- The order is non-negotiable: Zod → JWT → `SET LOCAL` → RLS; each layer depends on the previous one having set up a prerequisite (parsed body, verified identity, scoped DB context)
- `workspaceId` must come from the verified JWT payload, never from `req.body` — any route that accepts workspace scoping from user input violates Meridian's tenant isolation guarantee
- The `algorithms: ["HS256"]` option in `jwt.verify()` is mandatory — omitting it enables the `alg:none` attack where an attacker forges a token with no signature

## Go deeper

- [S013](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S013-jwt-rfc8725.md) — RFC 8725: JSON Web Token Best Current Practices — the attacks and mitigations
- [S003](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S003-postgresql-rls.md) — PostgreSQL RLS: `current_setting()`, SET LOCAL, and policy evaluation order

---

*[← Previous: Direct Anthropic SDK](./L13-direct-anthropic-sdk.md)* · *[Next: bcrypt vs Argon2id + JWT Attacks →](./L15-bcrypt-argon2id-jwt-attacks.md)*
