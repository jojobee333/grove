# @lexical/yjs in Practice: Editor State as a Y.XmlFragment

**Module**: M06 · Collaborative Editing: Yjs, CRDTs, and Lexical
**Type**: applied
**Estimated time**: 15 minutes
**Claim**: C5 — @lexical/yjs binds Lexical's immutable EditorState to Yjs's CRDT document model

---

## The core idea

`@lexical/yjs` maps Lexical's editor state (a frozen tree of nodes) to a Yjs `Y.XmlFragment` (a CRDT-backed XML fragment). When a user types in the Lexical editor, the binding translates the EditorState delta into a Yjs operation. When a remote peer's update arrives, the binding translates the Yjs operation into a Lexical `editor.update()` call. The two immutable models (Lexical's frozen state snapshots and Yjs's immutable operations) work together because neither system violates the other's immutability contract.

## Why it matters

Understanding the binding tells you what actually wires together when you see `<CollaborationPlugin>` in a Meridian component. It tells you why `awareness` is separate from the document content (cursor positions are ephemeral, not CRDT-tracked). And it tells you what lifecycle events to handle to avoid memory leaks and zombie WebSocket connections.

## A concrete example

**Complete collaborative editor setup**

```typescript
// client/src/components/editor/CollaborativeEditor.tsx
import { useEffect, useRef, useState, useCallback } from "react"
import { LexicalComposer, InitialConfigType } from "@lexical/react/LexicalComposer"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin"
import { Provider } from "@lexical/yjs"
import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"

interface CollaborativeEditorProps {
  documentId: string
  userId: string
  username: string
}

export function CollaborativeEditor({
  documentId,
  userId,
  username,
}: CollaborativeEditorProps) {
  const initialConfig: InitialConfigType = {
    namespace: "meridian",
    // When CollaborationPlugin is active, initial editor state
    // comes from Yjs — null tells Lexical not to initialise its own state
    editorState: null,
    onError: (error) => console.error("Lexical error:", error),
  }

  // providerFactory is called by CollaborationPlugin to create the Yjs provider
  // It receives the ydoc and returns a provider + awareness
  const providerFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Y.Doc>): Provider => {
      // Multiple documents can share one ydoc map — indexed by documentId
      let ydoc = yjsDocMap.get(id)
      if (!ydoc) {
        ydoc = new Y.Doc()
        yjsDocMap.set(id, ydoc)
      }

      // y-websocket provider — connects to Meridian's sync server
      const provider = new WebsocketProvider(
        "ws://localhost:1234",
        id,      // room name = document ID
        ydoc,
      )

      // Awareness: ephemeral peer state (cursor positions, user info)
      // NOT stored in the CRDT — lost when the peer disconnects
      provider.awareness.setLocalStateField("user", {
        name: username,
        color: getUserColor(userId),
      })

      return provider as unknown as Provider
    },
    [documentId, userId, username],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Start writing...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <CollaborationPlugin
        id={documentId}
        providerFactory={providerFactory}
        // Initial value to use if the document is new (first peer in the room)
        initialEditorState={null}
        // When true, CollaborationPlugin handles cursor rendering
        shouldBootstrap={true}
      />
    </LexicalComposer>
  )
}

function getUserColor(userId: string): string {
  // Deterministic colour from userId — consistent across sessions
  const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"]
  const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
```

**What CollaborationPlugin wires together**

```
User types in ContentEditable
  ↓
Lexical's reconciler creates a new frozen EditorState
  ↓
@lexical/yjs observes the EditorState diff
  ↓
Translates diff to Y.XmlFragment operations (immutable)
  ↓
Y.Doc emits a binary update
  ↓
WebsocketProvider sends update to y-websocket server
  ↓
Server relays to all other peers in the same room

Remote update arrives:
  ↑
WebsocketProvider receives binary update
  ↓
Y.Doc applies the update (CRDT merge)
  ↓
@lexical/yjs observes the Y.XmlFragment change
  ↓
Calls editor.update() with new node tree
  ↓
Lexical produces new frozen EditorState
  ↓
React renders via useSyncExternalStore
```

**Awareness: cursor positions as ephemeral state**

```typescript
// Awareness state is ephemeral CRDT-like data
// It synchronises between peers but is NOT persisted
// When a peer disconnects, their awareness state is cleaned up

// Reading other users' cursor positions for rendering
provider.awareness.on("change", () => {
  const states = provider.awareness.getStates()
  
  // Map to cursor positions for rendering
  const cursors = Array.from(states.entries())
    .filter(([clientId]) => clientId !== provider.awareness.clientID)
    .map(([clientId, state]) => ({
      clientId,
      user: state.user as { name: string; color: string },
      anchor: state.anchor,
      focus: state.focus,
    }))
    
  // Update cursor overlay in UI
  setCursors(cursors)
})
```

**The offline sync lifecycle**

The y-websocket provider handles offline/reconnect automatically. When offline, Yjs continues accepting local operations (stored in the Y.Doc). When the WebSocket reconnects, the provider sends all pending updates to the server, which relays them to peers. Both peers run CRDT merge and converge. No manual handling needed — this is what CRDT gives you over OT. [S006](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S006-yjs.md), [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md)

## Key points

- `CollaborationPlugin` wires Lexical's `EditorState` diffs to `Y.XmlFragment` operations bidirectionally — a two-way immutable-to-immutable bridge
- `awareness` is for ephemeral per-peer state (cursor, user colour); it synchronises but is not CRDT-persisted — lost when the peer disconnects
- The offline sync lifecycle requires no manual handling: Yjs buffers local operations when disconnected and the provider syncs them on reconnect via CRDT merge

## Go deeper

- [S006](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S006-yjs.md) — Yjs: Y.XmlFragment, awareness protocol, and provider lifecycle
- [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md) — Lexical: `@lexical/yjs` CollaborationPlugin props and offline behaviour

---

*[← Previous: CRDTs vs OT](./L10-crdts-vs-ot.md)* · *[Next: The Four RAG Stages →](./L12-four-rag-stages.md)*
