# One Lens for Every Technology Decision

**Module**: M03 · The Control-vs-Abstraction Lens
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C5, C7, C8, C11 — One tradeoff question explains every major technology choice in Meridian

---

## The core idea

Every major technology decision in Meridian resolves to the same question: *what mechanism does this tool expose directly, and what does the alternative hide?* Drizzle vs Prisma, Express vs Fastify, Lexical vs ProseMirror, direct Anthropic SDK vs LangChain — once you have this lens, each choice is obvious given Meridian's constraints, and reversible when those constraints change.

The lens is: **control** (direct access to the underlying mechanism, full flexibility, more code) vs **abstraction** (DX and productivity, hidden mechanism, locked into the abstraction's model).

## Why it matters

Without this lens, the Meridian stack looks like a list of arbitrary preferences. With it, every choice makes sense and you can confidently evaluate whether to change a tool when requirements shift. The question "should we switch from Drizzle to Prisma?" becomes "have our requirements changed in ways that make Prisma's abstraction worth what it hides?"

## A concrete example

**Drizzle vs Prisma**

| | Drizzle | Prisma |
|---|---|---|
| **What it exposes** | SQL-close query builder, raw SQL escape hatch | ORM abstraction over queries |
| **What it hides** | Nothing — you can see the SQL | Query strategy, N+1 behaviour, schema-to-migration mapping |
| **Meridian constraint** | pgvector HNSW queries need custom SQL (`ORDER BY embedding <=> $1`) | Prisma can't express pgvector operations natively |
| **When to prefer the alternative** | Small team, no custom SQL, rapid prototyping without schema migration complexity |

```typescript
// Drizzle — you see and control the SQL
const memories = await db
  .select()
  .from(memoriesTable)
  .where(
    and(
      eq(memoriesTable.userId, userId),
      eq(memoriesTable.workspaceId, workspaceId),
    )
  )
  .orderBy(sql`embedding <=> ${embedding}`)
  .limit(10)

// Prisma equivalent — no native pgvector support, requires $queryRaw
// which gives up type safety
const memories = await prisma.$queryRaw`
  SELECT * FROM memories
  WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
  ORDER BY embedding <=> ${embedding} LIMIT 10
`
// Result type: unknown — you've left the type-safe abstraction
```

**Express vs Fastify**

Express is middleware chains — every request handler is a function that receives `req`, `res`, and `next`. Fastify adds schema validation, serialization plugins, and lifecycle hooks as built-in abstractions. For Meridian, Express wins because the server has a specific structure: tenant middleware must run before route handlers, `SET LOCAL` must run before queries, and the request lifecycle order is load-bearing for security. Fastify's hooks can do this, but Express's simple middleware chain is transparent and easy to audit.

```typescript
// Express — middleware executes in explicit declaration order
// Security audit is: read the app.use() calls top-to-bottom
app.use(rateLimiter)
app.use(jwtMiddleware)        // extracts and verifies JWT
app.use(tenantMiddleware)     // sets req.workspace.id
app.use("/api", router)       // routes receive a verified, scoped request
```

**Lexical vs ProseMirror**

ProseMirror exposes its schema model directly — you define node types, marks, and the document schema yourself. Lexical provides a higher-level node abstraction with first-class React integration. For Meridian, `@lexical/yjs` binding exists as an official package; the ProseMirror + Yjs binding (`y-prosemirror`) is third-party. The binding quality matters here: when a dependency like Yjs is architectural, you want the editor that treats it as first-class.

```typescript
// Lexical — EditorNodes are React components
// Custom nodes integrate with React rendering natively
class CalloutNode extends DecoratorNode<JSX.Element> {
  decorate(): JSX.Element {
    return <CalloutComponent nodeKey={this.__key} />
  }
}

// ProseMirror — node views require imperative DOM management
// No native React integration — you wire it yourself
class CalloutView implements NodeView {
  dom: HTMLElement
  constructor(node: Node) {
    this.dom = document.createElement("div")
    ReactDOM.render(<CalloutComponent />, this.dom)
  }
}
```

**Direct Anthropic SDK vs LangChain/Vercel AI SDK**

LangChain hides: chain construction, prompt templates, retrieval strategy, and LLM routing. For Meridian — a single-provider, single-model architecture — every layer of that abstraction adds indirection without adding capability. The direct SDK exposes streaming chunk types precisely, which is what Meridian's SSE streaming route needs.

```typescript
// Direct SDK — you see exactly what the API returns
const stream = client.messages.stream({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: augmentedPrompt }],
})

for await (const event of stream) {
  if (event.type === "content_block_delta") {
    res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`)
  }
}

// LangChain equivalent — hides model selection, adds chain abstraction
// Correct for multi-model routing; unnecessary for single-provider
const chain = new ConversationChain({ llm: new ChatAnthropic() })
```

The pattern: *if you need what the abstraction adds, use the abstraction; if you don't, use the mechanism*. [S005](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S005-drizzle-orm.md), [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md)

## Key points

- The single question: "what mechanism does this tool expose, and what does the alternative hide?" resolves every major Meridian technology choice
- Drizzle wins over Prisma because pgvector queries require SQL-level control that Prisma cannot express in its type-safe abstraction layer
- Lexical wins over ProseMirror because `@lexical/yjs` is first-class while `y-prosemirror` is not, making the architectural dependency (Yjs) less risky

## Go deeper

- [S005](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S005-drizzle-orm.md) — Drizzle ORM vs alternatives: SQL control and pgvector integration
- [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md) — Lexical: why first-class Yjs support differs from third-party bindings

---

*[← Previous: Immutable Operations in Yjs](./L04-immutable-ops-yjs-crdts.md)* · *[Next: Schema-as-Type →](./L06-schema-as-type-drizzle-zod.md)*
