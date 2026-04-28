# L20 — RAG with pgvector: Scoped Semantic Retrieval

**Module**: M08 — AI Layer Integration  
**Type**: Applied  
**Estimated time**: 30 minutes

---

## What RAG Accomplishes

Without RAG, the AI assistant knows only what is in the current conversation. With RAG:

1. User types a message
2. Server generates an embedding vector for the message
3. pgvector finds the most semantically similar memories stored for this user
4. Those memories are injected into the system prompt before calling the LLM

The LLM now has context about the user's preferences, domain knowledge, and past interactions — even if they weren't mentioned in the current conversation.

---

## Step 1: Generate an Embedding

```typescript
// server/src/ai/embeddings.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function generateEmbedding(text: string): Promise<number[]> {
  // Anthropic does not currently offer a dedicated embedding endpoint.
  // In Meridian, embeddings are generated via the OpenAI-compatible endpoint
  // or a local embedding model. The interface is the same regardless.

  // Example with a local embedding service:
  const response = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text })
  })

  const data = await response.json()
  return data.embedding  // number[] with 1536 dimensions
}
```

The embedding model must always produce vectors of the same dimension (1536) that the `user_memory.embedding vector(1536)` column expects. Mixing dimensions causes a PostgreSQL type error.

---

## Step 2: Retrieve Relevant Memories

```typescript
// server/src/ai/retrieval.ts
import { db } from '../db'
import { user_memory } from '../db/schema'
import { sql, and, eq, isNotNull } from 'drizzle-orm'
import { generateEmbedding } from './embeddings'

interface MemoryResult {
  memory_key: string
  memory_value: string
  tier: string
  distance: number
}

export async function retrieveRelevantMemories(
  userId: string,
  workspaceId: string,
  query: string,
  limit = 10
): Promise<MemoryResult[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query)

  // Both user_id AND workspace_id are required in the WHERE clause
  const results = await db.execute(sql`
    SELECT
      memory_key,
      memory_value,
      tier,
      embedding <=> ${JSON.stringify(queryEmbedding)}::vector AS distance
    FROM user_memory
    WHERE user_id = ${userId}
      AND workspace_id = ${workspaceId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `)

  return results.rows as MemoryResult[]
}
```

**The dual-scope filter is non-negotiable:**

```sql
WHERE user_id = $1
  AND workspace_id = $2
```

RLS enforces the `workspace_id` filter at the database level (if RLS is active and the context is set). But `user_id` is an application-level constraint. User A and User B can both have memories in the same workspace. Without `user_id` in the filter, User B would see User A's memories — a data isolation violation that RLS does not protect against.

---

## Step 3: Inject Memories into the System Prompt

```typescript
// server/src/ai/context.ts
import { retrieveRelevantMemories } from './retrieval'

export async function buildSystemPromptWithMemory(
  userId: string,
  workspaceId: string,
  userMessage: string,
  baseSystemPrompt: string
): Promise<string> {
  const memories = await retrieveRelevantMemories(
    userId,
    workspaceId,
    userMessage,
    10
  )

  if (memories.length === 0) {
    return baseSystemPrompt
  }

  // Filter to only high-relevance memories (distance < 0.3 = cosine similarity > 0.7)
  const relevantMemories = memories.filter(m => m.distance < 0.3)

  if (relevantMemories.length === 0) {
    return baseSystemPrompt
  }

  const memoryContext = relevantMemories
    .map(m => `- ${m.memory_key}: ${m.memory_value}`)
    .join('\n')

  return `${baseSystemPrompt}

## What I Know About This User
The following facts have been learned from previous interactions:
${memoryContext}

Use this context to personalize your response, but do not reference these facts explicitly unless directly relevant.`
}
```

---

## Step 4: Write Memories After the Conversation

After a conversation, the AI can identify new learnings and write them to `user_memory`:

```typescript
// server/src/ai/memory.ts
import { db } from '../db'
import { user_memory } from '../db/schema'
import { generateEmbedding } from './embeddings'

export async function writeMemory(
  userId: string,
  workspaceId: string,
  key: string,
  value: string,
  tier: 'session' | 'medium' | 'deep'
): Promise<void> {
  const embedding = await generateEmbedding(value)

  // UPSERT — update if key exists for this user/workspace/tier
  await db.insert(user_memory).values({
    workspace_id: workspaceId,
    user_id: userId,
    tier,
    memory_key: key,
    memory_value: value,
    embedding: JSON.stringify(embedding),
    last_accessed_at: new Date()
  }).onConflictDoUpdate({
    target: [
      user_memory.workspace_id,
      user_memory.user_id,
      user_memory.tier,
      user_memory.memory_key
    ],
    set: {
      memory_value: value,
      embedding: JSON.stringify(embedding),
      last_accessed_at: new Date(),
      updated_at: new Date()
    }
  })
}
```

---

## The Distance Threshold

Cosine distance values range from 0 (identical) to 2 (opposite). In practice:
- Distance < 0.1: Nearly identical meaning
- Distance 0.1–0.3: Highly relevant
- Distance 0.3–0.5: Somewhat related
- Distance > 0.5: Weakly related

The threshold of 0.3 in `buildSystemPromptWithMemory` filters to only highly relevant memories. Including weakly related memories adds noise to the system prompt.

---

## Key Points

- RAG = generate query embedding → retrieve similar memories via pgvector → inject into system prompt.
- **Both `user_id` AND `workspace_id` must be in the WHERE clause.** RLS handles workspace isolation, but `user_id` is an application-level requirement.
- The cosine distance threshold (0.3) filters out low-relevance memories before injecting into the prompt.
- The embedding model must always produce the same dimension count (1536) that the `vector(1536)` column expects.
- Memory writes use UPSERT on `(workspace_id, user_id, tier, memory_key)` — the unique constraint for that combination.
- Log the RAG retrieval action to `audit_log` — it is an AI action.
