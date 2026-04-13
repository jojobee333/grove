# The Four RAG Stages Mapped to the Meridian Stack

**Module**: M07 · RAG as AI Memory Architecture
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C12 — RAG is the architecture that connects pgvector, the Anthropic SDK, and the memory system

---

## The core idea

Retrieval-Augmented Generation (RAG) is a four-stage pipeline: ingest document content, retrieve relevant chunks for a query, augment a prompt with retrieved context, and generate a response. In Meridian, each stage maps precisely to a specific part of the stack: embedding model for ingestion, pgvector HNSW index for retrieval, system prompt assembly for augmentation, and Anthropic SDK streaming for generation. None of these stages are optional — omitting retrieval means the AI has no memory of your documents; omitting augmentation means retrieved context never reaches the model.

## Why it matters

RAG is what makes Meridian's AI "know" the user's documents. Without it, the AI would only respond from its training data. With it, the AI can answer questions about specific content in the user's workspace. Understanding the pipeline stages is essential for debugging (which stage lost the context?) and for improving quality (which stage should be tuned?).

## A concrete example

**Stage 1: Ingestion — chunk, embed, store**

```typescript
// server/src/services/memory-ingest.ts
import Anthropic from "@anthropic-ai/sdk"

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function ingestDocument(
  content: string,
  documentId: string,
  userId: string,
  workspaceId: string,
): Promise<void> {
  // Step 1: Chunk the document into segments suitable for embedding
  // Simple strategy: split on double newlines, max 500 chars per chunk
  const chunks = chunkText(content, 500)

  for (const chunk of chunks) {
    // Step 2: Embed each chunk using Claude's embedding endpoint
    // (Meridian can also use text-embedding-3-small from OpenAI as alternative)
    const embeddingResponse = await anthropicClient.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1,
      // Note: for embeddings, use a dedicated embedding model in production
      // This simplified example illustrates the principle
      messages: [{ role: "user", content: chunk }],
    })

    // Step 3: Store chunk + embedding in pgvector
    await db.insert(memories).values({
      documentId,
      userId,
      workspaceId,
      content: chunk,
      embedding: embeddingAsVector, // number[] of 1536 dimensions
    })
  }
}

function chunkText(text: string, maxChars: number): string[] {
  return text
    .split(/\n\n+/)
    .flatMap(paragraph =>
      paragraph.length <= maxChars
        ? [paragraph]
        : splitIntoChunks(paragraph, maxChars)
    )
    .filter(chunk => chunk.trim().length > 0)
}
```

**Stage 2: Retrieval — embed query, vector search**

```typescript
// server/src/services/memory-retrieve.ts
import { db } from "../db"
import { memories } from "../db/schema"
import { sql, and, eq } from "drizzle-orm"

export async function retrieveRelevantMemories(
  query: string,
  userId: string,
  workspaceId: string,
  limit = 5,
): Promise<string[]> {
  // Embed the query using the same model as ingestion
  const queryEmbedding = await embedText(query)

  // HNSW approximate nearest-neighbour search
  // Must include both userId AND workspaceId — Meridian's security requirement
  const results = await db
    .select({ content: memories.content })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.workspaceId, workspaceId),
      )
    )
    .orderBy(sql`embedding <=> ${JSON.stringify(queryEmbedding)}::vector`)
    .limit(limit)

  return results.map(r => r.content)
}
```

**Stage 3: Augmentation — inject context into system prompt**

```typescript
// server/src/services/ai-augment.ts
export function buildAugmentedSystemPrompt(
  baseSystemPrompt: string,
  retrievedChunks: string[],
  userMessage: string,
): string {
  if (retrievedChunks.length === 0) {
    return baseSystemPrompt
  }

  const context = retrievedChunks
    .map((chunk, i) => `[Document excerpt ${i + 1}]:\n${chunk}`)
    .join("\n\n")

  // Augmentation: retrieved context is injected into the system prompt
  // NOT appended to the user message — keeps the user message clean
  return `${baseSystemPrompt}

## Relevant context from the user's workspace:

${context}

Use the above excerpts to answer the user's question when relevant.
If the context doesn't help, answer from your training knowledge.`
}
```

**Stage 4: Generation — Anthropic SDK streaming**

```typescript
// server/src/routes/ai.ts
import { Router } from "express"
import Anthropic from "@anthropic-ai/sdk"
import { retrieveRelevantMemories } from "../services/memory-retrieve"
import { buildAugmentedSystemPrompt } from "../services/ai-augment"

const router = Router()
const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

router.get("/stream", async (req, res) => {
  const { prompt } = req.query as { prompt: string }
  const { id: workspaceId } = req.workspace
  const userId = req.jwtPayload.userId

  // Stage 2 + 3: retrieve and augment
  const chunks = await retrieveRelevantMemories(prompt, userId, workspaceId)
  const systemPrompt = buildAugmentedSystemPrompt(
    "You are a helpful assistant integrated into a collaborative workspace.",
    chunks,
    prompt,
  )

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  // Stage 4: stream generation
  const stream = anthropicClient.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  })

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`)
    }
  }

  res.write("data: [DONE]\n\n")
  res.end()
})
```

[S011](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S011-anthropic-sdk.md), [S004](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S004-pgvector.md)

## Key points

- The four stages map directly: ingest (chunk + embed → pgvector INSERT), retrieve (embed query → `<=>` ORDER BY), augment (inject context into system prompt), generate (Anthropic SDK streaming)
- Retrieved context goes into the **system prompt**, not the user message — this keeps the conversation history clean and the context always available for multi-turn conversations
- Both `userId` and `workspaceId` are mandatory filters in retrieval — omitting either violates Meridian's security model (a user could retrieve another user's memories in the same workspace)

## Go deeper

- [S011](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S011-anthropic-sdk.md) — Anthropic SDK: messages.stream(), event types, and SSE patterns
- [S004](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S004-pgvector.md) — pgvector: HNSW vs IVFFlat, cosine vs L2 distance, embedding dimensions

---

*[← Previous: @lexical/yjs in Practice](./L11-lexical-yjs-in-practice.md)* · *[Next: Direct Anthropic SDK →](./L13-direct-anthropic-sdk.md)*
