# useSyncExternalStore: The Hook That Connects React 18 to the World

**Module**: M05 · React 18 + Zustand: The Client State Integration Contract
**Type**: core
**Estimated time**: 15 minutes
**Claim**: C4 — useSyncExternalStore is the integration contract between React 18's concurrent renderer and external state systems

---

## The core idea

React 18's concurrent renderer needs a way to read external state (state that lives outside React's tree) without producing torn reads. `useSyncExternalStore` is the hook React provides for this. It takes two things: a `subscribe` function (called when state changes) and a `getSnapshot` function (returns the current state). React uses `getSnapshot` to make the rendering deterministic: if `getSnapshot` returns the same value between renders, React knows nothing changed. Zustand v4, Lexical, and Meridian's SSE stream integration all honour this contract.

## Why it matters

Before React 18, external state libraries used `useState` + `useEffect` to sync their state into React. This worked because the renderer was synchronous — there was no gap between reading state and committing to the DOM. React 18's concurrent renderer can gap that pair, producing a render that reads stale state. `useSyncExternalStore` closes this gap by making state reads atomic from React's perspective.

## A concrete example

**The contract**

```typescript
import { useSyncExternalStore } from "react"

// A minimal external store
type Listener = () => void

function createExternalStore<T>(initialState: T) {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener) // cleanup
    },

    getSnapshot() {
      return state // must return the SAME reference if state hasn't changed
    },

    setState(newState: T) {
      state = newState        // replace with new reference, never mutate
      listeners.forEach(l => l()) // notify React to re-read getSnapshot
    },
  }
}

// Usage
const store = createExternalStore({ count: 0 })

function Counter() {
  // React calls getSnapshot() during rendering
  // React calls subscribe() to know when to re-render
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return <div>{state.count}</div>
}
```

**What Zustand does internally (simplified)**

```typescript
// zustand/src/react.ts (simplified)
import { useSyncExternalStore } from "react"

export function useStore<T, U>(
  api: StoreApi<T>,
  selector: (state: T) => U,
): U {
  return useSyncExternalStore(
    api.subscribe,

    // getSnapshot: selector applied to current state
    // React calls this multiple times — must return stable reference if unchanged
    () => selector(api.getState()),

    // getServerSnapshot: for SSR hydration
    () => selector(api.getState()),
  )
}
```

The selector pattern (`() => selector(api.getState())`) creates a performance problem: if the selector creates a new object every call, React thinking the state changed every render. Zustand solves this with `shallow` equality:

```typescript
import { useShallow } from "zustand/react/shallow"

// ❌ Creates new array reference every render — wastes reconciliation
const { title, content } = useDocumentStore(
  (state) => ({ title: state.title, content: state.content })
)

// ✅ Stable reference when values haven't changed
const { title, content } = useDocumentStore(
  useShallow((state) => ({ title: state.title, content: state.content }))
)
```

**Connecting an SSE stream to React state**

The AI streaming pattern in Meridian: an Express SSE route sends chunks, the client reads them and accumulates into a Zustand store, React renders the accumulating text without tearing.

```typescript
// client/src/stores/ai-stream.ts
interface AiStreamState {
  content: string
  isStreaming: boolean
  appendChunk: (chunk: string) => void
  setStreaming: (v: boolean) => void
}

const useAiStreamStore = create<AiStreamState>()((set) => ({
  content: "",
  isStreaming: false,

  appendChunk: (chunk) =>
    set((state) => ({ content: state.content + chunk })),

  setStreaming: (isStreaming) =>
    set({ isStreaming }),
}))

// client/src/hooks/use-ai-stream.ts
export function useAiStream(prompt: string) {
  const { appendChunk, setStreaming } = useAiStreamStore()

  useEffect(() => {
    setStreaming(true)
    const es = new EventSource(`/api/ai/stream?prompt=${encodeURIComponent(prompt)}`)

    es.onmessage = (event) => {
      const { delta } = JSON.parse(event.data) as { delta: string }
      appendChunk(delta) // → set() → new state object → React re-renders via useSyncExternalStore
    }

    es.onerror = () => { setStreaming(false); es.close() }
    return () => { setStreaming(false); es.close() }
  }, [prompt])

  return useAiStreamStore(useShallow((s) => ({
    content: s.content,
    isStreaming: s.isStreaming,
  })))
}
```

Each `appendChunk` call produces a new state object (not a mutation), which triggers `useSyncExternalStore`'s listener, which causes React to call `getSnapshot` again — no tearing possible. [S002](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S002-react18-release-notes.md), [S009](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S009-zustand-readme.md)

## Key points

- `useSyncExternalStore` makes external state reads atomic from React's perspective: React calls `getSnapshot` during render, not before it — so there's no gap where state can change
- Zustand's `useShallow` prevents infinite re-render loops when a selector returns a new object reference on every call
- SSE + Zustand + `useSyncExternalStore` is the correct React 18 pattern for AI streaming: chunks flow in asynchronously, accumulate immutably, render without tearing

## Go deeper

- [S002](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S002-react18-release-notes.md) — React 18: useSyncExternalStore API reference and concurrent mode contracts
- [S009](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S009-zustand-readme.md) — Zustand: useShallow, selector patterns, and v4 migration guide

---

*[← Previous: PostgreSQL RLS + pgvector](./L07-postgresql-rls-pgvector.md)* · *[Next: Vite SPA vs Next.js →](./L09-vite-spa-vs-nextjs.md)*
