# L21 — Tiered Memory: Session, Medium, and Deep

**Module**: M08 — AI Layer Integration  
**Type**: Applied  
**Estimated time**: 25 minutes

---

## Why Three Tiers?

Not all memories should be retained equally. A user's momentary preference ("I want shorter answers today") is different from a long-term pattern ("User always works in TypeScript"). Treating all memories the same would either fill the memory store with ephemeral noise or discard useful long-term patterns too quickly.

The three tiers encode lifecycle semantics:

| Tier | Lifecycle | Example content |
|---|---|---|
| `session` | Cleared at end of session | Current task context, temporary preferences |
| `medium` | Days to weeks, subject to eviction | Recent project context, evolving preferences |
| `deep` | Permanent | Domain expertise, stable communication preferences |

These tiers are enforced by the `tier CHECK` constraint in the schema. The application must actively manage promotion and eviction.

---

## Session Tier: Ephemeral Context

Session memories are written during a conversation and cleared at its end:

```typescript
// server/src/ai/memory.ts

export async function clearSessionMemories(
  userId: string,
  workspaceId: string
): Promise<void> {
  await db.delete(user_memory)
    .where(
      and(
        eq(user_memory.user_id, userId),
        eq(user_memory.workspace_id, workspaceId),
        eq(user_memory.tier, 'session')
      )
    )
}
```

This is called when the user explicitly ends a session or when a session timeout is detected. Session memories might include: "User is working on the authentication refactor," "User prefers code examples in TypeScript today."

---

## Medium Tier: Contextual Learning with Decay

Medium memories persist longer but are subject to eviction based on `last_accessed_at`:

```typescript
// server/src/ai/memory.ts

// Called periodically (e.g., daily cleanup job)
export async function evictStaleMemories(
  userId: string,
  workspaceId: string,
  staleDays = 30
): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - staleDays)

  await db.delete(user_memory)
    .where(
      and(
        eq(user_memory.user_id, userId),
        eq(user_memory.workspace_id, workspaceId),
        eq(user_memory.tier, 'medium'),
        lt(user_memory.last_accessed_at, cutoff)
      )
    )
}
```

When a medium memory is accessed (read in a RAG query), its `last_accessed_at` is updated:

```typescript
// Update last_accessed_at when a memory is retrieved
await db.update(user_memory)
  .set({ last_accessed_at: new Date() })
  .where(inArray(user_memory.id, retrievedIds))
```

This implements a form of LRU eviction at the tier level. Frequently accessed memories stay alive; dormant ones are evicted after 30 days.

---

## Deep Tier: Permanent Core Learnings

Deep memories are never evicted automatically. They represent verified, stable facts about the user:
- "User is a TypeScript developer working in a public sector lockbox environment"
- "User prefers concise responses with code examples"
- "User's primary language is English (Canadian)"

Writing to the `deep` tier should require an explicit signal (user confirmation or AI confidence threshold), not just frequency.

```typescript
// Only promote to deep when confidence is high
export async function promoteToDeep(
  userId: string,
  workspaceId: string,
  key: string
): Promise<void> {
  // Read from medium
  const existing = await db.query.user_memory.findFirst({
    where: and(
      eq(user_memory.user_id, userId),
      eq(user_memory.workspace_id, workspaceId),
      eq(user_memory.tier, 'medium'),
      eq(user_memory.memory_key, key)
    )
  })

  if (!existing) return

  // Write to deep tier
  await writeMemory(userId, workspaceId, key, existing.memory_value, 'deep')

  // Remove from medium (it now lives in deep)
  await db.delete(user_memory)
    .where(
      and(
        eq(user_memory.user_id, userId),
        eq(user_memory.workspace_id, workspaceId),
        eq(user_memory.tier, 'medium'),
        eq(user_memory.memory_key, key)
      )
    )
}
```

---

## Retrieval: Tier Priority

When building the system prompt context, deep memories should be included before medium memories, and session memories should take highest priority (current context is most relevant):

```typescript
// server/src/ai/retrieval.ts (updated)
export async function retrieveMemoriesWithTierPriority(
  userId: string,
  workspaceId: string,
  query: string
): Promise<MemoryResult[]> {
  const queryEmbedding = await generateEmbedding(query)

  // Session memories first (most current context)
  const sessionMemories = await db.execute(sql`
    SELECT memory_key, memory_value, tier,
           embedding <=> ${JSON.stringify(queryEmbedding)}::vector AS distance
    FROM user_memory
    WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
      AND tier = 'session' AND embedding IS NOT NULL
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT 5
  `)

  // Deep + medium memories
  const longTermMemories = await db.execute(sql`
    SELECT memory_key, memory_value, tier,
           embedding <=> ${JSON.stringify(queryEmbedding)}::vector AS distance
    FROM user_memory
    WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
      AND tier IN ('medium', 'deep') AND embedding IS NOT NULL
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT 8
  `)

  // Combine: session first, then long-term
  return [
    ...sessionMemories.rows as MemoryResult[],
    ...longTermMemories.rows as MemoryResult[]
  ]
}
```

---

## The Memory Graph (Multi-Hop Reasoning)

The `memory_graph` table links related memories. When retrieving memories for a query, the graph can be traversed to include connected facts:

```sql
-- Get memories connected to a retrieved memory
SELECT m.memory_key, m.memory_value
FROM memory_graph g
JOIN user_memory m ON g.to_memory_id = m.id
WHERE g.from_memory_id = $1  -- a retrieved memory's ID
  AND g.weight > 0.6         -- only strong connections
```

This is multi-hop retrieval: "This memory relates to another memory with weight 0.8 → include that memory too." The depth is bounded (typically max 2 hops) to prevent exponential query expansion.

---

## Key Points

- Three tiers encode lifecycle: session (ephemeral), medium (LRU eviction after 30 days), deep (permanent).
- Session memories are cleared explicitly at session end — they are not auto-evicted by TTL.
- Medium memories are evicted based on `last_accessed_at`. Every read updates `last_accessed_at`.
- Deep memories require explicit promotion signals — not just frequency thresholds.
- Retrieval is tier-prioritized: session memories first (most current), then deep, then medium.
- Both `user_id` AND `workspace_id` in all memory queries — always.
