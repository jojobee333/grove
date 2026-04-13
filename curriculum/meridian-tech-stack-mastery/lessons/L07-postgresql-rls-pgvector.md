# PostgreSQL RLS + pgvector: One Table Definition, Three Jobs

**Module**: M04 · Single Source of Truth: Schema-as-Type Across the Stack
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C9, C10 — PostgreSQL RLS and pgvector each add a layer of enforcement to the same table definition

---

## The core idea

A single Drizzle table definition can simultaneously define: a relational schema with foreign key constraints, Row-Level Security policies that enforce tenant isolation automatically at the database layer, and a pgvector column with an HNSW index for ANN (approximate nearest neighbour) search. These aren't separate concerns bolted together — they're all properties of one table, one source of truth, and one TypeScript type.

## Why it matters

Meridian requires multi-tenant isolation: every query against workspace data must be scoped to the requesting tenant. If that scoping is only enforced at the application layer (Express middleware), a bug in one route could leak data across tenants. RLS enforces it at the database layer — even a misconfigured or missing middleware call can't bypass it. Understanding how Drizzle, the tenant middleware, and `SET LOCAL` connect is the difference between "tenant isolation we hope is correct" and "tenant isolation enforced by the database engine."

## A concrete example

**Step 1: Define the table with an embedding column**

```typescript
// server/src/db/schema.ts
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core"
import { vector } from "drizzle-orm/pg-core" // pgvector extension

export const memories = pgTable("memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }), // pgvector column
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // HNSW index for fast ANN search
  embeddingIdx: index("memories_embedding_idx")
    .using("hnsw", table.embedding.op("vector_cosine_ops")),
}))
```

**Step 2: Add RLS in a migration**

```sql
-- db/migrations/0005_add_rls_memories.sql
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Policy: queries only see rows where workspace_id matches the session variable
CREATE POLICY workspace_isolation ON memories
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);

-- The policy uses current_setting() — a PostgreSQL session variable
-- This variable is set per-connection by the tenant middleware
```

**Step 3: Set the session variable in every request**

```typescript
// server/src/middleware/tenant.ts
import { Request, Response, NextFunction } from "express"
import { db } from "../db"
import { sql } from "drizzle-orm"

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // workspaceId comes from the verified JWT, never from req.body
  const workspaceId = req.jwtPayload?.workspaceId
  if (!workspaceId) {
    res.status(401).json({ error: "No workspace context" })
    return
  }

  // SET LOCAL scopes this to the current transaction only
  // If the transaction rolls back, the setting disappears
  await db.execute(sql`SET LOCAL app.current_workspace_id = ${workspaceId}`)
  req.workspace = { id: workspaceId }
  next()
}
```

**Step 4: Use the vector search — RLS applies automatically**

```typescript
// server/src/services/memory.ts
import { db } from "../db"
import { memories } from "../db/schema"
import { sql, and, eq } from "drizzle-orm"

export async function searchMemories(
  userId: string,
  workspaceId: string, // still include both filters — belt-and-suspenders
  queryEmbedding: number[],
  limit = 10,
) {
  // RLS policy enforces workspace_id filter automatically
  // The explicit filter here is belt-and-suspenders, required by Meridian rules
  const results = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.workspaceId, workspaceId),
      )
    )
    .orderBy(sql`embedding <=> ${JSON.stringify(queryEmbedding)}::vector`)
    .limit(limit)

  return results
}
```

**Why RLS + explicit WHERE is belt-and-suspenders**

RLS enforces the `workspace_id` filter at the database engine level — even if the application code forgets the `WHERE` clause. The explicit `workspaceId` filter in the application code means a bug in `SET LOCAL` (e.g., the middleware didn't run) would still fail safely, because the application-layer filter would return 0 rows rather than the wrong tenant's rows. Two independent mechanisms, each covering the other's failure mode. [S003](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S003-postgresql-rls.md), [S004](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S004-pgvector.md)

## Key points

- RLS adds tenant isolation at the database engine layer; `SET LOCAL` is the mechanism that scopes it to the current transaction — if `SET LOCAL` didn't run, the query fails (RLS rejects `current_setting()` returning null)
- pgvector's HNSW index enables approximate nearest-neighbour search in `O(log n)` time; the exact SQL `<=>` operator is the cosine distance operator
- The Meridian rule requires *both* the RLS policy and the explicit `WHERE workspaceId =` filter — belt-and-suspenders because each covers the other's failure mode

## Go deeper

- [S003](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S003-postgresql-rls.md) — PostgreSQL RLS: policy syntax, `current_setting()`, and `SET LOCAL` transaction scoping
- [S004](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S004-pgvector.md) — pgvector: HNSW vs IVFFlat, distance operators, and Drizzle integration

---

*[← Previous: Schema-as-Type](./L06-schema-as-type-drizzle-zod.md)* · *[Next: useSyncExternalStore →](./L08-usesyncexternalstore.md)*
