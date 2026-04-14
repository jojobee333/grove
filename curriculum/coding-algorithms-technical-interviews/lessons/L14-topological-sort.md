# Topological Sort — Kahn's BFS vs. DFS Post-Order

**Module**: M04 · Tree and Graph Traversal — BFS/DFS Duality
**Type**: applied
**Estimated time**: 35 minutes
**Claim**: C12 from Strata synthesis

---

## The situation

Topological sort produces a linear ordering of vertices in a **directed acyclic graph (DAG)** such that for every directed edge u → v, vertex u appears before vertex v in the ordering. The classic application: if course A is a prerequisite for course B, A must come before B in the schedule.

Two algorithms solve this with identical O(V + E) complexity and produce valid topological orderings:
1. **Kahn's BFS** — in-degree queue approach
2. **DFS post-order reversal** — recursive DFS with reverse of completion order

The algorithms are equivalent for correctness but differ in: cycle detection explicitness, implementation style, and which DFS intuition you need to build on.

## Algorithm 1: Kahn's BFS (In-Degree Queue)

**Core insight**: In a DAG, at least one vertex has no incoming edges (in-degree 0). That vertex can go first. Remove it, decrement in-degrees of its neighbors, and repeat.

```python
from collections import deque

def topological_sort_kahn(num_nodes: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build graph and compute in-degrees
    graph = [[] for _ in range(num_nodes)]
    in_degree = [0] * num_nodes
    
    for u, v in edges:
        graph[u].append(v)
        in_degree[v] += 1
    
    # Start with all nodes that have no prerequisites
    queue = deque(node for node in range(num_nodes) if in_degree[node] == 0)
    order = []
    
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)    # this node's all prerequisites done
    
    # Cycle detection: if not all nodes processed, a cycle exists
    if len(order) < num_nodes:
        return []                         # impossible — cycle detected
    return order
```

**Cycle detection**: This is Kahn's most distinctive advantage. After the loop, if `len(order) < num_nodes`, some nodes were never enqueued — they are part of a cycle (their in-degrees never reached 0). The DFS approach requires explicit three-colour checking to detect cycles; Kahn's makes it implicit.

**Canonical problems**: Course Schedule (LeetCode 207): return True if `len(order) == num_courses`. Course Schedule II (LeetCode 210): return the order directly.

## Algorithm 2: DFS Post-Order Reversal

**Core insight**: After DFS fully processes a node (all descendants explored), append it to a result list. Reverse the list at the end. This gives a valid topological order.

```python
def topological_sort_dfs(num_nodes: int, edges: list[tuple[int, int]]) -> list[int]:
    graph = [[] for _ in range(num_nodes)]
    for u, v in edges:
        graph[u].append(v)
    
    color = [0] * num_nodes    # 0=white, 1=gray, 2=black
    order = []
    has_cycle = [False]
    
    def dfs(node: int) -> None:
        color[node] = 1
        for neighbor in graph[node]:
            if color[neighbor] == 1:
                has_cycle[0] = True
                return
            if color[neighbor] == 0:
                dfs(neighbor)
        color[node] = 2
        order.append(node)             # append when fully processed
    
    for node in range(num_nodes):
        if color[node] == 0:
            dfs(node)
    
    if has_cycle[0]:
        return []
    return order[::-1]                 # reverse for topological order
```

**Why reverse?** DFS appends a node only after all its dependencies are processed. The most "leaf-like" nodes (no outgoing edges) are appended first. Reversing gives the correct order: independent nodes first, dependents last.

## Which to use?

Both algorithms:
- Produce valid topological orderings (different valid orderings may exist)
- Run in O(V + E) time
- Use O(V + E) space (graph storage + O(V) for queue/stack/color)

| Criterion | Kahn's BFS | DFS Post-Order |
|---|---|---|
| Cycle detection | Implicit (result size < V) | Requires explicit three-colour DFS |
| Preferred when | Problem explicitly asks for cycle detection | DFS code is already written |
| Implementation style | Iterative — no recursion limit risk | Recursive — risk on deep graphs |
| "Feels like" | BFS + running prerequisites counter | DFS + append on exit |
| Interview recommendation | ✓ Preferred for new code | Use only if DFS structure already needed |

When the problem combines "detect if ordering exists" (cycle detection) with "return the ordering" — use Kahn's. When the problem is purely ordering with no cycle detection requested — either works.

## Course Schedule II — Full Solution

```python
def find_order(num_courses: int, prerequisites: list[list[int]]) -> list[int]:
    graph = [[] for _ in range(num_courses)]
    in_degree = [0] * num_courses
    
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1
    
    queue = deque(i for i in range(num_courses) if in_degree[i] == 0)
    order = []
    
    while queue:
        course = queue.popleft()
        order.append(course)
        for next_course in graph[course]:
            in_degree[next_course] -= 1
            if in_degree[next_course] == 0:
                queue.append(next_course)
    
    return order if len(order) == num_courses else []
```

The `if len(order) == num_courses else []` at the end is the entire cycle detection — clean and explicit.

## Beyond course scheduling

Topological sort appears in:
- **Build systems**: determine compilation order (Makefile dependencies)
- **Package managers**: install dependencies before packages that require them
- **Task scheduling**: respect task prerequisites
- **Data pipelines**: ensure upstream stages complete before downstream stages

In interviews, these are almost always presented as Course Schedule variants or "alien dictionary" (reconstruct character ordering from sorted word list).

## Key points

- Topological sort orders vertices in a DAG so every edge u→v has u before v in the result.
- Kahn's BFS: repeatedly dequeue 0-in-degree nodes; decrement neighbors; detect cycle if result size < V.
- DFS post-order: append node when fully processed; reverse result.
- Both are O(V + E) time and space.
- Prefer Kahn's when the problem asks for explicit cycle detection — it requires no additional mechanism.

## Go deeper

- [S018](../../research/coding-algorithms-technical-interviews/01-sources/web/S018-kahns-topo-sort-gfg.md) — Kahn's algorithm with in-degree queue and cycle detection
- [S010](../../research/coding-algorithms-technical-interviews/01-sources/web/S010-topological-sort-cp-algorithms.md) — CP-Algorithms DFS topological sort with post-order reversal

---

*← [Previous lesson](./L13-dfs.md)* · *[Next lesson: Unified Binary Search Template](./L15-binary-search.md) →*
