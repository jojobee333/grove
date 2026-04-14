# BFS — Shortest Path, Level-Order, and Connected Components

**Module**: M04 · Tree and Graph Traversal — BFS/DFS Duality
**Type**: core
**Estimated time**: 40 minutes
**Claim**: C12 from Strata synthesis

---

## The core idea

Breadth-First Search explores a graph or tree **level by level** — all nodes at distance d from the source before any node at distance d+1. This property gives BFS its defining guarantee: **in an unweighted graph, the first time BFS reaches a node, it has found the shortest path to that node** ([S019](../../research/coding-algorithms-technical-interviews/01-sources/web/S019-bfs-cp-algorithms.md)).

This guarantee is unique to BFS. DFS does not guarantee it — DFS might find a longer path first. Whenever a problem asks for shortest path, minimum steps, minimum transformations, or BFS-specific level-counting, BFS is the correct traversal.

## The BFS template

```python
from collections import deque

def bfs(graph: dict[int, list[int]], source: int) -> dict[int, int]:
    dist = {source: 0}
    queue = deque([source])
    
    while queue:
        node = queue.popleft()         # O(1) — always use deque, never list.pop(0)
        for neighbor in graph[node]:
            if neighbor not in dist:   # only process unvisited nodes
                dist[neighbor] = dist[node] + 1
                queue.append(neighbor)
    
    return dist                        # dist[v] = shortest path length from source to v
```

**Why `deque`, not `list`**: `list.pop(0)` is O(n) — it shifts all remaining elements left. `deque.popleft()` is O(1) — it removes from a doubly-linked structure whose front is efficiently accessible. Using `list.pop(0)` in BFS makes the algorithm O(V + E·V) = O(V²) instead of O(V + E). This is a critical hidden-cost trap ([S025](../../research/coding-algorithms-technical-interviews/01-sources/web/S025-stack-monotonic-pattern-tih.md)).

**Visited tracking**: The `dist` dictionary doubles as the visited set — any node in `dist` has been queued. Adding a node to `dist` before it is processed (immediately when it is discovered) is critical. If you only mark it visited when you process it, the same node can be queued multiple times, causing duplicate work.

## Connected Components

BFS detects connected components in an undirected graph:

```python
def count_components(n: int, edges: list[list[int]]) -> int:
    # Build adjacency list
    graph = {i: [] for i in range(n)}
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)
    
    visited = set()
    count = 0
    
    for node in range(n):
        if node not in visited:
            count += 1                 # new component found
            # BFS from this node to mark entire component
            queue = deque([node])
            visited.add(node)
            while queue:
                curr = queue.popleft()
                for neighbor in graph[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
    
    return count
```

BFS from every unvisited node: each node and edge is processed exactly once total → O(V + E).

## 2D Matrix BFS — The Direction-Tuple Idiom

Many grid problems are BFS on an implicit graph where nodes are cells `(r, c)` and edges connect adjacent cells. The **direction-tuple idiom** is the standard way to express adjacency cleanly:

```python
def num_islands(grid: list[list[str]]) -> int:
    rows, cols = len(grid), len(grid[0])
    visited = set()
    islands = 0
    
    DIRS = [(0,1),(0,-1),(1,0),(-1,0)]  # right, left, down, up
    
    def bfs(r: int, c: int) -> None:
        queue = deque([(r, c)])
        visited.add((r, c))
        while queue:
            row, col = queue.popleft()
            for dr, dc in DIRS:
                nr, nc = row + dr, col + dc
                if (0 <= nr < rows and 0 <= nc < cols   # bounds check
                        and grid[nr][nc] == "1"          # is land
                        and (nr, nc) not in visited):
                    visited.add((nr, nc))
                    queue.append((nr, nc))
    
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in visited:
                bfs(r, c)
                islands += 1
    
    return islands
```

**Why BFS over DFS here?** Both work for island counting (L13 discusses DFS). BFS is preferred when shortest distance is needed — e.g., "01 Matrix" (LeetCode 542): distance of each cell to the nearest 0. BFS from *all* 0s simultaneously finds minimum distances for all cells in a single pass.

## Multi-Source BFS

Standard BFS starts from one source. Multi-source BFS starts from multiple sources simultaneously — useful when the "distance from any of N sources" is needed.

```python
def zero_distance(mat: list[list[int]]) -> list[list[int]]:
    rows, cols = len(mat), len(mat[0])
    dist = [[float("inf")] * cols for _ in range(rows)]
    queue = deque()
    
    # Initialise with all zeros as sources
    for r in range(rows):
        for c in range(cols):
            if mat[r][c] == 0:
                dist[r][c] = 0
                queue.append((r, c))
    
    DIRS = [(0,1),(0,-1),(1,0),(-1,0)]
    while queue:
        r, c = queue.popleft()
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                if dist[r][c] + 1 < dist[nr][nc]:
                    dist[nr][nc] = dist[r][c] + 1
                    queue.append((nr, nc))
    
    return dist
```

Multi-source BFS is O(V + E) — same as single-source. The multiple starting points don't change the fundamental complexity.

## BFS in 6 interview contexts

Per [S019](../../research/coding-algorithms-technical-interviews/01-sources/web/S019-bfs-cp-algorithms.md):

| Context | BFS application |
|---|---|
| Unweighted shortest path | Standard BFS — first visit = shortest path |
| Level-order tree traversal | BFS with level_size trick (see L11) |
| Connected components | BFS from each unvisited node |
| Cycle detection in undirected graph | BFS + parent tracking; if we reach a visited non-parent node, cycle exists |
| Multi-source nearest distance | BFS from all sources simultaneously |
| Topological sort (Kahn's) | BFS from all 0-indegree nodes (see L14) |

## Complexity

**Time**: O(V + E) — each vertex is enqueued once, each edge is examined once (from each endpoint = twice, but still O(E) total).

**Space**: O(V) for the queue and visited set. In the worst case, BFS queues all vertices at once (e.g., a star graph where all nodes connect to one center).

## Key points

- BFS guarantees shortest path in unweighted graphs — the first time it reaches a node is the shortest path distance.
- Always use `deque.popleft()` not `list.pop(0)` — the latter is O(n) and makes BFS O(V²).
- Mark nodes as visited *when they are discovered* (added to queue), not when they are processed — prevents duplicate queuing.
- 2D matrix BFS uses the direction-tuple idiom: `DIRS = [(0,1),(0,-1),(1,0),(-1,0)]` for 4-directional adjacency.
- Multi-source BFS starts with all sources pre-loaded in the queue — finds distance from the nearest of N sources in a single O(V+E) pass.

## Go deeper

- [S019](../../research/coding-algorithms-technical-interviews/01-sources/web/S019-bfs-cp-algorithms.md) — CP-Algorithms BFS with complexity proof and 6 application types
- [S029](../../research/coding-algorithms-technical-interviews/01-sources/web/S029-graph-cheatsheet-tih.md) — TIH graph cheatsheet with BFS/DFS application guidance

---

*← [Previous lesson](./L11-tree-traversal.md)* · *[Next lesson: DFS — Cycle Detection and Recursive Decomposition](./L13-dfs.md) →*
