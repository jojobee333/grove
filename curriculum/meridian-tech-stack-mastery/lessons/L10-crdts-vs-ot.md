# CRDTs vs OT: Why the Algorithm Choice Determines the Editor Choice

**Module**: M06 · Collaborative Editing: Yjs, CRDTs, and Lexical
**Type**: core
**Estimated time**: 15 minutes
**Claim**: C6 — The CRDT algorithm choice determines the editor choice; they cannot be separated

---

## The core idea

Operational Transformation (OT) and Conflict-free Replicated Data Types (CRDTs) are two algorithms for resolving concurrent edits in collaborative documents. They are not interchangeable choices for the same problem — they make different architectural commitments. OT requires a central server to order all operations. CRDTs do not. This difference is what connects the algorithm choice directly to the editor choice: Yjs (CRDT) has a first-class `@lexical/yjs` binding; Google Docs-style OT requires a central server that Meridian's architecture doesn't want.

## Why it matters

Knowing the difference between OT and CRDTs explains why `y-websocket` is a synchronisation *relay*, not a conflict resolution server. It explains why Meridian can support offline editing (edit while disconnected, sync when reconnected). And it explains why the binding quality matters: `@lexical/yjs` is maintained by the Lexical team, not a community member.

## A concrete example

**Operational Transformation — the central authority model**

OT transforms concurrent operations so they can be applied in any order while producing the same result. The key constraint: with two concurrent operations `a` and `b`, you need to compute `a'` (what `a` becomes after `b` has been applied) — the transformation function. For complex document structures, this function is notoriously difficult to implement correctly.

The deeper problem: OT transformation functions require global knowledge of all pending operations to compute correctly. This requires a central server that sees all operations and performs the transformations.

```
Client A:  insert("e") at index 2      →  sends to server
Client B:  delete(2, 1) at index 2     →  sends to server

Server:    OT transforms both operations against each other
           and sends transformed versions to each client
           
Without server: Client A and B might arrive at different states
               because each computed the wrong transformation
```

**CRDTs — the convergence-without-coordination model**

CRDTs provide a mathematical property: for any two sets of operations applied in any order, the result is always the same. This works because each operation carries enough information (its own identity: a Lamport clock + peer ID) to be correctly positioned relative to other operations without coordination.

```
Client A:  {id: [3, "A"], left: "o", right: "!", content: "e"}
           // Insert 'e' after the 'o' in "Hello!" 
           
Client B:  {id: [3, "B"], left: "o", right: "!", content: "W"}
           // Insert 'W' after the 'o' in "Hello!"

Both clients receive both operations:
A applies B after its own: "Heleo!" → "HeleoW!" (positions from identities)
B applies A after its own: "HelloW!" → "HelloeW!" 

Hmm, different order... but because IDs are unique and both clients
use same deterministic conflict resolution (e.g., sort by peer ID),
both arrive at: "HelloeW!" or "HelloWe!" consistently
```

The point: no server needed to decide the order. Both peers converge independently.

**Why this makes y-websocket a relay, not a resolver**

```yaml
# y-websocket server — from Meridian's docker-compose.yml
yjs:
  image: yjs/y-websocket
  ports:
    - "1234:1234"
  # Note: no complex OT transformation logic here
  # y-websocket simply relays Y.Doc updates between peers
  # Conflict resolution happens inside y.js (CRDT) on each client
```

The y-websocket server is a message relay — it forwards Yjs update binaries from one peer to all others. If peer A and peer B are both offline and make concurrent edits, they each produce Yjs updates. When both reconnect, y-websocket relays their updates to each other. Each peer applies both sets of updates using Yjs's CRDT algorithm and converges to the same state — without the server having seen the conflict.

**The chain: offline requirement → Yjs → Lexical**

```
Requirement: support offline editing (edit while disconnected)
  ↓
Requires: algorithm that doesn't need a central authority
  ↓
Algorithm: CRDT (specifically Yjs's YATA algorithm)
  ↓
Library: Yjs (reference CRDT implementation for collaborative text)
  ↓
Editor requirement: first-class Yjs integration, not a community binding
  ↓
Editor: Lexical (official @lexical/yjs package, maintained by Meta)
  ↓
Not: ProseMirror (y-prosemirror is third-party, not Yjs-first)
  ↓
Not: TipTap (uses y-prosemirror under the hood for Yjs)
```

[S006](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S006-yjs.md), [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md)

## Key points

- OT requires a central server that serializes and transforms all operations; CRDT convergence is guaranteed client-side, making CRDTs the only practical choice for offline-capable collaborative editing
- `y-websocket` is a relay server, not a conflict resolver — CRDT resolution happens inside Yjs on each client; the server just ensures all clients eventually receive all updates
- The chain is deterministic: offline requirement → CRDT → Yjs → Lexical (because `@lexical/yjs` is first-class); choosing ProseMirror or TipTap would require a third-party binding that the Yjs team doesn't maintain

## Go deeper

- [S006](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S006-yjs.md) — Yjs: YATA algorithm, convergence proofs, and provider architecture
- [S007](../../vault/research/meridian-tech-stack-mastery/01-sources/web/S007-lexical.md) — Lexical: `@lexical/yjs` integration and the offline sync lifecycle

---

*[← Previous: Vite SPA vs Next.js](./L09-vite-spa-vs-nextjs.md)* · *[Next: @lexical/yjs in Practice →](./L11-lexical-yjs-in-practice.md)*
