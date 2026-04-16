# Big-O Notation — Formal Definition and Growth Hierarchy

**Module**: M06 · Complexity Analysis — Big-O, Master Theorem, Amortised
**Type**: core
**Estimated time**: 16 minutes
**Claim**: C6 from Strata synthesis

---

## The core idea

Big-O notation answers the question: "How does the running time (or space) of this algorithm scale as input size grows?" It expresses **upper bounds** on growth, abstracting away hardware and implementation constants to reveal the fundamental scaling behaviour.

Understanding Big-O is not just theoretical courtesy — interviewers will ask you to explain time and space complexity for every solution you write. More practically, knowing complexity helps you predict performance problems before they happen in production.

## Formal Definition

`f(n) = O(g(n))` means:

$$\exists c > 0, \, n_0 \geq 1 : \forall n \geq n_0, \quad f(n) \leq c \cdot g(n)$$

In English: there exist positive constants `c` and `n₀` such that, for all `n ≥ n₀`, `f(n)` is bounded above by `c × g(n)`. The "for all sufficiently large n" phrasing is key — Big-O ignores behaviour on small inputs.

**Practical consequence**: constants don't matter. `5n` and `100n` are both O(n). `2n²` and `n²/3` are both O(n²). Only the dominant term matters.

## The Three Asymptotic Symbols

| Symbol | Meaning | Formal condition |
|---|---|---|
| O(g(n)) | f grows **at most** as fast as g | f(n) ≤ c·g(n) for large n (upper bound) |
| Ω(g(n)) | f grows **at least** as fast as g | f(n) ≥ c·g(n) for large n (lower bound) |
| Θ(g(n)) | f grows **exactly** as fast as g | both O and Ω hold simultaneously (tight bound) |

In interviews, "O(n log n)" is often used loosely when "Θ(n log n)" is meant. Be precise: "this algorithm is Θ(n log n) — tight bound" signals more rigour.

## Growth Hierarchy

From fastest to slowest growth (best to worst complexity for algorithms):

$$O(1) \subset O(\log n) \subset O(\sqrt{n}) \subset O(n) \subset O(n \log n) \subset O(n^2) \subset O(n^3) \subset O(2^n) \subset O(n!)$$

**Practical breakpoints** (rough estimates for 1-second time budget):

| Complexity | Max n (approx.) |
|---|---|
| O(n!) | n ≤ 10 |
| O(2^n) | n ≤ 25 |
| O(n³) | n ≤ 500 |
| O(n²) | n ≤ 5,000 |
| O(n log n) | n ≤ 10⁶ |
| O(n) | n ≤ 10⁸ |
| O(log n) | n ≤ 10¹⁸ |

When a problem constraints say `n ≤ 10⁵` and your solution is O(n²), that's ≈10¹⁰ operations — too slow. This table is the mental model for catching TLE before submitting.

## Counting Operations — The Mechanics

For simple code, count loops and nesting:

```python
# O(n) — single loop
for i in range(n):
    print(i)

# O(n²) — nested loops
for i in range(n):
    for j in range(n):
        print(i, j)

# O(n log n) — outer linear, inner halving
for i in range(n):
    j = 1
    while j < n:
        j *= 2        # j doubles each iteration → O(log n) inner

# O(log n) — binary search, repeatedly halving n
lo, hi = 0, n
while lo < hi:
    mid = (lo + hi) // 2
    lo = mid + 1      # or hi = mid (one of these per iteration)
```

## Dropping Constants and Lower-Order Terms

Formally justified because for any constant `c` and dominant term `n^k`, there exists `n₀` beyond which `c·n^k` dominates any lower-order term:

```
T(n) = 3n² + 100n + 50
     = O(n²)           ← drop constants and lower-order terms
```

**Common mistake**: "I looked up Python's `list.sort` and it runs in 50ms — therefore my algorithm is O(50ms)." No. Big-O describes growth rate, not raw time. O(n log n) stays O(n log n) regardless of whether the constant is 1 millisecond or 50 milliseconds.

## Common Algorithm Complexities (Reference)

| Algorithm | Time | Space |
|---|---|---|
| Binary search | O(log n) | O(1) |
| Hash map lookup/insert | O(1) average | O(n) |
| Heap push/pop | O(log n) | O(n) |
| Merge sort | O(n log n) | O(n) |
| Quick sort | O(n log n) avg, O(n²) worst | O(log n) |
| DFS / BFS | O(V + E) | O(V) |
| DP (2D table) | O(n × m) | O(n × m) or O(m) with rolling array |

## Hidden O(n) Operations in Python

Several Python built-ins are O(n) and easy to overlook:
- `list.insert(0, x)` — O(n) (shifts all elements right)
- `list.pop(0)` — O(n) (shifts all elements left) — **use `deque.popleft()` instead**
- `x in some_list` — O(n) — **use a set for O(1)**
- `sorted(x)` — O(n log n) always (not in-place)
- `"".join(parts)` — O(n total characters), correct; `s += piece` in a loop — O(n²) without join

Recognising these is part of complexity analysis — interviewers notice when candidates miss them.

## Key points

- Big-O is an **upper bound**: O(n) says "no worse than linear". It ignores constants and lower-order terms.
- Θ (theta) is the tight bound; Ω (omega) is the lower bound. In interviews, "O(n)" is adequate notation but be ready to clarify.
- Growth hierarchy: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2^n) < O(n!) — memorise the breakpoints.
- Map constraints to complexity: `n ≤ 10⁵` allows O(n log n); `n ≤ 5000` allows O(n²).
- Python hidden O(n) costs: `list.pop(0)`, `x in list`, `list.insert(0, x)` — know these, they appear in interviews.

## Go deeper

- Khan Academy Big-O: conceptual introduction with visual growth comparisons
- [S004](../../research/coding-algorithms-technical-interviews/01-sources/web/S004-mit-6006-spring2020.md) / [S005](../../research/coding-algorithms-technical-interviews/01-sources/web/S005-mit-6006-fall2011.md) — MIT 6.006 lecture notes: formal definitions and amortised analysis

---

*← [Previous lesson](./L17-monotonic-stack.md)* · *[Next lesson: Master Theorem — Divide-and-Conquer Complexity](./L19-master-theorem.md) →*
