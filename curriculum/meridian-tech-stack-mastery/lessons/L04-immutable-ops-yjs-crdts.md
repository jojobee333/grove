# Immutable Operations in Yjs: The Math Behind CRDT Convergence

**Module**: M02 · Immutability: The Architectural Principle Behind Three Layers
**Type**: core
**Estimated time**: 15 minutes
**Claim**: C6 — Yjs's CRDT model requires immutable operations to guarantee convergence

---

## The core idea

A Yjs operation — inserting a character, deleting a range, updating a property — is an immutable value. It describes a transformation to apply, not a new target state. Two peers can receive the same set of operations in any order and, because each operation is immutable and operations follow CRDT commutativity rules, they always arrive at the same final state. This is the mathematical guarantee behind conflict-free collaborative editing.

This is the same principle that governs Lexical's `EditorState`: it is frozen after every update. The editor doesn't mutate in place — it accepts a function that produces a new state.

## Why it matters

If you're integrating Lexical with Yjs in Meridian (via `@lexical/yjs`), you're working with two systems that both treat state as immutable snapshots. Understanding *why* both systems made this choice tells you how they connect, what to expect when something goes wrong, and why you can't just grab Lexical state and mutate it directly.

## A concrete example

**CRDT commutativity — the key property**

For collaborative editing to work without a central authority that orders all changes, every operation must commute: applying operation A then operation B must produce the same result as applying B then A.

```
Peer 1: insert("e") at position 2
Peer 2: insert("!") at position 5

// If both peers start from "Hello" and both operations arrive:
// Peer 1 applies their own insert, then receives Peer 2's:
// "Hello" → "Helelo" → "Helelo!" (wrong position from B's perspective)

// Yjs solution: operations carry a Unique ID (lamport clock + peer ID)
// Insertion is always relative to the *identity* of adjacent characters, not their position
// So both convergence orders produce the same result: "Helelo!"
```

The operation identity approach means each insert operation is an immutable value: `{ id: [clock, clientId], left: <ref to predecessor>, right: <ref to successor>, content: "e" }`. You can never mutate this object — if you did, the convergence guarantee would break.

**Yjs operation model vs direct mutation**

```typescript
import * as Y from "yjs"

const ydoc = new Y.Doc()
const ytext = ydoc.getText("content")

// ✅ Correct: encapsulate mutations in a transaction
// Yjs creates immutable operation objects during the transaction
ydoc.transact(() => {
  ytext.insert(0, "Hello")
  ytext.insert(5, " World")
}, "origin-peer-1")

// ❌ Cannot do: ytext.content = "Hello World"
// There is no mutable set on Y.Text — only insert/delete/format operations
// Each call produces a new operation object, not a mutation

// Observing changes — you get a Y.YTextEvent with immutable deltas
ytext.observe((event) => {
  // event.delta is an array of immutable operation records
  // [{ insert: "Hello" }, { insert: " World" }]
  console.log(event.delta) 
})
```

**Lexical's frozen EditorState — the same principle applied to the DOM**

```typescript
import { createEditor, $getRoot, $createTextNode, $createParagraphNode } from "lexical"

const editor = createEditor({ /* config */ })

// Every state change goes through editor.update()
// The callback receives a frozen snapshot; mutations inside create a new state
editor.update(() => {
  const root = $getRoot()
  const paragraph = $createParagraphNode()
  paragraph.append($createTextNode("Hello"))
  root.append(paragraph)
})

// editor.getEditorState() returns a frozen EditorState object
// You cannot mutate it outside of editor.update()
// Attempting to do so throws in development
const state = editor.getEditorState()
// state._nodeMap is frozen — Object.isFrozen(state._nodeMap) === true
```

Both Yjs and Lexical model state change as: *here is an immutable description of what changed* — never *here is the new mutable state*. When `@lexical/yjs` connects them, a change in Lexical produces an immutable delta, which becomes an immutable Yjs operation, which propagates to other peers. [S006](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S006-yjs.md), [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md)

## Key points

- Yjs operations are immutable value objects; their identity (clientId + clock) is what enables CRDT commutativity and convergence without a central server
- Lexical's `EditorState` is frozen after every `editor.update()` call — the same immutable-snapshot model
- `@lexical/yjs` bridges them by mapping frozen EditorState deltas to immutable Yjs operations — mutual immutability is what makes the bridge work

## Go deeper

- [S006](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S006-yjs.md) — Yjs documentation: shared types, operations, and the convergence guarantee
- [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md) — Lexical documentation: EditorState immutability and update lifecycle

---

*[← Previous: React 18 Concurrent Rendering](./L03-react18-concurrent-rendering.md)* · *[Next: One Lens for Every Technology Decision →](./L05-control-vs-abstraction-lens.md)*
