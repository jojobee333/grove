# Coverage Gaps — What This Course Does Not Cover

**Module**: M10 · Backtracking, Union-Find, Debates, and Gaps
**Type**: gap
**Estimated time**: 20 minutes
**Claim**: null (meta-lesson)

---

## Purpose of this lesson

No curriculum can cover everything. This lesson maps what the Strata research explicitly identified as gaps — areas that the source material covered weakly or not at all — and gives you a directed reading list for the highest-priority gaps. Read this lesson as a scouting report: these are the areas where this course's coverage runs out and where you should invest additional study time proportional to your role and target company.

## High-Priority Gaps

### Gap 1: Advanced Graph Algorithms

**Not covered**: Dijkstra's algorithm, Bellman-Ford, Floyd-Warshall, Prim's MST.

Dijkstra's is the most commonly tested graph algorithm not in this course. It finds shortest paths in weighted graphs with non-negative edge weights using a min-heap in O((V + E) log V). Most FAANG and FAANG-adjacent interviews will expect you to implement it from memory.

**Recommended resources**:
- Dijkstra's: CP-Algorithms (shortest paths), NeetCode network delay time (LeetCode 743)
- Bellman-Ford: for negative edge weights
- Floyd-Warshall: all-pairs shortest paths O(V³)

**Quick Dijkstra template**:
```python
import heapq

def dijkstra(graph: dict, source: int, n: int) -> list[int]:
    dist = [float('inf')] * n
    dist[source] = 0
    heap = [(0, source)]    # (distance, node)
    
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue        # stale entry
        for v, weight in graph[u]:
            if dist[u] + weight < dist[v]:
                dist[v] = dist[u] + weight
                heapq.heappush(heap, (dist[v], v))
    
    return dist
```

### Gap 2: Trie (Prefix Tree)

**Not covered**: Trie data structure, prefix search, word search with wildcards.

Tries appear in autocomplete, word dictionaries, and IP routing problems. The implementation is a linked structure of character nodes — similar to a tree but with up to 26 children per node.

**Template (basic)**:
```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
    
    def insert(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True
    
    def search(self, word: str) -> bool:
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end
```

### Gap 3: Segment Trees and Fenwick Trees

**Not covered**: Range queries, point updates, prefix sum with updates.

These are medium-hard data structures for range minimum/maximum/sum queries with O(log n) updates:
- **Fenwick tree (BIT)**: range sum queries with O(log n) update. Elegant two-line update/query.
- **Segment tree**: arbitrary range queries (min, max, sum) with O(log n) update/query.

Relevant for: "range sum query mutable" (LeetCode 307), interval problems where prefix sum has poor update cost.

### Gap 4: Bit Manipulation

**Not covered**: XOR tricks, bitmask DP, popcount.

Bit manipulation enables O(1) operations on integers interpreted as sets of flags:
- `x ^ x = 0`, `0 ^ x = x` — XOR to find the single non-duplicate element
- `x & (x-1) = 0` — checks if x is a power of 2
- Bitmask for subset enumeration: iterate over all 2^n subsets with `for mask in range(1 << n)`

Companies like Google frequently test bit manipulation knowledge.

### Gap 5: Advanced DP Patterns

**Not covered**: Interval DP (Matrix Chain Multiplication, Burst Balloons), digit DP, tree DP.

This course covers classical 1D/2D DP weel but omits:
- **Interval DP**: `dp[i][j]` = optimal cost for subproblem from i to j; computed by span length
- **Digit DP**: count numbers in range [0, n] with a given property — uses a "tight constraint" flag
- **Tree DP**: DP computed by post-order DFS on a tree (e.g., maximum independent set on tree)

### Gap 6: String Algorithms

**Not covered**: KMP pattern matching, Rabin-Karp, Z-algorithm, Manacher's palindrome algorithm.

KMP finds all occurrences of a pattern in a string in O(n + m) using a failure function. Rabin-Karp uses rolling hash. These appear in hard string matching problems but are rarely required unless you're targeting companies that ask graph/string hardball questions (Jane Street, Two Sigma, Jane Street).

## Lower-Priority Gaps

### Gap 7: Flow Networks (MaxFlow / MinCut)

Ford-Fulkerson, Edmonds-Karp — required for matching problems, bipartite graph assignments. Rarely tested in standard FAANG interviews; frequently tested in competitive programming.

### Gap 8: Geometry Algorithms

Convex hull, line intersection, point-in-polygon — appear in specialised roles (computational geometry, graphics engineering) but not in general software engineer interviews.

### Gap 9: Number Theory

Sieve of Eratosthenes (prime generation), modular exponentiation, GCD/LCM — occasionally tested in competitive programming and quantitative finance roles. Not typical for standard FAANG SWE roles.

## Prioritising Additional Study

Rank your additional study by target role and company:

| Topic | FAANG SWE | Competitive Programming | Quant / Systems |
|---|---|---|---|
| Dijkstra / shortest paths | ★★★★★ | ★★★★★ | ★★★ |
| Trie | ★★★★ | ★★★ | ★★ |
| Bit manipulation | ★★★★ | ★★★★★ | ★★★ |
| Segment tree / Fenwick | ★★ | ★★★★★ | ★★ |
| Interval DP | ★★ | ★★★★ | ★★ |
| MaxFlow | ★ | ★★★★ | ★ |
| String algorithms (KMP) | ★★ | ★★★★ | ★ |

**If preparing for FAANG**: Dijkstra's + Trie + Bit manipulation cover 90% of what this course misses.

## What This Course Covers Well

This course thoroughly covers the Pareto-dominant patterns — the topics that:
1. Appear in the majority of interview problems
2. Are prerequisites for understanding harder topics

If you've completed all 34 lessons:
- ✅ Hash maps (the universal speed-up)
- ✅ Two pointers, sliding window, prefix sum
- ✅ BFS/DFS, topological sort, cycle detection
- ✅ Binary search (all variants including answer-space)
- ✅ Heap / top-K pattern
- ✅ Monotonic stack
- ✅ Big-O, Master Theorem, amortised analysis
- ✅ Space complexity and Python recursion traps
- ✅ DP (recognition, memoisation, tabulation, state design)
- ✅ Language-specific complexity traps
- ✅ Backtracking
- ✅ Union-Find / DSU

The gaps listed in this lesson are the logical next layer — build this foundation first, then extend.

---

*← [Previous lesson](./L33-dp-priority-debate.md)* · *Course complete — return to [course outline](../course.json)*
