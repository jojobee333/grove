# L23 — Audit Logging: Every AI Action Leaves a Trail

**Module**: M09 — Security Hardening  
**Type**: Core  
**Estimated time**: 20 minutes

---

## Why Audit Logging Is Non-Negotiable

In a system that processes personal data with AI capabilities, audit logging serves three purposes:

1. **Security forensics** — if a data breach occurs, the audit log shows exactly what was accessed and when
2. **Compliance** — demonstrates that AI actions are traceable and attributable to specific users
3. **Debugging** — understand why the AI responded a certain way to a specific user at a specific time

The non-negotiable rule in Meridian is: **every AI action is logged to the `audit_log` table.**

---

## What Constitutes an AI Action

| Action | `action` field | What to log in `payload` |
|---|---|---|
| AI completion (non-streaming) | `ai.complete` | model, message count |
| AI streaming response | `ai.stream` | model, message count |
| Memory write | `ai.memory.write` | memory key, tier |
| Memory retrieval (RAG) | `ai.memory.retrieve` | query hash, result count |
| Memory promotion | `ai.memory.promote` | key, from_tier, to_tier |
| Memory eviction | `ai.memory.evict` | count evicted |

---

## The Audit Log Table (Reminder)

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`ON DELETE SET NULL` preserves audit records even when users or workspaces are deleted. Compliance records must survive entity deletion.

---

## The Audit Helper

```typescript
// server/src/audit.ts
import { db } from './db'
import { audit_log } from './db/schema'

interface AuditEntry {
  workspaceId?: string
  userId?: string
  action: string
  payload: Record<string, unknown>
}

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  await db.insert(audit_log).values({
    workspace_id: entry.workspaceId ?? null,
    user_id: entry.userId ?? null,
    action: entry.action,
    payload: entry.payload
  })
}
```

A thin helper avoids repeating the insert pattern in every handler. The helper does not throw on failure — if audit logging fails, the AI action should still complete (log the audit failure to the application logger as an alert).

---

## Logging Before the Action

```typescript
// server/src/routes/ai.ts — stream handler
router.post('/stream', async (req, res, next) => {
  const parsed = streamSchema.safeParse(req.body)
  if (!parsed.success) { next(parsed.error); return }

  // Log BEFORE starting the stream
  await logAuditEvent({
    workspaceId: req.workspace!.id,
    userId: req.user!.id,
    action: 'ai.stream',
    payload: {
      model: parsed.data.model,
      messageCount: parsed.data.messages.length,
      // Do NOT log message content — that could include PII
    }
  })

  // Start the stream...
})
```

**Why log before, not after?**

If the AI call fails halfway through, the audit log still needs an entry. Logging after means failed AI calls leave no trace — which is worse from a compliance perspective.

**What NOT to log in `payload`:**

- Message content (may contain PII)
- User-provided text
- Embedding vectors
- System prompt content

Log metadata only: model name, count of messages, tier, etc. The `payload` is JSONB and queryable — it should never contain sensitive user data.

---

## Querying the Audit Log

```typescript
// Get all AI actions for a workspace in the last 24 hours
const recentActions = await db.select()
  .from(audit_log)
  .where(
    and(
      eq(audit_log.workspace_id, workspaceId),
      like(audit_log.action, 'ai.%'),
      gte(audit_log.created_at, new Date(Date.now() - 24 * 60 * 60 * 1000))
    )
  )
  .orderBy(desc(audit_log.created_at))
  .limit(100)
```

This query does not require RLS context to be set because it queries with an explicit `workspace_id` filter. However, RLS is still active — if the context is set to a different workspace, the explicit `workspace_id` filter would be doubly restricted.

---

## Key Points

- Log every AI action: completion, streaming, memory read, memory write, memory promotion, eviction.
- Log BEFORE the action — not after. Failed actions still need audit entries.
- Never log message content or user-provided text. Log metadata only (model, count, tier).
- The `ON DELETE SET NULL` on audit_log means records survive when the referenced user or workspace is deleted.
- The audit log is a compliance record — it must never be deleted or truncated on a schedule.
- Audit log failure should alert (application log error), but must not block the AI action from completing.
