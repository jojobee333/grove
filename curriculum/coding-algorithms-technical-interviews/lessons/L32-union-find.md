# Union-Find — DSU Template for Connectivity Problems

**Module**: M10 · Backtracking, Union-Find, and Remaining Interview Patterns
**Type**: core
**Estimated time**: 17 minutes
**Claim**: C7 from Strata synthesis

---

## The core idea

**Union-Find** (Disjoint Set Union, DSU) maintains a partition of elements into disjoint sets and supports two operations efficiently:
- `find(x)`: which set does x belong to? (returns the representative/root of x's set)
- `union(x, y)`: merge the sets containing x and y

With **union by rank** and **path compression**, both operations are O(α(n)) amortised where α is the inverse Ackermann function — effectively O(1) for all practical n.

DSU solves graph connectivity problems more efficiently than repeated DFS/BFS when connectivity is built up incrementally (edges added one at a time). The canonical interview application: number of connected components after each edge addition ([S008](../../research/coding-algorithms-technical-interviews/01-sources/web/S008-dsu-cp-algorithms.md)).

## The Complete DSU Template

```python
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))     # each node initially its own parent
        self.rank = [0] * n              # tree height upper bound
        self.components = n              # track number of connected components
    
    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])   # path compression
        return self.parent[x]
    
    def union(self, x: int, y: int) -> bool:
        px, py = self.find(x), self.find(y)
        if px == py:
            return False           # already connected — no merge needed
        if self.rank[px] < self.rank[py]:
            px, py = py, px        # ensure px has higher rank
        self.parent[py] = px       # attach smaller tree to larger
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1     # rank increases only when merging equal-rank trees
        self.components -= 1       # one fewer component
        return True
    
    def connected(self, x: int, y: int) -> bool:
        return self.find(x) == self.find(y)
```

The `components` counter makes it trivial to answer "how many connected components?" at any point — common in problems like "Number of Islands II" (dynamic island formation).

## Path Compression — How It Works

Without path compression, `find(x)` traverses from x to the root — O(height of tree). After path compression, this traversal also re-links every node on the path directly to the root:

```
Before find(7):          After find(7):
1                        1
└── 3                    ├── 3
    └── 5                ├── 5
        └── 7            └── 7
```

Node 7, 5, and 3 all point directly to 1 after `find(7)`. Subsequent `find(7)`, `find(5)`, `find(3)` are all O(1).

This amortises the cost — an expensive `find` "pays for" itself by making all future finds on the same path free.

## Canonical Problem: Number of Connected Components

```python
def count_components(n: int, edges: list[list[int]]) -> int:
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return uf.components
```

After processing all edges, `uf.components` holds the answer. O(E × α(n)) time, O(n) space.

## Canonical Problem: Accounts Merge (LeetCode 721)

Group email accounts that belong to the same person (accounts with shared emails should merge):

```python
def accounts_merge(accounts: list[list[str]]) -> list[list[str]]:
    # Assign each account an index, union accounts sharing any email
    uf = UnionFind(len(accounts))
    email_to_account = {}
    
    for i, account in enumerate(accounts):
        for email in account[1:]:
            if email in email_to_account:
                uf.union(i, email_to_account[email])
            email_to_account[email] = i
    
    # Group emails by account root
    from collections import defaultdict
    merged = defaultdict(set)
    for email, acc_idx in email_to_account.items():
        merged[uf.find(acc_idx)].add(email)
    
    return [[accounts[root][0]] + sorted(emails)
            for root, emails in merged.items()]
```

## When to Use DSU vs. DFS/BFS

| Criterion | DSU | DFS/BFS |
|---|---|---|
| Edges added incrementally | ✅ O(α(n)) per union | ❌ O(V+E) per re-computation |
| Static graph, one-time connectivity | Either (BFS slightly simpler) | ✅ Familiar |
| Cycle detection (undirected) | ✅ union returns False if already connected | ✅ parent tracking in DFS |
| Shortest path | ❌ DSU cannot compute distances | ✅ BFS required |
| Dynamic connectivity (add + remove edges) | ❌ DSU is add-only by default | ✅ Rebuild each time (or link-cut tree) |
| "Are these two nodes in the same component?" | ✅ O(α(n)) query | ✅ O(1) if pre-labeled with BFS |

## DSU for Cycle Detection in Undirected Graphs

```python
def has_cycle(n: int, edges: list[list[int]]) -> bool:
    uf = UnionFind(n)
    for u, v in edges:
        if not uf.union(u, v):    # union returns False if already in same set
            return True            # this edge connects already-connected nodes = cycle
    return False
```

For directed graph cycle detection, use DFS three-colouring (L13) — DSU doesn't track edge direction.

## Kruskal's MST — DSU Application

Minimum spanning tree via Kruskal's algorithm: sort edges by weight, greedily add edge if it connects two different components:

```python
def kruskal_mst(n: int, edges: list[list[int]]) -> int:
    edges.sort(key=lambda e: e[2])    # sort by weight
    uf = UnionFind(n)
    total_weight = 0
    
    for u, v, weight in edges:
        if uf.union(u, v):            # only add edge if it merges two components
            total_weight += weight
            if uf.components == 1:
                break                  # all nodes connected — done
    
    return total_weight if uf.components == 1 else -1   # -1 if not fully connected
```

DSU makes the "are these already connected?" check O(α(n)) — the dominant cost is O(E log E) for sorting.

## Key points

- DSU maintains disjoint sets. `find(x)` returns the root/representative; `union(x, y)` merges two sets.
- Path compression: re-link every node on the find-path directly to root — amortises future finds.
- Union by rank: always attach the shallower tree under the deeper one — bounds tree height at O(log n).
- Combined: O(α(n)) per operation — effectively O(1) for practical n.
- `union()` returns False if x and y were already connected — use this for cycle detection and Kruskal's.

## Go deeper

- [S008](../../research/coding-algorithms-technical-interviews/01-sources/web/S008-dsu-cp-algorithms.md) — CP-Algorithms DSU: path compression, union by rank, O(α(n)) proof sketch
- [S007](../../research/coding-algorithms-technical-interviews/01-sources/web/S007-amortized-analysis-wikipedia.md) — amortised analysis: how path compression is analysed

---

*← [Previous lesson](./L31-backtracking.md)* · *[Next lesson: The DP Priority Debate — General Prep vs. Google Track](./L33-dp-priority-debate.md) →*
