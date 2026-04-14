# BFS vs. DFS Space — Queue vs. Stack Trade-offs

**Module**: M07 · Space Complexity and Recursion Depth
**Type**: applied
**Estimated time**: 30 minutes
**Claim**: C5 from Strata synthesis

---

## The situation

BFS and DFS both explore all V vertices and E edges in O(V + E) time and O(V) space in the worst case. But their space usage has very different **shapes**: BFS can consume proportional to the **width** of the graph at the current level; DFS consumes proportional to the **depth** of the DFS tree. For some graphs, this difference matters enormously.

## BFS Space: Proportional to Frontier Width

BFS holds an entire "frontier" in its queue. At any moment, the queue contains all nodes at the current level and possibly the next level:

```
Tree level widths (complete binary tree):
Level 0: 1 node
Level 1: 2 nodes
Level 2: 4 nodes
Level 3: 8 nodes
...
Level h: 2^h nodes  ← maximum queue size at leaf level
```

For a balanced binary tree with n nodes, the widest level has n/2 nodes → **O(n) BFS space**.

For a sparse graph (like a path: 1→2→3→...→n), BFS on node 1 has a queue of size 1 at every step → O(1) queue space at any moment, but still O(n) visited set.

**BFS queue space = O(maximum level width)** = O(w) where w is the maximum width.

## DFS Space: Proportional to Path Depth

DFS holds only the current path from root to the current node. The stack contains at most h+1 nodes where h is the maximum depth:

```
DFS on tree (balanced, height h = log n):
Recursion stack at deepest point: [root, child, grandchild, ..., leaf]
                                   = h+1 frames = O(log n)
```

For a degenerate tree (linked list), DFS depth = n → **O(n) DFS stack space**.

**DFS stack space = O(maximum path depth)** = O(d) where d is the depth.

## Comparing BFS and DFS Space

| Graph structure | BFS queue space | DFS stack space | Winner |
|---|---|---|---|
| Balanced binary tree (height log n) | O(n/2) = **O(n)** | O(log n) | **DFS** |
| Degenerate tree (chain) | O(1) | O(n) | **BFS** |
| Grid (m × n) | O(min(m, n)) frontier | O(m × n) worst | **BFS** |
| Dense graph, diameter 2 | O(n) — all neighbors enqueued | O(n) — quickly reaches leaves | Tied |
| Sparse graph, long path | O(1) queue | O(n) path stack | **BFS** |

**Key takeaway**: Neither algorithm dominates. The choice depends on graph structure:
- Shallow and wide → DFS is more space-efficient
- Deep and narrow → BFS is more space-efficient

For competitive programming where the graph structure is unknown or adversarial (e.g., the judge might send a skewed tree), the safe default for space is:
- Use **iterative BFS** for shortest path / minimum depth
- Use **iterative DFS** (explicit stack) for cycle detection / topo sort

## Memory Footprint in Practice

For `n = 10⁵` nodes:

**BFS** with balanced tree:
- Queue peaks at ~50,000 nodes = ~50,000 × 8 bytes (pointers) ≈ 400KB

**DFS recursive** with degenerate tree:
- Call stack peaks at 100,000 frames × ~200 bytes per frame ≈ 20MB (likely exceeds 8MB OS limit → segfault)

**DFS iterative** with degenerate tree:
- Stack list peaks at 100,000 elements × 8 bytes ≈ 800KB (heap memory, no OS limit)

The OS call stack is the bottleneck, not heap memory. Iterative DFS sidesteps this by moving the stack data to the heap.

## Shortest-Path Implication

Because BFS processes nodes level by level, it finds the shortest path in terms of number of edges. DFS finds some path, but not necessarily the shortest one.

This is a space vs. correctness trade-off, not just efficiency:
- BFS: O(w) queue space, guaranteed shortest path
- DFS: O(d) stack space, no shortest-path guarantee

When shortest path is required, BFS is not just preferred — it's correct, and DFS is wrong.

## Practical Decision Framework

```
Do I need shortest path?
  YES → BFS (mandatory)
  NO ↓

Is the graph potentially very wide (dense, complete)?
  YES → DFS (avoids wide queue)
  NO ↓

Could the graph be very deep (chain, skewed tree)?
  YES → BFS (avoids deep stack)
  NO → Either works; pick BFS for iterative clarity
```

For grids (2D matrix problems like Number of Islands, Shortest Path in Binary Matrix):
- **BFS** for shortest path
- **DFS** for "does all land connect" / flood fill (depth doesn't matter, and DFS code is slightly simpler)

## Key points

- BFS space is proportional to maximum frontier width; DFS space is proportional to maximum path depth.
- For balanced trees: DFS uses O(log n), BFS uses O(n) — DFS is far better.
- For skewed trees (chains): BFS uses O(1) queue, DFS uses O(n) stack — BFS is far better.
- Iterative DFS puts the stack on the heap (no recursion limit); recursive DFS uses the OS call stack (limited to ~1000 frames by default in Python).
- BFS is required (not just preferred) when the problem asks for minimum distance or shortest path.

## Go deeper

- [S029](../../research/coding-algorithms-technical-interviews/01-sources/web/S029-graph-cheatsheet-tih.md) — TIH graph cheatsheet comparing BFS and DFS space and correctness properties
- [S027](../../research/coding-algorithms-technical-interviews/01-sources/web/S027-dfs-template-cp-algorithms.md) — CP-Algorithms DFS with stack depth discussion

---

*← [Previous lesson](./L22-python-recursion-limit.md)* · *[Next lesson: DP — Recognising Optimal Substructure](./L24-dp-recognition.md) →*
