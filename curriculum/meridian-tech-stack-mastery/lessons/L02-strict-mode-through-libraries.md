# Strict Mode Through Libraries: Zod, Zustand, and the Anthropic SDK

**Module**: M01 · TypeScript Strict Mode: The Stack's Foundation
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C2 — TypeScript strict mode's value is realized through library integration

---

## The core idea

Strict mode doesn't just make your own code safer — it's the precondition for three core Meridian libraries to give you accurate types. Zod's schema-to-type derivation, Zustand's store type inference, and the Anthropic SDK's event types all depend on strict mode being active. Without it, the types compile but lie.

## Why it matters

You're building with a stack where a Zod schema IS a TypeScript type — not a source for generating one, not a runtime validator that happens to have a type, but the authoritative definition. If that derivation is wrong, you get false confidence at every call site that uses `z.infer<typeof schema>`. For production code, silent type drift is more dangerous than a compile error.

## A concrete example

**Zod — schema as type**

```typescript
import { z } from "zod"

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
})

// z.infer<> derives the TypeScript type from the schema at compile time
type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>
// Result (with strict: true):
// { name: string; slug: string }
```

Without `strict: true`, the `z.infer<>` utility can return `any` for certain schema shapes — specifically when conditional types are involved in Zod's internals. You won't get an error. You'll get `any`, which accepts everything. [S010](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S010-zod.md)

**Zustand — curried creation for generic inference**

```typescript
import { create } from "zustand"

interface WorkspaceState {
  workspaceId: string | null
  setWorkspaceId: (id: string) => void
}

// The curried pattern: create<State>()(() => ...) 
// Without strict mode, TypeScript can't infer State correctly
// from the callback alone — the extra () forces the generic to resolve
const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  workspaceId: null,
  setWorkspaceId: (id) => set({ workspaceId: id }),
}))
```

The `create<State>()(() => ...)` double-function pattern looks redundant. It exists specifically because TypeScript's generic inference requires strict mode to correctly resolve the state type from both the generic parameter and the callback simultaneously. Without it, `set` becomes `any`. [S009](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S009-zustand-readme.md)

**Drizzle — table definition as type**

```typescript
import { pgTable, uuid, text, vector } from "drizzle-orm/pg-core"

export const memories = pgTable("memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
})

// Drizzle infers the select/insert types directly from this definition
// typeof memories.$inferSelect → { id: string; workspaceId: string; content: string; embedding: number[] | null }
// No codegen. No .prisma file. The table IS the type.
```

Drizzle's structural type inference depends on `noImplicitAny` to resolve column types accurately. Without it, certain column type helpers return `any` instead of the specific column type. [S005](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S005-drizzle-orm.md)

## Key points

- `z.infer<typeof schema>` silently returns `any` for some schema shapes without `strict: true` — no error, just wrong types
- Zustand's `create<State>()()` double-function pattern is a deliberate workaround for TypeScript generic inference, requiring strict mode to work correctly
- Drizzle table definitions derive query result types structurally — `strict: true` is what makes those derived types accurate rather than `any`

## Go deeper

- [S010](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S010-zod.md) — Zod docs: `z.infer<>` and strict mode requirements
- [S005](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S005-drizzle-orm.md) — Drizzle ORM: structural type inference from table definitions
- [S009](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S009-zustand-readme.md) — Zustand: the curried create pattern and why it exists

---

*[← Previous: The Nine Flags](./L01-strict-mode-nine-flags.md)* · *[Next: React 18 Concurrent Rendering →](./L03-react18-concurrent-rendering.md)*
