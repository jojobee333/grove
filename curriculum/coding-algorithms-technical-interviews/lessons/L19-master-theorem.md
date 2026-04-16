# Master Theorem — Divide-and-Conquer Complexity

**Module**: M06 · Complexity Analysis — Big-O, Master Theorem, Amortised
**Type**: core
**Estimated time**: 18 minutes
**Claim**: C8 from Strata synthesis

---

## The core idea

The **Master Theorem** solves recurrences of the form:

$$T(n) = aT\!\left(\frac{n}{b}\right) + f(n)$$

- `a ≥ 1`: number of recursive subproblems
- `b > 1`: factor by which the problem is divided
- `f(n)`: cost of work done outside the recursive calls (combine/split step)

Divide-and-conquer algorithms map to this recurrence almost immediately: merge sort, binary search, Karatsuba multiplication, closest pair of points. The Master Theorem gives the closed-form solution without solving the recurrence manually ([S013](../../research/coding-algorithms-technical-interviews/01-sources/web/S013-master-theorem-wikipedia.md)).

## The Three Cases

Define the "critical exponent" $\log_b a$ (the exponent at which the recursion tree "fans out"):

**Case 1 — Work dominated by leaves**: $f(n) = O(n^{\log_b a - \epsilon})$ for some $\epsilon > 0$

$$T(n) = \Theta(n^{\log_b a})$$

The combine step is cheap; most work happens at the base cases (leaves).

**Case 2 — Work spread evenly across levels**: $f(n) = \Theta(n^{\log_b a} \cdot \log^k n)$ for $k \geq 0$

$$T(n) = \Theta(n^{\log_b a} \cdot \log^{k+1} n)$$

Most commonly seen with $k = 0$: $f(n) = \Theta(n^{\log_b a})$ → $T(n) = \Theta(n^{\log_b a} \cdot \log n)$.

**Case 3 — Work dominated by root**: $f(n) = \Omega(n^{\log_b a + \epsilon})$ for some $\epsilon > 0$

(with the regularity condition $af(n/b) \leq cf(n)$ for some $c < 1$)

$$T(n) = \Theta(f(n))$$

The combine step dominates; recursive calls are cheap.

## Worked Examples

**Merge Sort**: `T(n) = 2T(n/2) + O(n)`
- a=2, b=2 → $\log_2 2 = 1$
- f(n) = O(n) = $\Theta(n^1) = \Theta(n^{\log_2 2})$
- Case 2 with k=0: $T(n) = \Theta(n \log n)$ ✓

**Binary Search**: `T(n) = 1T(n/2) + O(1)`
- a=1, b=2 → $\log_2 1 = 0$
- f(n) = O(1) = $\Theta(n^0)$
- Case 2 with k=0: $T(n) = \Theta(\log n)$ ✓

**Karatsuba Multiplication** (fast integer multiplication): `T(n) = 3T(n/2) + O(n)`
- a=3, b=2 → $\log_2 3 \approx 1.585$
- f(n) = O(n) = $O(n^{1.585 - \epsilon})$ for $\epsilon ≈ 0.585$
- Case 1: $T(n) = \Theta(n^{\log_2 3}) \approx \Theta(n^{1.585})$ — better than naive O(n²) multiplication

**Building a Heap** (heapify): `T(n) = 2T(n/2) + O(log n)`
- a=2, b=2 → $\log_2 2 = 1$
- f(n) = O(log n) = $O(n^{1-\epsilon})$ for any positive $\epsilon$
- Case 1: $T(n) = \Theta(n)$ ✓ — confirms heapify is O(n), not O(n log n)

## When the Master Theorem Does NOT Apply

The theorem requires the recurrence to match `T(n) = aT(n/b) + f(n)` exactly. Common cases where it fails:

- **Subproblems of different sizes**: `T(n) = T(n/2) + T(n/3) + O(n)` — not a standard form
- **Non-polynomial gap**: If f(n) = $n^{\log_b a} / \log n$, the cases don't cover this (falls in a gap between Case 1 and 2)
- **Additively reduced subproblem**: `T(n) = T(n-1) + O(1)` — subproblem is n/b only when b divides, not when subtracted by a constant. This is O(n) by summing n terms, not applicable to Master Theorem.

For inadmissible cases, use the substitution method (guess and verify) or the recursion tree method.

## Recursion Tree Method (Visual Alternative)

When Master Theorem doesn't apply, draw the recursion tree:
1. Each level multiplies cost by branching factor
2. Number of levels = tree height
3. Sum across all levels

For `T(n) = 2T(n/2) + n`:
- Level 0: n work (1 node)
- Level 1: n/2 + n/2 = n work (2 nodes)
- Level 2: 4 × n/4 = n work (4 nodes)
- Height: log₂ n levels
- Total: n × log₂ n = O(n log n) ✓ — same as Master Theorem Case 2

## Interview Application

Interviewers may ask: "What's the time complexity of your recursive solution?" For divide-and-conquer:
1. Write the recurrence
2. Identify a, b, f(n)
3. Compute $\log_b a$
4. Compare f(n) against $n^{\log_b a}$ to pick a case
5. State the result

This process takes 30 seconds when rehearsed. The most common interview recurrences are merge sort (O(n log n)) and binary search (O(log n)).

## Key points

- Master Theorem solves `T(n) = aT(n/b) + f(n)`. The critical exponent is $\log_b a$.
- Case 1 (leaves dominate): f(n) grows slower than $n^{\log_b a}$ → $T(n) = \Theta(n^{\log_b a})$
- Case 2 (balanced): f(n) matches $n^{\log_b a}$ → $T(n) = \Theta(n^{\log_b a} \log n)$
- Case 3 (root dominates): f(n) grows faster than $n^{\log_b a}$ → $T(n) = \Theta(f(n))$
- Merge sort: Case 2 → O(n log n). Binary search: Case 2 → O(log n). Heapify: Case 1 → O(n).

## Go deeper

- [S013](../../research/coding-algorithms-technical-interviews/01-sources/web/S013-master-theorem-wikipedia.md) — Master Theorem with formal proofs, all three cases, and common inadmissible patterns
- [S005](../../research/coding-algorithms-technical-interviews/01-sources/web/S005-mit-6006-fall2011.md) — MIT 6.006 recurrence analysis lectures

---

*← [Previous lesson](./L18-big-o.md)* · *[Next lesson: Amortised Analysis — Table Doubling and DSU](./L20-amortized-analysis.md) →*
