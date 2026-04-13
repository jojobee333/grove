# Vite SPA vs Next.js: Why SSR-First Frameworks Break Meridian

**Module**: M05 · React 18 + Zustand: The Client State Integration Contract
**Type**: debate
**Estimated time**: 15 minutes
**Claim**: C3 — Vite SPA is the architecturally correct choice for Meridian; Next.js App Router is not

---

## The core idea

Next.js App Router is designed around server-first rendering: components run on the server by default, data fetches happen at the server, and the client progressively hydrates. This architecture is optimal for content-heavy, SEO-important sites. Meridian is the opposite: a collaborative, real-time editor where the most complex components — Lexical's DOM, Yjs's WebSocket provider — cannot run on the server at all. Using Next.js for Meridian would not just be suboptimal; it would require working against the framework's design at every layer.

## Why it matters

The "just use Next.js" reflex is strong because Next.js has excellent DX and broad adoption. Understanding specifically *why* it breaks for Meridian's architecture prevents a costly decision made on familiarity. It also clarifies Vite's role: not a framework, but a build tool — giving you full control over what runs where.

## A concrete example

**Why Lexical cannot run on the server**

Lexical is a DOM-dependent editor. Its core architecture builds and manipulates a shadow node tree that maps to DOM nodes. It uses `document.createElement`, `MutationObserver`, and `Selection` APIs. None of these exist in Node.js.

```typescript
// Lexical source — creates DOM nodes during reconciliation
// This code path executes even during "passive" operations like read()
import { createEditor } from "lexical"

// ❌ In a Next.js Server Component (runs on Node.js):
// throws: "document is not defined"
const editor = createEditor({ namespace: "meridian" })

// ✅ In a client component (runs in the browser):
"use client"
const editor = createEditor({ namespace: "meridian" })
```

The Next.js workaround is `dynamic(() => import(...), { ssr: false })` — essentially opting out of SSR for the editor component. But if the editor is the core of your product and SSR is disabled for it, you've gained nothing from Next.js's primary feature.

**Why Y.WebsocketProvider cannot run on the server**

Yjs's `WebsocketProvider` connects to a WebSocket URL on instantiation. WebSocket connections are bi-directional, long-lived, and browser-native. Server Components don't persist between requests — they render once, return HTML or RSC payload, and exit. There's no socket lifecycle to manage.

```typescript
// server/src/sync-server.ts — Meridian runs its own ws server
import { WebSocketServer } from "ws"
import { setupWSConnection } from "y-websocket/bin/utils"

const wss = new WebSocketServer({ port: 1234 })

wss.on("connection", (ws, req) => {
  setupWSConnection(ws, req, { docName: req.url?.slice(1) })
})

// client/src/editor/CollaborativeEditor.tsx
"use client" // Next.js — must mark client
import { WebsocketProvider } from "y-websocket"
import { useEffect, useRef } from "react"

// Provider must be created inside useEffect — client-only, after mount
useEffect(() => {
  const provider = new WebsocketProvider(
    "ws://localhost:1234",
    documentId,
    ydoc,
  )
  return () => provider.destroy()
}, [documentId])
```

With Vite SPA, there's no server-side concept to worry about. Every component is a client component. The `useEffect` is still needed for cleanup, but there's no architectural overhead.

**What Vite SPA gives Meridian**

```
Vite SPA                           Next.js App Router
─────────────────────────────────  ──────────────────────────────────
All components run in browser      Components run on server by default
No SSR hydration complexity        Hydration mismatch errors possible
Full WebSocket lifecycle control   WebSocket requires client boundary
Lexical runs without workaround    Requires ssr: false for editor
y-websocket works as designed      Requires useEffect + "use client"
Build output: static files + API   Build output: server + static files
Deployment: CDN + Express          Deployment: Node.js server required
```

**The SPA trade-off Meridian accepts**

Vite SPA means no server-side rendering, so the initial page load is a blank HTML shell with a script tag. Search engines can't crawl Meridian's document content. For a workspace tool — authenticated, behind a login wall — this is correct: the content is private, SEO is irrelevant, and the faster initial interactive time from a CDN-served SPA outweighs the cost of no SSR. [S008](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S008-vite.md), [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md)

## Key points

- Lexical depends on `document`, `MutationObserver`, and `Selection` — APIs that don't exist in Node.js, making it fundamentally incompatible with Next.js Server Components
- Y.WebsocketProvider requires persistent connection lifecycle management that is incompatible with the stateless request/response model of Server Components
- Vite SPA is not a compromise — for Meridian (authenticated, real-time, collaborative), it's the architecturally correct choice: no SSR overhead, full client control, CDN-optimal static output

## Go deeper

- [S008](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S008-vite.md) — Vite: build pipeline, SPA mode, and HMR architecture
- [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md) — Lexical: DOM dependency and why SSR is unsupported

---

*[← Previous: useSyncExternalStore](./L08-usesyncexternalstore.md)* · *[Next: CRDTs vs OT →](./L10-crdts-vs-ot.md)*
