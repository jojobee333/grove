# L01 — Reading Requirements as Architectural Constraints

**Module**: M01 — System Design Before Code  
**Type**: Core  
**Estimated time**: 20 minutes

---

## The Central Insight

Most developers read requirements and immediately think about code. The right move is to read requirements and first identify the constraints — the properties the system *must* have that eliminate entire classes of solutions.

Meridian has three load-bearing constraints. Once you understand them, the entire technology stack becomes obvious rather than arbitrary.

---

## The Three Load-Bearing Constraints

### Constraint 1: The Editor Must Run in the Browser

Meridian uses **Lexical** as its rich-text editor. Lexical's DOM reconciler is a custom browser rendering engine — it requires `document`, `window`, and live DOM nodes to function. The collaborative layer, **Yjs**, binds to Lexical's editor state as a `Y.XmlFragment` — a CRDT data structure that requires a live browser environment for its real-time bindings.

**What this eliminates**: Any framework that runs React components on the server (Next.js App Router, Remix). These frameworks assume components can render in Node.js. Lexical cannot. You would have to mark the entire editor as `"use client"` in Next.js, which defeats the purpose of using Next.js and adds complexity with no benefit.

**What it demands**: A pure client-side single-page application. **Vite** is the correct build tool for this. It has no server rendering model to fight against.

### Constraint 2: Tenant Isolation Must Hold Below the Application Layer

Meridian is multi-tenant. Every workspace's data must be isolated from every other workspace's data, even when application code has bugs. This is not a preference — it is a correctness requirement for a system handling user data.

**What this eliminates**: Query-filter-only isolation. If tenant isolation is implemented by adding `WHERE workspace_id = $1` to every query, then a developer who writes one query without that filter creates a data leak. Application bugs happen. The isolation mechanism must not depend on every developer remembering to add the filter.

**What it demands**: PostgreSQL **Row-Level Security (RLS)**. RLS is enforced at the database storage engine level. A query that omits the workspace filter still gets the correct result — because RLS adds the restriction automatically, below the application.

### Constraint 3: AI Memory Must Be Semantically Searchable Within One Transactional Boundary

Meridian stores learned user context (memories) as both relational data and vector embeddings. When the AI retrieves relevant memories, it needs a similarity search over vectors. This retrieval must:

1. Be atomic with relational queries (a memory read and a relational update are one transaction)
2. Respect the same tenant isolation as all other data
3. Not require a network round-trip to a separate service

**What this eliminates**: Dedicated vector databases (Pinecone, Weaviate, Qdrant). These are separate services with their own authentication, isolation models, and network latency. They cannot participate in PostgreSQL transactions.

**What it demands**: **pgvector** — the PostgreSQL extension that adds `vector` column types and approximate nearest-neighbor (ANN) search operators. It runs inside the same PostgreSQL instance, participates in the same ACID transactions, and respects the same RLS policies.

---

## How the Stack Follows from the Constraints

Once you have the three constraints, the technology choices read as conclusions:

| Constraint | Eliminated | Required |
|---|---|---|
| Browser-only editor | Next.js, Remix | Vite SPA |
| Sub-application tenant isolation | Query-filter-only, Prisma (limited `SET LOCAL` support) | PostgreSQL RLS + Drizzle ORM |
| Single-boundary vector search | Pinecone, Weaviate, Qdrant | pgvector in PostgreSQL |

The rest of the stack (TypeScript strict mode, Zustand, Tailwind, Redis for sessions) are best-practice choices within the space defined by the constraints — they are good choices but not forced by the constraints in the same way.

---

## A Real Example: Why Drizzle Over Prisma

This is a decision that confuses developers who arrive from standard CRUD apps where Prisma is the default choice. Prisma is excellent for most use cases. Meridian's constraints rule it out:

1. **RLS requires `SET LOCAL` per transaction**. The tenant middleware in Meridian runs `SELECT set_config('app.current_workspace_id', workspaceId, true)` — this is raw SQL executed on a specific database client inside an open transaction. Prisma's `$executeRaw` can technically run this, but it is awkward and not the documented pattern. Drizzle's `db.execute(sql`...`)` is idiomatic.

2. **pgvector requires native column types**. Drizzle supports `customType` for defining `vector(1536)` columns directly in TypeScript. Prisma requires workarounds (`Unsupported("vector(1536)")`) that break its automatic type inference.

3. **No codegen step**. Drizzle's table definitions ARE the TypeScript types — no separate `.prisma` schema file, no `prisma generate` step after every schema change.

---

## Key Points

- Constraints are requirements that eliminate technology choices. Find them before coding.
- Meridian has three: browser-only editor → Vite SPA; sub-app isolation → RLS; single-boundary vectors → pgvector.
- Technology choices that look arbitrary are almost always forced by constraints that weren't written down.
- Read the requirements and ask: "What can this system absolutely NOT do without?" Those are your constraints.

---

## Practice

Before reading L02, write down the constraints for a system you know well (a project at work, a side project, a past codebase). For each constraint, identify what it eliminates and what it demands. Then check whether the technology choices in that system match your analysis.
