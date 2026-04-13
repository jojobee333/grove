# React 18 Concurrent Rendering and Why Mutation Breaks It

**Module**: M02 · Immutability: The Architectural Principle Behind Three Layers
**Type**: core
**Estimated time**: 15 minutes
**Claim**: C4 — React 18's concurrent rendering model mandates immutable state across the entire client stack

---

## The core idea

React 18's concurrent renderer can interrupt a render mid-flight, discard its partial output, and restart later. This is what makes `startTransition` and Suspense safe. But it only works if state is immutable — if React can hold a reference to a past state snapshot and trust that it will never change underneath it. Mutable state turns concurrent rendering from a feature into a source of corrupting bugs.

## Why it matters

Every state-adjacent tool that integrates with Meridian's client — Zustand, Lexical, and SSE streaming — had to update its internals for React 18 concurrent mode. Zustand v4 changed its entire subscription mechanism. Lexical freezes its EditorState. If you understand *why* they made those changes, their APIs make sense. If you don't, they look like arbitrary design quirks.

## A concrete example

**The problem: state tearing**

Imagine a Zustand store backing a rich-text editor with a `documentTitle` field. React 18 starts rendering a component that reads `documentTitle`. Halfway through, React yields to a higher-priority update. While yielded, a mutation changes `documentTitle` in place. React resumes the original render and reads `documentTitle` again — but now gets a different value. The rendered output shows different title text in different parts of the component tree. This is tearing.

```typescript
// ❌ Mutable store — causes tearing in React 18
const buggyStore = {
  documentTitle: "Untitled",
  setTitle(title: string) {
    this.documentTitle = title // mutates in-place
  }
}

// ✅ Immutable store — safe under concurrent rendering
const useDocumentStore = create<{ title: string; setTitle: (t: string) => void }>()
  ((set) => ({
    title: "Untitled",
    setTitle: (title) => set({ title }), // produces a new state object
  }))
```

**`useSyncExternalStore`: React 18's contract with external state**

Zustand v4 replaced its custom subscription mechanism with `useSyncExternalStore`:

```typescript
// What Zustand does internally (simplified)
import { useSyncExternalStore } from "react"

function useStore<T>(store: Store<T>, selector: (state: T) => unknown) {
  return useSyncExternalStore(
    store.subscribe,    // called when state changes
    store.getSnapshot,  // must return the same reference if state is unchanged
    store.getSnapshot,  // server snapshot (same for SSR)
  )
}
```

`getSnapshot` must return a stable reference — the same object reference — if the state hasn't changed. This is the immutability contract: React can call `getSnapshot` multiple times during a concurrent render and trust that equal references mean equal values. [S002](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S002-react18-release-notes.md), [S009](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S009-zustand-readme.md)

**StrictMode double-invocation**

React 18's StrictMode invokes state initializers and some effects twice in development. This is not a bug — it's a deliberate mechanism to surface code that relies on mutation. If your state initializer has a side effect (mutates something), it will fail in development and work in production, revealing the bug before it ships. [S002](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S002-react18-release-notes.md)

## Key points

- React 18's concurrent renderer requires immutable state because it can hold multiple state snapshots simultaneously during interrupted renders
- `useSyncExternalStore` is the hook that formalises this contract — Zustand, Lexical, and AI streaming integration all use it
- StrictMode double-invocation in development is a feature that detects mutation-dependent code before it reaches production

## Go deeper

- [S002](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S002-react18-release-notes.md) — React 18 release notes: concurrent rendering, startTransition, useSyncExternalStore
- [S009](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S009-zustand-readme.md) — Zustand: why v4 switched to useSyncExternalStore

---

*[← Previous: Strict Mode Through Libraries](./L02-strict-mode-through-libraries.md)* · *[Next: Immutable Operations in Yjs →](./L04-immutable-ops-yjs-crdts.md)*
