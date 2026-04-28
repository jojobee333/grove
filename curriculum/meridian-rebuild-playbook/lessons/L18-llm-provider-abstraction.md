# L18 — LLM Provider Abstraction and Routing

**Module**: M08 — AI Layer Integration  
**Type**: Core  
**Estimated time**: 30 minutes

---

## The Problem with Tight Coupling

If every AI handler calls the Anthropic SDK directly:

```typescript
// ❌ Tightly coupled
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const response = await client.messages.create(...)
```

Then switching to a different provider (OpenAI, local Ollama) requires changing every handler. Testing requires mocking the SDK. Workspace-level provider overrides are impossible.

The solution is a provider abstraction: every handler calls the `LLMRouter`, which resolves the correct provider and calls its implementation.

---

## The `LLMProvider` Interface

```typescript
// server/src/ai/providers.ts
export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMCompletionOptions {
  model: string
  messages: LLMMessage[]
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface LLMStreamChunk {
  type: 'delta' | 'done' | 'error'
  content?: string
  error?: string
}

export interface LLMProvider {
  id: string
  name: string
  complete(options: LLMCompletionOptions): Promise<string>
  stream(
    options: LLMCompletionOptions,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void>
}
```

This interface is the contract. Any provider that implements `complete` and `stream` can be swapped in without changing calling code.

---

## The Anthropic Implementation

```typescript
// server/src/ai/providers.ts (continued)
import Anthropic from '@anthropic-ai/sdk'

export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic'
  readonly name = 'Anthropic Claude'
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })
  }

  async complete(options: LLMCompletionOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: options.model ?? 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      system: options.systemPrompt,
      messages: options.messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic')
    }
    return content.text
  }

  async stream(
    options: LLMCompletionOptions,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void> {
    const stream = await this.client.messages.stream({
      model: options.model ?? 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      system: options.systemPrompt,
      messages: options.messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta') {
        onChunk({ type: 'delta', content: event.delta.text })
      }
    }

    onChunk({ type: 'done' })
  }
}
```

The `AnthropicProvider` class hides all SDK-specific details. Calling code only sees `LLMProvider`.

---

## The LLM Router

```typescript
// server/src/ai/router.ts
import { LLMProvider, AnthropicProvider } from './providers'

interface WorkspaceProviderOverride {
  workspaceId: string
  providerId: string
  model: string
}

class LLMRouter {
  private providers: Map<string, LLMProvider> = new Map()
  private defaultProviderId = 'anthropic'

  constructor() {
    this.register(new AnthropicProvider())
  }

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider)
  }

  resolve(workspaceOverride?: WorkspaceProviderOverride): LLMProvider {
    const providerId = workspaceOverride?.providerId ?? this.defaultProviderId
    const provider = this.providers.get(providerId)

    if (!provider) {
      // Fallback to default rather than throwing (graceful degradation)
      return this.providers.get(this.defaultProviderId)!
    }

    return provider
  }
}

export const llmRouter = new LLMRouter()
```

The `LLMRouter` is a singleton. Handlers import `llmRouter` and call `llmRouter.resolve(workspaceOverride)` to get the correct provider.

---

## Adding a Second Provider

```typescript
// Future: add OpenAI support
export class OpenAIProvider implements LLMProvider {
  readonly id = 'openai'
  readonly name = 'OpenAI GPT'

  async complete(options: LLMCompletionOptions): Promise<string> {
    // ... OpenAI SDK calls
  }

  async stream(options: LLMCompletionOptions, onChunk: ...): Promise<void> {
    // ... OpenAI streaming
  }
}

// Register in router.ts
llmRouter.register(new OpenAIProvider())
```

No handler code changes. The router resolves the correct implementation.

---

## Using the Router in a Handler

```typescript
// server/src/routes/ai.ts
import { llmRouter } from '../ai/router'
import { db } from '../db'
import { audit_log } from '../db/schema'

router.post('/complete', async (req, res, next) => {
  const parsed = aiCompleteSchema.safeParse(req.body)
  if (!parsed.success) { next(parsed.error); return }

  const provider = llmRouter.resolve(req.workspace?.providerOverride)

  // Log the AI action BEFORE calling the provider
  await db.insert(audit_log).values({
    workspace_id: req.workspace!.id,
    user_id: req.user!.id,
    action: 'ai.complete',
    payload: { model: parsed.data.model, messageCount: parsed.data.messages.length }
  })

  const result = await provider.complete({
    model: parsed.data.model,
    messages: parsed.data.messages,
    systemPrompt: parsed.data.systemPrompt
  })

  res.json({ content: result })
})
```

Note: the `audit_log` insert happens **before** calling the provider. This ensures the action is logged even if the provider call fails.

---

## Key Points

- The `LLMProvider` interface is the contract. Handlers call `provider.complete()` or `provider.stream()` without knowing which SDK is being used.
- `AnthropicProvider` wraps the Anthropic SDK. A new provider implements the same interface and is registered with the router.
- The `LLMRouter` resolves the correct provider per workspace — the default provider is used unless a workspace override is configured.
- Log to `audit_log` before calling the LLM provider — not after. An action that fails still needs a log entry.
- Never put the Anthropic API key anywhere except `process.env.ANTHROPIC_API_KEY`. Hardcoding it is a critical security violation.
