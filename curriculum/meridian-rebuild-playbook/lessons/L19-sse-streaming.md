# L19 — SSE Streaming: Real-Time AI Responses

**Module**: M08 — AI Layer Integration  
**Type**: Applied  
**Estimated time**: 25 minutes

---

## Why SSE, Not WebSocket

AI responses from LLMs arrive token by token over several seconds. Users should see text appearing in real time, not wait for the full response.

Two options:
- **WebSocket**: Full duplex, bidirectional. Requires maintaining a persistent connection. Good for collaborative editing (Meridian uses Yjs WebSocket for this).
- **SSE (Server-Sent Events)**: Unidirectional server-to-client stream over HTTP. Simpler protocol, auto-reconnect built in, works with standard fetch. Good for one-shot AI responses.

For AI completion streams, SSE is appropriate: the client sends one request, the server streams back tokens, then the connection closes. The bidirectional capability of WebSocket is not needed here.

---

## Server: Streaming AI Handler

```typescript
// server/src/routes/ai.ts
import { Router } from 'express'
import { z } from 'zod'
import { llmRouter } from '../ai/router'
import { db } from '../db'
import { audit_log } from '../db/schema'
import { sql } from 'drizzle-orm'

const router = Router({ mergeParams: true })

const streamSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(50000)
  })).min(1),
  model: z.string().default('claude-3-5-sonnet-20241022'),
  systemPrompt: z.string().max(10000).optional()
})

router.post('/stream', async (req, res, next) => {
  const parsed = streamSchema.safeParse(req.body)
  if (!parsed.success) { next(parsed.error); return }

  // 1. Log the AI action before doing any work
  await db.insert(audit_log).values({
    workspace_id: req.workspace!.id,
    user_id: req.user!.id,
    action: 'ai.stream',
    payload: {
      model: parsed.data.model,
      messageCount: parsed.data.messages.length
    }
  })

  const provider = llmRouter.resolve()

  // 2. Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')  // Disable nginx buffering
  res.flushHeaders()  // Send headers immediately

  try {
    // 3. Stream from the provider
    await provider.stream(
      {
        model: parsed.data.model,
        messages: parsed.data.messages,
        systemPrompt: parsed.data.systemPrompt
      },
      (chunk) => {
        if (chunk.type === 'delta' && chunk.content) {
          // SSE format: "data: <json>\n\n"
          res.write(`data: ${JSON.stringify({ type: 'delta', content: chunk.content })}\n\n`)
        } else if (chunk.type === 'done') {
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          res.end()
        } else if (chunk.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`)
          res.end()
        }
      }
    )
  } catch (error) {
    // If streaming fails mid-way, send an error event
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`)
    res.end()
  }
})

export { router as aiRouter }
```

---

## SSE Format

The SSE wire format is simple:

```
data: {"type":"delta","content":"Hello"}\n\n
data: {"type":"delta","content":" world"}\n\n
data: {"type":"done"}\n\n
```

Each message is `data: <payload>\n\n`. The double newline terminates each event. The browser's `EventSource` API and `fetch` with `ReadableStream` both understand this format.

---

## Client: Consuming the SSE Stream

```typescript
// client/src/hooks/useAIStream.ts
import { useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

interface StreamMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useAIStream(workspaceId: string) {
  const [response, setResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const accessToken = useAuthStore(s => s.accessToken)

  const stream = useCallback(async (messages: StreamMessage[]) => {
    setResponse('')
    setIsStreaming(true)

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/ai/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ messages })
        }
      )

      if (!res.ok || !res.body) {
        throw new Error('Stream request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''  // Keep incomplete chunk in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = JSON.parse(line.slice(6))

          if (json.type === 'delta') {
            setResponse(prev => prev + json.content)
          } else if (json.type === 'done') {
            setIsStreaming(false)
          } else if (json.type === 'error') {
            throw new Error(json.error)
          }
        }
      }
    } catch (error) {
      setIsStreaming(false)
      throw error
    }
  }, [workspaceId, accessToken])

  return { response, isStreaming, stream }
}
```

Using `fetch` with `ReadableStream` instead of the browser's `EventSource` API allows sending custom headers (the `Authorization: Bearer` header). `EventSource` does not support custom headers.

---

## Nginx Buffering Warning

In production with nginx as a reverse proxy, nginx will buffer the SSE stream and send it all at once — defeating the purpose of streaming. The `X-Accel-Buffering: no` header disables nginx's response buffering for this endpoint:

```
X-Accel-Buffering: no
```

Without this header, users will see a long pause followed by the complete response appearing at once.

---

## Key Points

- SSE is appropriate for AI completion streams: one request → server streams back tokens → connection closes.
- SSE format: `data: <json>\n\n` — double newline terminates each event.
- Set `X-Accel-Buffering: no` to prevent nginx from buffering the stream.
- Call `res.flushHeaders()` immediately to start the SSE connection before any streaming happens.
- Use `fetch` + `ReadableStream` on the client (not `EventSource`) to support the `Authorization` header.
- Log to `audit_log` before starting the stream — not after.
