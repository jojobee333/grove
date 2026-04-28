# L02 — Architecture Decision Records: Making Choices Explicit

**Module**: M01 — System Design Before Code  
**Type**: Applied  
**Estimated time**: 25 minutes

---

## What Is an ADR?

An Architecture Decision Record (ADR) is a short document that captures a single architectural decision: what was decided, why it was decided, and what the alternatives were. ADRs are not long essays — they are structured notes that answer:

1. **What is the context?** What problem needed solving?
2. **What was decided?** The actual choice made.
3. **What were the alternatives?** The other options that were considered.
4. **Why this, not those?** The reasoning.
5. **What are the consequences?** What becomes easier, what becomes harder.

ADRs serve two purposes: they make implicit knowledge explicit during the decision, and they explain *why* to a future developer who sees only the result.

---

## Standard ADR Format (Lightweight)

```markdown
# ADR-001: [Decision title]

**Status**: Accepted
**Date**: YYYY-MM-DD

## Context
[What problem were we solving? What constraints apply?]

## Decision
[What did we decide?]

## Alternatives Considered
- **[Alternative 1]**: [Why it wasn't chosen]
- **[Alternative 2]**: [Why it wasn't chosen]

## Consequences
- **Easier**: [What this decision makes simpler]
- **Harder**: [What this decision makes more complex]
```

---

## Three ADRs for Meridian

### ADR-001: Vite SPA over Next.js

**Status**: Accepted  
**Date**: project start

**Context**: Meridian's workspace application requires a rich text editor (Lexical) with real-time collaborative editing (Yjs). The frontend framework choice determines the deployment model and the editor's technical feasibility.

**Decision**: Use Vite as the build tool for a pure client-side single-page application. No server-side rendering for the authenticated workspace app.

**Alternatives Considered**:
- **Next.js App Router**: Lexical's DOM reconciler requires a browser — it cannot run in a Node.js server context. The `@lexical/yjs` binding requires a live Y.Doc instance in the browser. Using Next.js would require marking the entire editor tree `"use client"`, eliminating any benefit of App Router.
- **Remix**: Same issue as Next.js — the editor component and all state that depends on it would need to be client-only.

**Consequences**:
- **Easier**: Editor integration is straightforward. No hydration mismatches. Yjs collaboration works without special handling.
- **Harder**: No SEO for workspace pages (acceptable — workspace is authenticated). Initial page load has no server-rendered content.

---

### ADR-002: Drizzle ORM over Prisma

**Status**: Accepted  
**Date**: project start

**Context**: Meridian requires three things from its ORM: (1) per-transaction `SET LOCAL` for RLS context, (2) native `vector(1536)` column types for pgvector, (3) zero-codegen TypeScript types.

**Decision**: Use Drizzle ORM.

**Alternatives Considered**:
- **Prisma**: Cannot cleanly issue `SET LOCAL` in the pattern required for per-request RLS scoping. Supports pgvector only via `Unsupported("vector(1536)")` which breaks type inference. Requires a codegen step after every schema change (~40MB binary engine).
- **Kysely**: Good SQL builder with type safety, but no built-in migration system and more verbose for complex queries.
- **Raw pg**: Maximum control, but no type safety on query results, no migration tooling.

**Consequences**:
- **Easier**: Schema changes are TypeScript code changes — no separate schema file. Types derive directly from table definitions via `InferSelectModel`. pgvector columns work natively.
- **Harder**: Less magic than Prisma — joins are explicit, no nested write API. Developers need to understand SQL.

---

### ADR-003: pgvector in PostgreSQL over Dedicated Vector Database

**Status**: Accepted  
**Date**: project start

**Context**: Meridian stores AI memories as text + vector embeddings. The AI memory retrieval needs semantic similarity search. The search must respect the same multi-tenant isolation as all other data.

**Decision**: Use pgvector in the same PostgreSQL 16 instance.

**Alternatives Considered**:
- **Pinecone**: Separate service with its own API and authentication model. Cannot participate in PostgreSQL transactions. RLS does not apply — would require duplicate tenant isolation logic. Network round-trip adds latency.
- **Weaviate / Qdrant**: Same concerns as Pinecone. Additional operational complexity.

**Consequences**:
- **Easier**: Single database to manage. RLS applies to vector searches automatically (because it is just a PostgreSQL query). Atomic reads across relational and vector data. No 2PC.
- **Harder**: At very large scale (millions of vectors per workspace), pgvector's memory consumption for HNSW indexes may become a concern. Migration path: abstract vector search behind a repository interface from day one.

---

## Why Write ADRs Before Coding?

The act of writing an ADR forces you to articulate the alternatives and the reasoning before you have committed. Once you have chosen Vite and built the frontend around it, the cognitive cost of reconsidering is high. Writing the ADR first externalizes the reasoning and makes it reviewable.

For Meridian specifically: if you start with Next.js and discover the Lexical incompatibility three weeks in, you are rewriting the entire frontend build setup. If you write ADR-001 before touching any code, you discover the incompatibility in 20 minutes of research.

---

## Key Points

- An ADR is a short structured document: context, decision, alternatives, consequences.
- Write ADRs before coding, not after — the act of writing one forces you to think through alternatives.
- ADRs are most valuable for decisions that are hard to reverse (framework choice, ORM choice, database architecture).
- Meridian's three load-bearing decisions (Vite, Drizzle, pgvector) each have clear ADRs derived from the constraints in L01.

---

## Exercise

Write an ADR for one decision in a project you are currently working on or have worked on recently. Use the lightweight format above. Your ADR should have at least two alternatives considered, each with a specific reason it wasn't chosen. When you are done, check: could a new developer understand the decision from your ADR alone, without asking you?
