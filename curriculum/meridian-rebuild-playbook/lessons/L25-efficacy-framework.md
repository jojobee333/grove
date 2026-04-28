# L25 — The Five-Question Efficacy Framework

**Module**: M10 — Code Efficacy Assessment  
**Type**: Core  
**Estimated time**: 20 minutes

---

## Efficacy Is a Binary Checklist

Code efficacy in Meridian is not a gradient — it is a binary pass/fail checklist. The architecture has non-negotiable rules. Either your code follows them or it doesn't. This framework provides five verifiable questions that determine whether your Meridian implementation meets the architecture's safety and correctness requirements.

These questions were derived from the non-negotiable rules in the project's architecture specification. If any answer is "No," you have a gap.

---

## The Five Questions

### Q1: Does every workspace-scoped query include `workspace_id` in the WHERE clause?

**Why**: Tenant isolation. A query that omits `workspace_id` can return data from any workspace, depending on what RLS allows for the current connection context.

**How to verify**:

```typescript
// Search your codebase for DB queries missing workspace_id

// ✅ Pass
const pages = await db.select()
  .from(pages_table)
  .where(
    and(
      eq(pages_table.workspace_id, workspaceId),
      eq(pages_table.id, pageId)
    )
  )

// ❌ Fail — omits workspace_id
const page = await db.select()
  .from(pages_table)
  .where(eq(pages_table.id, pageId))
```

**Automation**: Grep for `.where(eq(` patterns that do not include `workspace_id`.

---

### Q2: Is every API route protected by a Zod schema before any handler logic runs?

**Why**: Zod at the API boundary prevents malformed data from reaching the database layer. It is the input validation contract.

**How to verify**:

```typescript
// Every route handler must begin with a safeParse check

// ✅ Pass
router.post('/pages', async (req, res, next) => {
  const parsed = createPageSchema.safeParse(req.body)
  if (!parsed.success) { next(parsed.error); return }
  // ... handler logic using parsed.data ...
})

// ❌ Fail — no Zod schema, directly uses req.body
router.post('/pages', async (req, res, next) => {
  const { title, workspaceId } = req.body
  // ... handler logic ...
})
```

**Automation**: Check every `router.post`, `router.put`, `router.patch` handler for a `safeParse` call in the first two lines.

---

### Q3: Is every AI action logged to the `audit_log` table before execution?

**Why**: Compliance and forensics. AI actions that touch user data without a trace are unaccountable.

**How to verify**:

```typescript
// Every call to provider.complete() or provider.stream() must be preceded by logAuditEvent()

// ✅ Pass
await logAuditEvent({ workspaceId, userId, action: 'ai.stream', payload: {...} })
const result = await provider.stream(...)

// ❌ Fail — no audit log before the AI call
const result = await provider.stream(...)
```

**Automation**: Grep for `provider.complete(` and `provider.stream(` calls. Each must have a `logAuditEvent` call in the same handler before it.

---

### Q4: Is bcrypt cost factor set to exactly 12?

**Why**: Cost factor 12 is the project minimum for password hashing. Lower values are computationally cheaper to brute-force.

**How to verify**:

```typescript
// Search for bcrypt.hash( calls

// ✅ Pass
const hash = await bcrypt.hash(password, 12)

// ❌ Fail
const hash = await bcrypt.hash(password, 10)  // Too low
const hash = await bcrypt.hash(password, ROUNDS)  // Must verify ROUNDS = 12
```

**Automation**: Grep for `bcrypt.hash(` — the second argument must be `12`.

---

### Q5: Are refresh tokens rotated on every use with reuse detection?

**Why**: Without rotation, a stolen refresh token can be used indefinitely. Without reuse detection, a stolen token cannot be identified once the legitimate user rotates it.

**How to verify**:

```typescript
// The refresh token handler must:
// 1. Validate the incoming token against Redis
// 2. Delete the old token immediately
// 3. Issue a new token and store it
// 4. Detect if the old token is already gone (reuse = breach → revoke all)

// ✅ Pass (verified by reading the refresh handler)
const storedHash = await redis.get(`rt:${userId}`)
if (!storedHash) {
  // Token already rotated — this is a reuse attempt
  await revokeAllTokensForUser(userId)
  return res.status(401).json({ error: 'Session revoked' })
}
// ... validate, delete old, issue new ...

// ❌ Fail — no reuse detection
const storedHash = await redis.get(`rt:${userId}`)
if (!storedHash || !compareHash(token, storedHash)) {
  return res.status(401).json({ error: 'Invalid token' })
}
// Issues new token without checking for reuse
```

---

## Running the Framework Against Your Code

To use the Five-Question Framework:

1. Open each question's verification pattern
2. Search your codebase (grep or IDE search) for the failure pattern
3. Count violations — record each as a named gap with the file and line number
4. Enter gaps into the [Gap Report template](#) from L27

A code reviewer, CI check, or AI assistant can systematically apply this framework to any Meridian implementation. The framework is intentionally narrow — it only catches the five highest-risk non-negotiable violations. It does not replace comprehensive code review.

---

## Key Points

- The Five-Question Framework tests for non-negotiable rule violations only — they are binary pass/fail.
- Q1: Every workspace-scoped query must include `workspace_id` in WHERE.
- Q2: Every POST/PUT/PATCH route must call `safeParse` before handler logic.
- Q3: Every AI action must have `logAuditEvent` called BEFORE the provider call.
- Q4: bcrypt cost must be exactly `12` — not a variable, not `10`.
- Q5: Refresh token handler must check for token reuse (Redis key already gone = breach signal).
