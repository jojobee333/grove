# L26 — Common Implementation Gaps and How to Fix Them

**Module**: M10 — Code Efficacy Assessment  
**Type**: Applied  
**Estimated time**: 25 minutes

---

## Why Gaps Happen

Gaps are not caused by ignorance — they are caused by inattention, time pressure, or subtle misunderstanding of a rule's scope. This lesson catalogs the most common gaps found in Meridian implementations, with the exact symptoms, root cause, and fix for each.

---

## Gap 1: Missing `workspace_id` in a DB Query

**Symptom**: A query returns more rows than expected, or a user can access another workspace's data.

**Root cause**: Developer wrote the query thinking RLS alone is sufficient — RLS is a safety net, not a substitute for explicit scoping.

**Incorrect code**:
```typescript
// ❌ Trusts RLS to scope results — no explicit workspace filter
const page = await db.query.pages.findFirst({
  where: eq(pages.id, pageId)
})
```

**Fix**:
```typescript
// ✅ Explicit AND-scoped with workspace_id
const page = await db.query.pages.findFirst({
  where: and(
    eq(pages.workspace_id, workspaceId),
    eq(pages.id, pageId)
  )
})
```

**Rule**: Explicit `workspace_id` filter is mandatory even when RLS is active. RLS is defense-in-depth, not primary isolation.

---

## Gap 2: Zod Schema Applied After DB Query

**Symptom**: Type errors at runtime, malformed data in the database, or inconsistent API behavior.

**Root cause**: Developer placed Zod validation after some early handler logic (e.g., header checks), inadvertently allowing unvalidated data to flow to the DB.

**Incorrect code**:
```typescript
// ❌ Queries DB before validating the request body
router.post('/blocks', async (req, res, next) => {
  const page = await db.select()...  // using req.body.pageId — unvalidated
  const parsed = createBlockSchema.safeParse(req.body)
  if (!parsed.success) { next(parsed.error); return }
  // ...
})
```

**Fix**:
```typescript
// ✅ Validate FIRST, then use parsed.data in all downstream calls
router.post('/blocks', async (req, res, next) => {
  const parsed = createBlockSchema.safeParse(req.body)
  if (!parsed.success) { next(parsed.error); return }
  
  const page = await db.select()...where(eq(pages.id, parsed.data.pageId))
  // ...
})
```

---

## Gap 3: Audit Log Skipped for AI Actions

**Symptom**: `audit_log` table has no entries, or has entries for some AI endpoints but not others.

**Root cause**: Developer added `logAuditEvent` to the first AI endpoint they built and forgot to add it to subsequent endpoints. Or — audit logging was placed after the provider call and silently skipped when the provider threw an error.

**Incorrect code**:
```typescript
// ❌ Audit log added after provider call — skipped if provider throws
const result = await provider.complete(messages)
await logAuditEvent({ action: 'ai.complete', ... })
```

**Fix**:
```typescript
// ✅ Audit log before provider call — always executes
await logAuditEvent({ action: 'ai.complete', ... })
const result = await provider.complete(messages)
```

---

## Gap 4: bcrypt Cost Factor Lower Than 12

**Symptom**: Passwords are being hashed with cost factor 10 (Node.js default) or lower.

**Root cause**: Developer used `bcrypt.hash(password, 10)` from tutorial code or copied from a previous project. Cost factor 10 is the most common "example" value — it is too low for production.

**Incorrect code**:
```typescript
// ❌ bcrypt default — cost 10 is too low
const SALT_ROUNDS = 10
const hash = await bcrypt.hash(password, SALT_ROUNDS)
```

**Fix**:
```typescript
// ✅ Cost 12 as a named constant
const BCRYPT_ROUNDS = 12
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
```

The named constant also makes the value searchable — grep for `BCRYPT_ROUNDS` to verify it across the codebase.

---

## Gap 5: `SET` Instead of `SET LOCAL` in Tenant Middleware

**Symptom**: Workspace context leaks between requests when using connection pooling. One user's `workspace_id` appears in another user's query results.

**Root cause**: Developer used `SET app.current_workspace_id = ...` (session-level) instead of `SET LOCAL ...` (transaction-scoped). In a connection pool, session-level settings persist to the next request that reuses the connection.

**Incorrect code**:
```typescript
// ❌ Session-level SET — persists beyond the request
await db.execute(sql`SET app.current_workspace_id = ${workspaceId}`)
```

**Fix**:
```typescript
// ✅ Transaction-scoped SET LOCAL — reset when transaction ends
await db.execute(sql`SET LOCAL app.current_workspace_id = ${workspaceId}`)
```

This requires that tenant middleware runs inside a transaction context. If using Drizzle without an explicit transaction, wrap the handler in `db.transaction(async (tx) => { ... })`.

---

## Gap 6: User Input Concatenated Into System Prompt

**Symptom**: AI assistant responds to injection attempts embedded in user messages.

**Root cause**: Developer built the system prompt by string interpolation, including user-provided content.

**Incorrect code**:
```typescript
// ❌ User input in the system prompt
const systemPrompt = `
  You are a helpful assistant for ${user.name}.
  The user is currently asking about: ${userInput}
  Help them with their question.
`
```

**Fix**:
```typescript
// ✅ User input only in the messages array, never in systemPrompt
const systemPrompt = `You are a helpful assistant for ${user.name}.`
const messages = [{ role: 'user', content: userInput }]
```

---

## Gap Pattern Summary

| Gap | Symptom | Fix |
|---|---|---|
| Missing `workspace_id` | Cross-tenant data leakage | Add `workspace_id` to WHERE clause |
| Zod after handler logic | Unvalidated data in DB | Move `safeParse` to line 1 of handler |
| Audit log after provider call | Missing audit entries on error | Move `logAuditEvent` before provider call |
| bcrypt cost < 12 | Weaker password security | Change to `12`, use named constant |
| `SET` not `SET LOCAL` | Context leaks between requests | Change to `SET LOCAL`, wrap in transaction |
| User input in `systemPrompt` | Injection vulnerability | Move user input to `messages[]` only |

---

## Key Points

- The most common gaps are subtle omissions, not architectural failures — they are easy to introduce under time pressure.
- "RLS is active" does not mean you can omit `workspace_id` from queries. They serve different purposes.
- `SET LOCAL` is not optional when using a connection pool — session-level `SET` will cause context leaks.
- Audit log placement must be before the provider call. After = audit skipped on provider error.
- Never use tutorial-copy bcrypt values (`10`) in production. `12` must be a named constant.
