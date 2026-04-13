# Schema-as-Type: z.infer<> + drizzle-zod in Practice

**Module**: M04 · Single Source of Truth: Schema-as-Type Across the Stack
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C2 — The schema-as-type pattern eliminates manual type declarations and keeps server and database in sync

---

## The core idea

In the Meridian stack, a database table definition is the authoritative source for three things simultaneously: the SQL schema, the query result TypeScript type, and the input validation schema for every route that writes to that table. The pattern — table definition → `drizzle-zod createInsertSchema()` → Zod validator in Express route — means a change to the table automatically propagates to both the type and the validation. No `interface` declarations to maintain. No drift between what the database accepts and what the API validates.

## Why it matters

Most stacks separate these three concerns: a SQL migration file, a TypeScript interface, and a Joi/express-validator schema. When the table changes, you update all three separately — and eventually they diverge. The schema-as-type pattern collapses them into one definition. For a type-safe API like Meridian's, this matters because the runtime validator and the compile-time type are derived from the exact same source.

## A concrete example

**Step 1: Drizzle table definition**

```typescript
// server/src/db/schema.ts
import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core"

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  title: text("title").notNull().default("Untitled"),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
})

// TypeScript types are inferred automatically
type Document = typeof documents.$inferSelect
// { id: string; workspaceId: string; title: string; content: string; createdAt: Date; isPublished: boolean }

type NewDocument = typeof documents.$inferInsert
// { id?: string; workspaceId: string; title?: string; content?: string; createdAt?: Date; isPublished?: boolean }
```

**Step 2: Derive a Zod validator with drizzle-zod**

```typescript
// server/src/schemas/document.ts
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { documents } from "../db/schema"

// Creates a Zod schema that mirrors the table's insert type
// Server-generated fields (id, createdAt) are automatically excluded/optional
export const CreateDocumentSchema = createInsertSchema(documents, {
  // Override: title must be non-empty string, distinct from DB default
  title: z.string().min(1).max(255),
})
  .omit({ id: true, workspaceId: true, createdAt: true })

// Derived type — the same type you'd write manually, but derived
type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>
// { title: string; content?: string; isPublished?: boolean }
```

**Step 3: Use in an Express route**

```typescript
// server/src/routes/documents.ts
import { Router, Request, Response } from "express"
import { CreateDocumentSchema } from "../schemas/document"
import { db } from "../db"
import { documents } from "../db/schema"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  // Validate input — if this passes, TypeScript knows the exact shape
  const parsed = CreateDocumentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() })
  }

  // req.workspace.id is set by tenantMiddleware — never from req.body
  // This is the tenant isolation constraint from the copilot-instructions
  const [document] = await db
    .insert(documents)
    .values({
      ...parsed.data,
      workspaceId: req.workspace.id,
    })
    .returning()

  return res.status(201).json(document)
})
```

**The propagation chain in action**

When you add a `tags` column to the `documents` table:
1. The Drizzle table definition changes: `tags: text("tags").array().default([])`
2. `documents.$inferInsert` automatically includes `tags`
3. `createInsertSchema(documents)` automatically includes the field
4. The Express route's `parsed.data` type includes `tags`
5. TypeScript ensures you either handle it in the route or it errors at compile time

Zero manual type updates. The schema change propagates end-to-end at compile time. [S005](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S005-drizzle-orm.md), [S010](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S010-zod.md)

## Key points

- `createInsertSchema(table)` from `drizzle-zod` produces a Zod validator directly from the Drizzle table definition — one change, three things update
- The Meridian rule — only set `workspaceId` from `req.workspace.id`, never from `req.body` — is enforced by `.omit({ workspaceId: true })` on the Zod schema: the field is absent from validation so the user can't supply it
- `$inferSelect` and `$inferInsert` give you the full TypeScript types without declaring them separately

## Go deeper

- [S005](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S005-drizzle-orm.md) — Drizzle ORM: schema inference, drizzle-zod integration
- [S010](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S010-zod.md) — Zod: `safeParse`, `flatten()`, and the schema-as-type pattern

---

*[← Previous: One Lens for Every Technology Decision](./L05-control-vs-abstraction-lens.md)* · *[Next: PostgreSQL RLS + pgvector →](./L07-postgresql-rls-pgvector.md)*
