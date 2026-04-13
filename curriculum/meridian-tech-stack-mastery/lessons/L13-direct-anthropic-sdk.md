# Direct Anthropic SDK: Streaming, Tool Calling, and When Not to Abstract

**Module**: M07 · RAG as AI Memory Architecture
**Type**: debate
**Estimated time**: 15 minutes
**Claim**: C11 — The direct Anthropic SDK is correct for Meridian's single-provider architecture; abstraction layers add complexity without capability

---

## The core idea

The Vercel AI SDK, LangChain, and LlamaIndex are all abstraction layers over AI provider APIs. They're valuable when you need provider agnosticism (switch between OpenAI and Anthropic without rewriting call sites) or when you need pre-built orchestration patterns (chains, agents, retrieval pipelines). For Meridian — a single provider, a single model, with a custom RAG pipeline built on pgvector — these abstractions add indirection without adding capability. Knowing *what they hide* makes it clear when to use them and when not to.

## Why it matters

The reflex is to reach for a known framework. The `@anthropic-ai/sdk` API surface is small and well-typed — once you know the three core types (`MessageCreateParams`, `Message`, and the streaming event union), you can read any Meridian AI route without surprises. That transparency matters when debugging a streaming timeout or a malformed tool call response.

## A concrete example

**The three core types you need**

```typescript
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Optional: set default headers or base URL for proxy
})

// Type 1: MessageCreateParams — the request shape
const params: Anthropic.MessageCreateParams = {
  model: "claude-opus-4-5",    // or "claude-haiku-3"
  max_tokens: 1024,
  system: "You are a helpful assistant.",   // optional system prompt
  messages: [
    { role: "user", content: "What is a CRDT?" },
  ],
}

// Type 2: Message — the non-streaming response
const message: Anthropic.Message = await client.messages.create(params)
// message.content: Array<ContentBlock>
// message.usage: { input_tokens: number; output_tokens: number }
// message.stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use"

// Type 3: MessageStreamEvent — the streaming event union
// Used in: client.messages.stream()
```

**Streaming responses — the SSE event handling pattern**

```typescript
// The streaming event type is a discriminated union
// TypeScript's exhaustive checking ensures you handle all relevant events

const stream = client.messages.stream({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: userMessage }],
})

for await (const event of stream) {
  switch (event.type) {
    case "content_block_delta":
      if (event.delta.type === "text_delta") {
        // Stream this text chunk to the client via SSE
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`)
      }
      break

    case "message_delta":
      if (event.delta.stop_reason === "max_tokens") {
        // Model stopped — send a warning to the client
        res.write(`data: ${JSON.stringify({ warning: "max_tokens" })}\n\n`)
      }
      break

    case "message_stop":
      // Generation complete
      break
  }
}

// Alternative: convenience method for full response
const finalMessage = await stream.finalMessage()
// finalMessage.usage gives total token counts for billing
```

**Tool calling — when the model needs to invoke application logic**

```typescript
// Define tools with Zod-like schemas in Anthropic's format
const tools: Anthropic.Tool[] = [
  {
    name: "search_documents",
    description: "Search the user's workspace documents for relevant content",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The search query" },
        limit: { type: "number", description: "Max results", default: 5 },
      },
      required: ["query"],
    },
  },
]

// The model may respond with a tool_use block instead of text
const response = await client.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  tools,
  messages: [{ role: "user", content: "What did I write about CRDTs?" }],
})

// Handle tool_use response
if (response.stop_reason === "tool_use") {
  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  )

  if (toolUseBlock?.name === "search_documents") {
    const { query, limit } = toolUseBlock.input as { query: string; limit?: number }
    const results = await retrieveRelevantMemories(query, userId, workspaceId, limit)

    // Send tool result back to the model for final response
    const finalResponse = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      tools,
      messages: [
        { role: "user", content: "What did I write about CRDTs?" },
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: [{
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: results.join("\n\n"),
          }],
        },
      ],
    })
  }
}
```

**When to reach for an abstraction layer instead**

| Situation | Direct SDK | Abstraction layer |
|---|---|---|
| Single AI provider | ✅ Direct SDK | Unnecessary overhead |
| Multiple providers (OpenAI + Anthropic) | Complex to maintain | ✅ Vercel AI SDK |
| Custom RAG pipeline on pgvector | ✅ Direct SDK | LangChain's retrieval is opaque |
| Pre-built agent patterns (ReAct, etc.) | Complex to build | ✅ LangChain Agents |
| Streaming with SSE to React | ✅ Direct SDK | Vercel AI also works |
| Multi-step chains with conditional routing | Possible but verbose | ✅ LangChain LCEL |

For Meridian: single provider + custom pgvector RAG = direct SDK is correct. [S011](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S011-anthropic-sdk.md)

## Key points

- The direct Anthropic SDK exposes three core types: `MessageCreateParams`, `Message`, and the streaming `MessageStreamEvent` union — small surface, fully typed
- Tool calling is a first-class SDK feature: define tools with JSON Schema, handle `stop_reason === "tool_use"`, send tool results back in the next turn
- Use an abstraction layer when you need multi-provider support or pre-built agent orchestration; skip it when you have one provider and a custom retrieval pipeline already built

## Go deeper

- [S011](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S011-anthropic-sdk.md) — Anthropic TypeScript SDK: full API reference, streaming, and tool use

---

*[← Previous: The Four RAG Stages](./L12-four-rag-stages.md)* · *[Next: Four-Layer Security →](./L14-four-layer-security.md)*
