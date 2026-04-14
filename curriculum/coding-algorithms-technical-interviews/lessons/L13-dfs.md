# DFS — Cycle Detection, Path Existence, and Recursive Decomposition

**Module**: M04 · Tree and Graph Traversal — BFS/DFS Duality
**Type**: core
**Estimated time**: 40 minutes
**Claim**: C12 from Strata synthesis

---

## The core idea

Depth-First Search explores a graph or tree by going as deep as possible before backtracking. DFS is the natural traversal for problems involving **paths, cycles, ordering dependencies, and recursive decomposition** — situations where the question is about the structure reachable from a node, not the distance to it.

DFS comes in two forms: recursive (clean, natural for trees and simple graphs) and iterative with an explicit stack (necessary for large Python graphs due to the recursion limit). Both have O(V + E) time complexity ([S027](../../research/coding-algorithms-technical-interviews/01-sources/web/S027-dfs-template-cp-algorithms.md)).

## Recursive DFS Template

```python
def dfs(graph: dict[int, list[int]], source: int) -> None:
    visited = set()
    
    def _dfs(node: int) -> None:
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                _dfs(neighbor)
    
    _dfs(source)
    return visited
```

Simple, but insufficient for directed-graph cycle detection. For that, we need three-colour marking.

## Three-Colour Cycle Detection (Directed Graphs)

BFS-based cycle detection works for undirected graphs (reaching a visited non-parent node). For **directed graphs**, DFS needs three states:

- **White (0)**: unvisited
- **Gray (1)**: currently in the DFS call stack (being processed)
- **Black (2)**: fully processed (all descendants explored)

A **back edge** — reaching a gray node — indicates a cycle. Reaching a black node during DFS is not a cycle (it was explored from a different path and finished).

```python
def has_cycle(num_courses: int, prerequisites: list[list[int]]) -> bool:
    # Build adjacency list
    graph = [[] for _ in range(num_courses)]
    for course, prereq in prerequisites:
        graph[prereq].append(course)
    
    color = [0] * num_courses    # 0=white, 1=gray, 2=black
    
    def dfs(node: int) -> bool:
        color[node] = 1           # mark gray: currently on stack
        for neighbor in graph[node]:
            if color[neighbor] == 1:
                return True       # back edge → cycle
            if color[neighbor] == 0:
                if dfs(neighbor):
                    return True
        color[node] = 2           # mark black: fully processed
        return False
    
    for node in range(num_courses):
        if color[node] == 0:
            if dfs(node):
                return True
    return False
```

**Why three colours, not two?** With only a visited/unvisited distinction, when DFS reaches a visited node in a directed graph, we can't tell if it's a *back edge* (cycle) or a *cross/forward edge* (no cycle — just a different path to a node already fully processed). Gray = "on current DFS path" is the key distinction.

**Canonical problem**: Course Schedule (LeetCode 207). The "can all courses be completed" question reduces to "does the prerequisite graph have a directed cycle?"

## Entry and Exit Timestamps

A more powerful DFS variant records when each node is entered and when it is fully processed. These timestamps enable cycle classification, topological sort, and bridge/articulation-point detection.

```python
def dfs_timestamps(graph: dict[int, list[int]], n: int):
    color = [0] * n
    entry = [0] * n
    exit_time = [0] * n
    timer = [0]
    
    def dfs(v: int) -> None:
        color[v] = 1
        entry[v] = timer[0]
        timer[0] += 1
        for u in graph[v]:
            if color[u] == 0:
                dfs(u)
        color[v] = 2
        exit_time[v] = timer[0]
        timer[0] += 1
    
    for v in range(n):
        if color[v] == 0:
            dfs(v)
```

Entry/exit intervals have a nice property: for two nodes u and v, if u's interval contains v's interval, then v is a descendant of u in the DFS tree. This enables O(1) ancestor queries after O(V+E) preprocessing.

## Iterative DFS (Avoiding Python Recursion Limit)

For graphs where depth can exceed ~1000 (Python's default limit), use an explicit stack:

```python
def dfs_iterative(graph: dict[int, list[int]], source: int) -> set:
    visited = set()
    stack = [source]
    while stack:
        node = stack.pop()
        if node in visited:
            continue
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                stack.append(neighbor)
    return visited
```

**Important difference from recursive DFS**: The iterative version with simple stack does not naturally produce the same traversal order as recursive DFS (post-order, entry/exit timestamps). For post-order specifically, use a two-pass technique or explicit state flags on the stack. The simpler iterative version is sufficient for cycle detection and reachability.

## DFS for flood fill / islands

DFS and BFS both correctly solve connected-component problems like Number of Islands. DFS is often slightly simpler to write:

```python
def num_islands_dfs(grid: list[list[str]]) -> int:
    rows, cols = len(grid), len(grid[0])
    
    def dfs(r: int, c: int) -> None:
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != "1":
            return
        grid[r][c] = "0"          # mark visited by mutating grid in-place
        dfs(r+1, c); dfs(r-1, c)
        dfs(r, c+1); dfs(r, c-1)
    
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                dfs(r, c)
                islands += 1
    return islands
```

**DFS space concern**: For a 300×300 grid (90,000 cells), DFS recursion depth can reach 90,000 — far exceeding Python's 1000-frame default. Use iterative DFS or increase the limit for large grids.

## BFS vs DFS: when to choose which

| Problem type | DFS | BFS |
|---|---|---|
| Shortest path in unweighted graph | ✗ No guarantee | ✓ Guaranteed |
| Cycle detection (directed) | ✓ Three-colour | ✗ Not directly |
| Topological sort | ✓ Post-order reversal | ✓ Kahn's algorithm |
| Detect all reachable nodes | ✓ or BFS | ✓ or DFS |
| Path existence (directed) | ✓ Natural | ✓ Works |
| All paths (enumeration) | ✓ Natural (backtracking variant) | ✗ Memory explodes |
| Level-order / minimum depth | ✗ | ✓ Natural |
| Tree max depth / diameter | ✓ Post-order | ✗ Awkward |

## Key points

- Recursive DFS is clean for trees and shallow graphs; use iterative DFS when Python's 1000-frame limit is a concern.
- Three-colour DFS (white/gray/black) is required for directed-graph cycle detection — a back edge to a gray node means cycle.
- Entry/exit timestamps from DFS enable O(1) ancestor queries and bridge detection after O(V+E) preprocessing.
- Flood-fill problems (Number of Islands) can use DFS or BFS — DFS is slightly simpler to write but risks stack overflow on large grids.
- DFS does NOT guarantee shortest path — if shortest path is needed, use BFS.

## Go deeper

- [S027](../../research/coding-algorithms-technical-interviews/01-sources/web/S027-dfs-template-cp-algorithms.md) — CP-Algorithms DFS with recursive, iterative, and timestamp variants
- [S029](../../research/coding-algorithms-technical-interviews/01-sources/web/S029-graph-cheatsheet-tih.md) — TIH graph cheatsheet with DFS vs BFS application guide

---

*← [Previous lesson](./L12-bfs.md)* · *[Next lesson: Topological Sort — Kahn's BFS vs DFS Post-Order](./L14-topological-sort.md) →*
